import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, generateProofHash } from "./storage";
import { setupAuth, isAuthenticated, hashPassword, sessionParser } from "./auth";
import { bars } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import passport from "passport";
import { insertUserSchema, insertBarSchema, updateBarSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { sendVerificationEmail, sendPasswordResetEmail, generateVerificationCode } from "./email";
import { setupWebSocket, notifyNewMessage } from "./websocket";

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
  setupWebSocket(httpServer, sessionParser);

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
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Session cleanup failed" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
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

      // Check for similar bars (duplicate detection)
      const similarBars = await storage.findSimilarBars(result.data.content, 0.8);
      const duplicateWarnings = similarBars.map(sb => ({
        proofBarId: sb.bar.proofBarId,
        permissionStatus: sb.bar.permissionStatus,
        similarity: Math.round(sb.similarity * 100),
      }));

      // Create the bar first
      const bar = await storage.createBar(result.data);
      
      // Generate proof-of-origin data
      const sequenceNum = await storage.getNextBarSequence();
      const proofBarId = `orphanbars-#${sequenceNum.toString().padStart(5, '0')}`;
      
      // Generate proof hash
      const proofHash = generateProofHash(bar.content, bar.createdAt, bar.userId, proofBarId);
      
      // Update bar with proof data
      await db.update(bars).set({ 
        proofBarId, 
        proofHash,
        permissionStatus: req.body.permissionStatus || "share_only"
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
      
      res.json({ 
        ...bar, 
        proofHash,
        duplicateWarnings: duplicateWarnings.length > 0 ? duplicateWarnings : undefined 
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

  // Dislike routes
  app.post("/api/bars/:id/dislike", isAuthenticated, async (req, res) => {
    try {
      const disliked = await storage.toggleDislike(req.user!.id, req.params.id);
      const count = await storage.getDislikeCount(req.params.id);
      const likeCount = await storage.getLikeCount(req.params.id);
      const liked = await storage.hasUserLiked(req.user!.id, req.params.id);
      
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
        }
      }
      
      res.json({ disliked, count, likeCount, liked });
    } catch (error: any) {
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
      res.json(similarBars.map(sb => ({
        id: sb.bar.id,
        proofBarId: sb.bar.proofBarId,
        permissionStatus: sb.bar.permissionStatus,
        similarity: Math.round(sb.similarity * 100),
      })));
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
      const success = await storage.deleteBarAdmin(req.params.id);
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

      // Delete the bar
      const success = await storage.deleteBarAdmin(req.params.id);
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

  // Toggle admin status
  app.patch("/api/admin/users/:id/admin", isAdmin, async (req, res) => {
    try {
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
      const validTiers = ["free", "basic", "premium"];
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
      const friendshipStatus = await storage.getFriendshipStatus(req.user!.id, req.params.receiverId);
      if (!friendshipStatus || friendshipStatus.status !== "accepted") {
        return res.status(403).json({ message: "You can only message friends" });
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

  return httpServer;
}
