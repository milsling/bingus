import pg from 'pg';
const { Pool } = pg;
import { db } from './db';
import { users, bars, likes, comments, follows, bookmarks, notifications, directMessages, userAchievements, userBadges, flaggedPhrases, profileBadges } from '@shared/schema';

const prodPool = new Pool({ 
  connectionString: process.env.SUPABASE_DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function syncFromProduction() {
  console.log('Starting sync from production Supabase to development...\n');
  
  try {
    console.log('Clearing development database...');
    await db.execute(`TRUNCATE TABLE ai_settings, user_badges, user_achievements, notifications, direct_messages, bookmarks, flagged_phrases, comments, likes, follows, bars, profile_badges, protected_bars, notebooks, reports, debug_logs, bar_sequence, custom_tags, custom_categories, custom_achievements, achievement_badge_images, ai_review_requests, bar_usages, adoptions, friendships, push_subscriptions, password_reset_codes, verification_codes, comment_likes, comment_dislikes, dislikes, users CASCADE`);
    console.log('Development database cleared.\n');

    console.log('Fetching users from production...');
    const prodUsers = await prodPool.query('SELECT * FROM users');
    console.log(`Found ${prodUsers.rows.length} users`);
    
    for (const user of prodUsers.rows) {
      await db.insert(users).values({
        id: user.id,
        username: user.username,
        email: user.email,
        password: user.password,
        emailVerified: user.email_verified,
        verificationCode: user.verification_code,
        verificationCodeExpires: user.verification_code_expires,
        bio: user.bio,
        location: user.location,
        avatarUrl: user.avatar_url,
        bannerUrl: user.banner_url,
        membershipTier: user.membership_tier,
        membershipExpiresAt: user.membership_expires_at,
        isAdmin: user.is_admin,
        isAdminPlus: user.is_admin_plus,
        isOwner: user.is_owner,
        isGuest: user.is_guest || false,
        xp: user.xp,
        level: user.level,
        messagePrivacy: user.message_privacy,
      }).onConflictDoNothing();
    }
    console.log('Users synced.\n');

    console.log('Fetching bars from production...');
    const prodBars = await prodPool.query('SELECT * FROM bars');
    console.log(`Found ${prodBars.rows.length} bars`);
    
    for (const bar of prodBars.rows) {
      await db.insert(bars).values({
        id: bar.id,
        userId: bar.user_id,
        content: bar.content,
        explanation: bar.explanation,
        category: bar.category,
        tags: bar.tags,
        feedbackWanted: bar.feedback_wanted,
        isOriginal: bar.is_original,
        createdAt: bar.created_at,
        proofBarId: bar.proof_bar_id,
        permissionStatus: bar.permission_status,
        proofHash: bar.proof_hash,
        isFeatured: bar.is_featured,
        featuredAt: bar.featured_at,
        barType: bar.bar_type,
        fullRapLink: bar.full_rap_link,
        beatLink: bar.beat_link,
        isRecorded: bar.is_recorded,
        moderationStatus: bar.moderation_status,
        moderationScore: bar.moderation_score,
        moderationPhraseId: bar.moderation_phrase_id,
        deletedAt: bar.deleted_at,
        deletedBy: bar.deleted_by,
        deletedReason: bar.deleted_reason,
        isLocked: bar.is_locked,
        lockedAt: bar.locked_at,
      }).onConflictDoNothing();
    }
    console.log('Bars synced.\n');

    console.log('Fetching likes from production...');
    const prodLikes = await prodPool.query('SELECT * FROM likes');
    console.log(`Found ${prodLikes.rows.length} likes`);
    
    for (const like of prodLikes.rows) {
      await db.insert(likes).values({
        id: like.id,
        userId: like.user_id,
        barId: like.bar_id,
        createdAt: like.created_at,
        isDislike: like.is_dislike || false,
      }).onConflictDoNothing();
    }
    console.log('Likes synced.\n');

    console.log('Fetching comments from production...');
    const prodComments = await prodPool.query('SELECT * FROM comments');
    console.log(`Found ${prodComments.rows.length} comments`);
    
    for (const comment of prodComments.rows) {
      await db.insert(comments).values({
        id: comment.id,
        userId: comment.user_id,
        barId: comment.bar_id,
        content: comment.content,
        createdAt: comment.created_at,
      }).onConflictDoNothing();
    }
    console.log('Comments synced.\n');

    console.log('Fetching follows from production...');
    const prodFollows = await prodPool.query('SELECT * FROM follows');
    console.log(`Found ${prodFollows.rows.length} follows`);
    
    for (const follow of prodFollows.rows) {
      await db.insert(follows).values({
        id: follow.id,
        followerId: follow.follower_id,
        followingId: follow.following_id,
        status: follow.status,
        createdAt: follow.created_at,
      }).onConflictDoNothing();
    }
    console.log('Follows synced.\n');

    console.log('Fetching bookmarks from production...');
    const prodBookmarks = await prodPool.query('SELECT * FROM bookmarks');
    console.log(`Found ${prodBookmarks.rows.length} bookmarks`);
    
    for (const bookmark of prodBookmarks.rows) {
      await db.insert(bookmarks).values({
        id: bookmark.id,
        userId: bookmark.user_id,
        barId: bookmark.bar_id,
        createdAt: bookmark.created_at,
      }).onConflictDoNothing();
    }
    console.log('Bookmarks synced.\n');

    console.log('Fetching notifications from production...');
    const prodNotifications = await prodPool.query('SELECT * FROM notifications');
    console.log(`Found ${prodNotifications.rows.length} notifications`);
    
    for (const notif of prodNotifications.rows) {
      await db.insert(notifications).values({
        id: notif.id,
        userId: notif.user_id,
        type: notif.type,
        actorId: notif.actor_id,
        barId: notif.bar_id,
        commentId: notif.comment_id,
        read: notif.read,
        createdAt: notif.created_at,
      }).onConflictDoNothing();
    }
    console.log('Notifications synced.\n');

    console.log('Fetching direct messages from production...');
    const prodMessages = await prodPool.query('SELECT * FROM direct_messages');
    console.log(`Found ${prodMessages.rows.length} direct messages`);
    
    for (const msg of prodMessages.rows) {
      await db.insert(directMessages).values({
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        content: msg.content,
        read: msg.read,
        createdAt: msg.created_at,
      }).onConflictDoNothing();
    }
    console.log('Direct messages synced.\n');

    console.log('Fetching user achievements from production...');
    const prodUserAchievements = await prodPool.query('SELECT * FROM user_achievements');
    console.log(`Found ${prodUserAchievements.rows.length} user achievements`);
    
    for (const ua of prodUserAchievements.rows) {
      await db.insert(userAchievements).values({
        id: ua.id,
        odiaId: ua.odia_id,
        achievementId: ua.achievement_id,
        unlockedAt: ua.unlocked_at,
      }).onConflictDoNothing();
    }
    console.log('User achievements synced.\n');

    console.log('Fetching profile badges from production...');
    const prodBadges = await prodPool.query('SELECT * FROM profile_badges');
    console.log(`Found ${prodBadges.rows.length} profile badges`);
    
    for (const badge of prodBadges.rows) {
      await db.insert(profileBadges).values({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        imageUrl: badge.image_url,
        rarity: badge.rarity,
        createdAt: badge.created_at,
        createdBy: badge.created_by,
      }).onConflictDoNothing();
    }
    console.log('Profile badges synced.\n');

    console.log('Fetching user badges from production...');
    const prodUserBadges = await prodPool.query('SELECT * FROM user_badges');
    console.log(`Found ${prodUserBadges.rows.length} user badges`);
    
    for (const ub of prodUserBadges.rows) {
      await db.insert(userBadges).values({
        id: ub.id,
        odiaId: ub.odia_id,
        badgeId: ub.badge_id,
        awardedAt: ub.awarded_at,
        awardedBy: ub.awarded_by,
      }).onConflictDoNothing();
    }
    console.log('User badges synced.\n');

    console.log('=== SYNC COMPLETE ===');
    
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  } finally {
    await prodPool.end();
  }
}

syncFromProduction()
  .then(() => {
    console.log('\nSync completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nSync failed:', err);
    process.exit(1);
  });
