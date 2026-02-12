import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, generateProofHash } from "./storage";
import { setupAuth, isAuthenticated, hashPassword, sessionParser, OAUTH_ONLY_PASSWORD_SENTINEL, comparePasswords } from "./auth";
import { bars, likes, users, barSequence } from "@shared/schema";
import { db } from "./db";
import { eq, count, sql, asc } from "drizzle-orm";
import * as passport from "passport";
import { insertUserSchema, insertBarSchema, updateBarSchema, ACHIEVEMENTS } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerAIRoutes } from "./replit_integrations/ai";
import appleNotifications from "./appleNotifications";
import { sendVerificationEmail, sendPasswordResetEmail, generateVerificationCode } from "./email";
import { setupWebSocket, notifyNewMessage } from "./websocket";
import { analyzeContent, normalizeText, type FlaggedPhraseRule } from "./moderation";
import { moderateContent } from "./replit_integrations/ai/barAssistant";
import { aiReviewRequests } from "@shared/schema";
import { validateSupabaseToken } from "./supabaseAuth";
const verificationAttempts = new Map<string, { count: number; lastAttempt: number }>();
const passwordResetAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function checkRateLimit(attemptsMap: Map<string, { count: number; lastAttempt: number }>, key: string): boolean {
  const now = Date.now();
  const attempts = attemptsMap.get(key);
  
  if (!attempts) {
    attemptsMap.set(key, { count: 1, lastAttempt: now });
    return true;
  }
  
  if (now - attempts.lastAttempt > LOCKOUT_MS) {
    attemptsMap.set(key, { count: 1, lastAttempt: now });
    return true;
  }
  
  if (attempts.count >= MAX_ATTEMPTS) {
    return false;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

function clearRateLimit(attemptsMap: Map<string, { count: number; lastAttempt: number }>, key: string): void {
  attemptsMap.delete(key);
}

const APP_VERSION = Date.now().toString();

const QUICK_REACTION_TYPES = ["fire", "clever", "deep"] as const;
type QuickReactionType = (typeof QUICK_REACTION_TYPES)[number];

const QUICK_REACTION_EMOJIS: Record<QuickReactionType, string> = {
  fire: "🔥",
  clever: "💡",
  deep: "🧠",
};

const quickReactionStore = new Map<string, Set<string>>();

const PROMPT_LIBRARY = [
  { slug: "neon-nightmares", text: "Neon nightmares" },
  { slug: "rust-on-the-halo", text: "Rust on the halo" },
  { slug: "midnight-static", text: "Midnight static" },
  { slug: "church-bells-and-sirens", text: "Church bells and sirens" },
  { slug: "glass-jaw-prophecies", text: "Glass jaw prophecies" },
  { slug: "cold-gold-cadence", text: "Cold gold cadence" },
] as const;

function getCurrentPrompt() {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const epochWeek = Date.UTC(2025, 0, 6); // Monday
  const weekOffset = Math.floor((Date.now() - epochWeek) / msPerWeek);
  const normalizedIndex =
    ((weekOffset % PROMPT_LIBRARY.length) + PROMPT_LIBRARY.length) %
    PROMPT_LIBRARY.length;
  return {
    ...PROMPT_LIBRARY[normalizedIndex],
    index: normalizedIndex,
    tag: `prompt:${PROMPT_LIBRARY[normalizedIndex].slug}`,
  };
}

function stripHtmlToSnippet(input: string, maxLength = 140): string {
  const plain = input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();

  if (plain.length <= maxLength) {
    return plain;
  }

  return `${plain.slice(0, maxLength).trimEnd()}...`;
}

function getQuickReactionSummary(barId: string, userId?: string) {
  return QUICK_REACTION_TYPES.reduce(
    (acc, type) => {
      const key = `${barId}:${type}`;
      const voters = quickReactionStore.get(key) ?? new Set<string>();
      acc[type] = {
        count: voters.size,
        reacted: userId ? voters.has(userId) : false,
      };
      return acc;
    },
    {} as Record<QuickReactionType, { count: number; reacted: boolean }>,
  );
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // Hybrid auth: populate req.user from Supabase Bearer token when no passport session exists.
  // This ensures likes/comments/bookmarks work for OAuth users even if session cookie is missing.
  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    if ((req as any).user) return next(); // Already authenticated via session
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    try {
      const token = authHeader.substring(7);
      const supabaseUser = await validateSupabaseToken(token);
      if (supabaseUser) {
        const appUser = await storage.getUserBySupabaseId(supabaseUser.id);
        if (appUser) {
          const { password: _, ...userWithoutPassword } = appUser;
          (req as any).user = userWithoutPassword;
        }
      }
    } catch (e) {
      // Silently continue - auth is optional at this layer
    }
    next();
  });

  registerObjectStorageRoutes(app);
  registerAIRoutes(app);
  setupWebSocket(httpServer, sessionParser);
  app.use(appleNotifications);
  app.use(appleNotifications);

  // Version check endpoint - forces clients to refresh when version changes
  app.get("/api/version", (req: Request, res: Response) => {
    res.json({ version: APP_VERSION });
  });

  app.get("/api/motd", async (_req: Request, res: Response) => {
    res.json({ isActive: false });
  });

  // Owner-only middleware
  const isOwner: typeof isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() && req.user?.isOwner) {
      return next();
    }
    return res.status(403).json({ message: "Owner access required" });
  };

  // Supabase config endpoint for client-side OAuth
  app.get("/api/config/supabase", (req: Request, res: Response) => {
    res.json({
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || ''
    });
  });

  // Auth routes
  app.post("/api/auth/send-code", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email is required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const code = generateVerificationCode();
      await storage.createVerificationCode(email, code);
      
      const sent = await sendVerificationEmail(email, code);
      if (!sent) {
        return res.status(500).json({ message: "Failed to send verification email" });
      }

      res.json({ message: "Verification code sent" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/verify-code", async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ message: "Email and code are required" });
      }

      if (!checkRateLimit(verificationAttempts, email)) {
        return res.status(429).json({ message: "Too many attempts. Please try again later." });
      }

      const isValid = await storage.verifyCode(email, code);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      clearRateLimit(verificationAttempts, email);
      res.json({ verified: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/signup", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password, email, code } = req.body;

      if (!username || !password || !email || !code) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const isValid = await storage.verifyCode(email, code);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        // If legacy milsling account, link OAuth credentials and restore data
        const provider = req.body.oauthProvider;
        // For now, treat all existing emails as eligible for linking if provider is present
        if (["apple", "google", "email"].includes(provider)) {
          await storage.linkSupabaseAccount(existingEmail.id, req.body.supabaseId || req.body.appleId || req.body.googleId || req.body.emailId);
          const updatedUser = await storage.updateUser(existingEmail.id, {
            emailVerified: true,
          });
          if (!updatedUser) return res.status(500).json({ message: "Failed to update user" });
          req.login(updatedUser, (err: any) => {
            if (err) return next(err);
            return res.json(updatedUser);
          });
          return;
        }
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
      });

      await storage.deleteVerificationCodes(email);
      const updatedUser = await storage.updateUser(user.id, { emailVerified: true });

      // Auto-follow and auto-friend Milsling (creator)
      const milsling = await storage.getUserByUsername("Milsling");
      if (milsling && milsling.id !== user.id) {
        await storage.followUser(user.id, milsling.id);
        await storage.createAutoFriendship(milsling.id, user.id);
      }

      const { password: _, ...userWithoutPassword } = updatedUser!;
      req.login(userWithoutPassword, (err: any) => {
        if (err) {
          return next(err);
        }
        res.json(userWithoutPassword);
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Simple signup without email verification (temporary)
  app.post("/api/auth/signup-simple", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        email: `${username.toLowerCase()}@placeholder.orphanbars.local`,
        password: hashedPassword,
      });

      // Auto-follow and auto-friend Milsling (creator)
      const milsling = await storage.getUserByUsername("Milsling");
      if (milsling && milsling.id !== user.id) {
        await storage.followUser(user.id, milsling.id);
        await storage.createAutoFriendship(milsling.id, user.id);
      }

      const { password: _, ...userWithoutPassword } = user;
      req.login(userWithoutPassword, (err: any) => {
        if (err) {
          return next(err);
        }
        res.json(userWithoutPassword);
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    console.log(`[LOGIN] Attempting login for username: "${req.body.username}"`);
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error(`[LOGIN] Error during authentication:`, err);
        return next(err);
      }
      if (!user) {
        console.log(`[LOGIN] Failed login for "${req.body.username}": ${info?.message}`);
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      console.log(`[LOGIN] Successful auth for user: id=${user.id}, username="${user.username}"`);
      req.login(user, (err: any) => {
        if (err) {
          console.error(`[LOGIN] Session creation failed:`, err);
          return next(err);
        }
        // Remember Me: 30 days, otherwise session expires when browser closes
        if (req.session) {
          if (req.body.rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
          } else {
            req.session.cookie.maxAge = undefined; // Session cookie - expires on browser close
          }
        }
        console.log(`[LOGIN] Session created for user ${user.id}, rememberMe=${!!req.body.rememberMe}`);
        res.json(user);
      });
    })(req, res, next);
  });

  // Email-based login endpoint - allows users to log in with email instead of username
  app.post("/api/auth/login-with-email", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, rememberMe } = req.body;
      
      // Rate limiting by email
      if (!checkRateLimit(verificationAttempts, email)) {
        return res.status(429).json({ 
          message: "Too many login attempts. Please try again in 15 minutes." 
        });
      }
      
      console.log(`[LOGIN-EMAIL] Attempting login with email: "${email}"`);
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Look up user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        console.log(`[LOGIN-EMAIL] No user found with email: "${email}"`);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password
      const isValid = await comparePasswords(password, user.password);
      
      if (!isValid) {
        console.log(`[LOGIN-EMAIL] Invalid password for email: "${email}"`);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Log the user in
      console.log(`[LOGIN-EMAIL] Successful auth for user: id=${user.id}, username="${user.username}", email="${email}"`);
      
      const { password: _, ...userWithoutPassword } = user;
      
      req.login(userWithoutPassword, (err: any) => {
        if (err) {
          console.error(`[LOGIN-EMAIL] Session creation failed:`, err);
          return next(err);
        }
        
        // Handle Remember Me
        if (req.session) {
          if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
          } else {
            req.session.cookie.maxAge = undefined; // Session cookie
          }
        }
        
        console.log(`[LOGIN-EMAIL] Session created for user ${user.id}, rememberMe=${!!rememberMe}`);
        
        // Clear rate limit on successful login
        clearRateLimit(verificationAttempts, email);
        
        res.json(userWithoutPassword);
      });
    } catch (error: any) {
      console.error('[LOGIN-EMAIL] Error:', error);
      res.status(500).json({ message: "An error occurred during login" });
    }
  });

  app.post("/api/auth/guest", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const guestUser = {
        id: guestId,
        username: `Guest_${Math.random().toString(36).substr(2, 6)}`,
        email: `${guestId}@guest.orphanbars.space`,
        emailVerified: false,
        bio: null,
        location: null,
        avatarUrl: null,
        bannerUrl: null,
        membershipTier: "free",
        membershipExpiresAt: null,
        isAdmin: false,
        isAdminPlus: false,
        isOwner: false,
        xp: 0,
        level: 1,
        usernameChangedAt: null,
        onlineStatus: "offline",
        lastSeenAt: null,
        messagePrivacy: "friends_only",
        notificationSound: "chime",
        messageSound: "ding",
        displayedBadges: [],
        lastXpUpdate: null,
        dailyXpLikes: 0,
        dailyXpComments: 0,
        dailyXpBookmarks: 0,
        supabaseId: null,
      };
      
      req.login(guestUser, (err: any) => {
        if (err) {
          console.error(`[GUEST] Session creation failed:`, err);
          return next(err);
        }
        console.log(`[GUEST] Guest session created: ${guestUser.username}`);
        res.json(guestUser);
      });
    } catch (error) {
      console.error("[GUEST] Error creating guest session:", error);
      res.status(500).json({ message: "Failed to create guest session" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err: any) => {
        if (err) {
          return res.status(500).json({ message: "Session cleanup failed" });
        }
        // Clear cookie with matching options to ensure it's properly removed
        res.clearCookie('connect.sid', {
          path: '/',
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Password reset routes
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Case-insensitive email lookup
      const normalizedEmail = email.toLowerCase().trim();
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find(u => u.email.toLowerCase() === normalizedEmail);
      
      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "If an account exists with this email, a reset code has been sent" });
      }

      const code = generateVerificationCode();
      // Store with the user's actual email for consistency
      await storage.createPasswordResetCode(user.email, code);

      const sent = await sendPasswordResetEmail(email, code);
      if (!sent) {
        return res.status(500).json({ message: "Failed to send reset email" });
      }

      res.json({ message: "If an account exists with this email, a reset code has been sent" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({ message: "Email, code, and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      if (!checkRateLimit(passwordResetAttempts, email)) {
        return res.status(429).json({ message: "Too many attempts. Please try again later." });
      }

      // Try to verify with normalized email first, then original
      const normalizedEmailForVerify = email.toLowerCase().trim();
      let isValid = await storage.verifyPasswordResetCode(email, code);
      if (!isValid) {
        // Try with the stored user's email (case may differ)
        const allUsersForReset = await storage.getAllUsers();
        const matchingUser = allUsersForReset.find(u => u.email.toLowerCase() === normalizedEmailForVerify);
        if (matchingUser) {
          isValid = await storage.verifyPasswordResetCode(matchingUser.email, code);
        }
      }
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired reset code" });
      }

      // Look up by email (case-insensitive)
      const normalizedEmail = email.toLowerCase().trim();
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find(u => u.email.toLowerCase() === normalizedEmail);
      
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      const hashedPassword = await hashPassword(newPassword);
      const updatedUser = await storage.updateUser(user.id, { password: hashedPassword });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      await storage.deletePasswordResetCodes(email);
      // Also delete with normalized email in case stored differently
      await storage.deletePasswordResetCodes(normalizedEmail);
      clearRateLimit(passwordResetAttempts, email);

      console.log(`Password reset successfully for user: ${user.username} (${user.email})`);
      res.json({ message: "Password reset successfully", username: user.username });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/auth/user", (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Supabase auth routes - for social login (Google, Apple)
  app.get("/api/auth/supabase/user", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing authorization header' });
    }

    const token = authHeader.substring(7);
    const supabaseUser = await validateSupabaseToken(token);
    if (!supabaseUser) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const appUser = await storage.getUserBySupabaseId(supabaseUser.id);
    if (!appUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = appUser;
    res.json(userWithoutPassword);
  });

  app.post("/api/auth/supabase/oauth-callback", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing authorization header' });
    }

    const token = authHeader.substring(7);
    const supabaseUser = await validateSupabaseToken(token);
    if (!supabaseUser) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    try {
      let appUser = await storage.getUserBySupabaseId(supabaseUser.id);
      
      if (!appUser && supabaseUser.email) {
        const existingUserByEmail = await storage.getUserByEmail(supabaseUser.email);
        if (existingUserByEmail) {
          await storage.linkSupabaseAccount(existingUserByEmail.id, supabaseUser.id);
          appUser = await storage.getUser(existingUserByEmail.id);
        }
      }
      
      if (!appUser) {
        return res.json({ 
          needsUsername: true, 
          email: supabaseUser.email,
          supabaseId: supabaseUser.id 
        });
      }

      req.login(appUser, (err) => {
        if (err) {
          console.error('OAuth callback - Login error:', err);
          return res.status(500).json({ message: 'Failed to establish session' });
        }
        const { password: _, ...userWithoutPassword } = appUser;
        res.json(userWithoutPassword);
      });
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      res.status(500).json({ message: error.message || 'Failed to complete sign in' });
    }
  });

  app.post("/api/auth/supabase/complete-signup", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing authorization header' });
    }

    const token = authHeader.substring(7);
    const supabaseUser = await validateSupabaseToken(token);
    if (!supabaseUser) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    try {
      const { username } = req.body;
      if (!username || username.length < 3) {
        return res.status(400).json({ message: 'Username must be at least 3 characters' });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ message: 'Username can only contain letters, numbers, and underscores' });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      const existingSupabaseUser = await storage.getUserBySupabaseId(supabaseUser.id);
      if (existingSupabaseUser) {
        return req.login(existingSupabaseUser, (err) => {
          if (err) {
            console.error('Complete signup - Login error for existing user:', err);
            return res.status(500).json({ message: 'Failed to establish session' });
          }
          const { password: _, ...userWithoutPassword } = existingSupabaseUser;
          return res.json(userWithoutPassword);
        });
      }

      const appUser = await storage.createUser({
        username,
        password: OAUTH_ONLY_PASSWORD_SENTINEL,
        email: supabaseUser.email || '',
        supabaseId: supabaseUser.id,
      });

      req.login(appUser, (err) => {
        if (err) {
          console.error('Complete signup - Login error for new user:', err);
          return res.status(500).json({ message: 'Failed to establish session' });
        }
        const { password: _, ...userWithoutPassword } = appUser;
        res.json(userWithoutPassword);
      });
    } catch (error: any) {
      console.error('Complete signup error:', error);
      res.status(500).json({ message: error.message || 'Failed to create account' });
    }
  });

  app.post("/api/auth/supabase/register", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing authorization header' });
    }

    const token = authHeader.substring(7);
    const supabaseUser = await validateSupabaseToken(token);
    if (!supabaseUser) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: 'Username is required' });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      const appUser = await storage.createUser({
        username,
        password: OAUTH_ONLY_PASSWORD_SENTINEL,
        email: supabaseUser.email || '',
        supabaseId: supabaseUser.id,
      });

      const { password: _, ...userWithoutPassword } = appUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error('Supabase register error:', error);
      res.status(500).json({ message: error.message || 'Failed to create user' });
    }
  });

  app.post("/api/auth/supabase/pre-register", async (req, res) => {
    try {
      const { email, username, supabaseId } = req.body;
      
      if (!email || !username || !supabaseId) {
        return res.status(400).json({ message: 'Email, username, and supabaseId are required' });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      const appUser = await storage.createUser({
        username,
        password: OAUTH_ONLY_PASSWORD_SENTINEL,
        email,
        supabaseId,
        // isGuest: false, // Remove property not in type
      });

      const { password: _, ...userWithoutPassword } = appUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error('Supabase pre-register error:', error);
      res.status(500).json({ message: error.message || 'Failed to create user' });
    }
  });

  // Bar routes
  app.post("/api/bars", isAuthenticated, async (req, res) => {
    try {
      const result = insertBarSchema.safeParse({
        ...req.body,
        userId: req.user!.id,
      });

      if (!result.success) {
        return res.status(400).json({ 
          message: fromError(result.error).toString() 
        });
      }

      // Content moderation check with phrase matching
      const flaggedPhrases = await storage.getFlaggedPhrases();
      const phraseRules: FlaggedPhraseRule[] = flaggedPhrases.map(p => ({
        id: p.id,
        phrase: p.phrase,
        normalizedPhrase: p.normalizedPhrase,
        severity: p.severity,
        similarityThreshold: p.similarityThreshold,
      }));
      
      const textModerationResult = analyzeContent(result.data.content, phraseRules);
      if (textModerationResult.blocked) {
        return res.status(400).json({ 
          message: textModerationResult.reason || "Content violates community guidelines",
          blocked: true
        });
      }
      
      // AI moderation check - runs after text moderation passes
      const aiModerationResult = await moderateContent(result.data.content);
      if (!aiModerationResult.approved) {
        // AI rejected the content - return rejection with option to submit for review
        return res.status(400).json({
          message: "Content was not approved by our moderation system",
          aiRejected: true,
          reasons: aiModerationResult.reasons,
          plagiarismRisk: aiModerationResult.plagiarismRisk,
          plagiarismDetails: aiModerationResult.plagiarismDetails,
          canRequestReview: true
        });
      }

      // Protected bars check - blocks non-owner users from posting content matching owner's backlog
      if (!req.user?.isOwner) {
        const protectedMatch = await storage.checkContentAgainstProtectedBars(result.data.content);
        if (protectedMatch) {
          return res.status(403).json({
            message: "Access denied, you can't steal from God",
            blocked: true,
            protectedContent: true
          });
        }
      }

      // Check for similar bars (duplicate detection)
      const similarBars = await storage.findSimilarBars(result.data.content, 0.8);
      const duplicateWarnings = similarBars.map(sb => ({
        proofBarId: sb.bar.proofBarId,
        permissionStatus: sb.bar.permissionStatus,
        similarity: Math.round(sb.similarity * 100),
      }));

      // Validate beatLink if provided - only allow trusted domains
      if (result.data.beatLink) {
        try {
          const url = new URL(result.data.beatLink);
          const hostname = url.hostname.replace("www.", "");
          const allowedHosts = ["youtube.com", "youtu.be", "soundcloud.com", "open.spotify.com", "audiomack.com"];
          if (!allowedHosts.includes(hostname)) {
            return res.status(400).json({ message: "Beat link must be from YouTube, SoundCloud, or Spotify" });
          }
        } catch {
          return res.status(400).json({ message: "Invalid beat link URL" });
        }
      }

      // Set moderation status based on analysis
      const barData = {
        ...result.data,
        moderationStatus: textModerationResult.flagged ? 'pending_review' : 'approved',
        moderationScore: textModerationResult.similarityScore || null,
        moderationPhraseId: textModerationResult.matchedPhraseId || null,
      };

      // Create the bar (no proofBarId yet - assigned when locked)
      const bar = await storage.createBar(barData);
      
      // Update bar with metadata (proofBarId assigned later when user locks the bar)
      await db.update(bars).set({ 
        permissionStatus: req.body.permissionStatus || "share_only",
        barType: req.body.barType || "single_bar",
        fullRapLink: req.body.fullRapLink || null,
        beatLink: req.body.beatLink || null
      }).where(eq(bars.id, bar.id));
      
      // Notify followers about new bar (only if not private)
      const finalPermission = req.body.permissionStatus || "share_only";
      if (finalPermission !== "private") {
        const followers = await storage.getFollowers(req.user!.id);
        for (const followerId of followers) {
          await storage.createNotification({
            userId: followerId,
            type: "new_bar",
            actorId: req.user!.id,
            barId: bar.id,
            message: `@${req.user!.username} dropped a new bar`
          });
        }
      }
      
      // Award XP for posting a bar (+10 XP)
      await storage.awardXp(req.user!.id, 10, 'bar_posted');
      
      // Check for newly unlocked achievements after posting bar
      const newAchievements = await storage.checkAndUnlockAchievements(req.user!.id);
      for (const achievementId of newAchievements) {
        const achievement = ACHIEVEMENTS[achievementId];
        await storage.createNotification({
          userId: req.user!.id,
          type: "achievement",
          message: `${achievement.emoji} Achievement unlocked: ${achievement.name}!`,
        });
      }
      
      res.json({ 
        ...bar, 
        duplicateWarnings: duplicateWarnings.length > 0 ? duplicateWarnings : undefined,
        newAchievements: newAchievements.length > 0 ? newAchievements : undefined,
        pendingReview: textModerationResult.flagged,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const bars = await storage.getBars(limit);
      
      // Include like/dislike counts and user's liked/disliked status for each bar
      const userId = req.isAuthenticated() ? req.user!.id : null;
      console.log(`[BARS] Fetching bars for userId: ${userId}, authenticated: ${req.isAuthenticated()}`);
      
      const barsWithEngagement = await Promise.all(
        bars.map(async (bar) => {
          const likeCount = await storage.getLikeCount(bar.id);
          const liked = userId ? await storage.hasUserLiked(userId, bar.id) : false;
          const dislikeCount = await storage.getDislikeCount(bar.id);
          const disliked = userId ? await storage.hasUserDisliked(userId, bar.id) : false;
          if (liked) {
            console.log(`[BARS] Bar ${bar.id} is liked by user ${userId}`);
          }
          return { ...bar, likeCount, liked, dislikeCount, disliked };
        })
      );
      
      res.json(barsWithEngagement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars/feed/featured", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const bars = await storage.getFeaturedBars(limit);
      
      const userId = req.isAuthenticated() ? req.user!.id : null;
      const barsWithEngagement = await Promise.all(
        bars.map(async (bar) => {
          const likeCount = await storage.getLikeCount(bar.id);
          const liked = userId ? await storage.hasUserLiked(userId, bar.id) : false;
          const dislikeCount = await storage.getDislikeCount(bar.id);
          const disliked = userId ? await storage.hasUserDisliked(userId, bar.id) : false;
          return { ...bar, likeCount, liked, dislikeCount, disliked };
        })
      );
      
      res.json(barsWithEngagement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars/feed/top", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const bars = await storage.getTopBars(limit);
      
      const userId = req.isAuthenticated() ? req.user!.id : null;
      const barsWithEngagement = await Promise.all(
        bars.map(async (bar) => {
          const likeCount = await storage.getLikeCount(bar.id);
          const liked = userId ? await storage.hasUserLiked(userId, bar.id) : false;
          const dislikeCount = await storage.getDislikeCount(bar.id);
          const disliked = userId ? await storage.hasUserDisliked(userId, bar.id) : false;
          return { ...bar, likeCount, liked, dislikeCount, disliked };
        })
      );
      
      res.json(barsWithEngagement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars/adoptable", async (req, res) => {
    try {
      const adoptableBars = await storage.getAdoptableBars();
      
      const userId = req.isAuthenticated() ? req.user!.id : null;
      const barsWithEngagement = await Promise.all(
        adoptableBars.map(async (bar) => {
          const likeCount = await storage.getLikeCount(bar.id);
          const liked = userId ? await storage.hasUserLiked(userId, bar.id) : false;
          const dislikeCount = await storage.getDislikeCount(bar.id);
          const disliked = userId ? await storage.hasUserDisliked(userId, bar.id) : false;
          const usageCount = await storage.getBarUsageCount(bar.id);
          return { ...bar, likeCount, liked, dislikeCount, disliked, usageCount };
        })
      );
      
      res.json(barsWithEngagement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bars/:id/usage", isAuthenticated, async (req, res) => {
    try {
      let { usageLink, comment } = req.body;
      
      if (usageLink && typeof usageLink === 'string') {
        usageLink = usageLink.trim().slice(0, 500);
        if (usageLink && !/^https?:\/\/.+/.test(usageLink)) {
          return res.status(400).json({ message: "Please provide a valid URL starting with http:// or https://" });
        }
      } else {
        usageLink = undefined;
      }
      
      if (comment && typeof comment === 'string') {
        comment = comment.trim().slice(0, 500);
      } else {
        comment = undefined;
      }
      
      const bar = await storage.getBarById(req.params.id);
      if (!bar) {
        return res.status(404).json({ message: "Bar not found" });
      }
      
      if (bar.permissionStatus !== 'open_adopt') {
        return res.status(403).json({ message: "This bar is not available for adoption" });
      }
      
      const usage = await storage.recordBarUsage(req.params.id, req.user!.id, usageLink, comment);
      
      if (bar.userId !== req.user!.id) {
        await storage.createNotification({
          userId: bar.userId,
          type: 'bar_adopted',
          actorId: req.user!.id,
          barId: bar.id,
          message: `@${req.user!.username} adopted your bar!`
        });
        
        // Award XP to original creator for adoption (+20 XP)
        await storage.awardXp(bar.userId, 20, 'adoption_credited');
      }
      
      res.json(usage);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars/:id/usages", async (req, res) => {
    try {
      const usages = await storage.getBarUsages(req.params.id);
      res.json(usages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/adoptions", isAuthenticated, async (req, res) => {
    try {
      const adoptions = await storage.getUserAdoptions(req.user!.id);
      res.json(adoptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars/feed/trending", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const bars = await storage.getTrendingBars(limit);
      
      const userId = req.isAuthenticated() ? req.user!.id : null;
      const barsWithEngagement = await Promise.all(
        bars.map(async (bar) => {
          const likeCount = await storage.getLikeCount(bar.id);
          const liked = userId ? await storage.hasUserLiked(userId, bar.id) : false;
          const dislikeCount = await storage.getDislikeCount(bar.id);
          const disliked = userId ? await storage.hasUserDisliked(userId, bar.id) : false;
          return { ...bar, likeCount, liked, dislikeCount, disliked };
        })
      );
      
      res.json(barsWithEngagement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:id/likes", async (req, res) => {
    try {
      const bars = await storage.getUserLikes(req.params.id);
      
      const userId = req.isAuthenticated() ? req.user!.id : null;
      const barsWithEngagement = await Promise.all(
        bars.map(async (bar) => {
          const likeCount = await storage.getLikeCount(bar.id);
          const liked = userId ? await storage.hasUserLiked(userId, bar.id) : false;
          const dislikeCount = await storage.getDislikeCount(bar.id);
          const disliked = userId ? await storage.hasUserDisliked(userId, bar.id) : false;
          return { ...bar, likeCount, liked, dislikeCount, disliked };
        })
      );
      
      res.json(barsWithEngagement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bars/:id/feature", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user?.isAdmin && !user?.isOwner) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const bar = await storage.setBarFeatured(req.params.id, true);
      if (!bar) {
        return res.status(404).json({ message: "Bar not found" });
      }
      res.json(bar);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/bars/:id/feature", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user?.isAdmin && !user?.isOwner) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const bar = await storage.setBarFeatured(req.params.id, false);
      if (!bar) {
        return res.status(404).json({ message: "Bar not found" });
      }
      res.json(bar);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars/user/:userId", async (req, res) => {
    try {
      const bars = await storage.getBarsByUser(req.params.userId);
      res.json(bars);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single bar by ID
  app.get("/api/bars/:id", async (req, res) => {
    try {
      const bar = await storage.getBarById(req.params.id);
      if (!bar) {
        return res.status(404).json({ message: "Bar not found" });
      }
      res.json(bar);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/bars/:id", isAuthenticated, async (req, res) => {
    try {
      const result = updateBarSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: fromError(result.error).toString() 
        });
      }

      const existingBar = await storage.getBarById(req.params.id);
      if (!existingBar) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const sessionUserId = String(req.user!.id);
      const barOwnerId = String(existingBar.userId);
      console.log(`[EDIT] User ${sessionUserId} (${req.user!.username}) attempting to edit bar ${req.params.id}`);
      console.log(`[EDIT] Comparing: session="${sessionUserId}" vs owner="${barOwnerId}" match=${sessionUserId === barOwnerId}`);
      
      if (barOwnerId !== sessionUserId) {
        console.log(`[EDIT] DENIED: User ${sessionUserId} does not own bar ${req.params.id} (owner: ${barOwnerId})`);
        return res.status(403).json({ message: "You can only edit your own posts" });
      }

      // Check if bar is locked (authenticated)
      if ((existingBar as any).isLocked) {
        return res.status(403).json({ message: "This bar is locked and cannot be edited. Locked bars have permanent proof-of-origin certificates." });
      }

      const updates: Record<string, any> = {};
      if (result.data.content !== undefined) updates.content = result.data.content;
      if (result.data.explanation !== undefined) updates.explanation = result.data.explanation;
      if (result.data.category !== undefined) updates.category = result.data.category;
      if (result.data.tags !== undefined) updates.tags = result.data.tags;

      const bar = await storage.updateBar(req.params.id, req.user!.id, updates);
      if (!bar) {
        return res.status(500).json({ message: "Failed to update post" });
      }
      res.json(bar);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/bars/:id", isAuthenticated, async (req, res) => {
    try {
      const existingBar = await storage.getBarById(req.params.id);
      if (!existingBar) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const sessionUserId = String(req.user!.id);
      const barOwnerId = String(existingBar.userId);
      console.log(`[DELETE] User ${sessionUserId} (${req.user!.username}) attempting to delete bar ${req.params.id}`);
      console.log(`[DELETE] Comparing: session="${sessionUserId}" vs owner="${barOwnerId}" match=${sessionUserId === barOwnerId}`);
      
      if (barOwnerId !== sessionUserId) {
        console.log(`[DELETE] DENIED: User ${sessionUserId} does not own bar ${req.params.id} (owner: ${barOwnerId})`);
        return res.status(403).json({ message: "You can only delete your own posts" });
      }
      
      const success = await storage.deleteBar(req.params.id, req.user!.id);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete post" });
      }
      res.json({ message: "Bar deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lock bar for authentication (makes it uneditable with valid proof certificate)
  app.post("/api/bars/:id/lock", isAuthenticated, async (req, res) => {
    try {
      const existingBar = await storage.getBarById(req.params.id);
      if (!existingBar) {
        return res.status(404).json({ message: "Bar not found" });
      }

      const sessionUserId = String(req.user!.id);
      const barOwnerId = String(existingBar.userId);
      
      if (barOwnerId !== sessionUserId) {
        return res.status(403).json({ message: "You can only lock your own bars" });
      }

      if ((existingBar as any).isLocked) {
        return res.status(400).json({ message: "This bar is already locked" });
      }

      if (!existingBar.isOriginal) {
        return res.status(400).json({ message: "Only original bars can be locked and authenticated" });
      }

      // Generate proofBarId and proofHash NOW at lock time (not at post time)
      const sequenceNum = await storage.getNextBarSequence();
      const proofBarId = `orphanbars-#${sequenceNum.toString().padStart(5, '0')}`;
      const proofHash = generateProofHash(existingBar.content, existingBar.createdAt, existingBar.userId, proofBarId);

      const bar = await storage.lockBar(req.params.id, req.user!.id, proofBarId, proofHash);
      if (!bar) {
        return res.status(500).json({ message: "Failed to lock bar" });
      }
      
      res.json({ ...bar, message: "Bar has been locked and authenticated. It can no longer be edited." });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Like routes
  app.post("/api/bars/:id/like", isAuthenticated, async (req, res) => {
    const startTime = Date.now();
    console.log(`[LIKE] Request received for bar ${req.params.id} from user ${req.user?.id} (${req.user?.username})`);
    const logDetails: any = {
      barId: req.params.id,
      userId: req.user!.id,
      username: req.user!.username,
      timestamp: new Date().toISOString(),
    };
    
    try {
      // Check if bar exists first
      const existingBar = await storage.getBarById(req.params.id);
      logDetails.barExists = !!existingBar;
      logDetails.barOwnerId = existingBar?.userId;
      
      if (!existingBar) {
        logDetails.error = "Bar not found";
        await storage.createDebugLog({
          action: "like",
          userId: req.user!.id,
          targetId: req.params.id,
          details: JSON.stringify(logDetails),
          success: false,
          errorMessage: "Bar not found",
        });
        return res.status(404).json({ message: "Bar not found" });
      }
      
      const liked = await storage.toggleLike(req.user!.id, req.params.id);
      const count = await storage.getLikeCount(req.params.id);

      // Respond immediately so client never sees "failed" when the like was saved
      res.json({ liked, count });

      // Run notification, XP, achievements, and debug log in background (don't block or change response)
      (async () => {
        try {
          const verified = await storage.hasUserLiked(req.user!.id, req.params.id);
          if (liked !== verified) {
            console.error(`[LIKE] Verification mismatch! toggleLike returned ${liked} but hasUserLiked returned ${verified}`);
            logDetails.verificationMismatch = true;
          }
          logDetails.liked = liked;
          logDetails.verified = verified;
          logDetails.newLikeCount = count;
          logDetails.duration = Date.now() - startTime;

          if (liked) {
            const bar = await storage.getBarById(req.params.id);
            if (bar && bar.userId !== req.user!.id) {
              await storage.createNotification({
                userId: bar.userId,
                type: "like",
                actorId: req.user!.id,
                barId: bar.id,
                message: `@${req.user!.username} liked your bar`
              });
              logDetails.notificationSent = true;
              await storage.awardXp(bar.userId, 5, 'like_received');
              const newAchievements = await storage.checkAndUnlockAchievements(bar.userId);
              logDetails.newAchievements = newAchievements;
              for (const achievementId of newAchievements) {
                const achievement = ACHIEVEMENTS[achievementId];
                await storage.createNotification({
                  userId: bar.userId,
                  type: "achievement",
                  message: `${achievement.emoji} Achievement unlocked: ${achievement.name}!`,
                });
              }
            }
          }
          await storage.createDebugLog({
            action: "like",
            userId: req.user!.id,
            targetId: req.params.id,
            details: JSON.stringify(logDetails),
            success: true,
          });
        } catch (err: any) {
          console.error('[LIKE] Post-like processing failed:', err);
          logDetails.error = err.message;
          logDetails.duration = Date.now() - startTime;
          await storage.createDebugLog({
            action: "like",
            userId: req.user!.id,
            targetId: req.params.id,
            details: JSON.stringify(logDetails),
            success: false,
            errorMessage: err.message,
          }).catch(() => {});
        }
      })();
    } catch (error: any) {
      logDetails.error = error.message;
      logDetails.stack = error.stack;
      logDetails.duration = Date.now() - startTime;
      
      // Log failed like action
      await storage.createDebugLog({
        action: "like",
        userId: req.user!.id,
        targetId: req.params.id,
        details: JSON.stringify(logDetails),
        success: false,
        errorMessage: error.message,
      });
      
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars/:id/likes", async (req, res) => {
    try {
      const count = await storage.getLikeCount(req.params.id);
      const isAuth = req.isAuthenticated();
      const userId = isAuth ? req.user!.id : null;
      const liked = isAuth ? await storage.hasUserLiked(req.user!.id, req.params.id) : false;
      console.log(`[LIKES CHECK] Bar ${req.params.id}: auth=${isAuth}, userId=${userId}, liked=${liked}, count=${count}`);
      res.json({ count, liked });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dislike routes
  app.post("/api/bars/:id/dislike", isAuthenticated, async (req, res) => {
    const startTime = Date.now();
    const logDetails: any = {
      barId: req.params.id,
      userId: req.user!.id,
      username: req.user!.username,
      timestamp: new Date().toISOString(),
    };
    
    try {
      console.log(`[ROUTE] User ${req.user!.id} attempting to dislike bar ${req.params.id}`);
      const disliked = await storage.toggleDislike(req.user!.id, req.params.id);
      const count = await storage.getDislikeCount(req.params.id);
      const likeCount = await storage.getLikeCount(req.params.id);
      const liked = await storage.hasUserLiked(req.user!.id, req.params.id);
      
      logDetails.disliked = disliked;
      logDetails.newDislikeCount = count;
      logDetails.likeCount = likeCount;
      logDetails.duration = Date.now() - startTime;
      
      console.log(`[ROUTE] Dislike toggle success: disliked=${disliked}, newCount=${count}`);

      // Send notification if disliked (not undisliked) and not own bar
      if (disliked) {
        const bar = await storage.getBarById(req.params.id);
        if (bar && bar.userId !== req.user!.id) {
          await storage.createNotification({
            userId: bar.userId,
            type: "dislike",
            actorId: req.user!.id,
            barId: bar.id,
            message: `@${req.user!.username} disliked your bar`
          });
          logDetails.notificationSent = true;
        }
      }
      
      // Log successful dislike action
      await storage.createDebugLog({
        action: "dislike",
        userId: req.user!.id,
        targetId: req.params.id,
        details: JSON.stringify(logDetails),
        success: true,
      });
      
      res.json({ disliked, count, likeCount, liked });
    } catch (error: any) {
      logDetails.error = error.message;
      logDetails.stack = error.stack;
      logDetails.duration = Date.now() - startTime;
      
      console.error(`[ROUTE] Dislike toggle error: ${error.message}`);
      await storage.createDebugLog({
        action: "dislike",
        userId: req.user!.id,
        targetId: req.params.id,
        details: JSON.stringify(logDetails),
        success: false,
        errorMessage: error.message,
      });
      
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars/:id/dislikes", async (req, res) => {
    try {
      const count = await storage.getDislikeCount(req.params.id);
      const disliked = req.isAuthenticated() ? await storage.hasUserDisliked(req.user!.id, req.params.id) : false;
      res.json({ count, disliked });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Comment routes
  app.get("/api/bars/:id/comments", async (req, res) => {
    try {
      const barComments = await storage.getComments(req.params.id);
      res.json(barComments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bars/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Comment content is required" });
      }
      const comment = await storage.createComment({
        userId: req.user!.id,
        barId: req.params.id,
        content: content.trim(),
      });
      
      // Send notification to bar owner (if not commenting on own bar)
      const bar = await storage.getBarById(req.params.id);
      if (bar && bar.userId !== req.user!.id) {
        await storage.createNotification({
          userId: bar.userId,
          type: "comment",
          actorId: req.user!.id,
          barId: bar.id,
          message: `@${req.user!.username} commented on your bar`
        });
      }
      
      // Award XP to commenter (+3 XP, not for self-commenting)
      if (bar && bar.userId !== req.user!.id) {
        await storage.awardXp(req.user!.id, 3, 'comment_made');
      }
      
      res.json(comment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/comments/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteComment(req.params.id, req.user!.id);
      if (!success) {
        return res.status(404).json({ message: "Comment not found" });
      }
      res.json({ message: "Comment deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Comment like routes
  app.post("/api/comments/:id/like", isAuthenticated, async (req, res) => {
    try {
      const liked = await storage.toggleCommentLike(req.user!.id, req.params.id);
      const count = await storage.getCommentLikeCount(req.params.id);
      
      // Send notification to comment owner (if not liking own comment)
      if (liked) {
        const comment = await storage.getCommentById(req.params.id);
        if (comment && comment.userId !== req.user!.id) {
          await storage.createNotification({
            userId: comment.userId,
            type: "comment_like",
            actorId: req.user!.id,
            barId: comment.barId,
            commentId: comment.id,
            message: `@${req.user!.username} liked your comment`
          });
        }
      }
      
      res.json({ liked, count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/comments/:id/likes", async (req, res) => {
    try {
      const count = await storage.getCommentLikeCount(req.params.id);
      const liked = req.isAuthenticated() && req.user?.id
        ? await storage.hasUserLikedComment(req.user.id, req.params.id)
        : false;
      res.json({ count, liked });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Comment dislike routes
  app.post("/api/comments/:id/dislike", isAuthenticated, async (req, res) => {
    try {
      const disliked = await storage.toggleCommentDislike(req.user!.id, req.params.id);
      const count = await storage.getCommentDislikeCount(req.params.id);
      const likeCount = await storage.getCommentLikeCount(req.params.id);
      const liked = await storage.hasUserLikedComment(req.user!.id, req.params.id);
      
      // Send notification if disliked (not undisliked) and not own comment
      if (disliked) {
        const comment = await storage.getCommentById(req.params.id);
        if (comment && comment.userId !== req.user!.id) {
          await storage.createNotification({
            userId: comment.userId,
            type: "comment_dislike",
            actorId: req.user!.id,
            barId: comment.barId,
            commentId: comment.id,
            message: `@${req.user!.username} disliked your comment`
          });
        }
      }
      
      res.json({ disliked, count, likeCount, liked });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/comments/:id/dislikes", async (req, res) => {
    try {
      const count = await storage.getCommentDislikeCount(req.params.id);
      const disliked = req.isAuthenticated() && req.user?.id
        ? await storage.hasUserDislikedComment(req.user.id, req.params.id)
        : false;
      res.json({ count, disliked });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Follow routes
  app.post("/api/users/:userId/follow", isAuthenticated, async (req, res) => {
    try {
      const followed = await storage.followUser(req.user!.id, req.params.userId);
      
      // Check achievements for the user being followed (they gained a follower)
      if (followed) {
        const newAchievements = await storage.checkAndUnlockAchievements(req.params.userId);
        for (const achievementId of newAchievements) {
          const achievement = ACHIEVEMENTS[achievementId];
          await storage.createNotification({
            userId: req.params.userId,
            type: "achievement",
            message: `${achievement.emoji} Achievement unlocked: ${achievement.name}!`,
          });
        }
      }
      
      res.json({ followed });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users/:userId/unfollow", isAuthenticated, async (req, res) => {
    try {
      const unfollowed = await storage.unfollowUser(req.user!.id, req.params.userId);
      res.json({ unfollowed });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:userId/follow-status", async (req, res) => {
    try {
      const isFollowing = req.isAuthenticated() 
        ? await storage.isFollowing(req.user!.id, req.params.userId)
        : false;
      res.json({ isFollowing });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:userId/stats", async (req, res) => {
    try {
      const [barsCount, followersCount, followingCount] = await Promise.all([
        storage.getBarsCount(req.params.userId),
        storage.getFollowersCount(req.params.userId),
        storage.getFollowingCount(req.params.userId)
      ]);
      res.json({ barsCount, followersCount, followingCount });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Achievement routes
  app.get("/api/users/:userId/achievements", async (req, res) => {
    try {
      const achievements = await storage.getUserAchievements(req.params.userId);
      const achievementsWithDetails = achievements.map(a => ({
        ...a,
        ...(ACHIEVEMENTS[a.achievementId as keyof typeof ACHIEVEMENTS] || {}),
      }));
      res.json(achievementsWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/achievements", async (_req, res) => {
    try {
      res.json(ACHIEVEMENTS);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get active custom achievements (public endpoint)
  app.get("/api/achievements/custom", async (_req, res) => {
    try {
      const customAchievements = await storage.getActiveCustomAchievements();
      res.json(customAchievements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get total achievements count (built-in + active custom)
  app.get("/api/achievements/total", async (_req, res) => {
    try {
      const builtInCount = Object.keys(ACHIEVEMENTS).length;
      const customAchievements = await storage.getActiveCustomAchievements();
      const totalCount = builtInCount + customAchievements.length;
      res.json({ 
        total: totalCount, 
        builtIn: builtInCount, 
        custom: customAchievements.length 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update displayed badges
  app.patch("/api/user/displayed-badges", isAuthenticated, async (req, res) => {
    try {
      const { displayedBadges } = req.body;
      if (!Array.isArray(displayedBadges)) {
        return res.status(400).json({ message: "displayedBadges must be an array" });
      }
      if (displayedBadges.length > 5) {
        return res.status(400).json({ message: "Maximum 5 badges can be displayed" });
      }
      // Verify all badges are valid - can be achievement IDs OR profile badge IDs
      const customAchievements = await storage.getActiveCustomAchievements();
      const validCustomIds = new Set(customAchievements.map(a => `custom_${a.id}`));
      const userOwnedBadges = await storage.getUserBadges(req.user!.id);
      const validProfileBadgeIds = new Set(userOwnedBadges.map(ub => ub.badgeId));
      
      for (const badgeId of displayedBadges) {
        const isBuiltInAchievement = !!ACHIEVEMENTS[badgeId as keyof typeof ACHIEVEMENTS];
        const isCustomAchievement = validCustomIds.has(badgeId);
        const isProfileBadge = validProfileBadgeIds.has(badgeId);
        
        if (!isBuiltInAchievement && !isCustomAchievement && !isProfileBadge) {
          return res.status(400).json({ message: `Invalid badge ID: ${badgeId}` });
        }
      }
      const user = await storage.updateUser(req.user!.id, { displayedBadges });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const notifs = await storage.getNotifications(req.user!.id, limit);
      res.json(notifs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      const count = await storage.getUnreadCount(req.user!.id);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.markNotificationRead(req.params.id, req.user!.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.user!.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Search routes
  app.get("/api/search/bars", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res.json([]);
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const results = await storage.searchBars(query.trim(), limit);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/search/users", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res.json([]);
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const results = await storage.searchUsers(query.trim(), limit);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/search/tags", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 1) {
        return res.json([]);
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const results = await storage.searchTags(query.trim().toLowerCase(), limit);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars/by-tag/:tag", async (req, res) => {
    try {
      const tag = req.params.tag;
      const results = await storage.getBarsByTag(tag.toLowerCase());
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bookmark routes
  app.post("/api/bars/:id/bookmark", isAuthenticated, async (req, res) => {
    try {
      const bookmarked = await storage.toggleBookmark(req.user!.id, req.params.id);
      
      // Award XP for bookmarking (+2 XP, only when bookmarking, not unbookmarking)
      if (bookmarked) {
        const bar = await storage.getBarById(req.params.id);
        if (bar && bar.userId !== req.user!.id) {
          await storage.awardXp(req.user!.id, 2, 'bookmark_added');
        }
      }
      
      res.json({ bookmarked });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars/:id/bookmark", async (req, res) => {
    try {
      const bookmarked = req.isAuthenticated() && req.user?.id
        ? await storage.hasUserBookmarked(req.user.id, req.params.id)
        : false;
      res.json({ bookmarked });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bookmarks", isAuthenticated, async (req, res) => {
    try {
      const bookmarks = await storage.getUserBookmarks(req.user!.id);
      res.json(bookmarks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Proof-of-origin routes
  app.get("/api/bars/by-proof/:proofBarId", async (req, res) => {
    try {
      const bar = await storage.getBarByProofId(req.params.proofBarId);
      if (!bar) {
        return res.status(404).json({ message: "Bar not found" });
      }
      res.json(bar);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bars/check-similar", isAuthenticated, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }
      const similarBars = await storage.findSimilarBars(content, 0.8);
      const results = await Promise.all(similarBars.map(async (sb) => {
        const user = await storage.getUser(sb.bar.userId);
        return {
          id: sb.bar.id,
          proofBarId: sb.bar.proofBarId,
          permissionStatus: sb.bar.permissionStatus,
          similarity: Math.round(sb.similarity * 100),
          username: user?.username || 'Unknown',
        };
      }));
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Adoption routes
  app.post("/api/bars/:id/adopt", isAuthenticated, async (req, res) => {
    try {
      const { originalProofBarId } = req.body;
      if (!originalProofBarId) {
        return res.status(400).json({ message: "Original bar ID is required" });
      }
      
      const originalBar = await storage.getBarByProofId(originalProofBarId);
      if (!originalBar) {
        return res.status(404).json({ message: "Original bar not found" });
      }
      
      if (originalBar.permissionStatus !== "open_adopt") {
        return res.status(403).json({ message: "This bar is not open for adoption" });
      }
      
      const adoption = await storage.createAdoption(
        originalBar.id,
        req.params.id,
        req.user!.id
      );
      
      // Notify original creator
      await storage.createNotification({
        userId: originalBar.userId,
        type: "adoption",
        actorId: req.user!.id,
        barId: originalBar.id,
        message: `@${req.user!.username} adopted your bar ${originalProofBarId}`,
      });
      
      res.json(adoption);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars/:id/adoptions", async (req, res) => {
    try {
      const adoptions = await storage.getAdoptionsByOriginal(req.params.id);
      res.json(adoptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Push notification subscription routes
  app.post("/api/push/subscribe", isAuthenticated, async (req, res) => {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }
      await storage.savePushSubscription(req.user!.id, {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/push/unsubscribe", isAuthenticated, async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ message: "Endpoint is required" });
      }
      await storage.deletePushSubscription(req.user!.id, endpoint);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Profile routes
  app.get("/api/users/by-id/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // XP Stats endpoint
  app.get("/api/users/:username/xp", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const xpStats = await storage.getUserXpStats(user.id);
      res.json(xpStats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Retroactive XP calculation (admin only, idempotent)
  app.post("/api/retro-xp", isAuthenticated, async (req, res) => {
    try {
      if (!req.user!.isOwner && !req.user!.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const allUsers = await storage.getAllUsers();
      const results: Array<{ userId: string; username: string; xp: number; level: number }> = [];
      
      for (const user of allUsers) {
        const { xp, level } = await storage.calculateRetroactiveXp(user.id);
        results.push({ userId: user.id, username: user.username, xp, level });
      }
      
      res.json({ 
        message: `Retroactive XP calculated for ${results.length} users`,
        results 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/me", isAuthenticated, async (req, res) => {
    try {
      const { bio, location, avatarUrl, bannerUrl, messagePrivacy, notificationSound, messageSound } = req.body;
      const updates: Record<string, any> = {};
      
      if (bio !== undefined) updates.bio = bio;
      if (location !== undefined) updates.location = location;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
      if (bannerUrl !== undefined) updates.bannerUrl = bannerUrl;
      if (messagePrivacy !== undefined) {
        if (!["friends_only", "everyone"].includes(messagePrivacy)) {
          return res.status(400).json({ message: "Invalid privacy setting" });
        }
        updates.messagePrivacy = messagePrivacy;
      }
      if (notificationSound !== undefined) {
        if (!["none", "chime", "pop", "bell", "whoosh"].includes(notificationSound)) {
          return res.status(400).json({ message: "Invalid notification sound setting" });
        }
        updates.notificationSound = notificationSound;
      }
      if (messageSound !== undefined) {
        if (!["none", "ding", "bubble", "soft", "alert"].includes(messageSound)) {
          return res.status(400).json({ message: "Invalid message sound setting" });
        }
        updates.messageSound = messageSound;
      }

      const user = await storage.updateUser(req.user!.id, updates);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Change username route (once every 15 days)
  app.post("/api/users/me/username", isAuthenticated, async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username || username.trim().length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters" });
      }

      if (username.length > 20) {
        return res.status(400).json({ message: "Username must be 20 characters or less" });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores" });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check 15-day restriction
      if (user.usernameChangedAt) {
        const daysSinceChange = (Date.now() - new Date(user.usernameChangedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceChange < 15) {
          const daysRemaining = Math.ceil(15 - daysSinceChange);
          return res.status(400).json({ 
            message: `You can change your username again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}` 
          });
        }
      }

      // Check if username is actually changing
      if (username.trim().toLowerCase() === user.username.toLowerCase()) {
        return res.status(400).json({ message: "New username must be different from current username" });
      }

      // Check if username is taken
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const updatedUser = await storage.updateUser(req.user!.id, { 
        username: username.trim(),
        usernameChangedAt: new Date()
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update username" });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Change password route
  app.post("/api/users/me/password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { comparePasswords } = await import("./auth");
      const isValid = await comparePasswords(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(req.user!.id, { password: hashedPassword });
      
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin routes
  const isAdmin: typeof isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() && req.user?.isAdmin) {
      return next();
    }
    return res.status(403).json({ message: "Admin access required" });
  };

  // Helper to check if a user is the protected owner
  const isProtectedOwner = async (userId: string): Promise<boolean> => {
    const user = await storage.getUser(userId);
    return user?.isOwner === true;
  };

  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithoutPasswords = allUsers.map(({ password: _, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/bars", isAdmin, async (req, res) => {
    try {
      await storage.deleteAllBars();
      res.json({ message: "All bars deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/bars/:id", isAdmin, async (req, res) => {
    try {
      const bar = await storage.getBarById(req.params.id);
      if (!bar) {
        return res.status(404).json({ message: "Bar not found" });
      }
      if (await isProtectedOwner(bar.userId)) {
        return res.status(403).json({ message: "Cannot moderate owner's content" });
      }
      const success = await storage.deleteBarAdmin(req.params.id, req.user!.id);
      if (!success) {
        return res.status(404).json({ message: "Bar not found" });
      }
      res.json({ message: "Bar deleted by admin" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Moderate bar - remove and notify user
  app.post("/api/admin/bars/:id/moderate", isAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
        return res.status(400).json({ message: "Moderation reason is required" });
      }

      // Get the bar first to find the user
      const bar = await storage.getBarById(req.params.id);
      if (!bar) {
        return res.status(404).json({ message: "Bar not found" });
      }

      if (await isProtectedOwner(bar.userId)) {
        return res.status(403).json({ message: "Cannot moderate owner's content" });
      }

      const userId = bar.userId;
      const barContent = bar.content.length > 50 ? bar.content.substring(0, 50) + "..." : bar.content;

      // Soft delete the bar with reason
      const success = await storage.deleteBarAdmin(req.params.id, req.user!.id, reason.trim());
      if (!success) {
        return res.status(404).json({ message: "Failed to remove bar" });
      }

      // Create notification for the user (barId omitted since bar was deleted)
      await storage.createNotification({
        userId,
        type: "moderation",
        actorId: req.user!.id,
        message: `Your post "${barContent}" was removed due to moderation. Reason: ${reason.trim()}`,
      });

      res.json({ message: "Bar moderated and user notified" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      if (req.params.id === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }
      if (await isProtectedOwner(req.params.id)) {
        return res.status(403).json({ message: "Cannot delete owner account" });
      }
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Toggle admin status - only owner can do this
  app.patch("/api/admin/users/:id/admin", isAdmin, async (req, res) => {
    try {
      // Only the owner can promote/demote admins
      if (!req.user!.isOwner) {
        return res.status(403).json({ message: "Only the owner can change admin status" });
      }
      if (req.params.id === req.user!.id) {
        return res.status(400).json({ message: "Cannot change your own admin status" });
      }
      if (await isProtectedOwner(req.params.id)) {
        return res.status(403).json({ message: "Cannot modify owner's privileges" });
      }
      const { isAdmin: newAdminStatus } = req.body;
      if (typeof newAdminStatus !== "boolean") {
        return res.status(400).json({ message: "isAdmin must be a boolean" });
      }
      const user = await storage.updateUser(req.params.id, { isAdmin: newAdminStatus });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Toggle email verified status
  app.patch("/api/admin/users/:id/verify", isAdmin, async (req, res) => {
    try {
      if (await isProtectedOwner(req.params.id)) {
        return res.status(403).json({ message: "Cannot modify owner's privileges" });
      }
      const { emailVerified } = req.body;
      if (typeof emailVerified !== "boolean") {
        return res.status(400).json({ message: "emailVerified must be a boolean" });
      }
      const user = await storage.updateUser(req.params.id, { emailVerified });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Change membership tier
  app.patch("/api/admin/users/:id/membership", isAdmin, async (req, res) => {
    try {
      if (await isProtectedOwner(req.params.id)) {
        return res.status(403).json({ message: "Cannot modify owner's privileges" });
      }
      const { membershipTier } = req.body;
      const validTiers = ["free", "donor", "donor_plus"];
      if (!validTiers.includes(membershipTier)) {
        return res.status(400).json({ message: "Invalid membership tier" });
      }
      const user = await storage.updateUser(req.params.id, { membershipTier });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Report routes
  app.post("/api/reports", isAuthenticated, async (req, res) => {
    try {
      const { barId, commentId, userId, reason, details } = req.body;
      
      const validReasons = ["illegal_content", "harassment", "spam", "hate_speech", "self_harm", "other"];
      if (!reason || !validReasons.includes(reason)) {
        return res.status(400).json({ message: "Valid reason is required" });
      }
      
      if (!barId && !commentId && !userId) {
        return res.status(400).json({ message: "Must specify barId, commentId, or userId to report" });
      }
      
      // Validate that the referenced entity exists
      if (barId) {
        const bar = await storage.getBarById(barId);
        if (!bar) {
          return res.status(404).json({ message: "Bar not found" });
        }
      }
      
      const report = await storage.createReport({
        reporterId: req.user!.id,
        barId: barId || undefined,
        commentId: commentId || undefined,
        userId: userId || undefined,
        reason,
        details: details?.trim() || undefined,
      });
      
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/reports", isAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const reports = await storage.getReports(status);
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/reports/:id", isAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!["pending", "reviewed", "dismissed", "action_taken"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const report = await storage.updateReportStatus(req.params.id, status, req.user!.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Flagged phrases admin routes
  app.get("/api/admin/phrases", isAdmin, async (req, res) => {
    try {
      const phrases = await storage.getFlaggedPhrases();
      res.json(phrases);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/phrases", isAdmin, async (req, res) => {
    try {
      const { phrase, severity, similarityThreshold, notes } = req.body;
      if (!phrase || !phrase.trim()) {
        return res.status(400).json({ message: "Phrase is required" });
      }
      
      const normalized = normalizeText(phrase);
      const newPhrase = await storage.createFlaggedPhrase({
        phrase: phrase.trim(),
        normalizedPhrase: normalized,
        severity: severity || 'flag',
        similarityThreshold: similarityThreshold || 80,
        notes,
        createdBy: req.user!.id,
      });
      res.json(newPhrase);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/phrases/:id", isAdmin, async (req, res) => {
    try {
      const { phrase, severity, similarityThreshold, notes, isActive } = req.body;
      const updates: any = {};
      
      if (phrase !== undefined) {
        updates.phrase = phrase;
        updates.normalizedPhrase = normalizeText(phrase);
      }
      if (severity !== undefined) updates.severity = severity;
      if (similarityThreshold !== undefined) updates.similarityThreshold = similarityThreshold;
      if (notes !== undefined) updates.notes = notes;
      if (isActive !== undefined) updates.isActive = isActive;
      
      const updated = await storage.updateFlaggedPhrase(req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Phrase not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/phrases/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteFlaggedPhrase(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Pending moderation routes
  app.get("/api/admin/moderation/pending", isAdmin, async (req, res) => {
    try {
      const pending = await storage.getPendingModerationBars();
      res.json(pending);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/moderation/:barId/approve", isAdmin, async (req, res) => {
    try {
      const bar = await storage.updateBarModerationStatus(req.params.barId, 'approved');
      if (!bar) {
        return res.status(404).json({ message: "Bar not found" });
      }
      res.json(bar);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/moderation/:barId/reject", isAdmin, async (req, res) => {
    try {
      const bar = await storage.updateBarModerationStatus(req.params.barId, 'blocked');
      if (!bar) {
        return res.status(404).json({ message: "Bar not found" });
      }
      res.json(bar);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Review Request routes - for bars rejected by AI moderation
  app.post("/api/ai-review-request", isAuthenticated, async (req, res) => {
    try {
      const { content, category, tags, explanation, barType, beatLink, fullRapLink, 
              aiRejectionReasons, plagiarismRisk, plagiarismDetails, userAppeal } = req.body;
      
      if (!content || !category) {
        return res.status(400).json({ message: "Content and category are required" });
      }
      
      // Create the review request
      const result = await db.insert(aiReviewRequests).values({
        userId: req.user!.id,
        content,
        category,
        tags: tags || [],
        explanation,
        barType: barType || "single_bar",
        beatLink,
        fullRapLink,
        aiRejectionReasons: aiRejectionReasons || [],
        plagiarismRisk,
        plagiarismDetails,
        userAppeal,
        status: "pending",
      }).returning();
      
      res.json({ success: true, reviewRequest: result[0] });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's own AI review requests
  app.get("/api/ai-review-requests/mine", isAuthenticated, async (req, res) => {
    try {
      const requests = await db.select()
        .from(aiReviewRequests)
        .where(eq(aiReviewRequests.userId, req.user!.id))
        .orderBy(aiReviewRequests.createdAt);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin routes for AI review requests
  app.get("/api/admin/ai-review-requests", isAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      let query = db.select({
        request: aiReviewRequests,
        user: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        }
      })
        .from(aiReviewRequests)
        .leftJoin(users, eq(aiReviewRequests.userId, users.id))
        .orderBy(aiReviewRequests.createdAt);
      
      if (status) {
        query = query.where(eq(aiReviewRequests.status, status)) as typeof query;
      }
      
      const results = await query;
      res.json(results.map(r => ({ ...r.request, user: r.user })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Approve AI review request - creates the bar
  app.post("/api/admin/ai-review-requests/:id/approve", isAdmin, async (req, res) => {
    try {
      const { reviewNotes } = req.body;
      const requestId = req.params.id;
      
      // Get the review request
      const [reviewRequest] = await db.select().from(aiReviewRequests).where(eq(aiReviewRequests.id, requestId));
      if (!reviewRequest) {
        return res.status(404).json({ message: "Review request not found" });
      }
      
      if (reviewRequest.status !== "pending") {
        return res.status(400).json({ message: "This request has already been processed" });
      }
      
      // Create the bar from the review request
      const bar = await storage.createBar({
        userId: reviewRequest.userId,
        content: reviewRequest.content,
        category: reviewRequest.category,
        tags: reviewRequest.tags || [],
        explanation: reviewRequest.explanation,
        barType: reviewRequest.barType as any,
        beatLink: reviewRequest.beatLink,
        fullRapLink: reviewRequest.fullRapLink,
        moderationStatus: "approved",
      });
      
      // Update bar with additional fields
      await db.update(bars).set({ 
        permissionStatus: "share_only",
        barType: reviewRequest.barType || "single_bar",
        fullRapLink: reviewRequest.fullRapLink || null,
        beatLink: reviewRequest.beatLink || null
      }).where(eq(bars.id, bar.id));
      
      // Update the review request status
      await db.update(aiReviewRequests).set({
        status: "approved",
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
        reviewNotes,
      }).where(eq(aiReviewRequests.id, requestId));
      
      // Award XP for the posted bar
      await storage.awardXp(reviewRequest.userId, 10, 'bar_posted');
      
      // Notify the user
      await storage.createNotification({
        userId: reviewRequest.userId,
        type: "system",
        message: "Your bar has been approved and posted!",
        barId: bar.id,
      });
      
      res.json({ success: true, bar });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reject AI review request
  app.post("/api/admin/ai-review-requests/:id/reject", isAdmin, async (req, res) => {
    try {
      const { reviewNotes } = req.body;
      const requestId = req.params.id;
      
      const [reviewRequest] = await db.select().from(aiReviewRequests).where(eq(aiReviewRequests.id, requestId));
      if (!reviewRequest) {
        return res.status(404).json({ message: "Review request not found" });
      }
      
      if (reviewRequest.status !== "pending") {
        return res.status(400).json({ message: "This request has already been processed" });
      }
      
      // Update the review request status
      await db.update(aiReviewRequests).set({
        status: "rejected",
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
        reviewNotes,
      }).where(eq(aiReviewRequests.id, requestId));
      
      // Notify the user
      await storage.createNotification({
        userId: reviewRequest.userId,
        type: "system",
        message: reviewNotes 
          ? `Your bar review request was not approved: ${reviewNotes}`
          : "Your bar review request was not approved.",
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Maintenance status routes (public endpoint)
  app.get("/api/maintenance", async (req, res) => {
    try {
      const status = await storage.getMaintenanceStatus();
      res.json(status || { isActive: false });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin maintenance controls
  app.post("/api/admin/maintenance", isAdmin, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }
      const status = await storage.activateMaintenance(message, req.user!.id);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/maintenance", isAdmin, async (req, res) => {
    try {
      await storage.clearMaintenance();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Owner-only: Reset bar authentication sequence
  app.post("/api/admin/reset-bar-sequence", isOwner, async (req, res) => {
    try {
      console.log("🔄 Starting bar sequence reset...");
      
      // Get all locked bars ordered by creation date
      const lockedBars = await db
        .select()
        .from(bars)
        .where(eq(bars.isLocked, true))
        .orderBy(asc(bars.createdAt));
      
      if (lockedBars.length === 0) {
        return res.json({ message: "No locked bars found", count: 0 });
      }
      
      // Reset sequence counter
      await db
        .update(barSequence)
        .set({ currentValue: 0 })
        .where(eq(barSequence.id, "singleton"));
      
      // Renumber all bars
      for (let i = 0; i < lockedBars.length; i++) {
        const bar = lockedBars[i];
        const sequenceNum = i + 1;
        const proofBarId = `orphanbars-#${sequenceNum.toString().padStart(5, '0')}`;
        const proofHash = generateProofHash(bar.content, bar.createdAt, bar.userId, proofBarId);
        
        await db
          .update(bars)
          .set({ 
            proofBarId,
            proofHash,
          })
          .where(eq(bars.id, bar.id));
      }
      
      // Update sequence to final number
      await db
        .update(barSequence)
        .set({ currentValue: lockedBars.length })
        .where(eq(barSequence.id, "singleton"));
      
      res.json({ 
        message: `Renumbered ${lockedBars.length} bars`, 
        count: lockedBars.length,
        nextId: `orphanbars-#${(lockedBars.length + 1).toString().padStart(5, '0')}`
      });
      
    } catch (error: any) {
      console.error("❌ Failed to reset sequence:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Owner-only: Link a Supabase OAuth identity to an existing app user
  app.post("/api/admin/link-supabase", isOwner, async (req, res) => {
    try {
      const { username, supabaseId } = req.body;
      if (!username || !supabaseId) {
        return res.status(400).json({ message: "username and supabaseId are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if supabaseId is already linked to another user
      const existingBySupabaseId = await storage.getUserBySupabaseId(supabaseId);
      if (existingBySupabaseId && existingBySupabaseId.id !== user.id) {
        return res.status(409).json({ message: "Supabase ID is already linked to another user" });
      }

      await storage.linkSupabaseAccount(user.id, supabaseId);
      const updatedUser = await storage.getUser(user.id);
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword, message: `Supabase account linked to ${username}` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin+ middleware - for elevated admins (between admin and owner)
  const isAdminPlus: typeof isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() && req.user?.isAdminPlus) {
      return next();
    }
    return res.status(403).json({ message: "Admin+ access required" });
  };

  // Admin+ or Owner middleware - for features accessible to both
  const isAdminPlusOrOwner: typeof isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() && (req.user?.isAdminPlus || req.user?.isOwner)) {
      return next();
    }
    return res.status(403).json({ message: "Admin+ or owner access required" });
  };

  // Get all custom achievements (Admin+ or Owner)
  app.get("/api/admin/achievements/custom", isAdminPlusOrOwner, async (req, res) => {
    try {
      const achievements = await storage.getCustomAchievements();
      res.json(achievements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get pending achievements for approval (Owner only)
  app.get("/api/admin/achievements/pending", isOwner, async (req, res) => {
    try {
      const pending = await storage.getPendingAchievements();
      res.json(pending);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create achievement - Admin+ creates as "pending", Owner creates as "approved"
  app.post("/api/admin/achievements/custom", isAdminPlusOrOwner, async (req, res) => {
    try {
      const { name, emoji, description, rarity, conditionType, threshold } = req.body;
      
      if (!name || !emoji || !description || !conditionType) {
        return res.status(400).json({ message: "Name, emoji, description, and condition type are required" });
      }

      const validConditions = [
        "bars_posted", "likes_received", "followers_count", "following_count",
        "single_bar_likes", "single_bar_comments", "single_bar_bookmarks",
        "comments_made", "bars_adopted", "controversial_bar", "night_owl", "early_bird"
      ];
      if (!validConditions.includes(conditionType)) {
        return res.status(400).json({ message: "Invalid condition type" });
      }

      const validRarities = ["common", "uncommon", "rare", "epic", "legendary"];
      if (rarity && !validRarities.includes(rarity)) {
        return res.status(400).json({ message: "Invalid rarity" });
      }

      // Admin+ creates as pending, Owner creates as approved
      const approvalStatus = req.user!.isOwner ? "approved" : "pending";

      const achievement = await storage.createCustomAchievement({
        name: name.trim(),
        emoji: emoji.trim(),
        description: description.trim(),
        rarity: rarity || "common",
        conditionType,
        threshold: threshold || 1,
        approvalStatus,
        createdBy: req.user!.id,
      });

      res.json({ ...achievement, message: approvalStatus === "pending" ? "Achievement submitted for approval" : "Achievement created" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Approve achievement (Owner only)
  app.post("/api/admin/achievements/:id/approve", isOwner, async (req, res) => {
    try {
      const achievement = await storage.approveAchievement(req.params.id);
      if (!achievement) {
        return res.status(404).json({ message: "Achievement not found" });
      }
      res.json({ ...achievement, message: "Achievement approved and now active" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reject achievement (Owner only)
  app.post("/api/admin/achievements/:id/reject", isOwner, async (req, res) => {
    try {
      const achievement = await storage.rejectAchievement(req.params.id);
      if (!achievement) {
        return res.status(404).json({ message: "Achievement not found" });
      }
      res.json({ ...achievement, message: "Achievement rejected" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/achievements/custom/:id", isOwner, async (req, res) => {
    try {
      const { name, emoji, description, rarity, conditionType, threshold, isActive } = req.body;
      const updates: any = {};

      if (name !== undefined) updates.name = name.trim();
      if (emoji !== undefined) updates.emoji = emoji.trim();
      if (description !== undefined) updates.description = description.trim();
      if (rarity !== undefined) updates.rarity = rarity;
      if (conditionType !== undefined) updates.conditionType = conditionType;
      if (threshold !== undefined) updates.threshold = threshold;
      if (isActive !== undefined) updates.isActive = isActive;

      const achievement = await storage.updateCustomAchievement(req.params.id, updates);
      if (!achievement) {
        return res.status(404).json({ message: "Achievement not found" });
      }
      res.json(achievement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/achievements/custom/:id", isOwner, async (req, res) => {
    try {
      await storage.deleteCustomAchievement(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Achievement badge image routes (owner only)
  app.get("/api/achievements/badge-images", async (_req, res) => {
    try {
      const images = await storage.getAllAchievementBadgeImages();
      res.json(images);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/achievements/:id/badge-image", isOwner, async (req, res) => {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ message: "Image URL is required" });
      }
      await storage.setAchievementBadgeImage(req.params.id, imageUrl);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/achievements/:id/badge-image", isOwner, async (req, res) => {
    try {
      await storage.deleteAchievementBadgeImage(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Custom tag routes
  app.get("/api/tags/custom", async (_req, res) => {
    try {
      const tags = await storage.getActiveCustomTags();
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/tags", isOwner, async (_req, res) => {
    try {
      const tags = await storage.getAllCustomTags();
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/tags", isOwner, async (req, res) => {
    try {
      const { name, displayName, imageUrl, animation, color, backgroundColor } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Tag name is required" });
      }
      
      const existing = await storage.getCustomTagByName(name);
      if (existing) {
        return res.status(400).json({ message: "A tag with this name already exists" });
      }
      
      const tag = await storage.createCustomTag({
        name: name.trim(),
        displayName: displayName?.trim() || null,
        imageUrl: imageUrl || null,
        animation: animation || "none",
        color: color || null,
        backgroundColor: backgroundColor || null,
        createdBy: req.user!.id,
      });
      res.json(tag);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/tags/:id", isOwner, async (req, res) => {
    try {
      const { name, displayName, imageUrl, animation, color, backgroundColor, isActive } = req.body;
      const updates: any = {};
      
      if (name !== undefined) updates.name = name;
      if (displayName !== undefined) updates.displayName = displayName;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (animation !== undefined) updates.animation = animation;
      if (color !== undefined) updates.color = color;
      if (backgroundColor !== undefined) updates.backgroundColor = backgroundColor;
      if (isActive !== undefined) updates.isActive = isActive;
      
      const tag = await storage.updateCustomTag(req.params.id, updates);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json(tag);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/tags/:id", isOwner, async (req, res) => {
    try {
      const success = await storage.deleteCustomTag(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public custom categories endpoint
  app.get("/api/categories/custom", async (_req, res) => {
    try {
      const categories = await storage.getActiveCustomCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin custom categories CRUD
  app.get("/api/admin/categories", isOwner, async (_req, res) => {
    try {
      const categories = await storage.getAllCustomCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/categories", isOwner, async (req, res) => {
    try {
      const { name, displayName, imageUrl, color, backgroundColor, sortOrder } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Category name is required" });
      }
      
      const existing = await storage.getCustomCategoryByName(name);
      if (existing) {
        return res.status(400).json({ message: "A category with this name already exists" });
      }
      
      const category = await storage.createCustomCategory({
        name: name.trim(),
        displayName: displayName?.trim() || null,
        imageUrl: imageUrl || null,
        color: color || null,
        backgroundColor: backgroundColor || null,
        sortOrder: sortOrder ?? 0,
        createdBy: req.user!.id,
      });
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/categories/:id", isOwner, async (req, res) => {
    try {
      const { name, displayName, imageUrl, color, backgroundColor, sortOrder, isActive } = req.body;
      const updates: any = {};
      
      if (name !== undefined) updates.name = name;
      if (displayName !== undefined) updates.displayName = displayName;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (color !== undefined) updates.color = color;
      if (backgroundColor !== undefined) updates.backgroundColor = backgroundColor;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      if (isActive !== undefined) updates.isActive = isActive;
      
      const category = await storage.updateCustomCategory(req.params.id, updates);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/categories/:id", isOwner, async (req, res) => {
    try {
      const success = await storage.deleteCustomCategory(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Profile Badges Routes
  
  // Public: Get all active badges
  app.get("/api/badges", async (_req, res) => {
    try {
      const badges = await storage.getProfileBadges(false);
      res.json(badges);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get current user's badge collection
  app.get("/api/badges/my-collection", isAuthenticated, async (req, res) => {
    try {
      const userBadges = await storage.getUserBadges(req.user!.id);
      res.json(userBadges);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get displayed badges for any user (public)
  app.get("/api/users/:userId/displayed-badges", async (req, res) => {
    try {
      console.log("[BADGES] Fetching displayed badges for userId:", req.params.userId);
      const badges = await storage.getUserDisplayedBadges(req.params.userId);
      console.log("[BADGES] Returned badges:", badges.length, badges.map(b => b.displayName));
      res.json(badges);
    } catch (error: any) {
      console.error("[BADGES] Error fetching badges:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Debug endpoint to check badge status for current user
  app.get("/api/debug/my-badges", isAuthenticated, async (req, res) => {
    try {
      // First try to get raw data to see what's stored
      const rawResult = await db
        .select({ displayedBadges: sql`displayed_badges::text` })
        .from(users)
        .where(eq(users.id, req.user!.id));
      
      const rawValue = rawResult[0]?.displayedBadges || 'null';
      
      let displayedBadgeIds: string[] = [];
      let resolvedBadges: any[] = [];
      let error = null;
      
      try {
        const user = await storage.getUser(req.user!.id);
        displayedBadgeIds = user?.displayedBadges || [];
        resolvedBadges = await storage.getUserDisplayedBadges(req.user!.id);
      } catch (e: any) {
        error = e.message;
      }
      
      res.json({
        userId: req.user!.id,
        rawDatabaseValue: rawValue,
        displayedBadgeIds,
        resolvedBadgesCount: resolvedBadges.length,
        resolvedBadges: resolvedBadges.map(b => ({ id: b.id, name: b.displayName })),
        error,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Fix corrupted displayedBadges for current user (GET for easy phone access)
  app.get("/api/debug/fix-my-badges", isAuthenticated, async (req, res) => {
    try {
      // Reset displayedBadges to empty array
      await db.update(users).set({ displayedBadges: [] }).where(eq(users.id, req.user!.id));
      res.send(`
        <html>
          <body style="font-family: sans-serif; padding: 20px; background: #1a1a2e; color: white;">
            <h1>✅ Badges Fixed!</h1>
            <p>Your badge data has been reset.</p>
            <p>Now go back to the app and select your badges again on the <strong>Badges</strong> page.</p>
            <a href="/" style="color: #8b5cf6;">Go to Home</a>
          </body>
        </html>
      `);
    } catch (error: any) {
      res.status(500).send(`Error: ${error.message}`);
    }
  });

  // Set displayed badges for current user (accepts both profile badges AND achievement IDs)
  app.patch("/api/badges/displayed", isAuthenticated, async (req, res) => {
    try {
      const { badgeIds } = req.body;
      if (!Array.isArray(badgeIds)) {
        return res.status(400).json({ message: "badgeIds must be an array" });
      }
      if (badgeIds.length > 5) {
        return res.status(400).json({ message: "Maximum 5 badges can be displayed" });
      }
      // Verify all badges are valid - can be profile badges OR achievement IDs
      const userBadges = await storage.getUserBadges(req.user!.id);
      const ownedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));
      const customAchievements = await storage.getActiveCustomAchievements();
      const validCustomIds = new Set(customAchievements.map(a => `custom_${a.id}`));
      
      for (const badgeId of badgeIds) {
        const isBuiltInAchievement = !!ACHIEVEMENTS[badgeId as keyof typeof ACHIEVEMENTS];
        const isCustomAchievement = validCustomIds.has(badgeId);
        const isProfileBadge = ownedBadgeIds.has(badgeId);
        
        if (!isBuiltInAchievement && !isCustomAchievement && !isProfileBadge) {
          return res.status(400).json({ message: `Invalid badge ID: ${badgeId}` });
        }
      }
      await storage.setDisplayedBadges(req.user!.id, badgeIds);
      res.json({ success: true, displayedBadges: badgeIds });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Get all badges (including inactive)
  app.get("/api/admin/badges", isOwner, async (_req, res) => {
    try {
      const badges = await storage.getProfileBadges(true);
      res.json(badges);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Create a new badge
  app.post("/api/admin/badges", isOwner, async (req, res) => {
    try {
      const { name, displayName, description, imageUrl, emoji, color, backgroundColor, borderColor, animation, rarity, linkedAchievementId } = req.body;
      if (!name || !displayName) {
        return res.status(400).json({ message: "Name and display name are required" });
      }
      const badge = await storage.createProfileBadge({
        name: name.trim().toLowerCase(),
        displayName: displayName.trim(),
        description: description || null,
        imageUrl: imageUrl || null,
        emoji: emoji || null,
        color: color || null,
        backgroundColor: backgroundColor || null,
        borderColor: borderColor || null,
        animation: animation || "none",
        rarity: rarity || "common",
        linkedAchievementId: linkedAchievementId || null,
        createdBy: req.user!.id,
      });
      res.json(badge);
    } catch (error: any) {
      if (error.message?.includes("unique")) {
        return res.status(400).json({ message: "A badge with this name already exists" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Update a badge
  app.patch("/api/admin/badges/:id", isOwner, async (req, res) => {
    try {
      const updates: any = {};
      const fields = ['name', 'displayName', 'description', 'imageUrl', 'emoji', 'color', 'backgroundColor', 'borderColor', 'animation', 'rarity', 'isActive', 'linkedAchievementId'];
      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });
      const badge = await storage.updateProfileBadge(req.params.id, updates);
      if (!badge) {
        return res.status(404).json({ message: "Badge not found" });
      }
      res.json(badge);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Delete a badge
  app.delete("/api/admin/badges/:id", isOwner, async (req, res) => {
    try {
      await storage.deleteProfileBadge(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Grant badge to a user
  app.post("/api/admin/badges/:badgeId/grant/:userId", isOwner, async (req, res) => {
    try {
      const { badgeId, userId } = req.params;
      const badge = await storage.getProfileBadgeById(badgeId);
      if (!badge) {
        return res.status(404).json({ message: "Badge not found" });
      }
      const hasAlready = await storage.userHasBadge(userId, badgeId);
      if (hasAlready) {
        return res.status(400).json({ message: "User already has this badge" });
      }
      const userBadge = await storage.grantBadgeToUser(userId, badgeId, "owner_gift", req.user!.id);
      
      // Send notification to user about receiving the badge
      await storage.createNotification({
        userId,
        type: "badge_granted",
        message: `The king has blessed you with a one of a kind custom badge "${badge.displayName}". Enjoy.`,
      });
      
      res.json(userBadge);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Revoke badge from a user
  app.delete("/api/admin/badges/:badgeId/revoke/:userId", isOwner, async (req, res) => {
    try {
      const { badgeId, userId } = req.params;
      await storage.revokeBadgeFromUser(userId, badgeId);
      // Also remove from displayed badges
      const user = await storage.getUser(userId);
      if (user?.displayedBadges?.includes(badgeId)) {
        const newDisplayed = user.displayedBadges.filter(id => id !== badgeId);
        await storage.setDisplayedBadges(userId, newDisplayed);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Get users who have a specific badge
  app.get("/api/admin/badges/:badgeId/users", isOwner, async (req, res) => {
    try {
      // For now, just return badge info - could expand to list users with this badge
      const badge = await storage.getProfileBadgeById(req.params.badgeId);
      if (!badge) {
        return res.status(404).json({ message: "Badge not found" });
      }
      res.json(badge);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin archive routes (soft-deleted bars)
  app.get("/api/admin/archive", isAdmin, async (req, res) => {
    try {
      const deletedBars = await storage.getDeletedBars();
      res.json(deletedBars);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/archive/:id/restore", isAdmin, async (req, res) => {
    try {
      const bar = await storage.restoreBar(req.params.id);
      if (!bar) {
        return res.status(404).json({ message: "Bar not found in archive" });
      }
      res.json(bar);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Debug log routes (admin or owner)
  const isAdminOrOwner: typeof isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() && (req.user?.isAdmin || req.user?.isAdminPlus || req.user?.isOwner)) {
      return next();
    }
    return res.status(403).json({ message: "Admin or owner access required" });
  };

  app.get("/api/admin/debug-logs", isAdminPlusOrOwner, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const action = req.query.action as string | undefined;
      const logs = await storage.getDebugLogs(limit, action);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/debug-logs", isOwner, async (req, res) => {
    try {
      await storage.clearDebugLogs();
      res.json({ success: true, message: "Debug logs cleared" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Online status routes
  app.get("/api/online/count", async (req, res) => {
    try {
      const count = await storage.getOnlineUsersCount();
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/online/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      if (!["online", "offline", "busy"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      await storage.updateOnlineStatus(req.user!.id, status);
      res.json({ status });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/online/heartbeat", isAuthenticated, async (req, res) => {
    try {
      await storage.updateLastSeen(req.user!.id);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Friendship routes
  app.post("/api/friends/request/:userId", isAuthenticated, async (req, res) => {
    try {
      if (req.user!.id === req.params.userId) {
        return res.status(400).json({ message: "Cannot send friend request to yourself" });
      }
      const friendship = await storage.sendFriendRequest(req.user!.id, req.params.userId);
      await storage.createNotification({
        userId: req.params.userId,
        type: "friend_request",
        actorId: req.user!.id,
        message: `@${req.user!.username} sent you a friend request`,
      });
      res.json(friendship);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/friends/accept/:friendshipId", isAuthenticated, async (req, res) => {
    try {
      const friendship = await storage.acceptFriendRequest(req.params.friendshipId, req.user!.id);
      if (!friendship) {
        return res.status(404).json({ message: "Friend request not found" });
      }
      await storage.createNotification({
        userId: friendship.requesterId,
        type: "friend_accepted",
        actorId: req.user!.id,
        message: `@${req.user!.username} accepted your friend request`,
      });
      res.json(friendship);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/friends/decline/:friendshipId", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.declineFriendRequest(req.params.friendshipId, req.user!.id);
      if (!success) {
        return res.status(404).json({ message: "Friend request not found" });
      }
      res.json({ message: "Friend request declined" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/friends/:friendId", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.removeFriend(req.user!.id, req.params.friendId);
      if (!success) {
        return res.status(404).json({ message: "Friendship not found" });
      }
      res.json({ message: "Friend removed" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends", isAuthenticated, async (req, res) => {
    try {
      const friends = await storage.getFriends(req.user!.id);
      res.json(friends.map(({ password: _, ...f }) => f));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends/requests", isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getPendingRequests(req.user!.id);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends/status/:userId", isAuthenticated, async (req, res) => {
    try {
      const status = await storage.getFriendshipStatus(req.user!.id, req.params.userId);
      res.json(status || { status: "none" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Direct message routes
  app.post("/api/messages/:receiverId", isAuthenticated, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ message: "Message content required" });
      }
      
      const receiver = await storage.getUser(req.params.receiverId);
      if (!receiver) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const messagePrivacy = receiver.messagePrivacy || "friends_only";
      if (messagePrivacy === "friends_only") {
        const friendshipStatus = await storage.getFriendshipStatus(req.user!.id, req.params.receiverId);
        if (!friendshipStatus || friendshipStatus.status !== "accepted") {
          return res.status(403).json({ message: "This user only accepts messages from friends" });
        }
      }
      
      const message = await storage.sendMessage(req.user!.id, req.params.receiverId, content.trim());
      await storage.createNotification({
        userId: req.params.receiverId,
        type: "message",
        actorId: req.user!.id,
        message: `@${req.user!.username} sent you a message`,
      });
      notifyNewMessage(req.params.receiverId, {
        ...message,
        sender: { id: req.user!.id, username: req.user!.username },
      });
      res.json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/messages/:userId", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getConversation(req.user!.id, req.params.userId, limit);
      await storage.markMessagesRead(req.user!.id, req.params.userId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const conversations = await storage.getConversations(req.user!.id);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/messages/unread/count", isAuthenticated, async (req, res) => {
    try {
      const count = await storage.getUnreadMessageCount(req.user!.id);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Owner Console Routes
  app.post("/api/owner/console/query", isOwner, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query is required" });
      }

      const normalizedQuery = query.trim().toLowerCase();
      
      // Only allow SELECT queries for safety
      if (!normalizedQuery.startsWith('select')) {
        return res.status(400).json({ 
          message: "Only SELECT queries are allowed. Use specific action endpoints for modifications." 
        });
      }

      // Block multiple statements (semicolon followed by anything except whitespace/end)
      const semicolonCheck = query.replace(/;\s*$/, ''); // Remove trailing semicolon
      if (semicolonCheck.includes(';')) {
        return res.status(400).json({ 
          message: "Multiple statements are not allowed" 
        });
      }

      // Block dangerous keywords anywhere in the query (case insensitive)
      const dangerousKeywords = [
        'drop', 'delete', 'truncate', 'update', 'insert', 'alter', 'create',
        'grant', 'revoke', 'execute', 'exec', 'pg_sleep', 'copy', 'load_file',
        'into', 'benchmark', 'information_schema', 'pg_catalog', 'pg_proc', 
        'current_setting', 'set_config', 'vacuum', 'analyze', 'reindex'
      ];
      
      for (const keyword of dangerousKeywords) {
        // Match keyword as whole word (not part of column name)
        const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (wordBoundaryRegex.test(query)) {
          return res.status(400).json({ 
            message: `Query contains forbidden keyword: ${keyword}` 
          });
        }
      }

      // Block SQL comments
      if (query.includes('--') || query.includes('/*') || query.includes('*/')) {
        return res.status(400).json({ 
          message: "SQL comments are not allowed" 
        });
      }

      // Add LIMIT if not present
      let safeQuery = query.replace(/;\s*$/, '').trim(); // Remove trailing semicolon
      if (!normalizedQuery.includes('limit')) {
        safeQuery = safeQuery + ' LIMIT 100';
      }

      // Log the query
      await storage.createDebugLog({
        action: 'owner_console_query',
        userId: req.user!.id,
        details: JSON.stringify({ query: safeQuery }),
      });

      const result = await db.execute(safeQuery as any);
      res.json({ 
        success: true, 
        rows: result.rows || result,
        rowCount: result.rowCount || (result.rows?.length ?? 0)
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/owner/console/action", isOwner, async (req, res) => {
    try {
      const { action, params } = req.body;
      
      // Log the action
      await storage.createDebugLog({
        action: 'owner_console_action',
        userId: req.user!.id,
        details: JSON.stringify({ action, params }),
      });

      let result: any;
      
      switch (action) {
        case 'clear_debug_logs':
          await storage.clearDebugLogs();
          result = { message: "Debug logs cleared" };
          break;
          
        case 'get_user_by_username':
          if (!params?.username) {
            return res.status(400).json({ message: "Username required" });
          }
          const user = await storage.getUserByUsername(params.username);
          if (!user) {
            return res.status(404).json({ message: "User not found" });
          }
          const { password: _, ...safeUser } = user;
          result = safeUser;
          break;
          
        
        case 'promote_admin':
          if (!params?.userId) {
            return res.status(400).json({ message: "User ID required" });
          }
          await storage.updateUser(params.userId, { isAdmin: true });
          result = { message: "User promoted to admin" };
          break;
          
        case 'demote_admin':
          if (!params?.userId) {
            return res.status(400).json({ message: "User ID required" });
          }
          await storage.updateUser(params.userId, { isAdmin: false, isAdminPlus: false });
          result = { message: "User demoted from admin" };
          break;
          
        case 'delete_user':
          if (!params?.userId) {
            return res.status(400).json({ message: "User ID required" });
          }
          if (params.userId === req.user!.id) {
            return res.status(400).json({ message: "Cannot delete yourself" });
          }
          await storage.deleteUser(params.userId);
          result = { message: "User deleted" };
          break;

        case 'reset_user_password':
          if (!params?.userId || !params?.newPassword) {
            return res.status(400).json({ message: "User ID and new password required" });
          }
          const hashed = await hashPassword(params.newPassword);
          await storage.updateUser(params.userId, { password: hashed });
          result = { message: "Password reset" };
          break;
          
        default:
          return res.status(400).json({ message: "Unknown action: " + action });
      }

      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/owner/console/stats", isOwner, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const totalUsers = allUsers.length;
      const bannedUsers = 0; // Ban feature not yet implemented
      const admins = allUsers.filter(u => u.isAdmin || u.isAdminPlus).length;
      const onlineNow = allUsers.filter(u => u.onlineStatus === 'online').length;
      
      // Get bar count using a simple query
      const [barCount] = await db.select({ count: eq(bars.id, bars.id) }).from(bars);
      
      res.json({
        totalUsers,
        bannedUsers,
        admins,
        onlineNow,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Owner-only RLS sanity check
  app.get("/api/owner/rls-status", isOwner, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          tablename,
          CASE WHEN rowsecurity THEN 'enabled' ELSE 'disabled' END as rls_status,
          (
            SELECT COUNT(*) 
            FROM pg_policies 
            WHERE pg_policies.tablename = pg_tables.tablename
            AND pg_policies.schemaname = 'public'
          ) as policy_count
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
          'achievement_badge_images',
          'ai_review_requests',
          'ai_settings',
          'bar_sequence',
          'debug_logs',
          'flagged_phrases',
          'maintenance_status',
          'password_reset_codes',
          'protected_bars',
          'sessions',
          'site_settings',
          'users',
          'verification_codes'
        )
        ORDER BY tablename;
      `);

      res.json({ tables: result.rows });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Debug endpoint to check user's likes (owner only)
  app.get("/api/debug/my-likes", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const username = req.user!.username;
      
      // Get all likes for this user
      const userLikes = await db.select().from(likes).where(eq(likes.userId, userId));
      
      // Get total like count in system
      const [totalLikesResult] = await db.select({ count: count() }).from(likes);
      
      res.json({
        userId,
        username,
        yourLikeCount: userLikes.length,
        yourLikes: userLikes.map(l => ({ barId: l.barId, createdAt: l.createdAt })),
        totalLikesInSystem: totalLikesResult?.count || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Protected Bars routes (Owner only)
  app.get("/api/protected-bars", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.isOwner) {
        return res.status(403).json({ message: "Owner access required" });
      }
      const protectedBars = await storage.getProtectedBars();
      res.json(protectedBars);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/protected-bars", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.isOwner) {
        return res.status(403).json({ message: "Owner access required" });
      }
      const { content, notes, similarityThreshold } = req.body;
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ message: "Content is required" });
      }
      const threshold = typeof similarityThreshold === 'number' ? Math.min(100, Math.max(0, similarityThreshold)) : 80;
      const protectedBar = await storage.createProtectedBar({
        content: content.trim(),
        notes: notes?.trim() || null,
        similarityThreshold: threshold,
        createdBy: req.user.id,
      });
      res.json(protectedBar);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/protected-bars/:id", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.isOwner) {
        return res.status(403).json({ message: "Owner access required" });
      }
      const deleted = await storage.deleteProtectedBar(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Protected bar not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Settings routes (Owner only)
  app.get("/api/ai-settings", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.isOwner) {
        return res.status(403).json({ message: "Owner access required" });
      }
      const settings = await storage.getAISettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/ai-settings", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.isOwner) {
        return res.status(403).json({ message: "Owner access required" });
      }
      const updates = req.body;
      const settings = await storage.updateAISettings(updates, req.user.id);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public endpoint to check which AI features are enabled
  app.get("/api/ai-features", async (req, res) => {
    try {
      const settings = await storage.getAISettings();
      res.json({
        moderation: settings.moderationEnabled,
        styleAnalysis: settings.styleAnalysisEnabled,
        orphieChat: settings.orphieChatEnabled,
        barExplanations: settings.barExplanationsEnabled,
        rhymeSuggestions: settings.rhymeSuggestionsEnabled,
        orphieGreeting: settings.orphieGreeting,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ Notebook Routes ============
  
  // Get all notebooks for current user
  app.get("/api/notebooks", isAuthenticated, async (req, res) => {
    try {
      const notebooks = await storage.getNotebooks(req.user!.id);
      res.json(notebooks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single notebook
  app.get("/api/notebooks/:id", isAuthenticated, async (req, res) => {
    try {
      const notebook = await storage.getNotebook(req.params.id, req.user!.id);
      if (!notebook) {
        return res.status(404).json({ message: "Notebook not found" });
      }
      res.json(notebook);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create notebook
  app.post("/api/notebooks", isAuthenticated, async (req, res) => {
    try {
      const { title, content } = req.body;
      const notebook = await storage.createNotebook({
        userId: req.user!.id,
        title: title || "Untitled",
        content: content || "",
      });
      res.status(201).json(notebook);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update notebook
  app.patch("/api/notebooks/:id", isAuthenticated, async (req, res) => {
    try {
      const { title, content } = req.body;
      const notebook = await storage.updateNotebook(req.params.id, req.user!.id, { title, content });
      if (!notebook) {
        return res.status(404).json({ message: "Notebook not found" });
      }
      res.json(notebook);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete notebook
  app.delete("/api/notebooks/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteNotebook(req.params.id, req.user!.id);
      if (!deleted) {
        return res.status(404).json({ message: "Notebook not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Leaderboard - Top users by XP
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const topUsers = await db
        .select({
          id: users.id,
          username: users.username,
          xp: users.xp,
          level: users.level,
          avatarUrl: users.avatarUrl,
          displayedBadges: users.displayedBadges,
        })
        .from(users)
        .orderBy(sql`${users.xp} DESC`)
        .limit(limit);
      
      res.json(topUsers);
    } catch (error: any) {
      console.error("Leaderboard error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Recent public activity (likes, comments, new bars)
  app.get("/api/activity/recent", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
      
      // Get recent likes with user and bar info
      const recentLikes = await db.execute(sql`
        SELECT 
          'like' as type,
          l.id,
          l.created_at as "createdAt",
          u.username as "actorUsername",
          u.avatar_url as "actorAvatar",
          b.id as "barId",
          SUBSTRING(b.content, 1, 50) as "barPreview",
          bu.username as "barAuthor"
        FROM likes l
        JOIN users u ON l.user_id = u.id
        JOIN bars b ON l.bar_id = b.id
        JOIN users bu ON b.user_id = bu.id
        WHERE b.moderation_status = 'approved'
        ORDER BY l.created_at DESC
        LIMIT ${limit}
      `);

      // Get recent comments
      const recentComments = await db.execute(sql`
        SELECT 
          'comment' as type,
          c.id,
          c.created_at as "createdAt",
          u.username as "actorUsername",
          u.avatar_url as "actorAvatar",
          b.id as "barId",
          SUBSTRING(b.content, 1, 50) as "barPreview",
          bu.username as "barAuthor"
        FROM comments c
        JOIN users u ON c.user_id = u.id
        JOIN bars b ON c.bar_id = b.id
        JOIN users bu ON b.user_id = bu.id
        WHERE b.moderation_status = 'approved'
        ORDER BY c.created_at DESC
        LIMIT ${limit}
      `);

      // Get recent bars posted
      const recentBars = await db.execute(sql`
        SELECT 
          'post' as type,
          b.id,
          b.created_at as "createdAt",
          u.username as "actorUsername",
          u.avatar_url as "actorAvatar",
          b.id as "barId",
          SUBSTRING(b.content, 1, 50) as "barPreview",
          u.username as "barAuthor"
        FROM bars b
        JOIN users u ON b.user_id = u.id
        WHERE b.moderation_status = 'approved'
        ORDER BY b.created_at DESC
        LIMIT ${limit}
      `);

      // Combine and sort by time
      const allActivity = [
        ...(recentLikes.rows || []),
        ...(recentComments.rows || []),
        ...(recentBars.rows || []),
      ].sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, limit);

      res.json(allActivity);
    } catch (error: any) {
      console.error("Recent activity error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/community/stats", async (_req, res) => {
    try {
      const statsResult = await db.execute(sql`
        SELECT
          COUNT(*)::int AS "totalBars",
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS "barsThisWeek",
          COUNT(DISTINCT user_id) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS "activeWritersMonth"
        FROM bars
        WHERE deleted_at IS NULL
          AND moderation_status = 'approved'
      `);

      const row = (statsResult.rows?.[0] as any) || {};

      res.json({
        totalBars: Number(row.totalBars) || 0,
        barsThisWeek: Number(row.barsThisWeek) || 0,
        activeWritersMonth: Number(row.activeWritersMonth) || 0,
      });
    } catch (error: any) {
      console.error("Community stats error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/community/spotlight", async (_req, res) => {
    try {
      const spotlightResult = await db.execute(sql`
        SELECT
          b.id,
          b.content,
          b.tags,
          b.created_at AS "createdAt",
          u.username,
          u.avatar_url AS "avatarUrl",
          COALESCE(COUNT(l.id), 0)::int AS "reactionCount"
        FROM bars b
        JOIN users u ON b.user_id = u.id
        LEFT JOIN likes l
          ON l.bar_id = b.id
          AND l.created_at >= NOW() - INTERVAL '7 days'
        WHERE b.deleted_at IS NULL
          AND b.permission_status != 'private'
          AND b.moderation_status = 'approved'
        GROUP BY b.id, u.username, u.avatar_url
        ORDER BY "reactionCount" DESC, b.created_at DESC
        LIMIT 1
      `);

      const row = (spotlightResult.rows?.[0] as any) || null;
      if (!row) {
        return res.json(null);
      }

      const snippet = stripHtmlToSnippet(String(row.content || ""), 180);
      const lines = snippet
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 2);
      const tags = Array.isArray(row.tags) ? row.tags : [];
      const themeTag = tags.find((tag: string) => tag.startsWith("theme:"));

      res.json({
        id: row.id,
        author: row.username,
        avatarUrl: row.avatarUrl,
        snippet,
        lines,
        titleLine: lines[0] || snippet,
        reactionCount: Number(row.reactionCount) || 0,
        theme: themeTag ? String(themeTag).replace("theme:", "") : "minimal",
        href: `/bars/${row.id}`,
      });
    } catch (error: any) {
      console.error("Community spotlight error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/community/now", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 8, 20);
      const queryLimit = Math.max(limit, 8);

      const recentLikes = await db.execute(sql`
        SELECT
          l.id,
          l.created_at AS "createdAt",
          u.username AS "actorUsername",
          b.id AS "barId",
          SUBSTRING(b.content, 1, 80) AS "barPreview"
        FROM likes l
        JOIN users u ON l.user_id = u.id
        JOIN bars b ON l.bar_id = b.id
        WHERE b.deleted_at IS NULL
          AND b.moderation_status = 'approved'
        ORDER BY l.created_at DESC
        LIMIT ${queryLimit}
      `);

      const recentComments = await db.execute(sql`
        SELECT
          c.id,
          c.created_at AS "createdAt",
          u.username AS "actorUsername",
          b.id AS "barId",
          SUBSTRING(b.content, 1, 80) AS "barPreview"
        FROM comments c
        JOIN users u ON c.user_id = u.id
        JOIN bars b ON c.bar_id = b.id
        WHERE b.deleted_at IS NULL
          AND b.moderation_status = 'approved'
        ORDER BY c.created_at DESC
        LIMIT ${queryLimit}
      `);

      const recentPosts = await db.execute(sql`
        SELECT
          b.id,
          b.created_at AS "createdAt",
          u.username AS "actorUsername",
          b.id AS "barId"
        FROM bars b
        JOIN users u ON b.user_id = u.id
        WHERE b.deleted_at IS NULL
          AND b.permission_status != 'private'
          AND b.moderation_status = 'approved'
        ORDER BY b.created_at DESC
        LIMIT ${queryLimit}
      `);

      const prompt = getCurrentPrompt();
      const promptEvent = {
        id: `prompt-${prompt.slug}`,
        type: "prompt",
        text: `New prompt: "${prompt.text}"`,
        href: `/prompts/${prompt.slug}`,
        createdAt: new Date().toISOString(),
      };

      const likeEvents = (recentLikes.rows || []).map((row: any) => {
        const snippet = stripHtmlToSnippet(String(row.barPreview || ""), 42);
        return {
          id: `like-${row.id}`,
          type: "reaction",
          text: `@${row.actorUsername} reacted 🔥 to "${snippet}"`,
          href: `/bars/${row.barId}`,
          createdAt: row.createdAt,
        };
      });

      const commentEvents = (recentComments.rows || []).map((row: any) => {
        const snippet = stripHtmlToSnippet(String(row.barPreview || ""), 42);
        return {
          id: `comment-${row.id}`,
          type: "comment",
          text: `@${row.actorUsername} jumped in on "${snippet}"`,
          href: `/bars/${row.barId}`,
          createdAt: row.createdAt,
        };
      });

      const postEvents = (recentPosts.rows || []).map((row: any) => ({
        id: `post-${row.id}`,
        type: "post",
        text: `@${row.actorUsername} just dropped a bar`,
        href: `/bars/${row.barId}`,
        createdAt: row.createdAt,
      }));

      const merged = [promptEvent, ...likeEvents, ...commentEvents, ...postEvents]
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, limit);

      res.json(merged);
    } catch (error: any) {
      console.error("Now activity error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/prompts", async (_req, res) => {
    try {
      const current = getCurrentPrompt();
      const prompts = await Promise.all(
        PROMPT_LIBRARY.map(async (prompt) => {
          const tag = `prompt:${prompt.slug}`;
          const promptBars = await storage.getBarsByTag(tag);
          return {
            ...prompt,
            tag,
            isCurrent: current.slug === prompt.slug,
            barsCount: promptBars.length,
          };
        }),
      );

      res.json(prompts);
    } catch (error: any) {
      console.error("Prompts list error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/prompts/current", async (_req, res) => {
    try {
      const current = getCurrentPrompt();
      const promptBars = await storage.getBarsByTag(current.tag);

      res.json({
        ...current,
        barsCount: promptBars.length,
        href: `/prompts/${current.slug}`,
      });
    } catch (error: any) {
      console.error("Current prompt error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/prompts/:slug/bars", async (req, res) => {
    try {
      const slug = String(req.params.slug || "").toLowerCase();
      const prompt = PROMPT_LIBRARY.find((entry) => entry.slug === slug);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const promptBars = await storage.getBarsByTag(`prompt:${slug}`);
      const userId = req.isAuthenticated() ? req.user!.id : undefined;

      const barsWithEngagement = await Promise.all(
        promptBars.map(async (bar) => {
          const likeCount = await storage.getLikeCount(bar.id);
          const liked = userId
            ? await storage.hasUserLiked(userId, bar.id)
            : false;
          const dislikeCount = await storage.getDislikeCount(bar.id);
          const disliked = userId
            ? await storage.hasUserDisliked(userId, bar.id)
            : false;

          return {
            ...bar,
            likeCount,
            liked,
            dislikeCount,
            disliked,
            quickReactions: getQuickReactionSummary(bar.id, userId),
          };
        }),
      );

      res.json({
        prompt: {
          ...prompt,
          tag: `prompt:${prompt.slug}`,
        },
        bars: barsWithEngagement,
      });
    } catch (error: any) {
      console.error("Prompt bars error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/challenges", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
      const challengeBars = (await storage.getBarsByTag("challenge")).filter(
        (bar: any) =>
          bar.permissionStatus !== "private" &&
          bar.moderationStatus === "approved",
      );
      const userId = req.isAuthenticated() ? req.user!.id : undefined;

      const enriched = await Promise.all(
        challengeBars.slice(0, limit).map(async (bar) => {
          const likeCount = await storage.getLikeCount(bar.id);
          const liked = userId
            ? await storage.hasUserLiked(userId, bar.id)
            : false;
          const dislikeCount = await storage.getDislikeCount(bar.id);
          const disliked = userId
            ? await storage.hasUserDisliked(userId, bar.id)
            : false;
          const responses = await storage.getAdoptionsByOriginal(bar.id);

          return {
            ...bar,
            likeCount,
            liked,
            dislikeCount,
            disliked,
            responseCount: responses.length,
            quickReactions: getQuickReactionSummary(bar.id, userId),
          };
        }),
      );

      res.json(enriched);
    } catch (error: any) {
      console.error("Challenges feed error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bars/:id/challenge", isAuthenticated, async (req, res) => {
    try {
      const active = req.body?.active;
      if (typeof active !== "boolean") {
        return res
          .status(400)
          .json({ message: "active (boolean) is required" });
      }

      const bar = await storage.getBarById(req.params.id);
      if (!bar) {
        return res.status(404).json({ message: "Bar not found" });
      }

      if (bar.userId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "You can only update your own bars" });
      }

      const currentTags = Array.isArray(bar.tags) ? [...bar.tags] : [];
      const hadChallenge = currentTags.some(
        (tag) => tag.toLowerCase() === "challenge",
      );
      const nextTags = active
        ? hadChallenge
          ? currentTags
          : [...currentTags, "challenge"]
        : currentTags.filter((tag) => tag.toLowerCase() !== "challenge");

      const nextPermissionStatus = active
        ? "open_adopt"
        : bar.permissionStatus === "open_adopt"
          ? "share_only"
          : bar.permissionStatus;

      const [updated] = await db
        .update(bars)
        .set({
          tags: nextTags,
          permissionStatus: nextPermissionStatus,
        })
        .where(eq(bars.id, req.params.id))
        .returning();

      res.json({ ...updated, isChallenge: active });
    } catch (error: any) {
      console.error("Challenge toggle error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bars/:id/respond", isAuthenticated, async (req, res) => {
    try {
      const { responseBarId } = req.body || {};
      if (!responseBarId) {
        return res.status(400).json({ message: "responseBarId is required" });
      }

      const originalBar = await storage.getBarById(req.params.id);
      if (!originalBar) {
        return res.status(404).json({ message: "Original bar not found" });
      }

      const isChallenge = (originalBar.tags || []).some(
        (tag) => tag.toLowerCase() === "challenge",
      );
      if (!isChallenge && originalBar.permissionStatus !== "open_adopt") {
        return res
          .status(403)
          .json({ message: "This bar is not open for responses" });
      }

      const responseBar = await storage.getBarById(String(responseBarId));
      if (!responseBar) {
        return res.status(404).json({ message: "Response bar not found" });
      }

      if (responseBar.userId !== req.user!.id) {
        return res.status(403).json({
          message: "You can only attach bars that belong to your account",
        });
      }

      if (responseBar.id === originalBar.id) {
        return res
          .status(400)
          .json({ message: "A bar cannot respond to itself" });
      }

      try {
        const adoption = await storage.createAdoption(
          originalBar.id,
          responseBar.id,
          req.user!.id,
        );

        if (originalBar.userId !== req.user!.id) {
          await storage.createNotification({
            userId: originalBar.userId,
            type: "challenge_response",
            actorId: req.user!.id,
            barId: originalBar.id,
            message: `@${req.user!.username} responded to your challenge`,
          });
        }

        return res.json(adoption);
      } catch (error: any) {
        if (String(error?.message || "").toLowerCase().includes("duplicate")) {
          return res
            .status(409)
            .json({ message: "This response is already attached" });
        }
        throw error;
      }
    } catch (error: any) {
      console.error("Challenge response error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars/:id/responses", async (req, res) => {
    try {
      const adoptions = await storage.getAdoptionsByOriginal(req.params.id);
      const userId = req.isAuthenticated() ? req.user!.id : undefined;

      const responses = await Promise.all(
        adoptions.map(async (adoption) => {
          const bar = await storage.getBarById(adoption.adoptedByBarId);
          if (!bar || bar.deletedAt) {
            return null;
          }

          const likeCount = await storage.getLikeCount(bar.id);
          const liked = userId
            ? await storage.hasUserLiked(userId, bar.id)
            : false;
          const dislikeCount = await storage.getDislikeCount(bar.id);
          const disliked = userId
            ? await storage.hasUserDisliked(userId, bar.id)
            : false;

          return {
            ...bar,
            likeCount,
            liked,
            dislikeCount,
            disliked,
            quickReactions: getQuickReactionSummary(bar.id, userId),
            responseId: adoption.id,
            respondedAt: adoption.createdAt,
          };
        }),
      );

      const cleanResponses = responses
        .filter(Boolean)
        .sort(
          (a: any, b: any) =>
            new Date(b.respondedAt).getTime() - new Date(a.respondedAt).getTime(),
        );

      res.json(cleanResponses);
    } catch (error: any) {
      console.error("Fetch responses error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars/:id/reactions", async (req, res) => {
    try {
      const userId = req.isAuthenticated() ? req.user!.id : undefined;
      const summary = getQuickReactionSummary(req.params.id, userId);
      res.json(summary);
    } catch (error: any) {
      console.error("Get quick reactions error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bars/:id/reactions/:type", isAuthenticated, async (req, res) => {
    try {
      const type = String(req.params.type || "").toLowerCase() as QuickReactionType;
      if (!QUICK_REACTION_TYPES.includes(type)) {
        return res.status(400).json({ message: "Invalid reaction type" });
      }

      const bar = await storage.getBarById(req.params.id);
      if (!bar) {
        return res.status(404).json({ message: "Bar not found" });
      }

      // Lightweight in-memory implementation for quick reactions.
      // TODO: Promote to persistent DB table when reaction analytics are finalized.
      const key = `${req.params.id}:${type}`;
      const voters = quickReactionStore.get(key) ?? new Set<string>();
      let reacted = false;

      if (voters.has(req.user!.id)) {
        voters.delete(req.user!.id);
      } else {
        voters.add(req.user!.id);
        reacted = true;
      }

      if (voters.size === 0) {
        quickReactionStore.delete(key);
      } else {
        quickReactionStore.set(key, voters);
      }

      if (reacted && bar.userId !== req.user!.id) {
        await storage.createNotification({
          userId: bar.userId,
          type: `quick_reaction_${type}`,
          actorId: req.user!.id,
          barId: bar.id,
          message: `@${req.user!.username} reacted ${QUICK_REACTION_EMOJIS[type]} to your bar`,
        });
      }

      const summary = getQuickReactionSummary(req.params.id, req.user!.id);
      res.json({
        type,
        reacted,
        count: summary[type].count,
        reactions: summary,
      });
    } catch (error: any) {
      console.error("Toggle quick reactions error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
