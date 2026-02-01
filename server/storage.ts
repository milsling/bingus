import { users, bars, verificationCodes, passwordResetCodes, likes, comments, commentLikes, dislikes, commentDislikes, follows, notifications, bookmarks, pushSubscriptions, friendships, directMessages, adoptions, barSequence, userAchievements, reports, flaggedPhrases, maintenanceStatus, barUsages, customAchievements, debugLogs, achievementBadgeImages, customTags, customCategories, profileBadges, userBadges, protectedBars, aiSettings, notebooks, ACHIEVEMENTS, type User, type InsertUser, type Bar, type InsertBar, type Like, type Comment, type CommentLike, type InsertComment, type Notification, type Bookmark, type PushSubscription, type Friendship, type DirectMessage, type Adoption, type BarUsage, type UserAchievement, type AchievementId, type Report, type FlaggedPhrase, type MaintenanceStatus, type CustomAchievement, type InsertCustomAchievement, type CustomTag, type InsertCustomTag, type CustomCategory, type InsertCustomCategory, type DebugLog, type InsertDebugLog, type AchievementRuleTree, type AchievementCondition, type AchievementRuleGroup, type AchievementConditionType, type ProfileBadge, type InsertProfileBadge, type UserBadge, type InsertUserBadge, type ProtectedBar, type InsertProtectedBar, type AISettings, type Notebook, type InsertNotebook } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gt, count, sql, or, ilike, notInArray, ne, inArray } from "drizzle-orm";
import { createHash } from "crypto";

// User metrics cache for evaluating compound achievements
export interface UserMetrics {
  bars_posted: number;
  likes_received: number;
  followers_count: number;
  following_count: number;
  single_bar_likes: number;
  single_bar_comments: number;
  single_bar_bookmarks: number;
  comments_made: number;
  bars_adopted: number;
  controversial_bar: boolean;
  night_owl: boolean;
  early_bird: boolean;
  bars_with_keyword: number; // Dynamic - needs keyword context
  // New metrics for expanded achievements
  posting_streak_days: number;
  comment_likes_received: number;
  adoptions_given: number;
  bars_adopted_by_others: number;
  weekend_bars: number;
  midnight_bars: number;
  days_without_violations: number;
  top_bar_engagement: number; // likes + bookmarks on single bar
  tagged_bars_with_likes: number; // bars with specific tags that got likes
  account_age_days: number;
}

// Context for evaluating conditions that need additional data (like keywords)
export interface EvaluationContext {
  metrics: UserMetrics;
  keywordCounts: Map<string, number>; // keyword -> count of bars containing it
}

// Evaluate a single condition against user metrics
function evaluateCondition(condition: AchievementCondition, context: EvaluationContext): boolean {
  const value = condition.value;
  
  // Handle keyword-based metric specially
  if (condition.metric === 'bars_with_keyword' && condition.keyword) {
    const keyword = condition.keyword.toLowerCase();
    const count = context.keywordCounts.get(keyword) || 0;
    return evaluateNumeric(count, condition.comparator, value);
  }
  
  const metricValue = context.metrics[condition.metric as keyof UserMetrics];
  
  // Handle boolean metrics (night_owl, early_bird, controversial_bar) by coercing to 0/1
  if (typeof metricValue === 'boolean') {
    const numericValue = metricValue ? 1 : 0;
    return evaluateNumeric(numericValue, condition.comparator, value);
  }
  
  return evaluateNumeric(metricValue as number, condition.comparator, value);
}

function evaluateNumeric(numericValue: number, comparator: string, value: number): boolean {
  switch (comparator) {
    case '>=': return numericValue >= value;
    case '>': return numericValue > value;
    case '=': return numericValue === value;
    case '<': return numericValue < value;
    case '<=': return numericValue <= value;
    default: return false;
  }
}

// Recursively evaluate a rule tree
export function evaluateRuleTree(ruleTree: AchievementRuleTree, context: EvaluationContext): boolean {
  if (ruleTree.type === 'condition') {
    const condition = ruleTree as AchievementCondition;
    let result = evaluateCondition(condition, context);
    
    // Handle NOT logic - invert the result if negated
    if (condition.negated) {
      result = !result;
    }
    
    return result;
  }
  
  const group = ruleTree as AchievementRuleGroup;
  if (group.children.length === 0) return false;
  
  if (group.operator === 'AND') {
    return group.children.every(child => evaluateRuleTree(child, context));
  } else {
    return group.children.some(child => evaluateRuleTree(child, context));
  }
}

// Extract all keywords needed from a rule tree
export function extractKeywordsFromRuleTree(ruleTree: AchievementRuleTree): string[] {
  if (ruleTree.type === 'condition') {
    const condition = ruleTree as AchievementCondition;
    if (condition.metric === 'bars_with_keyword' && condition.keyword) {
      return [condition.keyword.toLowerCase()];
    }
    return [];
  }
  
  const group = ruleTree as AchievementRuleGroup;
  return group.children.flatMap(child => extractKeywordsFromRuleTree(child));
}

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserBySupabaseId(supabaseId: string): Promise<User | undefined>;
  linkSupabaseAccount(userId: string, supabaseId: string): Promise<void>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Bar methods
  createBar(bar: InsertBar): Promise<Bar>;
  getBars(limit?: number): Promise<Array<Bar & { user: User }>>;
  getBarById(id: string): Promise<(Bar & { user: User }) | undefined>;
  getBarsByUser(userId: string): Promise<Array<Bar & { user: User; commentCount: number }>>;
  updateBar(id: string, userId: string, updates: Partial<Pick<Bar, 'content' | 'explanation' | 'category' | 'tags' | 'barType' | 'fullRapLink' | 'beatLink'>>): Promise<Bar | undefined>;
  deleteBar(id: string, userId: string): Promise<boolean>;

  // Verification methods
  createVerificationCode(email: string, code: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<boolean>;
  deleteVerificationCodes(email: string): Promise<void>;

  // Password reset methods
  createPasswordResetCode(email: string, code: string): Promise<void>;
  verifyPasswordResetCode(email: string, code: string): Promise<boolean>;
  deletePasswordResetCodes(email: string): Promise<void>;

  // Admin methods
  getAllUsers(): Promise<User[]>;
  deleteBarAdmin(barId: string): Promise<boolean>;
  deleteAllBars(): Promise<void>;
  deleteUser(userId: string): Promise<boolean>;

  // Like methods
  toggleLike(userId: string, barId: string): Promise<boolean>;
  getLikeCount(barId: string): Promise<number>;
  hasUserLiked(userId: string, barId: string): Promise<boolean>;
  
  // Dislike methods
  toggleDislike(userId: string, barId: string): Promise<boolean>;
  getDislikeCount(barId: string): Promise<number>;
  hasUserDisliked(userId: string, barId: string): Promise<boolean>;

  // Comment methods
  createComment(comment: InsertComment): Promise<Comment>;
  getComments(barId: string): Promise<Array<Comment & { user: Pick<User, 'id' | 'username' | 'avatarUrl'>; likeCount: number }>>;
  deleteComment(id: string, userId: string): Promise<boolean>;
  getCommentCount(barId: string): Promise<number>;
  
  // Comment like methods
  toggleCommentLike(userId: string, commentId: string): Promise<boolean>;
  getCommentLikeCount(commentId: string): Promise<number>;
  hasUserLikedComment(userId: string, commentId: string): Promise<boolean>;
  getCommentById(commentId: string): Promise<Comment | undefined>;
  
  // Comment dislike methods
  toggleCommentDislike(userId: string, commentId: string): Promise<boolean>;
  getCommentDislikeCount(commentId: string): Promise<number>;
  hasUserDislikedComment(userId: string, commentId: string): Promise<boolean>;

  // Follow methods
  followUser(followerId: string, followingId: string): Promise<boolean>;
  unfollowUser(followerId: string, followingId: string): Promise<boolean>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowersCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  getBarsCount(userId: string): Promise<number>;
  getFollowers(userId: string): Promise<string[]>;

  // Notification methods
  createNotification(data: { userId: string; type: string; actorId?: string; barId?: string; commentId?: string; message: string }): Promise<Notification>;
  getNotifications(userId: string, limit?: number): Promise<Array<Notification & { actor?: Pick<User, 'id' | 'username' | 'avatarUrl'> }>>;
  getUnreadCount(userId: string): Promise<number>;
  markNotificationRead(id: string, userId: string): Promise<boolean>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // Search methods
  searchBars(query: string, limit?: number): Promise<Array<Bar & { user: User; commentCount: number }>>;
  searchUsers(query: string, limit?: number): Promise<Array<Pick<User, 'id' | 'username' | 'avatarUrl' | 'bio' | 'membershipTier'>>>;
  searchTags(query: string, limit?: number): Promise<string[]>;
  getBarsByTag(tag: string): Promise<Array<Bar & { user: User; commentCount: number }>>;

  // Bookmark methods
  toggleBookmark(userId: string, barId: string): Promise<boolean>;
  hasUserBookmarked(userId: string, barId: string): Promise<boolean>;
  getUserBookmarks(userId: string): Promise<Array<Bar & { user: User; commentCount: number }>>;

  // Push subscription methods
  savePushSubscription(userId: string, subscription: { endpoint: string; p256dh: string; auth: string }): Promise<PushSubscription>;
  deletePushSubscription(userId: string, endpoint: string): Promise<boolean>;
  getPushSubscriptions(userId: string): Promise<PushSubscription[]>;

  // Friendship methods
  sendFriendRequest(requesterId: string, receiverId: string): Promise<Friendship>;
  acceptFriendRequest(friendshipId: string, userId: string): Promise<Friendship | undefined>;
  createAutoFriendship(userId1: string, userId2: string): Promise<Friendship | null>;
  declineFriendRequest(friendshipId: string, userId: string): Promise<boolean>;
  removeFriend(userId: string, friendId: string): Promise<boolean>;
  getFriends(userId: string): Promise<Array<User & { friendshipId: string }>>;
  getPendingRequests(userId: string): Promise<Array<Friendship & { requester: Pick<User, 'id' | 'username' | 'avatarUrl'> }>>;
  getFriendshipStatus(userId: string, otherId: string): Promise<{ status: string; friendshipId?: string } | null>;

  // Direct message methods
  sendMessage(senderId: string, receiverId: string, content: string): Promise<DirectMessage>;
  getConversation(userId: string, otherId: string, limit?: number): Promise<DirectMessage[]>;
  getConversations(userId: string): Promise<Array<{ user: Pick<User, 'id' | 'username' | 'avatarUrl' | 'onlineStatus'>; lastMessage: DirectMessage; unreadCount: number }>>;
  markMessagesRead(userId: string, senderId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;

  // Online status methods
  updateOnlineStatus(userId: string, status: string): Promise<void>;
  getOnlineUsersCount(): Promise<number>;
  updateLastSeen(userId: string): Promise<void>;

  // Proof-of-origin methods
  getNextBarSequence(): Promise<number>;
  findSimilarBars(content: string, threshold?: number): Promise<Array<{ bar: Bar; similarity: number }>>;
  
  // Adoption methods
  createAdoption(originalBarId: string, adoptedByBarId: string, adoptedByUserId: string): Promise<Adoption>;
  getAdoptionsByOriginal(barId: string): Promise<Adoption[]>;
  getAdoptedFromBar(barId: string): Promise<Adoption | undefined>;
  getBarByProofId(proofBarId: string): Promise<(Bar & { user: User }) | undefined>;

  // Feed ranking methods
  getTopBars(limit?: number): Promise<Array<Bar & { user: Pick<User, 'id' | 'username' | 'avatarUrl' | 'membershipTier'>; score: number }>>;
  getTrendingBars(limit?: number): Promise<Array<Bar & { user: Pick<User, 'id' | 'username' | 'avatarUrl' | 'membershipTier'>; velocity: number }>>;
  getFeaturedBars(limit?: number): Promise<Array<Bar & { user: Pick<User, 'id' | 'username' | 'avatarUrl' | 'membershipTier'> }>>;
  setBarFeatured(barId: string, featured: boolean): Promise<Bar | undefined>;

  // Achievement methods
  getUserStats(userId: string): Promise<{ barsMinted: number; likesReceived: number; followers: number; topBarLikes: number }>;
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  unlockAchievement(userId: string, achievementId: AchievementId): Promise<UserAchievement | null>;
  checkAndUnlockAchievements(userId: string): Promise<AchievementId[]>;
  getUserLikes(userId: string): Promise<Array<Bar & { user: User; commentCount: number }>>;
  
  // Report methods
  createReport(data: { reporterId: string; barId?: string; commentId?: string; userId?: string; reason: string; details?: string }): Promise<Report>;
  getReports(status?: string): Promise<Array<Report & { reporter: Pick<User, 'id' | 'username'>; bar?: Bar; reportedUser?: Pick<User, 'id' | 'username'> }>>;
  updateReportStatus(reportId: string, status: string, reviewedBy: string): Promise<Report | undefined>;
  
  // Flagged phrase methods
  getFlaggedPhrases(): Promise<FlaggedPhrase[]>;
  createFlaggedPhrase(data: { phrase: string; normalizedPhrase: string; severity: string; similarityThreshold: number; notes?: string; createdBy?: string }): Promise<FlaggedPhrase>;
  updateFlaggedPhrase(id: string, updates: Partial<FlaggedPhrase>): Promise<FlaggedPhrase | undefined>;
  deleteFlaggedPhrase(id: string): Promise<boolean>;
  
  // Bar moderation methods
  getPendingModerationBars(): Promise<Array<Bar & { user: User; matchedPhrase?: FlaggedPhrase }>>;
  updateBarModerationStatus(barId: string, status: string): Promise<Bar | undefined>;
  
  // Maintenance status methods
  getMaintenanceStatus(): Promise<MaintenanceStatus | null>;
  activateMaintenance(message: string, userId: string): Promise<MaintenanceStatus>;
  clearMaintenance(): Promise<void>;
  
  // Soft delete archive methods
  getDeletedBars(): Promise<Array<Bar & { user: User }>>;
  restoreBar(barId: string): Promise<Bar | undefined>;
  
  // Bar usage methods (adoption claims)
  recordBarUsage(barId: string, userId: string, usageLink?: string, comment?: string): Promise<BarUsage>;
  getBarUsages(barId: string): Promise<Array<BarUsage & { user: Pick<User, 'id' | 'username' | 'avatarUrl'> }>>;
  getBarUsageCount(barId: string): Promise<number>;
  getUserAdoptions(userId: string): Promise<Array<BarUsage & { bar: Bar & { user: Pick<User, 'id' | 'username' | 'avatarUrl'> } }>>;
  
  // Custom achievement methods
  getCustomAchievements(): Promise<CustomAchievement[]>;
  getActiveCustomAchievements(): Promise<CustomAchievement[]>;
  getPendingAchievements(): Promise<Array<CustomAchievement & { creator?: { username: string } }>>;
  createCustomAchievement(data: InsertCustomAchievement): Promise<CustomAchievement>;
  updateCustomAchievement(id: string, updates: Partial<CustomAchievement>): Promise<CustomAchievement | undefined>;
  approveAchievement(id: string): Promise<CustomAchievement | undefined>;
  rejectAchievement(id: string): Promise<CustomAchievement | undefined>;
  deleteCustomAchievement(id: string): Promise<boolean>;
  checkCustomAchievements(userId: string): Promise<string[]>;
  
  // Debug log methods (admin only)
  createDebugLog(data: Omit<InsertDebugLog, 'id' | 'createdAt'>): Promise<DebugLog>;
  getDebugLogs(limit?: number, action?: string): Promise<DebugLog[]>;
  clearDebugLogs(): Promise<void>;
  
  // Achievement badge image methods
  getAchievementBadgeImage(achievementId: string): Promise<string | null>;
  getAllAchievementBadgeImages(): Promise<Record<string, string>>;
  setAchievementBadgeImage(achievementId: string, imageUrl: string): Promise<void>;
  deleteAchievementBadgeImage(achievementId: string): Promise<void>;
  
  // XP and Level methods
  awardXp(userId: string, amount: number, source: 'bar_posted' | 'like_received' | 'adoption_credited' | 'comment_made' | 'bookmark_added'): Promise<{ xp: number; level: number; leveledUp: boolean; previousLevel: number }>;
  getUserXpStats(userId: string): Promise<{ xp: number; level: number; xpForNextLevel: number; xpProgress: number }>;
  calculateRetroactiveXp(userId: string): Promise<{ xp: number; level: number }>;
  resetDailyXpLimits(): Promise<void>;
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

  async getUserBySupabaseId(supabaseId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseId));
    return user || undefined;
  }

  async linkSupabaseAccount(userId: string, supabaseId: string): Promise<void> {
    await db.update(users).set({ supabaseId }).where(eq(users.id, userId));
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

  async getBars(limit: number = 50): Promise<Array<Bar & { user: User; commentCount: number }>> {
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
          isAdminPlus: users.isAdminPlus,
          isOwner: users.isOwner,
          level: users.level,
        },
        commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.bar_id = ${bars.id})`.as('comment_count'),
      })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .where(sql`${bars.deletedAt} IS NULL`)
      .orderBy(desc(bars.createdAt))
      .limit(limit);
    
    return result.map(row => ({
      ...row.bar,
      user: row.user as any,
      commentCount: Number(row.commentCount) || 0,
    }));
  }

  async getBarById(id: string): Promise<(Bar & { user: User }) | undefined> {
    const [result] = await db
      .select({
        bar: bars,
        user: users
      })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .where(and(eq(bars.id, id), sql`${bars.deletedAt} IS NULL`));
    
    if (!result) return undefined;
    return { ...result.bar, user: result.user as User };
  }

  async getAdoptableBars(): Promise<Array<Bar & { user: User; commentCount: number }>> {
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
          isAdminPlus: users.isAdminPlus,
          isOwner: users.isOwner,
          level: users.level,
        },
        commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.bar_id = ${bars.id})`.as('comment_count'),
      })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .where(and(
        eq(bars.permissionStatus, "open_adopt"),
        sql`${bars.deletedAt} IS NULL`,
        sql`${bars.moderationStatus} != 'removed'`
      ))
      .orderBy(desc(bars.createdAt));
    
    return result.map(row => ({
      ...row.bar,
      user: row.user as any,
      commentCount: Number(row.commentCount) || 0,
    }));
  }

  async getBarsByUser(userId: string): Promise<Array<Bar & { user: User; commentCount: number }>> {
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
          isAdminPlus: users.isAdminPlus,
          isOwner: users.isOwner,
          level: users.level,
        },
        commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.bar_id = ${bars.id})`.as('comment_count'),
      })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .where(and(eq(bars.userId, userId), sql`${bars.deletedAt} IS NULL`))
      .orderBy(desc(bars.createdAt));
    
    return result.map(row => ({
      ...row.bar,
      user: row.user as any,
      commentCount: Number(row.commentCount) || 0,
    }));
  }

  async updateBar(id: string, userId: string, updates: Partial<Pick<Bar, 'content' | 'explanation' | 'category' | 'tags' | 'barType' | 'fullRapLink' | 'beatLink'>>): Promise<Bar | undefined> {
    const [bar] = await db
      .update(bars)
      .set(updates)
      .where(and(eq(bars.id, id), eq(bars.userId, userId)))
      .returning();
    return bar || undefined;
  }

  async deleteBar(id: string, userId: string): Promise<boolean> {
    const result = await db
      .update(bars)
      .set({ deletedAt: new Date(), deletedBy: userId })
      .where(and(eq(bars.id, id), eq(bars.userId, userId), sql`${bars.deletedAt} IS NULL`))
      .returning();
    return result.length > 0;
  }

  async lockBar(id: string, userId: string, proofBarId: string, proofHash: string): Promise<Bar | undefined> {
    const [bar] = await db
      .update(bars)
      .set({ 
        isLocked: true, 
        lockedAt: new Date(),
        proofBarId,
        proofHash,
      })
      .where(and(eq(bars.id, id), eq(bars.userId, userId)))
      .returning();
    return bar || undefined;
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

  async createPasswordResetCode(email: string, code: string): Promise<void> {
    await db.delete(passwordResetCodes).where(eq(passwordResetCodes.email, email));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(passwordResetCodes).values({ email, code, expiresAt });
  }

  async verifyPasswordResetCode(email: string, code: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.email, email),
          eq(passwordResetCodes.code, code),
          gt(passwordResetCodes.expiresAt, new Date())
        )
      );
    return !!result;
  }

  async deletePasswordResetCodes(email: string): Promise<void> {
    await db.delete(passwordResetCodes).where(eq(passwordResetCodes.email, email));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.id));
  }

  async deleteBarAdmin(barId: string, adminId?: string, reason?: string): Promise<boolean> {
    const result = await db
      .update(bars)
      .set({ deletedAt: new Date(), deletedBy: adminId, deletedReason: reason })
      .where(and(eq(bars.id, barId), sql`${bars.deletedAt} IS NULL`))
      .returning();
    return result.length > 0;
  }

  async deleteAllBars(): Promise<void> {
    const ownerUsers = await db.select({ id: users.id }).from(users).where(eq(users.isOwner, true));
    const ownerIds = ownerUsers.map(u => u.id);
    if (ownerIds.length > 0) {
      await db.update(bars)
        .set({ deletedAt: new Date() })
        .where(and(notInArray(bars.userId, ownerIds), sql`${bars.deletedAt} IS NULL`));
    } else {
      await db.update(bars)
        .set({ deletedAt: new Date() })
        .where(sql`${bars.deletedAt} IS NULL`);
    }
  }

  async getDeletedBars(): Promise<Array<Bar & { user: User }>> {
    const result = await db
      .select({ bar: bars, user: users })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .where(sql`${bars.deletedAt} IS NOT NULL`)
      .orderBy(desc(bars.deletedAt));
    return result.map(row => ({ ...row.bar, user: row.user as User }));
  }

  async restoreBar(barId: string): Promise<Bar | undefined> {
    const [bar] = await db
      .update(bars)
      .set({ deletedAt: null, deletedBy: null, deletedReason: null })
      .where(eq(bars.id, barId))
      .returning();
    return bar;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (user?.isOwner) {
      return false;
    }
    await db.delete(bars).where(eq(bars.userId, userId));
    const result = await db.delete(users).where(eq(users.id, userId)).returning();
    return result.length > 0;
  }

  async toggleLike(userId: string, barId: string): Promise<boolean> {
    console.log(`[STORAGE] toggleLike called: userId=${userId}, barId=${barId}`);
    const [existing] = await db.select().from(likes).where(and(eq(likes.userId, userId), eq(likes.barId, barId)));
    if (existing) {
      await db.delete(likes).where(eq(likes.id, existing.id));
      console.log(`[STORAGE] User ${userId} unliked bar ${barId}`);
      return false;
    } else {
      // Remove dislike if exists (mutual exclusivity)
      await db.delete(dislikes).where(and(eq(dislikes.userId, userId), eq(dislikes.barId, barId)));
      const [inserted] = await db.insert(likes).values({ userId, barId }).returning();
      console.log(`[STORAGE] User ${userId} liked bar ${barId}, inserted:`, inserted);
      return true;
    }
  }

  async getLikeCount(barId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(likes).where(eq(likes.barId, barId));
    return result?.count || 0;
  }
  
  // Get like count excluding self-likes (for achievement calculations)
  async getLikeCountExcludingSelf(barId: string, barOwnerId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(likes)
      .where(and(
        eq(likes.barId, barId),
        ne(likes.userId, barOwnerId) // Exclude self-likes
      ));
    return result?.count || 0;
  }

  async hasUserLiked(userId: string, barId: string): Promise<boolean> {
    const [existing] = await db.select().from(likes).where(and(eq(likes.userId, userId), eq(likes.barId, barId)));
    return !!existing;
  }

  async toggleDislike(userId: string, barId: string): Promise<boolean> {
    const [existing] = await db.select().from(dislikes).where(and(eq(dislikes.userId, userId), eq(dislikes.barId, barId)));
    if (existing) {
      await db.delete(dislikes).where(eq(dislikes.id, existing.id));
      console.log(`[STORAGE] User ${userId} undisliked bar ${barId}`);
      return false;
    } else {
      // Remove like if exists (mutual exclusivity)
      await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.barId, barId)));
      await db.insert(dislikes).values({ userId, barId });
      console.log(`[STORAGE] User ${userId} disliked bar ${barId}`);
      return true;
    }
  }

  async getDislikeCount(barId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(dislikes).where(eq(dislikes.barId, barId));
    return result?.count || 0;
  }

  async hasUserDisliked(userId: string, barId: string): Promise<boolean> {
    const [existing] = await db.select().from(dislikes).where(and(eq(dislikes.userId, userId), eq(dislikes.barId, barId)));
    return !!existing;
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  async getComments(barId: string): Promise<Array<Comment & { user: Pick<User, 'id' | 'username' | 'avatarUrl'>; likeCount: number }>> {
    const result = await db
      .select({
        comment: comments,
        user: { id: users.id, username: users.username, avatarUrl: users.avatarUrl },
        likeCount: sql<number>`(SELECT COUNT(*) FROM comment_likes WHERE comment_id = ${comments.id})`.as('likeCount')
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.barId, barId))
      .orderBy(desc(comments.createdAt));
    return result.map(r => ({ ...r.comment, user: r.user as any, likeCount: Number(r.likeCount) || 0 }));
  }

  async deleteComment(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(comments).where(and(eq(comments.id, id), eq(comments.userId, userId))).returning();
    return result.length > 0;
  }

  async getCommentCount(barId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(comments).where(eq(comments.barId, barId));
    return result?.count || 0;
  }

  async toggleCommentLike(userId: string, commentId: string): Promise<boolean> {
    const [existing] = await db.select().from(commentLikes).where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)));
    if (existing) {
      await db.delete(commentLikes).where(eq(commentLikes.id, existing.id));
      return false;
    } else {
      // Remove dislike if exists (mutual exclusivity)
      await db.delete(commentDislikes).where(and(eq(commentDislikes.userId, userId), eq(commentDislikes.commentId, commentId)));
      await db.insert(commentLikes).values({ userId, commentId });
      return true;
    }
  }

  async getCommentLikeCount(commentId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(commentLikes).where(eq(commentLikes.commentId, commentId));
    return result?.count || 0;
  }

  async hasUserLikedComment(userId: string, commentId: string): Promise<boolean> {
    const [existing] = await db.select().from(commentLikes).where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)));
    return !!existing;
  }

  async toggleCommentDislike(userId: string, commentId: string): Promise<boolean> {
    const [existing] = await db.select().from(commentDislikes).where(and(eq(commentDislikes.userId, userId), eq(commentDislikes.commentId, commentId)));
    if (existing) {
      await db.delete(commentDislikes).where(eq(commentDislikes.id, existing.id));
      return false;
    } else {
      // Remove like if exists (mutual exclusivity)
      await db.delete(commentLikes).where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)));
      await db.insert(commentDislikes).values({ userId, commentId });
      return true;
    }
  }

  async getCommentDislikeCount(commentId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(commentDislikes).where(eq(commentDislikes.commentId, commentId));
    return result?.count || 0;
  }

  async hasUserDislikedComment(userId: string, commentId: string): Promise<boolean> {
    const [existing] = await db.select().from(commentDislikes).where(and(eq(commentDislikes.userId, userId), eq(commentDislikes.commentId, commentId)));
    return !!existing;
  }

  async getCommentById(commentId: string): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
    return comment || undefined;
  }

  async followUser(followerId: string, followingId: string): Promise<boolean> {
    if (followerId === followingId) return false;
    try {
      await db.insert(follows).values({ followerId, followingId }).onConflictDoNothing();
      const [existing] = await db.select().from(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
      return !!existing;
    } catch {
      return false;
    }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const result = await db.delete(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))).returning();
    return result.length > 0;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [existing] = await db.select().from(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return !!existing;
  }

  async getFollowersCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(follows).where(eq(follows.followingId, userId));
    return result?.count || 0;
  }

  async getFollowingCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(follows).where(eq(follows.followerId, userId));
    return result?.count || 0;
  }

  async getBarsCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(bars).where(eq(bars.userId, userId));
    return result?.count || 0;
  }

  async getFollowers(userId: string): Promise<string[]> {
    const result = await db.select({ followerId: follows.followerId }).from(follows).where(eq(follows.followingId, userId));
    return result.map(r => r.followerId);
  }

  async createNotification(data: { userId: string; type: string; actorId?: string; barId?: string; commentId?: string; message: string }): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  }

  async getNotifications(userId: string, limit = 50): Promise<Array<Notification & { actor?: Pick<User, 'id' | 'username' | 'avatarUrl'> }>> {
    const result = await db
      .select({
        notification: notifications,
        actor: { id: users.id, username: users.username, avatarUrl: users.avatarUrl }
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.actorId, users.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return result.map(r => ({ ...r.notification, actor: r.actor || undefined }));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return result?.count || 0;
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    const result = await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId))).returning();
    return result.length > 0;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async searchBars(query: string, limit = 50): Promise<Array<Bar & { user: User; commentCount: number }>> {
    const searchPattern = `%${query}%`;
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
          isAdminPlus: users.isAdminPlus,
          isOwner: users.isOwner,
        },
        commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.bar_id = ${bars.id})`.as('comment_count'),
      })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .where(
        and(
          sql`${bars.deletedAt} IS NULL`,
          or(
            ilike(bars.content, searchPattern),
            ilike(users.username, searchPattern),
            sql`${bars.tags}::text ILIKE ${searchPattern}`
          )
        )
      )
      .orderBy(desc(bars.createdAt))
      .limit(limit);
    
    return result.map(row => ({
      ...row.bar,
      user: row.user as any,
      commentCount: Number(row.commentCount) || 0,
    }));
  }

  async searchUsers(query: string, limit = 20): Promise<Array<Pick<User, 'id' | 'username' | 'avatarUrl' | 'bio' | 'membershipTier'>>> {
    const searchPattern = `%${query}%`;
    return db
      .select({
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        membershipTier: users.membershipTier,
      })
      .from(users)
      .where(
        or(
          ilike(users.username, searchPattern),
          ilike(users.bio, searchPattern)
        )
      )
      .limit(limit);
  }

  async searchTags(query: string, limit = 10): Promise<string[]> {
    const result = await db
      .select({ tags: bars.tags })
      .from(bars)
      .where(sql`${bars.tags} IS NOT NULL AND array_length(${bars.tags}, 1) > 0 AND ${bars.deletedAt} IS NULL`);
    const tagSet = new Set<string>();
    const lowerQuery = query.toLowerCase();
    for (const row of result) {
      if (row.tags) {
        for (const tag of row.tags) {
          const lowerTag = tag.toLowerCase();
          if (lowerTag.includes(lowerQuery)) {
            tagSet.add(lowerTag);
          }
        }
      }
    }
    return Array.from(tagSet).slice(0, limit);
  }

  async getBarsByTag(tag: string): Promise<Array<Bar & { user: User; commentCount: number }>> {
    const lowerTag = tag.toLowerCase();
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
          isAdminPlus: users.isAdminPlus,
          isOwner: users.isOwner,
        },
        commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.bar_id = ${bars.id})`.as('comment_count'),
      })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .where(and(sql`LOWER(${lowerTag}) = ANY(SELECT LOWER(unnest(${bars.tags})))`, sql`${bars.deletedAt} IS NULL`))
      .orderBy(desc(bars.createdAt));
    return result.map(r => ({
      ...r.bar,
      user: r.user as User,
      commentCount: Number(r.commentCount) || 0,
    }));
  }

  async toggleBookmark(userId: string, barId: string): Promise<boolean> {
    const [existing] = await db.select().from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.barId, barId)));
    if (existing) {
      await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
      return false;
    } else {
      await db.insert(bookmarks).values({ userId, barId });
      return true;
    }
  }

  async hasUserBookmarked(userId: string, barId: string): Promise<boolean> {
    const [existing] = await db.select().from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.barId, barId)));
    return !!existing;
  }

  async getUserLikes(userId: string): Promise<Array<Bar & { user: User; commentCount: number }>> {
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
          isAdminPlus: users.isAdminPlus,
          isOwner: users.isOwner,
        },
        commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.bar_id = ${bars.id})`.as('comment_count'),
      })
      .from(likes)
      .innerJoin(bars, eq(likes.barId, bars.id))
      .leftJoin(users, eq(bars.userId, users.id))
      .where(and(eq(likes.userId, userId), sql`${bars.deletedAt} IS NULL`))
      .orderBy(desc(likes.createdAt));

    return result.map(row => ({
      ...row.bar,
      user: row.user as any,
      commentCount: Number(row.commentCount) || 0,
    }));
  }

  async getUserBookmarks(userId: string): Promise<Array<Bar & { user: User; commentCount: number }>> {
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
          isAdminPlus: users.isAdminPlus,
          isOwner: users.isOwner,
        },
        commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.bar_id = ${bars.id})`.as('comment_count'),
        bookmarkCreatedAt: bookmarks.createdAt,
      })
      .from(bookmarks)
      .innerJoin(bars, eq(bookmarks.barId, bars.id))
      .leftJoin(users, eq(bars.userId, users.id))
      .where(and(eq(bookmarks.userId, userId), sql`${bars.deletedAt} IS NULL`))
      .orderBy(desc(bookmarks.createdAt));
    
    return result.map(row => ({
      ...row.bar,
      user: row.user as any,
      commentCount: Number(row.commentCount) || 0,
    }));
  }

  async savePushSubscription(userId: string, subscription: { endpoint: string; p256dh: string; auth: string }): Promise<PushSubscription> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    const [sub] = await db.insert(pushSubscriptions).values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    }).returning();
    return sub;
  }

  async deletePushSubscription(userId: string, endpoint: string): Promise<boolean> {
    const result = await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint))).returning();
    return result.length > 0;
  }

  async getPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async sendFriendRequest(requesterId: string, receiverId: string): Promise<Friendship> {
    const [existing] = await db.select().from(friendships).where(
      or(
        and(eq(friendships.requesterId, requesterId), eq(friendships.receiverId, receiverId)),
        and(eq(friendships.requesterId, receiverId), eq(friendships.receiverId, requesterId))
      )
    );
    if (existing) {
      // If the other user already sent us a pending request, auto-accept it
      if (existing.status === "pending" && existing.requesterId === receiverId && existing.receiverId === requesterId) {
        const [accepted] = await db
          .update(friendships)
          .set({ status: "accepted" })
          .where(eq(friendships.id, existing.id))
          .returning();
        return accepted;
      }
      throw new Error("Friendship already exists or pending");
    }
    const [friendship] = await db.insert(friendships).values({
      requesterId,
      receiverId,
      status: "pending",
    }).returning();
    return friendship;
  }

  async acceptFriendRequest(friendshipId: string, userId: string): Promise<Friendship | undefined> {
    const [result] = await db
      .update(friendships)
      .set({ status: "accepted" })
      .where(and(eq(friendships.id, friendshipId), eq(friendships.receiverId, userId), eq(friendships.status, "pending")))
      .returning();
    return result;
  }

  async createAutoFriendship(userId1: string, userId2: string): Promise<Friendship | null> {
    if (userId1 === userId2) return null;
    const [existing] = await db.select().from(friendships).where(
      or(
        and(eq(friendships.requesterId, userId1), eq(friendships.receiverId, userId2)),
        and(eq(friendships.requesterId, userId2), eq(friendships.receiverId, userId1))
      )
    );
    if (existing) return null;
    const [friendship] = await db.insert(friendships).values({
      requesterId: userId1,
      receiverId: userId2,
      status: "accepted",
    }).returning();
    return friendship;
  }

  async declineFriendRequest(friendshipId: string, userId: string): Promise<boolean> {
    const result = await db.delete(friendships)
      .where(and(eq(friendships.id, friendshipId), eq(friendships.receiverId, userId), eq(friendships.status, "pending")))
      .returning();
    return result.length > 0;
  }

  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    const result = await db.delete(friendships)
      .where(
        and(
          eq(friendships.status, "accepted"),
          or(
            and(eq(friendships.requesterId, userId), eq(friendships.receiverId, friendId)),
            and(eq(friendships.requesterId, friendId), eq(friendships.receiverId, userId))
          )
        )
      )
      .returning();
    return result.length > 0;
  }

  async getFriends(userId: string): Promise<Array<User & { friendshipId: string; isRecentlyActive: boolean }>> {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const result = await db
      .select({ friendship: friendships, user: users })
      .from(friendships)
      .leftJoin(users, or(
        and(eq(friendships.requesterId, userId), eq(users.id, friendships.receiverId)),
        and(eq(friendships.receiverId, userId), eq(users.id, friendships.requesterId))
      ))
      .where(and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.requesterId, userId), eq(friendships.receiverId, userId))
      ));
    return result.filter(r => r.user).map(r => ({ 
      ...r.user!, 
      friendshipId: r.friendship.id,
      isRecentlyActive: r.user!.lastSeenAt ? new Date(r.user!.lastSeenAt) > twoMinutesAgo : false
    }));
  }

  async getPendingRequests(userId: string): Promise<Array<Friendship & { requester: Pick<User, 'id' | 'username' | 'avatarUrl'> }>> {
    const result = await db
      .select({
        friendship: friendships,
        requester: { id: users.id, username: users.username, avatarUrl: users.avatarUrl },
      })
      .from(friendships)
      .leftJoin(users, eq(friendships.requesterId, users.id))
      .where(and(eq(friendships.receiverId, userId), eq(friendships.status, "pending")));
    return result.map(r => ({ ...r.friendship, requester: r.requester as any }));
  }

  async getFriendshipStatus(userId: string, otherId: string): Promise<{ status: string; friendshipId?: string } | null> {
    const [friendship] = await db.select().from(friendships).where(
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.receiverId, otherId)),
        and(eq(friendships.requesterId, otherId), eq(friendships.receiverId, userId))
      )
    );
    if (!friendship) return null;
    return { status: friendship.status, friendshipId: friendship.id };
  }

  async sendMessage(senderId: string, receiverId: string, content: string): Promise<DirectMessage> {
    const [message] = await db.insert(directMessages).values({
      senderId,
      receiverId,
      content,
    }).returning();
    return message;
  }

  async getConversation(userId: string, otherId: string, limit = 50): Promise<DirectMessage[]> {
    return db.select().from(directMessages).where(
      or(
        and(eq(directMessages.senderId, userId), eq(directMessages.receiverId, otherId)),
        and(eq(directMessages.senderId, otherId), eq(directMessages.receiverId, userId))
      )
    ).orderBy(desc(directMessages.createdAt)).limit(limit);
  }

  async getConversations(userId: string): Promise<Array<{ user: Pick<User, 'id' | 'username' | 'avatarUrl' | 'onlineStatus' | 'lastSeenAt'>; lastMessage: DirectMessage; unreadCount: number }>> {
    const messages = await db.select().from(directMessages).where(
      or(eq(directMessages.senderId, userId), eq(directMessages.receiverId, userId))
    ).orderBy(desc(directMessages.createdAt));

    const conversationsMap = new Map<string, { lastMessage: DirectMessage; unreadCount: number }>();
    for (const msg of messages) {
      const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!conversationsMap.has(otherId)) {
        const unread = messages.filter(m => m.senderId === otherId && m.receiverId === userId && !m.readAt).length;
        conversationsMap.set(otherId, { lastMessage: msg, unreadCount: unread });
      }
    }

    const result: Array<{ user: Pick<User, 'id' | 'username' | 'avatarUrl' | 'onlineStatus' | 'lastSeenAt'>; lastMessage: DirectMessage; unreadCount: number }> = [];
    const entries = Array.from(conversationsMap.entries());
    for (const entry of entries) {
      const otherId = entry[0];
      const data = entry[1];
      const [user] = await db.select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl, onlineStatus: users.onlineStatus, lastSeenAt: users.lastSeenAt }).from(users).where(eq(users.id, otherId));
      if (user) {
        result.push({ user, ...data });
      }
    }
    return result;
  }

  async markMessagesRead(userId: string, senderId: string): Promise<void> {
    await db.update(directMessages)
      .set({ readAt: new Date() })
      .where(and(eq(directMessages.receiverId, userId), eq(directMessages.senderId, senderId), sql`${directMessages.readAt} IS NULL`));
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(directMessages)
      .where(and(eq(directMessages.receiverId, userId), sql`${directMessages.readAt} IS NULL`));
    return result?.count || 0;
  }

  async updateOnlineStatus(userId: string, status: string): Promise<void> {
    await db.update(users).set({ onlineStatus: status, lastSeenAt: new Date() }).where(eq(users.id, userId));
  }

  async getOnlineUsersCount(): Promise<number> {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const [result] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          or(eq(users.onlineStatus, "online"), eq(users.onlineStatus, "busy")),
          gt(users.lastSeenAt, twoMinutesAgo)
        )
      );
    return result?.count || 0;
  }

  async updateLastSeen(userId: string): Promise<void> {
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, userId));
  }

  async getNextBarSequence(): Promise<number> {
    const [existing] = await db.select().from(barSequence).where(eq(barSequence.id, "singleton"));
    if (!existing) {
      await db.insert(barSequence).values({ id: "singleton", currentValue: 1 });
      return 1;
    }
    const nextValue = existing.currentValue + 1;
    await db.update(barSequence).set({ currentValue: nextValue }).where(eq(barSequence.id, "singleton"));
    return nextValue;
  }

  async findSimilarBars(content: string, threshold = 0.8): Promise<Array<{ bar: Bar; similarity: number }>> {
    const allBars = await db.select().from(bars);
    const normalizedContent = this.normalizeText(content);
    const results: Array<{ bar: Bar; similarity: number }> = [];
    
    for (const bar of allBars) {
      const normalizedBar = this.normalizeText(bar.content);
      const similarity = this.calculateSimilarity(normalizedContent, normalizedBar);
      if (similarity >= threshold) {
        results.push({ bar, similarity });
      }
    }
    return results.sort((a, b) => b.similarity - a.similarity);
  }

  private normalizeText(text: string): string {
    const doc = text.replace(/<[^>]*>/g, '');
    return doc.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  }

  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;
    const wordsA = a.split(' ');
    const wordsB = b.split(' ');
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    const intersection = wordsA.filter(x => setB.has(x));
    const unionSet = new Set(wordsA.concat(wordsB));
    return intersection.length / unionSet.size;
  }

  async createAdoption(originalBarId: string, adoptedByBarId: string, adoptedByUserId: string): Promise<Adoption> {
    const [adoption] = await db.insert(adoptions).values({
      originalBarId,
      adoptedByBarId,
      adoptedByUserId,
    }).returning();
    return adoption;
  }

  async getAdoptionsByOriginal(barId: string): Promise<Adoption[]> {
    return db.select().from(adoptions).where(eq(adoptions.originalBarId, barId)).orderBy(desc(adoptions.createdAt));
  }

  async getAdoptedFromBar(barId: string): Promise<Adoption | undefined> {
    const [adoption] = await db.select().from(adoptions).where(eq(adoptions.adoptedByBarId, barId));
    return adoption || undefined;
  }

  async getBarByProofId(proofBarId: string): Promise<(Bar & { user: User }) | undefined> {
    const [result] = await db
      .select({ bar: bars, user: users })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .where(and(eq(bars.proofBarId, proofBarId), sql`${bars.deletedAt} IS NULL`));
    if (!result) return undefined;
    return { ...result.bar, user: result.user as User };
  }

  async getTopBars(limit: number = 50): Promise<Array<Bar & { user: Pick<User, 'id' | 'username' | 'avatarUrl' | 'membershipTier'>; score: number }>> {
    const allBars = await db
      .select({ 
        bar: bars, 
        user: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
          membershipTier: users.membershipTier,
        }
      })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .where(and(ne(bars.permissionStatus, "private"), sql`${bars.deletedAt} IS NULL`));
    
    const barsWithScores = await Promise.all(
      allBars.map(async (result) => {
        const likeCount = await this.getLikeCount(result.bar.id);
        const commentCount = await this.getCommentCount(result.bar.id);
        const bookmarkCount = await db.select({ count: count() }).from(bookmarks).where(eq(bookmarks.barId, result.bar.id));
        const score = (likeCount * 3) + (commentCount * 2) + (bookmarkCount[0]?.count || 0);
        return {
          ...result.bar,
          user: result.user as Pick<User, 'id' | 'username' | 'avatarUrl' | 'membershipTier'>,
          score,
        };
      })
    );
    
    return barsWithScores
      .sort((a, b) => b.score - a.score || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getTrendingBars(limit: number = 50): Promise<Array<Bar & { user: Pick<User, 'id' | 'username' | 'avatarUrl' | 'membershipTier'>; velocity: number }>> {
    const now = new Date();
    const hoursAgo72 = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const hoursAgo24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentBars = await db
      .select({ 
        bar: bars, 
        user: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
          membershipTier: users.membershipTier,
        }
      })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .where(and(
        gt(bars.createdAt, hoursAgo72),
        ne(bars.permissionStatus, "private"),
        sql`${bars.deletedAt} IS NULL`
      ));
    
    const barsWithVelocity = await Promise.all(
      recentBars.map(async (result) => {
        const recentLikes = await db
          .select({ count: count() })
          .from(likes)
          .where(and(eq(likes.barId, result.bar.id), gt(likes.createdAt, hoursAgo24)));
        
        const recentComments = await db
          .select({ count: count() })
          .from(comments)
          .where(and(eq(comments.barId, result.bar.id), gt(comments.createdAt, hoursAgo24)));
        
        const hoursOld = Math.max(1, (now.getTime() - new Date(result.bar.createdAt).getTime()) / (1000 * 60 * 60));
        const engagementIn24h = (recentLikes[0]?.count || 0) * 3 + (recentComments[0]?.count || 0) * 2;
        const velocity = engagementIn24h / hoursOld;
        
        return {
          ...result.bar,
          user: result.user as Pick<User, 'id' | 'username' | 'avatarUrl' | 'membershipTier'>,
          velocity,
        };
      })
    );
    
    return barsWithVelocity
      .filter(bar => bar.velocity > 0 || new Date(bar.createdAt).getTime() > hoursAgo24.getTime())
      .sort((a, b) => b.velocity - a.velocity || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getFeaturedBars(limit: number = 20): Promise<Array<Bar & { user: Pick<User, 'id' | 'username' | 'avatarUrl' | 'membershipTier'> }>> {
    const featuredResults = await db
      .select({ 
        bar: bars, 
        user: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
          membershipTier: users.membershipTier,
        }
      })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .where(and(eq(bars.isFeatured, true), sql`${bars.deletedAt} IS NULL`))
      .orderBy(desc(bars.featuredAt))
      .limit(limit);
    
    if (featuredResults.length === 0) {
      const topBars = await this.getTopBars(limit);
      return topBars.map(({ score, ...bar }) => bar);
    }
    
    return featuredResults.map(result => ({
      ...result.bar,
      user: result.user as Pick<User, 'id' | 'username' | 'avatarUrl' | 'membershipTier'>,
    }));
  }

  async setBarFeatured(barId: string, featured: boolean): Promise<Bar | undefined> {
    const [updatedBar] = await db
      .update(bars)
      .set({
        isFeatured: featured,
        featuredAt: featured ? new Date() : null,
      })
      .where(eq(bars.id, barId))
      .returning();
    return updatedBar || undefined;
  }

  async getUserStats(userId: string): Promise<{ barsMinted: number; likesReceived: number; followers: number; topBarLikes: number }> {
    const [barsCount] = await db
      .select({ count: count() })
      .from(bars)
      .where(eq(bars.userId, userId));
    
    const [followersCount] = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, userId));
    
    const userBars = await db
      .select({ id: bars.id })
      .from(bars)
      .where(eq(bars.userId, userId));
    
    const barIds = userBars.map(b => b.id);
    
    let likesReceived = 0;
    let topBarLikes = 0;
    
    if (barIds.length > 0) {
      // Exclude self-likes: don't count likes where the liker is the bar owner
      const likeCounts = await db
        .select({ barId: likes.barId, count: count() })
        .from(likes)
        .where(and(
          sql`${likes.barId} IN (${sql.join(barIds.map(id => sql`${id}`), sql`, `)})`,
          ne(likes.userId, userId) // Exclude self-likes
        ))
        .groupBy(likes.barId);
      
      for (const lc of likeCounts) {
        likesReceived += lc.count;
        if (lc.count > topBarLikes) {
          topBarLikes = lc.count;
        }
      }
    }
    
    return {
      barsMinted: barsCount?.count || 0,
      likesReceived,
      followers: followersCount?.count || 0,
      topBarLikes,
    };
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.unlockedAt));
  }

  async unlockAchievement(userId: string, achievementId: AchievementId): Promise<UserAchievement | null> {
    try {
      const [achievement] = await db
        .insert(userAchievements)
        .values({ userId, achievementId })
        .onConflictDoNothing()
        .returning();
      return achievement || null;
    } catch {
      return null;
    }
  }

  async checkAndUnlockAchievements(userId: string): Promise<AchievementId[]> {
    const stats = await this.getUserStats(userId);
    const existingAchievements = await this.getUserAchievements(userId);
    const existingIds = new Set(existingAchievements.map(a => a.achievementId));
    
    // Lazy-load full metrics only if needed for new achievements
    let metrics: UserMetrics | null = null;
    
    const newlyUnlocked: AchievementId[] = [];
    
    for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
      if (existingIds.has(id)) continue;
      
      const threshold = achievement.threshold as Record<string, number>;
      let unlocked = false;
      
      // Original thresholds (use stats for efficiency)
      if ('barsMinted' in threshold && stats.barsMinted >= threshold.barsMinted) {
        unlocked = true;
      } else if ('likesReceived' in threshold && stats.likesReceived >= threshold.likesReceived) {
        unlocked = true;
      } else if ('followers' in threshold && stats.followers >= threshold.followers) {
        unlocked = true;
      } else if ('topBarLikes' in threshold && stats.topBarLikes >= threshold.topBarLikes) {
        unlocked = true;
      } else {
        // New thresholds require full metrics
        if (!metrics) {
          metrics = await this.getUserMetricsForAchievements(userId);
        }
        
        // Engagement & Virality
        if ('topBarEngagement' in threshold && metrics.top_bar_engagement >= threshold.topBarEngagement) {
          unlocked = true;
        } else if ('topBarComments' in threshold && metrics.single_bar_comments >= threshold.topBarComments) {
          unlocked = true;
        } else if ('commentsMade' in threshold && metrics.comments_made >= threshold.commentsMade) {
          unlocked = true;
        } else if ('barsAdoptedByOthers' in threshold && metrics.bars_adopted_by_others >= threshold.barsAdoptedByOthers) {
          unlocked = true;
        }
        // Consistency & Streaks
        else if ('streakDays' in threshold && metrics.posting_streak_days >= threshold.streakDays) {
          unlocked = true;
        } else if ('weekendBars' in threshold && metrics.weekend_bars >= threshold.weekendBars) {
          unlocked = true;
        } else if ('midnightBars' in threshold && metrics.midnight_bars >= threshold.midnightBars) {
          unlocked = true;
        }
        // Community & Social
        else if ('adoptionsGiven' in threshold && metrics.adoptions_given >= threshold.adoptionsGiven) {
          unlocked = true;
        } else if ('commentLikesReceived' in threshold && metrics.comment_likes_received >= threshold.commentLikesReceived) {
          unlocked = true;
        } else if ('following' in threshold && metrics.following_count >= threshold.following) {
          unlocked = true;
        }
        // Platform Health
        else if ('cleanDays' in threshold && metrics.days_without_violations >= threshold.cleanDays) {
          unlocked = true;
        }
        // Special
        else if ('accountAgeDays' in threshold && metrics.account_age_days >= threshold.accountAgeDays) {
          unlocked = true;
        } else if ('underdogBar' in threshold) {
          // Check underdog: bar with 50+ likes from user with <50 followers at time of check
          if (stats.followers < 50 && stats.topBarLikes >= 50) {
            unlocked = true;
          }
        }
      }
      
      if (unlocked) {
        const result = await this.unlockAchievement(userId, id as AchievementId);
        if (result) {
          newlyUnlocked.push(id as AchievementId);
        }
      }
    }
    
    // Also check custom achievements
    const customUnlocked = await this.checkCustomAchievements(userId);
    newlyUnlocked.push(...(customUnlocked as AchievementId[]));
    
    return newlyUnlocked;
  }

  async createReport(data: { reporterId: string; barId?: string; commentId?: string; userId?: string; reason: string; details?: string }): Promise<Report> {
    const [report] = await db
      .insert(reports)
      .values(data)
      .returning();
    return report;
  }

  async getReports(status?: string): Promise<Array<Report & { reporter: Pick<User, 'id' | 'username'>; bar?: Bar; reportedUser?: Pick<User, 'id' | 'username'> }>> {
    let query = db
      .select({
        report: reports,
        reporter: {
          id: users.id,
          username: users.username,
        },
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .orderBy(desc(reports.createdAt));

    const results = status 
      ? await query.where(eq(reports.status, status))
      : await query;

    const enrichedReports = await Promise.all(
      results.map(async (r) => {
        let bar: Bar | undefined;
        let reportedUser: Pick<User, 'id' | 'username'> | undefined;

        if (r.report.barId) {
          const [barResult] = await db.select().from(bars).where(eq(bars.id, r.report.barId));
          bar = barResult;
        }

        if (r.report.userId) {
          const [userResult] = await db.select({ id: users.id, username: users.username }).from(users).where(eq(users.id, r.report.userId));
          reportedUser = userResult;
        }

        return {
          ...r.report,
          reporter: r.reporter,
          bar,
          reportedUser,
        };
      })
    );

    return enrichedReports;
  }

  async updateReportStatus(reportId: string, status: string, reviewedBy: string): Promise<Report | undefined> {
    const [report] = await db
      .update(reports)
      .set({ 
        status, 
        reviewedBy, 
        reviewedAt: new Date() 
      })
      .where(eq(reports.id, reportId))
      .returning();
    return report;
  }

  async getFlaggedPhrases(): Promise<FlaggedPhrase[]> {
    return await db
      .select()
      .from(flaggedPhrases)
      .where(eq(flaggedPhrases.isActive, true))
      .orderBy(desc(flaggedPhrases.createdAt));
  }

  async createFlaggedPhrase(data: { phrase: string; normalizedPhrase: string; severity: string; similarityThreshold: number; notes?: string; createdBy?: string }): Promise<FlaggedPhrase> {
    const [phrase] = await db
      .insert(flaggedPhrases)
      .values(data)
      .returning();
    return phrase;
  }

  async updateFlaggedPhrase(id: string, updates: Partial<FlaggedPhrase>): Promise<FlaggedPhrase | undefined> {
    const [phrase] = await db
      .update(flaggedPhrases)
      .set(updates)
      .where(eq(flaggedPhrases.id, id))
      .returning();
    return phrase;
  }

  async deleteFlaggedPhrase(id: string): Promise<boolean> {
    const result = await db
      .delete(flaggedPhrases)
      .where(eq(flaggedPhrases.id, id));
    return true;
  }

  async getPendingModerationBars(): Promise<Array<Bar & { user: User; matchedPhrase?: FlaggedPhrase }>> {
    const result = await db
      .select({
        bar: bars,
        user: users,
      })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .where(eq(bars.moderationStatus, 'pending_review'))
      .orderBy(desc(bars.createdAt));

    const enriched = await Promise.all(
      result.map(async (r) => {
        let matchedPhrase: FlaggedPhrase | undefined;
        if (r.bar.moderationPhraseId) {
          const [phrase] = await db
            .select()
            .from(flaggedPhrases)
            .where(eq(flaggedPhrases.id, r.bar.moderationPhraseId));
          matchedPhrase = phrase;
        }
        return {
          ...r.bar,
          user: r.user as User,
          matchedPhrase,
        };
      })
    );

    return enriched;
  }

  async updateBarModerationStatus(barId: string, status: string): Promise<Bar | undefined> {
    const [bar] = await db
      .update(bars)
      .set({ moderationStatus: status })
      .where(eq(bars.id, barId))
      .returning();
    return bar;
  }

  async getMaintenanceStatus(): Promise<MaintenanceStatus | null> {
    const [status] = await db.select().from(maintenanceStatus).where(eq(maintenanceStatus.id, 'singleton'));
    if (!status || !status.isActive) return null;
    return status;
  }

  async activateMaintenance(message: string, userId: string): Promise<MaintenanceStatus> {
    const activatedAt = new Date();
    const [result] = await db
      .insert(maintenanceStatus)
      .values({ id: 'singleton', isActive: true, message, activatedAt, activatedBy: userId })
      .onConflictDoUpdate({
        target: maintenanceStatus.id,
        set: { isActive: true, message, activatedAt, activatedBy: userId }
      })
      .returning();
    return result;
  }

  async clearMaintenance(): Promise<void> {
    await db
      .update(maintenanceStatus)
      .set({ isActive: false, message: null, activatedAt: null, activatedBy: null })
      .where(eq(maintenanceStatus.id, 'singleton'));
  }

  async recordBarUsage(barId: string, userId: string, usageLink?: string, comment?: string): Promise<BarUsage> {
    const [usage] = await db
      .insert(barUsages)
      .values({ barId, userId, usageLink: usageLink || null, comment: comment || null })
      .returning();
    return usage;
  }

  async getBarUsages(barId: string): Promise<Array<BarUsage & { user: Pick<User, 'id' | 'username' | 'avatarUrl'> }>> {
    const result = await db
      .select({
        usage: barUsages,
        user: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(barUsages)
      .innerJoin(users, eq(barUsages.userId, users.id))
      .where(eq(barUsages.barId, barId))
      .orderBy(desc(barUsages.createdAt));
    
    return result.map(r => ({ ...r.usage, user: r.user }));
  }

  async getBarUsageCount(barId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(barUsages)
      .where(eq(barUsages.barId, barId));
    return result?.count || 0;
  }

  async getUserAdoptions(userId: string): Promise<Array<BarUsage & { bar: Bar & { user: Pick<User, 'id' | 'username' | 'avatarUrl'> } }>> {
    const result = await db
      .select({
        usage: barUsages,
        bar: bars,
        barUser: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(barUsages)
      .innerJoin(bars, eq(barUsages.barId, bars.id))
      .innerJoin(users, eq(bars.userId, users.id))
      .where(eq(barUsages.userId, userId))
      .orderBy(desc(barUsages.createdAt));
    
    return result.map(r => ({ 
      ...r.usage, 
      bar: { ...r.bar, user: r.barUser }
    }));
  }

  // Custom achievement methods
  async getCustomAchievements(): Promise<CustomAchievement[]> {
    return db.select().from(customAchievements).orderBy(desc(customAchievements.createdAt));
  }

  async getActiveCustomAchievements(): Promise<CustomAchievement[]> {
    // Only return achievements that are both active AND approved
    return db.select().from(customAchievements).where(
      and(
        eq(customAchievements.isActive, true),
        eq(customAchievements.approvalStatus, "approved")
      )
    );
  }

  async getPendingAchievements(): Promise<Array<CustomAchievement & { creator?: { username: string } }>> {
    const results = await db
      .select({
        achievement: customAchievements,
        creatorUsername: users.username,
      })
      .from(customAchievements)
      .leftJoin(users, eq(customAchievements.createdBy, users.id))
      .where(eq(customAchievements.approvalStatus, "pending"))
      .orderBy(desc(customAchievements.createdAt));
    
    return results.map(r => ({
      ...r.achievement,
      creator: r.creatorUsername ? { username: r.creatorUsername } : undefined,
    }));
  }

  async createCustomAchievement(data: InsertCustomAchievement): Promise<CustomAchievement> {
    const [achievement] = await db.insert(customAchievements).values(data).returning();
    return achievement;
  }

  async approveAchievement(id: string): Promise<CustomAchievement | undefined> {
    const [achievement] = await db
      .update(customAchievements)
      .set({ approvalStatus: "approved" })
      .where(eq(customAchievements.id, id))
      .returning();
    return achievement;
  }

  async rejectAchievement(id: string): Promise<CustomAchievement | undefined> {
    const [achievement] = await db
      .update(customAchievements)
      .set({ approvalStatus: "rejected" })
      .where(eq(customAchievements.id, id))
      .returning();
    return achievement;
  }

  async updateCustomAchievement(id: string, updates: Partial<CustomAchievement>): Promise<CustomAchievement | undefined> {
    const [achievement] = await db
      .update(customAchievements)
      .set(updates)
      .where(eq(customAchievements.id, id))
      .returning();
    return achievement;
  }

  async deleteCustomAchievement(id: string): Promise<boolean> {
    const result = await db.delete(customAchievements).where(eq(customAchievements.id, id));
    return true;
  }

  // Get all user metrics for rule tree evaluation
  async getUserMetricsForAchievements(userId: string): Promise<UserMetrics> {
    const stats = await this.getUserStats(userId);
    const followingCount = await this.getFollowingCount(userId);
    
    // Get top bar comments count
    const userBars = await db.select({ id: bars.id, createdAt: bars.createdAt }).from(bars).where(eq(bars.userId, userId));
    let topBarComments = 0;
    for (const bar of userBars) {
      const cnt = await this.getCommentCount(bar.id);
      if (cnt > topBarComments) topBarComments = cnt;
    }
    
    // Get top bar bookmarks count
    const [bookmarkResult] = await db
      .select({ count: count() })
      .from(bookmarks)
      .innerJoin(bars, eq(bookmarks.barId, bars.id))
      .where(eq(bars.userId, userId))
      .groupBy(bookmarks.barId)
      .orderBy(desc(count()))
      .limit(1);
    
    // Get comments made count
    const [commentsMade] = await db
      .select({ count: count() })
      .from(comments)
      .where(eq(comments.userId, userId));
    
    // Get bars adopted count (by user)
    const [barsAdopted] = await db
      .select({ count: count() })
      .from(barUsages)
      .where(eq(barUsages.userId, userId));
    
    // Check controversial bar (exclude self-likes)
    let hasControversialBar = false;
    for (const bar of userBars) {
      const likeCount = await this.getLikeCountExcludingSelf(bar.id, userId);
      const dislikeCount = await this.getDislikeCount(bar.id);
      if (dislikeCount > likeCount && (likeCount + dislikeCount) >= 5) {
        hasControversialBar = true;
        break;
      }
    }
    
    // Check night owl (midnight - 5am)
    const nightBars = await db
      .select({ id: bars.id })
      .from(bars)
      .where(and(
        eq(bars.userId, userId),
        sql`EXTRACT(HOUR FROM ${bars.createdAt}) >= 0 AND EXTRACT(HOUR FROM ${bars.createdAt}) < 5`
      ))
      .limit(1);
    
    // Check early bird
    const earlyBars = await db
      .select({ id: bars.id })
      .from(bars)
      .where(and(
        eq(bars.userId, userId),
        sql`EXTRACT(HOUR FROM ${bars.createdAt}) >= 5 AND EXTRACT(HOUR FROM ${bars.createdAt}) < 8`
      ))
      .limit(1);
    
    // NEW METRICS
    
    // Calculate posting streak days
    let streakDays = 0;
    if (userBars.length > 0) {
      const postDates = userBars
        .map(b => new Date(b.createdAt!).toDateString())
        .filter((v, i, a) => a.indexOf(v) === i) // unique dates
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // newest first
      
      const today = new Date();
      const todayStr = today.toDateString();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      
      // Start counting if posted today or yesterday
      if (postDates[0] === todayStr || postDates[0] === yesterdayStr) {
        let currentDate = new Date(postDates[0]);
        streakDays = 1;
        for (let i = 1; i < postDates.length; i++) {
          const prevDay = new Date(currentDate);
          prevDay.setDate(prevDay.getDate() - 1);
          if (postDates[i] === prevDay.toDateString()) {
            streakDays++;
            currentDate = prevDay;
          } else {
            break;
          }
        }
      }
    }
    
    // Comment likes received
    const [commentLikesResult] = await db
      .select({ count: count() })
      .from(commentLikes)
      .innerJoin(comments, eq(commentLikes.commentId, comments.id))
      .where(eq(comments.userId, userId));
    
    // Adoptions given (bars the user adopted from others)
    const [adoptionsGivenResult] = await db
      .select({ count: count() })
      .from(adoptions)
      .where(eq(adoptions.adoptedByUserId, userId));
    
    // Bars adopted by others (user's bars that were adopted)
    const [barsAdoptedByOthersResult] = await db
      .select({ count: count() })
      .from(adoptions)
      .innerJoin(bars, eq(adoptions.originalBarId, bars.id))
      .where(eq(bars.userId, userId));
    
    // Weekend bars (Fri 8PM to Sun 8PM approximated as Sat/Sun)
    const [weekendBarsResult] = await db
      .select({ count: count() })
      .from(bars)
      .where(and(
        eq(bars.userId, userId),
        sql`EXTRACT(DOW FROM ${bars.createdAt}) IN (0, 6)` // 0=Sunday, 6=Saturday
      ));
    
    // Midnight bars (12AM-5AM)
    const [midnightBarsResult] = await db
      .select({ count: count() })
      .from(bars)
      .where(and(
        eq(bars.userId, userId),
        sql`EXTRACT(HOUR FROM ${bars.createdAt}) >= 0 AND EXTRACT(HOUR FROM ${bars.createdAt}) < 5`
      ));
    
    // Days without violations (since last action_taken report or account creation)
    const user = await this.getUser(userId);
    const accountCreated = user?.createdAt || new Date();
    const [lastViolation] = await db
      .select({ createdAt: reports.createdAt })
      .from(reports)
      .where(and(
        eq(reports.reportedUserId, userId),
        eq(reports.status, 'action_taken')
      ))
      .orderBy(desc(reports.createdAt))
      .limit(1);
    
    const lastViolationDate = lastViolation?.createdAt || accountCreated;
    const cleanDays = Math.floor((Date.now() - new Date(lastViolationDate).getTime()) / (1000 * 60 * 60 * 24));
    
    // Top bar engagement (likes + bookmarks on a single bar)
    let topBarEngagement = 0;
    for (const bar of userBars) {
      const likeCount = await this.getLikeCount(bar.id);
      const [bookmarkCount] = await db
        .select({ count: count() })
        .from(bookmarks)
        .where(eq(bookmarks.barId, bar.id));
      const totalEngagement = likeCount + (bookmarkCount?.count || 0);
      if (totalEngagement > topBarEngagement) {
        topBarEngagement = totalEngagement;
      }
    }
    
    // Account age in days
    const accountAgeDays = Math.floor((Date.now() - new Date(accountCreated).getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      bars_posted: stats.barsMinted,
      likes_received: stats.likesReceived,
      followers_count: stats.followers,
      following_count: followingCount,
      single_bar_likes: stats.topBarLikes,
      single_bar_comments: topBarComments,
      single_bar_bookmarks: bookmarkResult?.count || 0,
      comments_made: commentsMade?.count || 0,
      bars_adopted: barsAdopted?.count || 0,
      controversial_bar: hasControversialBar,
      night_owl: nightBars.length > 0,
      early_bird: earlyBars.length > 0,
      bars_with_keyword: 0, // Handled dynamically via keywordCounts
      // New metrics
      posting_streak_days: streakDays,
      comment_likes_received: commentLikesResult?.count || 0,
      adoptions_given: adoptionsGivenResult?.count || 0,
      bars_adopted_by_others: barsAdoptedByOthersResult?.count || 0,
      weekend_bars: weekendBarsResult?.count || 0,
      midnight_bars: midnightBarsResult?.count || 0,
      days_without_violations: cleanDays,
      top_bar_engagement: topBarEngagement,
      tagged_bars_with_likes: 0, // Handled dynamically
      account_age_days: accountAgeDays,
    };
  }
  
  // Count bars containing a specific keyword
  async countBarsWithKeyword(userId: string, keyword: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(bars)
      .where(and(
        eq(bars.userId, userId),
        ilike(bars.content, `%${keyword}%`)
      ));
    return result?.count || 0;
  }

  async checkCustomAchievements(userId: string): Promise<string[]> {
    const unlockedIds: string[] = [];
    const activeAchievements = await this.getActiveCustomAchievements();
    const existingAchievements = await this.getUserAchievements(userId);
    const existingIds = new Set(existingAchievements.map(a => a.achievementId));
    
    // Pre-fetch user metrics once for efficiency
    let userMetrics: UserMetrics | null = null;

    for (const achievement of activeAchievements) {
      const customId = `custom_${achievement.id}`;
      if (existingIds.has(customId)) continue;

      let meetsCondition = false;
      
      // Check if this achievement uses advanced rule tree
      if (achievement.ruleTree) {
        const ruleTree = achievement.ruleTree as AchievementRuleTree;
        
        // Lazy load metrics
        if (!userMetrics) {
          userMetrics = await this.getUserMetricsForAchievements(userId);
        }
        
        // Extract and count keywords needed for this achievement
        const keywords = extractKeywordsFromRuleTree(ruleTree);
        const keywordCounts = new Map<string, number>();
        for (const keyword of keywords) {
          if (!keywordCounts.has(keyword)) {
            keywordCounts.set(keyword, await this.countBarsWithKeyword(userId, keyword));
          }
        }
        
        const context: EvaluationContext = { metrics: userMetrics, keywordCounts };
        meetsCondition = evaluateRuleTree(ruleTree, context);
      } else {
        // Legacy single-condition check
        const condition = achievement.conditionType;
        const threshold = achievement.threshold;

        switch (condition) {
          case "bars_posted": {
            const stats = await this.getUserStats(userId);
            meetsCondition = stats.barsMinted >= threshold;
            break;
          }
          case "likes_received": {
            const stats = await this.getUserStats(userId);
            meetsCondition = stats.likesReceived >= threshold;
            break;
          }
          case "followers_count": {
            const stats = await this.getUserStats(userId);
            meetsCondition = stats.followers >= threshold;
            break;
          }
          case "following_count": {
            const followingCount = await this.getFollowingCount(userId);
            meetsCondition = followingCount >= threshold;
            break;
          }
          case "single_bar_likes": {
            const stats = await this.getUserStats(userId);
            meetsCondition = stats.topBarLikes >= threshold;
            break;
          }
          case "single_bar_comments": {
            const userBars = await db.select({ id: bars.id }).from(bars).where(eq(bars.userId, userId));
            for (const bar of userBars) {
              const commentCount = await this.getCommentCount(bar.id);
              if (commentCount >= threshold) {
                meetsCondition = true;
                break;
              }
            }
            break;
          }
          case "single_bar_bookmarks": {
            const [result] = await db
              .select({ count: count() })
              .from(bookmarks)
              .innerJoin(bars, eq(bookmarks.barId, bars.id))
              .where(eq(bars.userId, userId))
              .groupBy(bookmarks.barId)
              .orderBy(desc(count()))
              .limit(1);
            meetsCondition = (result?.count || 0) >= threshold;
            break;
          }
          case "comments_made": {
            const [result] = await db
              .select({ count: count() })
              .from(comments)
              .where(eq(comments.userId, userId));
            meetsCondition = (result?.count || 0) >= threshold;
            break;
          }
          case "bars_adopted": {
            const [result] = await db
              .select({ count: count() })
              .from(barUsages)
              .where(eq(barUsages.userId, userId));
            meetsCondition = (result?.count || 0) >= threshold;
            break;
          }
          case "controversial_bar": {
            const userBars = await db.select({ id: bars.id }).from(bars).where(eq(bars.userId, userId));
            for (const bar of userBars) {
              const likeCount = await this.getLikeCountExcludingSelf(bar.id, userId);
              const dislikeCount = await this.getDislikeCount(bar.id);
              if (dislikeCount > likeCount && (likeCount + dislikeCount) >= threshold) {
                meetsCondition = true;
                break;
              }
            }
            break;
          }
          case "night_owl": {
            const nightBars = await db
              .select({ id: bars.id })
              .from(bars)
              .where(and(
                eq(bars.userId, userId),
                sql`EXTRACT(HOUR FROM ${bars.createdAt}) >= 0 AND EXTRACT(HOUR FROM ${bars.createdAt}) < 5`
              ))
              .limit(1);
            meetsCondition = nightBars.length > 0;
            break;
          }
          case "early_bird": {
            const earlyBars = await db
              .select({ id: bars.id })
              .from(bars)
              .where(and(
                eq(bars.userId, userId),
                sql`EXTRACT(HOUR FROM ${bars.createdAt}) >= 5 AND EXTRACT(HOUR FROM ${bars.createdAt}) < 8`
              ))
              .limit(1);
            meetsCondition = earlyBars.length > 0;
            break;
          }
        }
      }

      if (meetsCondition) {
        try {
          await db.insert(userAchievements).values({
            userId,
            achievementId: customId,
          });
          unlockedIds.push(customId);
        } catch (e) {
          // Already unlocked (unique constraint)
        }
      }
    }

    return unlockedIds;
  }

  // Debug log methods
  async createDebugLog(data: Omit<InsertDebugLog, 'id' | 'createdAt'>): Promise<DebugLog> {
    const [log] = await db.insert(debugLogs).values(data).returning();
    return log;
  }

  async getDebugLogs(limit: number = 100, action?: string): Promise<DebugLog[]> {
    if (action) {
      return db
        .select()
        .from(debugLogs)
        .where(eq(debugLogs.action, action))
        .orderBy(desc(debugLogs.createdAt))
        .limit(limit);
    }
    return db
      .select()
      .from(debugLogs)
      .orderBy(desc(debugLogs.createdAt))
      .limit(limit);
  }

  async clearDebugLogs(): Promise<void> {
    await db.delete(debugLogs);
  }

  // Achievement badge image methods
  async getAchievementBadgeImage(achievementId: string): Promise<string | null> {
    const [result] = await db
      .select()
      .from(achievementBadgeImages)
      .where(eq(achievementBadgeImages.id, achievementId));
    return result?.imageUrl || null;
  }

  async getAllAchievementBadgeImages(): Promise<Record<string, string>> {
    const results = await db.select().from(achievementBadgeImages);
    const map: Record<string, string> = {};
    for (const row of results) {
      map[row.id] = row.imageUrl;
    }
    return map;
  }

  async setAchievementBadgeImage(achievementId: string, imageUrl: string): Promise<void> {
    await db
      .insert(achievementBadgeImages)
      .values({ id: achievementId, imageUrl, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: achievementBadgeImages.id,
        set: { imageUrl, updatedAt: new Date() },
      });
  }

  async deleteAchievementBadgeImage(achievementId: string): Promise<void> {
    await db.delete(achievementBadgeImages).where(eq(achievementBadgeImages.id, achievementId));
  }

  // Custom tag methods
  async getAllCustomTags(): Promise<CustomTag[]> {
    return db.select().from(customTags).orderBy(customTags.name);
  }

  async getActiveCustomTags(): Promise<CustomTag[]> {
    return db.select().from(customTags).where(eq(customTags.isActive, true)).orderBy(customTags.name);
  }

  async getCustomTagByName(name: string): Promise<CustomTag | undefined> {
    const normalizedName = name.toLowerCase().trim();
    const [tag] = await db.select().from(customTags).where(eq(customTags.name, normalizedName));
    return tag;
  }

  async createCustomTag(data: Omit<InsertCustomTag, 'id' | 'createdAt'>): Promise<CustomTag> {
    const normalizedName = data.name.toLowerCase().trim();
    const [tag] = await db.insert(customTags).values({
      ...data,
      name: normalizedName,
    }).returning();
    return tag;
  }

  async updateCustomTag(id: string, updates: Partial<Omit<InsertCustomTag, 'id' | 'createdAt'>>): Promise<CustomTag | undefined> {
    if (updates.name) {
      updates.name = updates.name.toLowerCase().trim();
    }
    const [tag] = await db.update(customTags).set(updates).where(eq(customTags.id, id)).returning();
    return tag;
  }

  async deleteCustomTag(id: string): Promise<boolean> {
    const result = await db.delete(customTags).where(eq(customTags.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Custom category methods
  async getAllCustomCategories(): Promise<CustomCategory[]> {
    return db.select().from(customCategories).orderBy(customCategories.sortOrder, customCategories.name);
  }

  async getActiveCustomCategories(): Promise<CustomCategory[]> {
    return db.select().from(customCategories).where(eq(customCategories.isActive, true)).orderBy(customCategories.sortOrder, customCategories.name);
  }

  async getCustomCategoryByName(name: string): Promise<CustomCategory | undefined> {
    const normalizedName = name.toLowerCase().trim();
    const [category] = await db.select().from(customCategories).where(eq(customCategories.name, normalizedName));
    return category;
  }

  async createCustomCategory(data: Omit<InsertCustomCategory, 'id' | 'createdAt'>): Promise<CustomCategory> {
    const normalizedName = data.name.toLowerCase().trim();
    const [category] = await db.insert(customCategories).values({
      ...data,
      name: normalizedName,
    }).returning();
    return category;
  }

  async updateCustomCategory(id: string, updates: Partial<Omit<InsertCustomCategory, 'id' | 'createdAt'>>): Promise<CustomCategory | undefined> {
    if (updates.name) {
      updates.name = updates.name.toLowerCase().trim();
    }
    const [category] = await db.update(customCategories).set(updates).where(eq(customCategories.id, id)).returning();
    return category;
  }

  async deleteCustomCategory(id: string): Promise<boolean> {
    const result = await db.delete(customCategories).where(eq(customCategories.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // XP and Level methods
  private calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  private getXpForLevel(level: number): number {
    return Math.pow(level - 1, 2) * 100;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
           date1.getUTCMonth() === date2.getUTCMonth() &&
           date1.getUTCDate() === date2.getUTCDate();
  }

  async awardXp(
    userId: string, 
    amount: number, 
    source: 'bar_posted' | 'like_received' | 'adoption_credited' | 'comment_made' | 'bookmark_added'
  ): Promise<{ xp: number; level: number; leveledUp: boolean; previousLevel: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    const lastUpdate = user.lastXpUpdate || new Date(0);
    const isNewDay = !this.isSameDay(lastUpdate, now);

    let dailyLikes = isNewDay ? 0 : (user.dailyXpLikes || 0);
    let dailyComments = isNewDay ? 0 : (user.dailyXpComments || 0);
    let dailyBookmarks = isNewDay ? 0 : (user.dailyXpBookmarks || 0);

    let xpToAdd = amount;

    if (source === 'like_received') {
      const remaining = Math.max(0, 50 - dailyLikes);
      xpToAdd = Math.min(amount, remaining);
      dailyLikes += xpToAdd;
    } else if (source === 'comment_made') {
      const remaining = Math.max(0, 30 - dailyComments);
      xpToAdd = Math.min(amount, remaining);
      dailyComments += xpToAdd;
    } else if (source === 'bookmark_added') {
      const remaining = Math.max(0, 20 - dailyBookmarks);
      xpToAdd = Math.min(amount, remaining);
      dailyBookmarks += xpToAdd;
    }

    if (xpToAdd <= 0) {
      return {
        xp: user.xp || 0,
        level: user.level || 1,
        leveledUp: false,
        previousLevel: user.level || 1,
      };
    }

    const newXp = Math.max(0, (user.xp || 0) + xpToAdd);
    const previousLevel = user.level || 1;
    const newLevel = this.calculateLevel(newXp);
    const leveledUp = newLevel > previousLevel;

    await db.update(users).set({
      xp: newXp,
      level: newLevel,
      lastXpUpdate: now,
      dailyXpLikes: dailyLikes,
      dailyXpComments: dailyComments,
      dailyXpBookmarks: dailyBookmarks,
    }).where(eq(users.id, userId));

    if (leveledUp) {
      await this.createNotification({
        userId,
        type: 'level_up',
        message: `Level up! You're now Level ${newLevel}`,
      });
    }

    return { xp: newXp, level: newLevel, leveledUp, previousLevel };
  }

  async getUserXpStats(userId: string): Promise<{ xp: number; level: number; xpForNextLevel: number; xpProgress: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { xp: 0, level: 1, xpForNextLevel: 100, xpProgress: 0 };
    }

    const xp = user.xp || 0;
    const level = user.level || 1;
    const xpForCurrentLevel = this.getXpForLevel(level);
    const xpForNextLevel = this.getXpForLevel(level + 1);
    const xpInCurrentLevel = xp - xpForCurrentLevel;
    const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
    const xpProgress = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100));

    return { xp, level, xpForNextLevel, xpProgress };
  }

  async calculateRetroactiveXp(userId: string): Promise<{ xp: number; level: number }> {
    const [barsCount] = await db.select({ count: count() }).from(bars).where(eq(bars.userId, userId));
    
    const [likesReceived] = await db
      .select({ count: count() })
      .from(likes)
      .innerJoin(bars, eq(likes.barId, bars.id))
      .where(and(eq(bars.userId, userId), ne(likes.userId, userId)));
    
    const [adoptionsCredited] = await db
      .select({ count: count() })
      .from(barUsages)
      .innerJoin(bars, eq(barUsages.barId, bars.id))
      .where(and(eq(bars.userId, userId), ne(barUsages.userId, userId)));
    
    const [commentsMade] = await db.select({ count: count() }).from(comments).where(eq(comments.userId, userId));
    
    const [bookmarksAdded] = await db.select({ count: count() }).from(bookmarks).where(eq(bookmarks.userId, userId));

    const totalXp = 
      (barsCount?.count || 0) * 10 +
      (likesReceived?.count || 0) * 5 +
      (adoptionsCredited?.count || 0) * 20 +
      (commentsMade?.count || 0) * 3 +
      (bookmarksAdded?.count || 0) * 2;

    const level = this.calculateLevel(totalXp);

    await db.update(users).set({
      xp: totalXp,
      level: level,
      lastXpUpdate: new Date(),
      dailyXpLikes: 0,
      dailyXpComments: 0,
      dailyXpBookmarks: 0,
    }).where(eq(users.id, userId));

    return { xp: totalXp, level };
  }

  async resetDailyXpLimits(): Promise<void> {
    await db.update(users).set({
      dailyXpLikes: 0,
      dailyXpComments: 0,
      dailyXpBookmarks: 0,
    });
  }

  // Profile Badges Methods
  async createProfileBadge(data: Omit<InsertProfileBadge, 'id' | 'createdAt'>): Promise<ProfileBadge> {
    const [badge] = await db.insert(profileBadges).values(data).returning();
    return badge;
  }

  async getProfileBadges(includeInactive = false): Promise<ProfileBadge[]> {
    if (includeInactive) {
      return db.select().from(profileBadges).orderBy(desc(profileBadges.createdAt));
    }
    return db.select().from(profileBadges).where(eq(profileBadges.isActive, true)).orderBy(desc(profileBadges.createdAt));
  }

  async getProfileBadgeById(id: string): Promise<ProfileBadge | undefined> {
    const [badge] = await db.select().from(profileBadges).where(eq(profileBadges.id, id));
    return badge;
  }

  async updateProfileBadge(id: string, data: Partial<InsertProfileBadge>): Promise<ProfileBadge | undefined> {
    const [updated] = await db.update(profileBadges).set(data).where(eq(profileBadges.id, id)).returning();
    return updated;
  }

  async deleteProfileBadge(id: string): Promise<boolean> {
    const result = await db.delete(profileBadges).where(eq(profileBadges.id, id));
    return true;
  }

  // User Badges Methods
  async grantBadgeToUser(userId: string, badgeId: string, source: string, grantedBy?: string, sourceDetails?: string): Promise<UserBadge> {
    const [userBadge] = await db.insert(userBadges).values({
      userId,
      badgeId,
      source,
      grantedBy,
      sourceDetails,
    }).returning();
    return userBadge;
  }

  async getUserBadges(userId: string): Promise<(UserBadge & { badge: ProfileBadge })[]> {
    const results = await db
      .select({
        userBadge: userBadges,
        badge: profileBadges,
      })
      .from(userBadges)
      .innerJoin(profileBadges, eq(userBadges.badgeId, profileBadges.id))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.grantedAt));
    
    return results.map(r => ({
      ...r.userBadge,
      badge: r.badge,
    }));
  }

  async userHasBadge(userId: string, badgeId: string): Promise<boolean> {
    const [exists] = await db
      .select({ count: count() })
      .from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)));
    return (exists?.count || 0) > 0;
  }

  async revokeBadgeFromUser(userId: string, badgeId: string): Promise<boolean> {
    await db.delete(userBadges).where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)));
    return true;
  }

  async setDisplayedBadges(userId: string, badgeIds: string[]): Promise<void> {
    await db.update(users).set({ displayedBadges: badgeIds }).where(eq(users.id, userId));
  }

  async getUserDisplayedBadges(userId: string): Promise<ProfileBadge[]> {
    const result = await this.getDisplayedBadgesForUsers([userId]);
    return result.get(userId) || [];
  }

  async getDisplayedBadgesForUsers(userIds: string[]): Promise<Map<string, ProfileBadge[]>> {
    if (userIds.length === 0) return new Map();
    
    let usersWithBadges: { id: string; displayedBadges: string[] | null }[] = [];
    try {
      usersWithBadges = await db
        .select({ id: users.id, displayedBadges: users.displayedBadges })
        .from(users)
        .where(inArray(users.id, userIds));
    } catch (error: any) {
      console.error("[BADGES STORAGE] Error fetching users with badges:", error.message);
      // If there's a malformed array, try fetching without the displayedBadges
      const usersOnly = await db
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.id, userIds));
      usersWithBadges = usersOnly.map(u => ({ id: u.id, displayedBadges: null }));
    }
    
    console.log("[BADGES STORAGE] Users fetched:", usersWithBadges.map(u => ({ id: u.id, displayedBadges: u.displayedBadges })));
    
    const allBadgeIds = new Set<string>();
    usersWithBadges.forEach(u => {
      (u.displayedBadges || []).forEach(id => allBadgeIds.add(id));
    });
    
    console.log("[BADGES STORAGE] All badge IDs to fetch:", Array.from(allBadgeIds));
    
    if (allBadgeIds.size === 0) {
      console.log("[BADGES STORAGE] No badge IDs found, returning empty map");
      return new Map();
    }
    
    // Separate achievement badge IDs from profile badge IDs
    const achievementKeys = Object.keys(ACHIEVEMENTS);
    console.log("[BADGES STORAGE] Known achievement keys:", achievementKeys);
    const achievementBadgeIds: string[] = [];
    const profileBadgeIds: string[] = [];
    
    allBadgeIds.forEach(id => {
      // Check if it's an achievement ID (includes custom_ prefix for custom achievements)
      const isAchievement = achievementKeys.includes(id) || id.startsWith('custom_');
      console.log(`[BADGES STORAGE] Badge ID "${id}" - isAchievement: ${isAchievement}`);
      if (isAchievement) {
        achievementBadgeIds.push(id);
      } else {
        profileBadgeIds.push(id);
      }
    });
    
    // Fetch profile badges from database
    const badgesMap = new Map<string, ProfileBadge>();
    
    if (profileBadgeIds.length > 0) {
      const badgesList = await db
        .select()
        .from(profileBadges)
        .where(inArray(profileBadges.id, profileBadgeIds));
      badgesList.forEach(b => badgesMap.set(b.id, b));
    }
    
    // Fetch custom images for achievement badges
    const achievementImages = new Map<string, string>();
    if (achievementBadgeIds.length > 0) {
      const images = await db
        .select()
        .from(achievementBadgeImages)
        .where(inArray(achievementBadgeImages.id, achievementBadgeIds));
      images.forEach(img => achievementImages.set(img.id, img.imageUrl));
    }
    
    // Also fetch custom achievements for custom_ prefixed IDs
    const customAchievementIds = achievementBadgeIds
      .filter(id => id.startsWith('custom_'))
      .map(id => id.replace('custom_', ''));
    
    const customAchievementsMap = new Map<string, { name: string; emoji: string | null; imageUrl: string | null; description: string | null; rarity: string }>();
    if (customAchievementIds.length > 0) {
      const customAchievementsList = await db
        .select()
        .from(customAchievements)
        .where(inArray(customAchievements.id, customAchievementIds));
      customAchievementsList.forEach(ca => {
        customAchievementsMap.set(`custom_${ca.id}`, {
          name: ca.name,
          emoji: ca.emoji,
          imageUrl: ca.imageUrl,
          description: ca.description,
          rarity: ca.rarity || 'common',
        });
      });
    }
    
    // Convert achievement badges to ProfileBadge format
    achievementBadgeIds.forEach(id => {
      if (id.startsWith('custom_')) {
        // Custom achievement
        const customAch = customAchievementsMap.get(id);
        if (customAch) {
          badgesMap.set(id, {
            id,
            name: id,
            displayName: customAch.name,
            description: customAch.description,
            imageUrl: customAch.imageUrl,
            emoji: customAch.emoji,
            color: null,
            backgroundColor: null,
            borderColor: null,
            animation: 'none',
            rarity: customAch.rarity as any,
            linkedAchievementId: null,
            isActive: true,
            createdBy: null,
            createdAt: new Date(),
          });
        }
      } else {
        // Built-in achievement
        const achievement = ACHIEVEMENTS[id as keyof typeof ACHIEVEMENTS];
        if (achievement) {
          const customImage = achievementImages.get(id);
          badgesMap.set(id, {
            id,
            name: id,
            displayName: achievement.name,
            description: achievement.description,
            imageUrl: customImage || achievement.imageUrl,
            emoji: achievement.emoji,
            color: null,
            backgroundColor: null,
            borderColor: null,
            animation: 'none',
            rarity: achievement.rarity,
            linkedAchievementId: null,
            isActive: true,
            createdBy: null,
            createdAt: new Date(),
          });
        }
      }
    });
    
    const result = new Map<string, ProfileBadge[]>();
    usersWithBadges.forEach(u => {
      const userBadges = (u.displayedBadges || [])
        .map(id => badgesMap.get(id))
        .filter((b): b is ProfileBadge => !!b);
      result.set(u.id, userBadges);
    });
    
    return result;
  }

  // Protected Bars methods
  async getProtectedBars(): Promise<ProtectedBar[]> {
    return db.select().from(protectedBars).orderBy(desc(protectedBars.createdAt));
  }

  async createProtectedBar(data: InsertProtectedBar): Promise<ProtectedBar> {
    const [result] = await db.insert(protectedBars).values(data).returning();
    return result;
  }

  async deleteProtectedBar(id: string): Promise<boolean> {
    const result = await db.delete(protectedBars).where(eq(protectedBars.id, id)).returning();
    return result.length > 0;
  }

  async checkContentAgainstProtectedBars(content: string): Promise<ProtectedBar | null> {
    // Normalize content for comparison (lowercase, trim, remove extra whitespace)
    const normalizedContent = content.toLowerCase().trim().replace(/\s+/g, ' ');
    
    const allProtected = await db.select().from(protectedBars);
    
    for (const protectedBar of allProtected) {
      const normalizedProtected = protectedBar.content.toLowerCase().trim().replace(/\s+/g, ' ');
      const threshold = (protectedBar.similarityThreshold || 80) / 100; // Convert to decimal
      
      // Check for exact match or if the new content contains the protected content
      if (normalizedContent === normalizedProtected || 
          normalizedContent.includes(normalizedProtected) ||
          normalizedProtected.includes(normalizedContent)) {
        return protectedBar;
      }
      
      // Check word similarity using the custom threshold for this bar
      const contentWords = normalizedContent.split(' ').filter(w => w.length > 2);
      const protectedWords = normalizedProtected.split(' ').filter(w => w.length > 2);
      
      if (protectedWords.length > 3) {
        const matchingWords = contentWords.filter(w => protectedWords.includes(w));
        const similarity = matchingWords.length / protectedWords.length;
        if (similarity >= threshold) {
          return protectedBar;
        }
      }
    }
    
    return null;
  }

  // AI Settings methods
  async getAISettings(): Promise<AISettings> {
    const [settings] = await db.select().from(aiSettings).where(eq(aiSettings.id, 'default'));
    if (!settings) {
      // Create default settings if not exists
      const [newSettings] = await db.insert(aiSettings).values({ id: 'default' }).returning();
      return newSettings;
    }
    return settings;
  }

  async updateAISettings(updates: Partial<AISettings>, updatedBy?: string): Promise<AISettings> {
    const [settings] = await db
      .update(aiSettings)
      .set({ ...updates, updatedAt: new Date(), updatedBy: updatedBy || null })
      .where(eq(aiSettings.id, 'default'))
      .returning();
    return settings;
  }

  // Notebook methods
  async getNotebooks(userId: string): Promise<Notebook[]> {
    return db.select().from(notebooks).where(eq(notebooks.userId, userId)).orderBy(desc(notebooks.updatedAt));
  }

  async getNotebook(id: string, userId: string): Promise<Notebook | undefined> {
    const [notebook] = await db.select().from(notebooks).where(and(eq(notebooks.id, id), eq(notebooks.userId, userId)));
    return notebook;
  }

  async createNotebook(data: InsertNotebook): Promise<Notebook> {
    const [notebook] = await db.insert(notebooks).values(data).returning();
    return notebook;
  }

  async updateNotebook(id: string, userId: string, updates: { title?: string; content?: string }): Promise<Notebook | undefined> {
    const [notebook] = await db
      .update(notebooks)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(notebooks.id, id), eq(notebooks.userId, userId)))
      .returning();
    return notebook;
  }

  async deleteNotebook(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(notebooks).where(and(eq(notebooks.id, id), eq(notebooks.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();

export function generateProofHash(content: string, createdAt: Date, userId: string, proofBarId: string): string {
  const data = `${content}|${createdAt.toISOString()}|${userId}|${proofBarId}`;
  return createHash('sha256').update(data).digest('hex');
}
