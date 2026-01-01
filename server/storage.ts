import { users, bars, verificationCodes, likes, comments, type User, type InsertUser, type Bar, type InsertBar, type Like, type Comment, type InsertComment } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gt, count, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Bar methods
  createBar(bar: InsertBar): Promise<Bar>;
  getBars(limit?: number): Promise<Array<Bar & { user: User }>>;
  getBarsByUser(userId: string): Promise<Bar[]>;
  updateBar(id: string, userId: string, updates: Partial<Pick<Bar, 'content' | 'explanation' | 'category' | 'tags'>>): Promise<Bar | undefined>;
  deleteBar(id: string, userId: string): Promise<boolean>;

  // Verification methods
  createVerificationCode(email: string, code: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<boolean>;
  deleteVerificationCodes(email: string): Promise<void>;

  // Admin methods
  getAllUsers(): Promise<User[]>;
  deleteBarAdmin(barId: string): Promise<boolean>;
  deleteAllBars(): Promise<void>;
  deleteUser(userId: string): Promise<boolean>;

  // Like methods
  toggleLike(userId: string, barId: string): Promise<boolean>;
  getLikeCount(barId: string): Promise<number>;
  hasUserLiked(userId: string, barId: string): Promise<boolean>;

  // Comment methods
  createComment(comment: InsertComment): Promise<Comment>;
  getComments(barId: string): Promise<Array<Comment & { user: Pick<User, 'id' | 'username' | 'avatarUrl'> }>>;
  deleteComment(id: string, userId: string): Promise<boolean>;
  getCommentCount(barId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async createBar(bar: InsertBar): Promise<Bar> {
    const [newBar] = await db
      .insert(bars)
      .values(bar)
      .returning();
    return newBar;
  }

  async getBars(limit: number = 50): Promise<Array<Bar & { user: User }>> {
    const result = await db
      .select({
        bar: bars,
        user: {
          id: users.id,
          username: users.username,
          bio: users.bio,
          location: users.location,
          avatarUrl: users.avatarUrl,
          membershipTier: users.membershipTier,
          membershipExpiresAt: users.membershipExpiresAt,
          isAdmin: users.isAdmin,
        }
      })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .orderBy(desc(bars.createdAt))
      .limit(limit);
    
    return result.map(row => ({
      ...row.bar,
      user: row.user as any,
    }));
  }

  async getBarsByUser(userId: string): Promise<Bar[]> {
    return db
      .select()
      .from(bars)
      .where(eq(bars.userId, userId))
      .orderBy(desc(bars.createdAt));
  }

  async updateBar(id: string, userId: string, updates: Partial<Pick<Bar, 'content' | 'explanation' | 'category' | 'tags'>>): Promise<Bar | undefined> {
    const [bar] = await db
      .update(bars)
      .set(updates)
      .where(and(eq(bars.id, id), eq(bars.userId, userId)))
      .returning();
    return bar || undefined;
  }

  async deleteBar(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(bars)
      .where(and(eq(bars.id, id), eq(bars.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async createVerificationCode(email: string, code: string): Promise<void> {
    await db.delete(verificationCodes).where(eq(verificationCodes.email, email));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(verificationCodes).values({ email, code, expiresAt });
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.email, email),
          eq(verificationCodes.code, code),
          gt(verificationCodes.expiresAt, new Date())
        )
      );
    return !!result;
  }

  async deleteVerificationCodes(email: string): Promise<void> {
    await db.delete(verificationCodes).where(eq(verificationCodes.email, email));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.id));
  }

  async deleteBarAdmin(barId: string): Promise<boolean> {
    const result = await db.delete(bars).where(eq(bars.id, barId)).returning();
    return result.length > 0;
  }

  async deleteAllBars(): Promise<void> {
    await db.delete(bars);
  }

  async deleteUser(userId: string): Promise<boolean> {
    await db.delete(bars).where(eq(bars.userId, userId));
    const result = await db.delete(users).where(eq(users.id, userId)).returning();
    return result.length > 0;
  }

  async toggleLike(userId: string, barId: string): Promise<boolean> {
    const [existing] = await db.select().from(likes).where(and(eq(likes.userId, userId), eq(likes.barId, barId)));
    if (existing) {
      await db.delete(likes).where(eq(likes.id, existing.id));
      return false;
    } else {
      await db.insert(likes).values({ userId, barId });
      return true;
    }
  }

  async getLikeCount(barId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(likes).where(eq(likes.barId, barId));
    return result?.count || 0;
  }

  async hasUserLiked(userId: string, barId: string): Promise<boolean> {
    const [existing] = await db.select().from(likes).where(and(eq(likes.userId, userId), eq(likes.barId, barId)));
    return !!existing;
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  async getComments(barId: string): Promise<Array<Comment & { user: Pick<User, 'id' | 'username' | 'avatarUrl'> }>> {
    const result = await db
      .select({
        comment: comments,
        user: { id: users.id, username: users.username, avatarUrl: users.avatarUrl }
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.barId, barId))
      .orderBy(desc(comments.createdAt));
    return result.map(r => ({ ...r.comment, user: r.user as any }));
  }

  async deleteComment(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(comments).where(and(eq(comments.id, id), eq(comments.userId, userId))).returning();
    return result.length > 0;
  }

  async getCommentCount(barId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(comments).where(eq(comments.barId, barId));
    return result?.count || 0;
  }
}

export const storage = new DatabaseStorage();
