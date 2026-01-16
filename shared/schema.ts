import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, unique, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const permissionStatusOptions = ["share_only", "open_adopt", "private"] as const;
export const messagePrivacyOptions = ["friends_only", "everyone"] as const;
export const barTypeOptions = ["single_bar", "snippet", "half_verse"] as const;
export const moderationStatusOptions = ["approved", "pending_review", "flagged", "blocked"] as const;
export const phraseSeverityOptions = ["block", "flag"] as const;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  password: text("password").notNull(),
  bio: text("bio"),
  location: text("location"),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  membershipTier: text("membership_tier").notNull().default("free"),
  membershipExpiresAt: timestamp("membership_expires_at"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isAdminPlus: boolean("is_admin_plus").notNull().default(false),
  isOwner: boolean("is_owner").notNull().default(false),
  usernameChangedAt: timestamp("username_changed_at"),
  onlineStatus: text("online_status").notNull().default("offline"),
  lastSeenAt: timestamp("last_seen_at"),
  messagePrivacy: text("message_privacy").notNull().default("friends_only"),
  displayedBadges: text("displayed_badges").array(),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  lastXpUpdate: timestamp("last_xp_update").defaultNow(),
  dailyXpLikes: integer("daily_xp_likes").notNull().default(0),
  dailyXpComments: integer("daily_xp_comments").notNull().default(0),
  dailyXpBookmarks: integer("daily_xp_bookmarks").notNull().default(0),
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
  barType: text("bar_type").notNull().default("single_bar"),
  fullRapLink: text("full_rap_link"),
  beatLink: text("beat_link"),
  isRecorded: boolean("is_recorded").notNull().default(false),
  moderationStatus: text("moderation_status").notNull().default("approved"),
  moderationScore: integer("moderation_score"),
  moderationPhraseId: varchar("moderation_phrase_id"),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by").references(() => users.id),
  deletedReason: text("deleted_reason"),
  isLocked: boolean("is_locked").notNull().default(false),
  lockedAt: timestamp("locked_at"),
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

export const barUsages = pgTable("bar_usages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barId: varchar("bar_id").notNull().references(() => bars.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  usageLink: text("usage_link"),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const barUsagesRelations = relations(barUsages, ({ one }) => ({
  bar: one(bars, { fields: [barUsages.barId], references: [bars.id] }),
  user: one(users, { fields: [barUsages.userId], references: [users.id] }),
}));

export const barSequence = pgTable("bar_sequence", {
  id: varchar("id").primaryKey().default("singleton"),
  currentValue: integer("current_value").notNull().default(0),
});

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementId: text("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
}, (table) => [
  unique("user_achievements_unique").on(table.userId, table.achievementId)
]);

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, { fields: [userAchievements.userId], references: [users.id] }),
}));

export const reportReasonOptions = ["illegal_content", "harassment", "spam", "other"] as const;
export const reportStatusOptions = ["pending", "reviewed", "dismissed", "action_taken"] as const;

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  barId: varchar("bar_id").references(() => bars.id, { onDelete: "cascade" }),
  commentId: varchar("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("pending"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, { fields: [reports.reporterId], references: [users.id] }),
  bar: one(bars, { fields: [reports.barId], references: [bars.id] }),
  comment: one(comments, { fields: [reports.commentId], references: [comments.id] }),
  reviewedByUser: one(users, { fields: [reports.reviewedBy], references: [users.id] }),
}));

export const flaggedPhrases = pgTable("flagged_phrases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phrase: text("phrase").notNull(),
  normalizedPhrase: text("normalized_phrase").notNull(),
  severity: text("severity").notNull().default("flag"),
  similarityThreshold: integer("similarity_threshold").notNull().default(80),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const flaggedPhrasesRelations = relations(flaggedPhrases, ({ one }) => ({
  creator: one(users, { fields: [flaggedPhrases.createdBy], references: [users.id] }),
}));

// AI moderation review requests - when AI rejects a bar but user wants manual review
export const aiReviewRequests = pgTable("ai_review_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  category: text("category").notNull(),
  tags: text("tags").array(),
  explanation: text("explanation"),
  barType: text("bar_type").notNull().default("single_bar"),
  beatLink: text("beat_link"),
  fullRapLink: text("full_rap_link"),
  aiRejectionReasons: text("ai_rejection_reasons").array(),
  plagiarismRisk: text("plagiarism_risk"),
  plagiarismDetails: text("plagiarism_details"),
  userAppeal: text("user_appeal"), // User's explanation for why it should be approved
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiReviewRequestsRelations = relations(aiReviewRequests, ({ one }) => ({
  user: one(users, { fields: [aiReviewRequests.userId], references: [users.id] }),
  reviewer: one(users, { fields: [aiReviewRequests.reviewedBy], references: [users.id] }),
}));

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

// Condition types for custom achievements
export const achievementConditionTypes = [
  "bars_posted",           // Total bars posted >= threshold
  "likes_received",        // Total likes received >= threshold
  "followers_count",       // Followers >= threshold
  "following_count",       // Following >= threshold
  "single_bar_likes",      // Any single bar has >= threshold likes
  "single_bar_comments",   // Any single bar has >= threshold comments
  "single_bar_bookmarks",  // Any single bar has >= threshold bookmarks
  "comments_made",         // Total comments made >= threshold
  "bars_adopted",          // Total bars adopted >= threshold
  "controversial_bar",     // Has a bar with more dislikes than likes (threshold = min total reactions)
  "night_owl",             // Posted a bar between midnight and 5am
  "early_bird",            // Posted a bar between 5am and 8am
  "bars_with_keyword",     // Bars containing a specific keyword >= threshold
] as const;

export type AchievementConditionType = typeof achievementConditionTypes[number];

export const achievementApprovalStatusOptions = ["pending", "approved", "rejected"] as const;

// Rule tree types for compound achievement conditions
export type AchievementCondition = {
  type: "condition";
  metric: AchievementConditionType;
  comparator: ">=" | ">" | "=" | "<" | "<=";
  value: number;
  keyword?: string; // For bars_with_keyword metric
  negated?: boolean; // For NOT logic - inverts the comparison
  timeRange?: { start: number; end: number }; // For time-based metrics (hour in 24h format)
};

export type AchievementRuleGroup = {
  type: "group";
  operator: "AND" | "OR";
  children: (AchievementCondition | AchievementRuleGroup)[];
};

export type AchievementRuleTree = AchievementCondition | AchievementRuleGroup;

export const customAchievements = pgTable("custom_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  emoji: text("emoji"), // Deprecated - use imageUrl instead
  imageUrl: text("image_url"), // Custom badge image URL
  description: text("description").notNull(),
  rarity: text("rarity").notNull().default("common"),
  conditionType: text("condition_type").notNull(),
  threshold: integer("threshold").notNull().default(1),
  ruleTree: jsonb("rule_tree"), // For compound conditions (AND/OR logic)
  isActive: boolean("is_active").notNull().default(true),
  approvalStatus: text("approval_status").notNull().default("approved"), // pending, approved, rejected
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customAchievementsRelations = relations(customAchievements, ({ one }) => ({
  creator: one(users, { fields: [customAchievements.createdBy], references: [users.id] }),
}));

export type CustomAchievement = typeof customAchievements.$inferSelect;
export type InsertCustomAchievement = typeof customAchievements.$inferInsert;

// Debug logs for admin troubleshooting
export const debugLogs = pgTable("debug_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(), // like, dislike, follow, etc.
  userId: varchar("user_id"),
  targetId: varchar("target_id"), // barId, userId, etc.
  details: text("details").notNull(), // JSON string with full details
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DebugLog = typeof debugLogs.$inferSelect;
export type InsertDebugLog = typeof debugLogs.$inferInsert;

export const ACHIEVEMENTS = {
  first_bar: { name: "Origin Founder", emoji: "🔥", imageUrl: null as string | null, description: "Posted your first bar", threshold: { barsMinted: 1 }, rarity: "common" as AchievementRarity },
  bar_slinger: { name: "Bar Slinger", emoji: "💀", imageUrl: null as string | null, description: "Posted 10 bars", threshold: { barsMinted: 10 }, rarity: "rare" as AchievementRarity },
  bar_lord: { name: "Bar Lord", emoji: "👑", imageUrl: null as string | null, description: "Posted 50 bars", threshold: { barsMinted: 50 }, rarity: "epic" as AchievementRarity },
  crowd_pleaser: { name: "Crowd Pleaser", emoji: "🎤", imageUrl: null as string | null, description: "Received 100 total likes", threshold: { likesReceived: 100 }, rarity: "rare" as AchievementRarity },
  cult_leader: { name: "Cult Leader", emoji: "🪖", imageUrl: null as string | null, description: "Gained 50 followers", threshold: { followers: 50 }, rarity: "epic" as AchievementRarity },
  immortal_bar: { name: "Immortal", emoji: "🌹", imageUrl: null as string | null, description: "One bar reached 500 likes", threshold: { topBarLikes: 500 }, rarity: "legendary" as AchievementRarity },
  milsling_legacy: { name: "Milsling Heir", emoji: "⚔️", imageUrl: null as string | null, description: "Received 1000 total likes", threshold: { likesReceived: 1000 }, rarity: "legendary" as AchievementRarity },
  wordsmith: { name: "Wordsmith", emoji: "✍️", imageUrl: null as string | null, description: "Posted 25 bars", threshold: { barsMinted: 25 }, rarity: "rare" as AchievementRarity },
  rising_star: { name: "Rising Star", emoji: "⭐", imageUrl: null as string | null, description: "Gained 10 followers", threshold: { followers: 10 }, rarity: "common" as AchievementRarity },
  viral: { name: "Viral", emoji: "🔥", imageUrl: null as string | null, description: "One bar reached 100 likes", threshold: { topBarLikes: 100 }, rarity: "rare" as AchievementRarity },
} as const;

// Achievement badge images stored in database for built-in achievements
export const achievementBadgeImages = pgTable("achievement_badge_images", {
  id: varchar("id").primaryKey(), // matches the achievement key (e.g., "first_bar")
  imageUrl: text("image_url").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AchievementBadgeImage = typeof achievementBadgeImages.$inferSelect;

export const tagAnimationOptions = ["none", "pulse", "glow", "shimmer", "bounce", "sparkle", "gradient"] as const;
export type TagAnimation = typeof tagAnimationOptions[number];

export const customTags = pgTable("custom_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name"),
  imageUrl: text("image_url"),
  animation: text("animation").notNull().default("none"),
  color: text("color"),
  backgroundColor: text("background_color"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customTagsRelations = relations(customTags, ({ one }) => ({
  creator: one(users, { fields: [customTags.createdBy], references: [users.id] }),
}));

export type CustomTag = typeof customTags.$inferSelect;
export type InsertCustomTag = typeof customTags.$inferInsert;

export const insertCustomTagSchema = createInsertSchema(customTags).omit({
  id: true,
  createdAt: true,
});

export const customCategories = pgTable("custom_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name"),
  imageUrl: text("image_url"),
  color: text("color"),
  backgroundColor: text("background_color"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customCategoriesRelations = relations(customCategories, ({ one }) => ({
  creator: one(users, { fields: [customCategories.createdBy], references: [users.id] }),
}));

export type CustomCategory = typeof customCategories.$inferSelect;
export type InsertCustomCategory = typeof customCategories.$inferInsert;

export const insertCustomCategorySchema = createInsertSchema(customCategories).omit({
  id: true,
  createdAt: true,
});

export type AchievementId = keyof typeof ACHIEVEMENTS;

// Profile Badges - Custom badges that appear next to usernames
export const profileBadges = pgTable("profile_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  emoji: text("emoji"),
  color: text("color"), // text color
  backgroundColor: text("background_color"),
  borderColor: text("border_color"),
  animation: text("animation").notNull().default("none"),
  rarity: text("rarity").notNull().default("common"), // common, rare, epic, legendary
  isActive: boolean("is_active").notNull().default(true),
  linkedAchievementId: text("linked_achievement_id"), // links to achievement key if earned from achievement
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const profileBadgesRelations = relations(profileBadges, ({ one }) => ({
  creator: one(users, { fields: [profileBadges.createdBy], references: [users.id] }),
}));

export type ProfileBadge = typeof profileBadges.$inferSelect;
export type InsertProfileBadge = typeof profileBadges.$inferInsert;

export const insertProfileBadgeSchema = createInsertSchema(profileBadges).omit({
  id: true,
  createdAt: true,
});

// User Badges - Junction table for which users own which badges
export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeId: varchar("badge_id").notNull().references(() => profileBadges.id, { onDelete: "cascade" }),
  source: text("source").notNull().default("owner_gift"), // "achievement", "owner_gift", "purchase", "event"
  sourceDetails: text("source_details"), // e.g., achievement ID or event name
  grantedBy: varchar("granted_by").references(() => users.id), // who gave the badge (for owner gifts)
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
});

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, { fields: [userBadges.userId], references: [users.id] }),
  badge: one(profileBadges, { fields: [userBadges.badgeId], references: [profileBadges.id] }),
  granter: one(users, { fields: [userBadges.grantedBy], references: [users.id] }),
}));

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = typeof userBadges.$inferInsert;

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
  barType: z.enum(["single_bar", "snippet", "half_verse"]).optional(),
  fullRapLink: z.string().optional().nullable().transform(v => v === "" ? null : v).pipe(z.string().url().nullable().optional()),
  beatLink: z.string().optional().nullable().transform(v => v === "" ? null : v).pipe(z.string().url().nullable().optional()),
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
export type BarUsage = typeof barUsages.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type FlaggedPhrase = typeof flaggedPhrases.$inferSelect;

export const onlineStatusOptions = ["online", "offline", "busy"] as const;

export type BarWithUser = Bar & {
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    membershipTier: string;
    isOwner?: boolean;
    level?: number;
  };
  adoptionCount?: number;
  adoptedFromBarId?: string | null;
};

export const categoryOptions = ["Funny", "Serious", "Wordplay", "Storytelling", "Battle", "Freestyle"] as const;
export const membershipTiers = ["free", "donor", "donor_plus"] as const;

export const maintenanceStatus = pgTable("maintenance_status", {
  id: varchar("id").primaryKey().default("singleton"),
  isActive: boolean("is_active").notNull().default(false),
  message: text("message"),
  activatedAt: timestamp("activated_at"),
  activatedBy: varchar("activated_by").references(() => users.id),
});

export type MaintenanceStatus = typeof maintenanceStatus.$inferSelect;
