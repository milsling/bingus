import { users, bars, verificationCodes, passwordResetCodes, likes, comments, commentLikes, follows, notifications, bookmarks, pushSubscriptions, type User, type InsertUser, type Bar, type InsertBar, type Like, type Comment, type CommentLike, type InsertComment, type Notification, type Bookmark, type PushSubscription } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gt, count, sql, or, ilike, notInArray } from "drizzle-orm";

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
  getBarsByUser(userId: string): Promise<Bar[]>;
  updateBar(id: string, userId: string, updates: Partial<Pick<Bar, 'content' | 'explanation' | 'category' | 'tags'>>): Promise<Bar | undefined>;
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

  // Bookmark methods
  toggleBookmark(userId: string, barId: string): Promise<boolean>;
  hasUserBookmarked(userId: string, barId: string): Promise<boolean>;
  getUserBookmarks(userId: string): Promise<Array<Bar & { user: User; commentCount: number }>>;

  // Push subscription methods
  savePushSubscription(userId: string, subscription: { endpoint: string; p256dh: string; auth: string }): Promise<PushSubscription>;
  deletePushSubscription(userId: string, endpoint: string): Promise<boolean>;
  getPushSubscriptions(userId: string): Promise<PushSubscription[]>;
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
          isOwner: users.isOwner,
        },
        commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.bar_id = ${bars.id})`.as('comment_count'),
      })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
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
      .where(eq(bars.id, id));
    
    if (!result) return undefined;
    return { ...result.bar, user: result.user as User };
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

  async deleteBarAdmin(barId: string): Promise<boolean> {
    const result = await db.delete(bars).where(eq(bars.id, barId)).returning();
    return result.length > 0;
  }

  async deleteAllBars(): Promise<void> {
    const ownerUsers = await db.select({ id: users.id }).from(users).where(eq(users.isOwner, true));
    const ownerIds = ownerUsers.map(u => u.id);
    if (ownerIds.length > 0) {
      await db.delete(bars).where(notInArray(bars.userId, ownerIds));
    } else {
      await db.delete(bars);
    }
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

  async createNotification(data: { userId: string; type: string; actorId?: string; barId?: string; message: string }): Promise<Notification> {
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
          isOwner: users.isOwner,
        },
        commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.bar_id = ${bars.id})`.as('comment_count'),
      })
      .from(bars)
      .leftJoin(users, eq(bars.userId, users.id))
      .where(
        or(
          ilike(bars.content, searchPattern),
          ilike(users.username, searchPattern),
          sql`${bars.tags}::text ILIKE ${searchPattern}`
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
          isOwner: users.isOwner,
        },
        commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.bar_id = ${bars.id})`.as('comment_count'),
        bookmarkCreatedAt: bookmarks.createdAt,
      })
      .from(bookmarks)
      .innerJoin(bars, eq(bookmarks.barId, bars.id))
      .leftJoin(users, eq(bars.userId, users.id))
      .where(eq(bookmarks.userId, userId))
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
}

export const storage = new DatabaseStorage();
