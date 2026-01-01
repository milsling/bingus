import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import passport from "passport";
import { insertUserSchema, insertBarSchema, updateBarSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { sendVerificationEmail, sendPasswordResetEmail, generateVerificationCode } from "./email";

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

      // Auto-follow Milsling (creator)
      const milsling = await storage.getUserByUsername("Milsling");
      if (milsling && milsling.id !== user.id) {
        await storage.followUser(user.id, milsling.id);
      }

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

  // Simple signup without email verification (temporary)
  app.post("/api/auth/signup-simple", async (req, res, next) => {
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

      // Auto-follow Milsling (creator)
      const milsling = await storage.getUserByUsername("Milsling");
      if (milsling && milsling.id !== user.id) {
        await storage.followUser(user.id, milsling.id);
      }

      const { password: _, ...userWithoutPassword } = user;
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

  // Password reset routes
  app.post("/api/auth/forgot-password", async (req, res) => {
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

  app.post("/api/auth/reset-password", async (req, res) => {
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
      
      // Notify followers about new bar
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

      const updates: Record<string, any> = {};
      if (result.data.content !== undefined) updates.content = result.data.content;
      if (result.data.explanation !== undefined) updates.explanation = result.data.explanation;
      if (result.data.category !== undefined) updates.category = result.data.category;
      if (result.data.tags !== undefined) updates.tags = result.data.tags;

      const bar = await storage.updateBar(req.params.id, req.user!.id, updates);
      if (!bar) {
        return res.status(404).json({ message: "Bar not found or you don't have permission" });
      }
      res.json(bar);
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

  // Like routes
  app.post("/api/bars/:id/like", isAuthenticated, async (req, res) => {
    try {
      const liked = await storage.toggleLike(req.user!.id, req.params.id);
      const count = await storage.getLikeCount(req.params.id);
      
      // Send notification if liked (not unliked) and not own bar
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
        }
      }
      
      res.json({ liked, count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bars/:id/likes", async (req, res) => {
    try {
      const count = await storage.getLikeCount(req.params.id);
      const liked = req.isAuthenticated() ? await storage.hasUserLiked(req.user!.id, req.params.id) : false;
      res.json({ count, liked });
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

  // Follow routes
  app.post("/api/users/:userId/follow", isAuthenticated, async (req, res) => {
    try {
      const followed = await storage.followUser(req.user!.id, req.params.userId);
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
