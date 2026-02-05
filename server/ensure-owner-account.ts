/**
 * Script to ensure the owner account exists with the correct email
 * 
 * Environment variables required:
 * - OWNER_EMAIL: The owner's email address (REQUIRED for production use)
 * - OWNER_USERNAME: The owner's username (default: Milsling)
 * 
 * Note: A default email is provided for development/testing only.
 * In production, always set OWNER_EMAIL environment variable.
 */
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { randomBytes } from "crypto";

const OWNER_USERNAME = process.env.OWNER_USERNAME || "Milsling";
// Default email for development only - MUST be overridden in production
const OWNER_EMAIL = process.env.OWNER_EMAIL || "trevorjpiccone@gmail.com";

if (!process.env.OWNER_EMAIL) {
  console.warn("⚠️  OWNER_EMAIL not set. Using default development email.");
  console.warn("⚠️  For production, set OWNER_EMAIL environment variable.");
}

// Generate a secure random password
// Note: Excludes ambiguous characters (I, l, 1, O, 0) for better readability
// while maintaining strong entropy (16 characters from 52-char set = ~94 bits)
function generateSecurePassword(length: number = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  const randomValues = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[randomValues[i] % chars.length];
  }
  return password;
}

async function ensureOwnerAccount() {
  try {
    console.log("Checking for owner account...");
    
    // Check if user with email exists
    const [existingByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, OWNER_EMAIL))
      .limit(1);
    
    if (existingByEmail) {
      console.log(`✓ User found with email ${OWNER_EMAIL}: ${existingByEmail.username}`);
      
      // Update to ensure they're marked as owner and admin
      if (!existingByEmail.isOwner || !existingByEmail.isAdmin) {
        console.log("Updating user to be owner and admin...");
        await db
          .update(users)
          .set({
            isOwner: true,
            isAdmin: true,
            username: OWNER_USERNAME, // Ensure username is correct
          })
          .where(eq(users.id, existingByEmail.id));
        console.log("✓ User updated successfully");
      } else {
        console.log("✓ User is already owner and admin");
      }
      return;
    }
    
    // Check if username exists with different email
    const [existingByUsername] = await db
      .select()
      .from(users)
      .where(eq(users.username, OWNER_USERNAME))
      .limit(1);
    
    if (existingByUsername) {
      console.log(`User ${OWNER_USERNAME} exists with different email: ${existingByUsername.email}`);
      console.log("Updating email to correct one...");
      await db
        .update(users)
        .set({
          email: OWNER_EMAIL,
          isOwner: true,
          isAdmin: true,
          emailVerified: true,
        })
        .where(eq(users.id, existingByUsername.id));
      console.log("✓ User updated successfully");
      return;
    }
    
    // Create new owner account
    console.log("Creating new owner account...");
    const tempPassword = generateSecurePassword(16);
    const hashedPassword = await hashPassword(tempPassword);
    
    const [newUser] = await db
      .insert(users)
      .values({
        username: OWNER_USERNAME,
        email: OWNER_EMAIL,
        password: hashedPassword,
        bio: "Creator of orphanbars.com!",
        location: "Seattle, WA",
        isOwner: true,
        isAdmin: true,
        emailVerified: true,
      })
      .returning();
    
    console.log("✓ Owner account created successfully");
    console.log(`  Username: ${newUser.username}`);
    console.log(`  Email: ${newUser.email}`);
    console.log(`  Temporary password: ${tempPassword}`);
    console.log("  ⚠️  IMPORTANT: Save this password securely and change it immediately after first login!");
    console.log("  ⚠️  This password will NOT be displayed again!");
    
  } catch (error) {
    console.error("Error ensuring owner account:", error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureOwnerAccount()
    .then(() => {
      console.log("\n✓ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n✗ Failed:", error);
      process.exit(1);
    });
}

export { ensureOwnerAccount };
