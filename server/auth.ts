import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const PgStore = connectPgSimple(session);

// Sentinel value for OAuth-only users - impossible to match via comparePasswords
const OAUTH_ONLY_PASSWORD_SENTINEL = "__OAUTH_ONLY_NO_PASSWORD__";

// Generate a secure session secret if not provided
function getOrGenerateSessionSecret(): string {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }
  
  console.warn("⚠️  SESSION_SECRET not set in environment. Generating a random secret.");
  console.warn("⚠️  Sessions will be invalidated when the server restarts.");
  console.warn("⚠️  Set SESSION_SECRET in your .env file for production use.");
  
  return randomBytes(32).toString("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(
  suppliedPassword: string,
  storedPassword: string
): Promise<boolean> {
  // OAuth-only users have no password and cannot login with username/password
  if (!storedPassword || storedPassword === OAUTH_ONLY_PASSWORD_SENTINEL) {
    return false;
  }
  
  // Handle malformed passwords (missing salt separator)
  if (!storedPassword.includes(".")) {
    return false;
  }
  
  const [hashedPassword, salt] = storedPassword.split(".");
  
  // Validate hex format
  if (!hashedPassword || !salt) {
    return false;
  }
  
  try {
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    
    // Ensure buffers are the same length before comparison
    if (hashedPasswordBuf.length !== suppliedPasswordBuf.length) {
      return false;
    }
    
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      bio: string | null;
      location: string | null;
      avatarUrl: string | null;
      membershipTier: string;
      membershipExpiresAt: Date | null;
      isAdmin: boolean;
      isOwner: boolean;
      emailVerified: boolean;
      usernameChangedAt: Date | null;
    }
  }
}

export const sessionParser = session({
  secret: getOrGenerateSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  store: new PgStore({
    conString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
    createTableIfMissing: true,
    tableName: "sessions",
  }),
});

export function setupAuth(app: Express) {
  app.use(sessionParser);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Try to find user by username first, then by email
        let user = await storage.getUserByUsername(username);
        if (!user && username.includes('@')) {
          user = await storage.getUserByEmail(username);
        }
        
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // Don't include password in session
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      done(error);
    }
  });
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Export sentinel value for use in routes
export { OAUTH_ONLY_PASSWORD_SENTINEL };
