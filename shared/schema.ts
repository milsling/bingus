import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, unique, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const permissionStatusOptions = ["share_only", "open_adopt", "private"] as const;

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
  isOwner: boolean("is_owner").notNull().default(false),
  usernameChangedAt: timestamp("username_changed_at"),
  onlineStatus: text("online_status").notNull().default("offline"),
  lastSeenAt: timestamp("last_seen_at"),
});

export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const passwordResetCodes = pgTable("password_reset_codes", {
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
  feedbackWanted: boolean("feedback_wanted").notNull().default(false),
  isOriginal: boolean("is_original").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  proofBarId: text("proof_bar_id"),
  permissionStatus: text("permission_status").notNull().default("share_only"),
  proofHash: text("proof_hash"),
  isFeatured: boolean("is_featured").notNull().default(false),
  featuredAt: timestamp("featured_at"),
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

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  bar: one(bars, { fields: [comments.barId], references: [bars.id] }),
  likes: many(commentLikes),
}));

export const commentLikes = pgTable("comment_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  commentId: varchar("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("comment_likes_unique").on(table.userId, table.commentId)
]);

export const commentLikesRelations = relations(commentLikes, ({ one }) => ({
  user: one(users, { fields: [commentLikes.userId], references: [users.id] }),
  comment: one(comments, { fields: [commentLikes.commentId], references: [comments.id] }),
}));

export const dislikes = pgTable("dislikes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  barId: varchar("bar_id").notNull().references(() => bars.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("dislikes_unique").on(table.userId, table.barId)
]);

export const dislikesRelations = relations(dislikes, ({ one }) => ({
  user: one(users, { fields: [dislikes.userId], references: [users.id] }),
  bar: one(bars, { fields: [dislikes.barId], references: [bars.id] }),
}));

export const commentDislikes = pgTable("comment_dislikes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  commentId: varchar("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("comment_dislikes_unique").on(table.userId, table.commentId)
]);

export const commentDislikesRelations = relations(commentDislikes, ({ one }) => ({
  user: one(users, { fields: [commentDislikes.userId], references: [users.id] }),
  comment: one(comments, { fields: [commentDislikes.commentId], references: [comments.id] }),
}));

export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("follows_unique").on(table.followerId, table.followingId)
]);

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, { fields: [follows.followerId], references: [users.id] }),
  following: one(users, { fields: [follows.followingId], references: [users.id] }),
}));

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  actorId: varchar("actor_id").references(() => users.id, { onDelete: "cascade" }),
  barId: varchar("bar_id").references(() => bars.id, { onDelete: "cascade" }),
  commentId: varchar("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookmarks = pgTable("bookmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  barId: varchar("bar_id").notNull().references(() => bars.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("bookmarks_unique").on(table.userId, table.barId)
]);

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, { fields: [bookmarks.userId], references: [users.id] }),
  bar: one(bars, { fields: [bookmarks.barId], references: [bars.id] }),
}));

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const friendships = pgTable("friendships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("friendships_unique").on(table.requesterId, table.receiverId)
]);

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(users, { fields: [friendships.requesterId], references: [users.id] }),
  receiver: one(users, { fields: [friendships.receiverId], references: [users.id] }),
}));

export const directMessages = pgTable("direct_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  sender: one(users, { fields: [directMessages.senderId], references: [users.id] }),
  receiver: one(users, { fields: [directMessages.receiverId], references: [users.id] }),
}));

export const adoptions = pgTable("adoptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalBarId: varchar("original_bar_id").notNull().references(() => bars.id, { onDelete: "cascade" }),
  adoptedByBarId: varchar("adopted_by_bar_id").notNull().references(() => bars.id, { onDelete: "cascade" }),
  adoptedByUserId: varchar("adopted_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("adoptions_unique").on(table.originalBarId, table.adoptedByBarId)
]);

export const adoptionsRelations = relations(adoptions, ({ one }) => ({
  originalBar: one(bars, { fields: [adoptions.originalBarId], references: [bars.id] }),
  adoptedByBar: one(bars, { fields: [adoptions.adoptedByBarId], references: [bars.id] }),
  adoptedByUser: one(users, { fields: [adoptions.adoptedByUserId], references: [users.id] }),
}));

export const barSequence = pgTable("bar_sequence", {
  id: varchar("id").primaryKey().default("singleton"),
  currentValue: integer("current_value").notNull().default(0),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  actor: one(users, { fields: [notifications.actorId], references: [users.id] }),
  bar: one(bars, { fields: [notifications.barId], references: [bars.id] }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  membershipTier: true,
  membershipExpiresAt: true,
});

export const insertBarSchema = createInsertSchema(bars).omit({
  id: true,
  createdAt: true,
  proofBarId: true,
  proofHash: true,
});

export const updateBarSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  explanation: z.string().max(500).optional().nullable(),
  category: z.enum(["Funny", "Serious", "Wordplay", "Storytelling", "Battle", "Freestyle"]).optional(),
  tags: z.array(z.string()).optional(),
  feedbackWanted: z.boolean().optional(),
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
export type CommentLike = typeof commentLikes.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Follow = typeof follows.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type DirectMessage = typeof directMessages.$inferSelect;
export type Adoption = typeof adoptions.$inferSelect;

export const onlineStatusOptions = ["online", "offline", "busy"] as const;

export type BarWithUser = Bar & {
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    membershipTier: string;
    isOwner?: boolean;
  };
  adoptionCount?: number;
  adoptedFromBarId?: string | null;
};

export const categoryOptions = ["Funny", "Serious", "Wordplay", "Storytelling", "Battle", "Freestyle"] as const;
export const membershipTiers = ["free", "donor", "donor_plus"] as const;
