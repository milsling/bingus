import { users, bars, verificationCodes, passwordResetCodes, likes, comments, commentLikes, dislikes, commentDislikes, follows, notifications, bookmarks, pushSubscriptions, friendships, directMessages, adoptions, barSequence, userAchievements, reports, flaggedPhrases, maintenanceStatus, barUsages, customAchievements, debugLogs, achievementBadgeImages, customTags, customCategories, ACHIEVEMENTS, type User, type InsertUser, type Bar, type InsertBar, type Like, type Comment, type CommentLike, type InsertComment, type Notification, type Bookmark, type PushSubscription, type Friendship, type DirectMessage, type Adoption, type BarUsage, type UserAchievement, type AchievementId, type Report, type FlaggedPhrase, type MaintenanceStatus, type CustomAchievement, type InsertCustomAchievement, type CustomTag, type InsertCustomTag, type CustomCategory, type InsertCustomCategory, type DebugLog, type InsertDebugLog, type AchievementRuleTree, type AchievementCondition, type AchievementRuleGroup, type AchievementConditionType } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gt, count, sql, or, ilike, notInArray, ne } from "drizzle-orm";
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
    return evaluateCondition(ruleTree as AchievementCondition, context);
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
    
    const newlyUnlocked: AchievementId[] = [];
    
    for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
      if (existingIds.has(id)) continue;
      
      const threshold = achievement.threshold;
      let unlocked = false;
      
      if ('barsMinted' in threshold && stats.barsMinted >= threshold.barsMinted) {
        unlocked = true;
      } else if ('likesReceived' in threshold && stats.likesReceived >= threshold.likesReceived) {
        unlocked = true;
      } else if ('followers' in threshold && stats.followers >= threshold.followers) {
        unlocked = true;
      } else if ('topBarLikes' in threshold && stats.topBarLikes >= threshold.topBarLikes) {
        unlocked = true;
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
    const userBars = await db.select({ id: bars.id }).from(bars).where(eq(bars.userId, userId));
    let topBarComments = 0;
    for (const bar of userBars) {
      const count = await this.getCommentCount(bar.id);
      if (count > topBarComments) topBarComments = count;
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
    
    // Get bars adopted count
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
    
    // Check night owl
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
}

export const storage = new DatabaseStorage();

export function generateProofHash(content: string, createdAt: Date, userId: string, proofBarId: string): string {
  const data = `${content}|${createdAt.toISOString()}|${userId}|${proofBarId}`;
  return createHash('sha256').update(data).digest('hex');
}
