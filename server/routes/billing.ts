import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
import { isAuthenticated, hasProAccess } from "../auth";
import { storage } from "../storage";

const router = Router();
const PRO_TIER = "donor_plus";
const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
]);

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

function getAppUrl(req: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProto === "string" ? forwardedProto.split(",")[0] : req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}`;
}

async function getUserByStripeCustomerId(customerId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  return user;
}

async function ensureStripeCustomer(stripe: Stripe, user: any): Promise<string> {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: user.email || undefined,
    name: user.displayName || user.username,
    metadata: {
      userId: user.id,
      username: user.username,
    },
  });

  await storage.updateUser(user.id, {
    stripeCustomerId: customer.id,
  });

  return customer.id;
}

function isSubscriptionActive(subscription: Stripe.Subscription): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status);
}

function getBestSubscription(subscriptions: Stripe.Subscription[]): Stripe.Subscription | null {
  const active = subscriptions.find((sub) => isSubscriptionActive(sub));
  if (active) {
    return active;
  }

  const latest = [...subscriptions].sort((a, b) => b.created - a.created)[0];
  return latest ?? null;
}

async function syncMembershipFromSubscription(params: {
  userId: string;
  customerId: string | null;
  subscription: Stripe.Subscription | null;
}) {
  const { userId, customerId, subscription } = params;

  const isActive = Boolean(subscription && isSubscriptionActive(subscription));

  // Get current user to check if this is their first time becoming PRO
  const currentUser = await storage.getUser(userId);
  const isFirstTimePro = isActive && currentUser && !currentUser.proStartDate;

  await storage.updateUser(userId, {
    membershipTier: isActive ? PRO_TIER : "free",
    membershipExpiresAt:
      isActive && subscription?.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
    stripeCustomerId: customerId,
    stripeSubscriptionId: isActive && subscription ? subscription.id : null,
    // Set proStartDate only if this is their first time becoming PRO
    ...(isFirstTimePro ? { proStartDate: new Date() } : {}),
  });
}

router.get("/billing/status", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.json({
      membershipTier: user.membershipTier,
      membershipExpiresAt: user.membershipExpiresAt,
      isPro: hasProAccess(user),
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID),
      hasBillingCustomer: Boolean(user.stripeCustomerId),
      pricePerMonthUsd: 10,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch billing status" });
  }
});

router.post("/billing/sync", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }

    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!user.stripeCustomerId) {
      return res.json({ synced: true, membershipTier: user.membershipTier, isPro: hasProAccess(user) });
    }

    const subscriptionList = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 20,
    });

    const bestSubscription = getBestSubscription(subscriptionList.data);

    await syncMembershipFromSubscription({
      userId: user.id,
      customerId: user.stripeCustomerId,
      subscription: bestSubscription,
    });

    const refreshed = await storage.getUser(user.id);

    return res.json({
      synced: true,
      membershipTier: refreshed?.membershipTier || "free",
      membershipExpiresAt: refreshed?.membershipExpiresAt || null,
      isPro: hasProAccess(refreshed),
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to sync billing status" });
  }
});

router.post("/billing/create-checkout-session", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }

    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!priceId) {
      return res.status(500).json({ message: "Missing STRIPE_PRO_PRICE_ID configuration" });
    }

    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (hasProAccess(user)) {
      return res.status(400).json({ message: "You already have Orphan Bars Pro" });
    }

    const customerId = await ensureStripeCustomer(stripe, user);
    const appUrl = getAppUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/settings?billing=success`,
      cancel_url: `${appUrl}/settings?billing=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
    });

    if (!session.url) {
      return res.status(500).json({ message: "Stripe did not return a checkout URL" });
    }

    return res.json({ url: session.url });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to create checkout session" });
  }
});

router.post("/billing/create-portal-session", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }

    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const customerId = await ensureStripeCustomer(stripe, user);
    const appUrl = getAppUrl(req);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings`,
    });

    if (!portalSession.url) {
      return res.status(500).json({ message: "Stripe did not return a billing portal URL" });
    }

    return res.json({ url: portalSession.url });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to create billing portal session" });
  }
});

router.post("/billing/webhook", async (req: Request, res: Response) => {
  const stripe = getStripeClient();
  if (!stripe) {
    return res.status(503).json({ message: "Stripe is not configured" });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(500).json({ message: "Missing STRIPE_WEBHOOK_SECRET configuration" });
  }

  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") {
    return res.status(400).json({ message: "Missing stripe-signature header" });
  }

  try {
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      return res.status(400).json({ message: "Missing raw webhook body" });
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "subscription" && typeof session.customer === "string") {
        let user =
          (typeof session.metadata?.userId === "string" && (await storage.getUser(session.metadata.userId))) ||
          (await getUserByStripeCustomerId(session.customer));

        if (user && typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncMembershipFromSubscription({
            userId: user.id,
            customerId: session.customer,
            subscription,
          });
        }
      }
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const user = await getUserByStripeCustomerId(customerId);

      if (user) {
        await syncMembershipFromSubscription({
          userId: user.id,
          customerId,
          subscription,
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const user = await getUserByStripeCustomerId(customerId);

      if (user) {
        await syncMembershipFromSubscription({
          userId: user.id,
          customerId,
          subscription: null,
        });
      }
    }

    return res.json({ received: true });
  } catch (error: any) {
    return res.status(400).json({ message: `Webhook error: ${error.message}` });
  }
});

export default router;
