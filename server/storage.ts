import { users, bars, type User, type InsertUser, type Bar, type InsertBar } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Bar methods
  createBar(bar: InsertBar): Promise<Bar>;
  getBars(limit?: number): Promise<Array<Bar & { user: User }>>;
  getBarsByUser(userId: string): Promise<Bar[]>;
  deleteBar(id: string, userId: string): Promise<boolean>;
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
      .select()
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .orderBy(desc(bars.createdAt))
      .limit(limit);
    
    return result.map(row => ({
      ...row.bars,
      user: row.users!,
    }));
  }

  async getBarsByUser(userId: string): Promise<Bar[]> {
    return db
      .select()
      .from(bars)
      .where(eq(bars.userId, userId))
      .orderBy(desc(bars.createdAt));
  }

  async deleteBar(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(bars)
      .where(eq(bars.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
