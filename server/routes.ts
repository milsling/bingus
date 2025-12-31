import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import passport from "passport";
import { insertUserSchema, insertBarSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { sendVerificationEmail, generateVerificationCode } from "./email";

const verificationAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const attempts = verificationAttempts.get(email);
  
  if (!attempts) {
    verificationAttempts.set(email, { count: 1, lastAttempt: now });
    return true;
  }
  
  if (now - attempts.lastAttempt > LOCKOUT_MS) {
    verificationAttempts.set(email, { count: 1, lastAttempt: now });
    return true;
  }
  
  if (attempts.count >= MAX_ATTEMPTS) {
    return false;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

function clearRateLimit(email: string): void {
  verificationAttempts.delete(email);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  registerObjectStorageRoutes(app);

  // Auth routes
  app.post("/api/auth/send-code", async (req, res) => {
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

  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ message: "Email and code are required" });
      }

      if (!checkRateLimit(email)) {
        return res.status(429).json({ message: "Too many attempts. Please try again later." });
      }

      const isValid = await storage.verifyCode(email, code);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      clearRateLimit(email);
      res.json({ verified: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/signup", async (req, res, next) => {
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

      const { password: _, ...userWithoutPassword } = updatedUser!;
      req.login(userWithoutPassword, (err) => {
        if (err) {
          return next(err);
        }
        res.json(userWithoutPassword);
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
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

      const bar = await storage.createBar(result.data);
      res.json(bar);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const bars = await storage.getBars(limit);
      res.json(bars);
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

  app.delete("/api/bars/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteBar(req.params.id, req.user!.id);
      if (!success) {
        return res.status(404).json({ message: "Bar not found" });
      }
      res.json({ message: "Bar deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Profile routes
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

  app.patch("/api/users/me", isAuthenticated, async (req, res) => {
    try {
      const { bio, location, avatarUrl } = req.body;
      const updates: Record<string, any> = {};
      
      if (bio !== undefined) updates.bio = bio;
      if (location !== undefined) updates.location = location;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

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

  // Admin routes
  const isAdmin: typeof isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() && req.user?.isAdmin) {
      return next();
    }
    return res.status(403).json({ message: "Admin access required" });
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

  app.delete("/api/admin/bars/:id", isAdmin, async (req, res) => {
    try {
      const success = await storage.deleteBarAdmin(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Bar not found" });
      }
      res.json({ message: "Bar deleted by admin" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      if (req.params.id === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete yourself" });
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

  return httpServer;
}
