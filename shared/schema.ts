import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  password: text("password").notNull(),
  bio: text("bio"),
  location: text("location"),
  avatarUrl: text("avatar_url"),
  membershipTier: text("membership_tier").notNull().default("free"),
  membershipExpiresAt: timestamp("membership_expires_at"),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  bars: many(bars),
}));

export const bars = pgTable("bars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  explanation: text("explanation"),
  category: text("category").notNull(),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const barsRelations = relations(bars, ({ one, many }) => ({
  user: one(users, {
    fields: [bars.userId],
    references: [users.id],
  }),
  likes: many(likes),
  comments: many(comments),
}));

export const likes = pgTable("likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  barId: varchar("bar_id").notNull().references(() => bars.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, { fields: [likes.userId], references: [users.id] }),
  bar: one(bars, { fields: [likes.barId], references: [bars.id] }),
}));

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  barId: varchar("bar_id").notNull().references(() => bars.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  bar: one(bars, { fields: [comments.barId], references: [bars.id] }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  membershipTier: true,
  membershipExpiresAt: true,
});

export const insertBarSchema = createInsertSchema(bars).omit({
  id: true,
  createdAt: true,
});

export const updateBarSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  explanation: z.string().max(500).optional().nullable(),
  category: z.enum(["Funny", "Serious", "Wordplay", "Storytelling", "Battle", "Freestyle"]).optional(),
  tags: z.array(z.string()).optional(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBar = z.infer<typeof insertBarSchema>;
export type Bar = typeof bars.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type BarWithUser = Bar & {
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    membershipTier: string;
  };
};

export const categoryOptions = ["Funny", "Serious", "Wordplay", "Storytelling", "Battle", "Freestyle"] as const;
export const membershipTiers = ["free", "donor", "donor_plus"] as const;
