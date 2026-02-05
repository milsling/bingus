/**
 * Endpoint to handle re-authentication for existing users
 * Allows users who forgot their username to log in with email + password
 */
import type { Express } from "express";
import { storage } from "./storage";
import { comparePasswords } from "./auth";
import passport from "passport";

export function registerEmailLoginRoute(app: Express) {
  app.post("/api/auth/login-with-email", async (req, res, next) => {
    try {
      const { email, password, rememberMe } = req.body;
      
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
      
      req.login(userWithoutPassword, (err) => {
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
        res.json(userWithoutPassword);
      });
    } catch (error: any) {
      console.error('[LOGIN-EMAIL] Error:', error);
      res.status(500).json({ message: "An error occurred during login" });
    }
  });
}
