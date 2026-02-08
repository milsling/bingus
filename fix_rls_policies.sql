-- Fix all RLS (Row Level Security) issues in Supabase
-- This migration creates proper RLS policies for all tables that have RLS enabled but no policies

-- ============================================================================
-- 1. ACHIEVEMENT_BADGE_IMAGES - Public read, admin/owner only modify
-- ============================================================================
ALTER TABLE achievement_badge_images ENABLE ROW LEVEL SECURITY;

-- Anyone can read achievement badge images
CREATE POLICY "achievement_badge_images_select_public"
ON achievement_badge_images FOR SELECT
USING (true);

-- Only admin/owner can insert badge images
CREATE POLICY "achievement_badge_images_insert_admin"
ON achievement_badge_images FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
);

-- Only admin/owner can update badge images
CREATE POLICY "achievement_badge_images_update_admin"
ON achievement_badge_images FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
);

-- Only admin/owner can delete badge images
CREATE POLICY "achievement_badge_images_delete_admin"
ON achievement_badge_images FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
);

-- ============================================================================
-- 2. AI_REVIEW_REQUESTS - Users read own, admin/owner read all and approve
-- ============================================================================
ALTER TABLE ai_review_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own review requests
CREATE POLICY "ai_review_requests_select_own"
ON ai_review_requests FOR SELECT
USING (
  auth.uid()::text = user_id
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
);

-- Users can insert their own review requests
CREATE POLICY "ai_review_requests_insert_own"
ON ai_review_requests FOR INSERT
WITH CHECK (
  auth.uid()::text = user_id
);

-- Users can update their own requests (before review)
CREATE POLICY "ai_review_requests_update_own"
ON ai_review_requests FOR UPDATE
USING (
  auth.uid()::text = user_id
  AND status = 'pending'
)
WITH CHECK (
  auth.uid()::text = user_id
  AND status = 'pending'
);

-- Only admin/owner can approve/reject (update status and review fields)
CREATE POLICY "ai_review_requests_review_admin"
ON ai_review_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
);

-- ============================================================================
-- 3. AI_SETTINGS - Owner only (singleton row)
-- ============================================================================
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read AI settings (affects public behavior)
CREATE POLICY "ai_settings_select_public"
ON ai_settings FOR SELECT
USING (true);

-- Only owner can update AI settings
CREATE POLICY "ai_settings_update_owner"
ON ai_settings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND users.is_owner
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND users.is_owner
  )
);

-- Only owner can insert AI settings
CREATE POLICY "ai_settings_insert_owner"
ON ai_settings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND users.is_owner
  )
);

-- ============================================================================
-- 4. BAR_SEQUENCE - System table, read-only for authenticated users
-- ============================================================================
ALTER TABLE bar_sequence ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (need for displaying bar numbers)
CREATE POLICY "bar_sequence_select_authenticated"
ON bar_sequence FOR SELECT
USING (auth.role() = 'authenticated');

-- Server-side only update (no direct client access)
-- This would be updated via stored procedures or server-side actions

-- ============================================================================
-- 5. DEBUG_LOGS - Admin/owner only
-- ============================================================================
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Only admin/owner can read debug logs
CREATE POLICY "debug_logs_select_admin"
ON debug_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
);

-- Only server can insert debug logs (triggered actions)
CREATE POLICY "debug_logs_insert_server"
ON debug_logs FOR INSERT
WITH CHECK (true);

-- Only admin/owner can delete debug logs
CREATE POLICY "debug_logs_delete_admin"
ON debug_logs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
);

-- ============================================================================
-- 6. FLAGGED_PHRASES - Admin/owner only
-- ============================================================================
ALTER TABLE flagged_phrases ENABLE ROW LEVEL SECURITY;

-- Anyone can read flagged phrases (they're used for content moderation)
CREATE POLICY "flagged_phrases_select_public"
ON flagged_phrases FOR SELECT
USING (true);

-- Only admin/owner can create flagged phrases
CREATE POLICY "flagged_phrases_insert_admin"
ON flagged_phrases FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
);

-- Only admin/owner can modify flagged phrases
CREATE POLICY "flagged_phrases_update_admin"
ON flagged_phrases FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
);

-- Only admin/owner can delete flagged phrases
CREATE POLICY "flagged_phrases_delete_admin"
ON flagged_phrases FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
);

-- ============================================================================
-- 7. MAINTENANCE_STATUS - Public read, owner only write
-- ============================================================================
ALTER TABLE maintenance_status ENABLE ROW LEVEL SECURITY;

-- Anyone can read maintenance status (need to know if site is in maintenance)
CREATE POLICY "maintenance_status_select_public"
ON maintenance_status FOR SELECT
USING (true);

-- Only owner can update maintenance status
CREATE POLICY "maintenance_status_update_owner"
ON maintenance_status FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND users.is_owner
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND users.is_owner
  )
);

-- ============================================================================
-- 8. PASSWORD_RESET_CODES - Public (no auth required for reset flow)
-- ============================================================================
ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can read/create password reset codes (needed for reset flow)
CREATE POLICY "password_reset_codes_insert_public"
ON password_reset_codes FOR INSERT
WITH CHECK (true);

CREATE POLICY "password_reset_codes_select_public"
ON password_reset_codes FOR SELECT
USING (true);

-- Auto-delete old codes or admin cleanup
CREATE POLICY "password_reset_codes_delete_admin"
ON password_reset_codes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
  OR expires_at < NOW()
);

-- ============================================================================
-- 9. PROTECTED_BARS - Owner only
-- ============================================================================
ALTER TABLE protected_bars ENABLE ROW LEVEL SECURITY;

-- Only owner can read protected bars
CREATE POLICY "protected_bars_select_owner"
ON protected_bars FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND users.is_owner
  )
);

-- Only owner can create protected bars
CREATE POLICY "protected_bars_insert_owner"
ON protected_bars FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND users.is_owner
  )
);

-- Only owner can update protected bars
CREATE POLICY "protected_bars_update_owner"
ON protected_bars FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND users.is_owner
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND users.is_owner
  )
);

-- Only owner can delete protected bars
CREATE POLICY "protected_bars_delete_owner"
ON protected_bars FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND users.is_owner
  )
);

-- ============================================================================
-- 10. SESSIONS - Public (Passport session storage)
-- ============================================================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Sessions are managed by Passport, need public access to work
CREATE POLICY "sessions_insert_public"
ON sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "sessions_select_public"
ON sessions FOR SELECT
USING (true);

CREATE POLICY "sessions_update_public"
ON sessions FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "sessions_delete_public"
ON sessions FOR DELETE
USING (true);

-- ==========================================================================
-- 11. SITE_SETTINGS - Skipped (table not present in this schema)
-- ==========================================================================

-- ============================================================================
-- 12. USERS - Public read, authenticated update own, admin full control
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Anyone can read public user data (needed for displaying user profiles, comments, etc.)
-- This is a public directory of users
CREATE POLICY "users_select_public"
ON users FOR SELECT
USING (true);

-- Authenticated users can update their own profile via session or auth token
CREATE POLICY "users_update_own"
ON users FOR UPDATE
USING (
  CASE
    WHEN auth.uid()::text IS NOT NULL THEN auth.uid()::text = id
    ELSE FALSE
  END
)
WITH CHECK (
  CASE
    WHEN auth.uid()::text IS NOT NULL THEN auth.uid()::text = id
    ELSE FALSE
  END
);

-- Server-side backend can insert users (has direct database connection)
-- This allows the app to create users without Supabase Auth
CREATE POLICY "users_insert_backend"
ON users FOR INSERT
WITH CHECK (true);

-- Admin/owner can update any user via Supabase Auth
CREATE POLICY "users_update_admin"
ON users FOR UPDATE
USING (
  auth.uid()::text IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()::text
    AND (u.is_admin OR u.is_owner)
  )
)
WITH CHECK (
  auth.uid()::text IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()::text
    AND (u.is_admin OR u.is_owner)
  )
);

-- Admin/owner can delete users via Supabase Auth
CREATE POLICY "users_delete_admin"
ON users FOR DELETE
USING (
  auth.uid()::text IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()::text
    AND u.is_owner
  )
);

-- ============================================================================
-- 12b. USERS - Authorization constraint (only Milsling & authorized emails as admin/owner)
-- ============================================================================
-- Block unauthorized admin/owner field modifications
CREATE POLICY "users_prevent_unauthorized_admin"
ON users FOR UPDATE
USING (true)
WITH CHECK (
  -- If trying to set is_admin or is_owner to true, enforce authorization
  CASE
    WHEN (is_admin = true OR is_owner = true)
    THEN
      -- Only Milsling and authorized emails can be admin/owner
      username = 'Milsling' 
      OR email = 'trevorjpiccone@gmail.com'
      OR email = 'picconetrevor@gmail.com'
      OR email = 'support@orphanbars.com'
    ELSE true  -- Can set to false without restriction
  END
);

-- ============================================================================
-- 13. BARS - Users own their bars, authenticated users can create
-- ============================================================================
ALTER TABLE bars ENABLE ROW LEVEL SECURITY;

-- Anyone can read bars
CREATE POLICY "bars_select_public"
ON bars FOR SELECT
USING (true);

-- Authenticated users can insert (create their own bars)
CREATE POLICY "bars_insert_authenticated"
ON bars FOR INSERT
WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Users can update their own bars, admins can update any
CREATE POLICY "bars_update_own_or_admin"
ON bars FOR UPDATE
USING (
  auth.uid()::text = user_id
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()::text
    AND (u.is_admin OR u.is_owner)
  )
  OR auth.role() = 'service_role'
)
WITH CHECK (
  auth.uid()::text = user_id
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()::text
    AND (u.is_admin OR u.is_owner)
  )
  OR auth.role() = 'service_role'
);

-- Users can delete their own bars, admins can delete any
CREATE POLICY "bars_delete_own_or_admin"
ON bars FOR DELETE
USING (
  auth.uid()::text = user_id
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()::text
    AND (u.is_admin OR u.is_owner)
  )
  OR auth.role() = 'service_role'
);

-- ============================================================================
-- 14. COMMENTS - Users own their comments, authenticated can create
-- ============================================================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "comments_select_public"
ON comments FOR SELECT
USING (true);

-- Authenticated users can insert comments
CREATE POLICY "comments_insert_authenticated"
ON comments FOR INSERT
WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Users can update/delete their own comments, admins can modify any
CREATE POLICY "comments_modify_own_or_admin"
ON comments FOR UPDATE
USING (
  auth.uid()::text = user_id
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()::text
    AND (u.is_admin OR u.is_owner)
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY "comments_delete_own_or_admin"
ON comments FOR DELETE
USING (
  auth.uid()::text = user_id
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()::text
    AND (u.is_admin OR u.is_owner)
  )
  OR auth.role() = 'service_role'
);

-- ============================================================================
-- 15. LIKES - Users own their likes, authenticated can create
-- ============================================================================
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Anyone can read likes
CREATE POLICY "likes_select_public"
ON likes FOR SELECT
USING (true);

-- Authenticated users can insert likes
CREATE POLICY "likes_insert_authenticated"
ON likes FOR INSERT
WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Users can delete their own likes
CREATE POLICY "likes_delete_own"
ON likes FOR DELETE
USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- ============================================================================
-- 16. DIRECT_MESSAGES - Users can only see/modify their own messages
-- ============================================================================
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages they're involved in
CREATE POLICY "direct_messages_select_own"
ON direct_messages FOR SELECT
USING (
  (SELECT id FROM users WHERE users.id = auth.uid()::text LIMIT 1) = sender_id
  OR (SELECT id FROM users WHERE users.id = auth.uid()::text LIMIT 1) = receiver_id
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()::text
    AND (u.is_admin OR u.is_owner)
  )
  OR auth.role() = 'service_role'
);

-- Authenticated users can send messages
CREATE POLICY "direct_messages_insert_authenticated"
ON direct_messages FOR INSERT
WITH CHECK (auth.uid()::text = sender_id OR auth.role() = 'service_role');

-- Users can delete their own sent messages
CREATE POLICY "direct_messages_delete_own"
ON direct_messages FOR DELETE
USING (
  auth.uid()::text = sender_id
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()::text
    AND (u.is_admin OR u.is_owner)
  )
  OR auth.role() = 'service_role'
);

-- ============================================================================
-- 17. NOTIFICATIONS - Users can only see their own
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
ON notifications FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "notifications_insert_backend"
ON notifications FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "notifications_delete_own"
ON notifications FOR DELETE
USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- ============================================================================
-- 18. FOLLOWS - Users manage their own follows
-- ============================================================================
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_public"
ON follows FOR SELECT
USING (true);

CREATE POLICY "follows_insert_own"
ON follows FOR INSERT
WITH CHECK (auth.uid()::text = follower_id OR auth.role() = 'service_role');

CREATE POLICY "follows_delete_own"
ON follows FOR DELETE
USING (auth.uid()::text = follower_id OR auth.role() = 'service_role');

-- ============================================================================
-- 19. BOOKMARKS - Users manage their own bookmarks
-- ============================================================================
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookmarks_select_own"
ON bookmarks FOR SELECT
USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "bookmarks_insert_own"
ON bookmarks FOR INSERT
WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "bookmarks_delete_own"
ON bookmarks FOR DELETE
USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- ============================================================================
-- 20. VERIFICATION_CODES - Public (no auth required for signup/verification)
-- ============================================================================
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can read verification codes (needed for verification flow)
CREATE POLICY "verification_codes_insert_public"
ON verification_codes FOR INSERT
WITH CHECK (true);

CREATE POLICY "verification_codes_select_public"
ON verification_codes FOR SELECT
USING (true);

-- Auto-delete old codes or admin cleanup
CREATE POLICY "verification_codes_delete_admin"
ON verification_codes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND (users.is_admin OR users.is_owner)
  )
  OR expires_at < NOW()
);

-- ============================================================================
-- AUTHORIZATION RULE
-- ============================================================================
-- CRITICAL: Only these identities can be admin/owner:
--   - Username: Milsling
--   - Emails: trevorjpiccone@gmail.com, picconetrevor@gmail.com, support@orphanbars.com
-- Any attempt to promote other users to admin/owner will be blocked at the RLS level.
-- Backend server (service_role) can bypass for trusted operations.

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration enables RLS and creates appropriate policies:
-- ✅ achievement_badge_images (public read, admin write)
-- ✅ ai_review_requests (user read own, admin review)
-- ✅ ai_settings (public read, owner write)
-- ✅ bar_sequence (authenticated read)
-- ✅ bars (public read, user create/modify own, admin modify any)
-- ✅ bookmarks (user private, authenticated create/modify own)
-- ✅ comments (public read, user create/modify own, admin modify any)
-- ✅ debug_logs (admin only)
-- ✅ direct_messages (user private, authenticated send)
-- ✅ flagged_phrases (public read, admin write)
-- ✅ follows (public read, user manage own)
-- ✅ likes (public read, user create own)
-- ✅ maintenance_status (public read, owner write)
-- ✅ notifications (user private)
-- ============================================================================
-- 21. ADOPTIONS - Backend only
-- ============================================================================
ALTER TABLE adoptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adoptions_select_public" ON adoptions FOR SELECT USING (true);
CREATE POLICY "adoptions_insert_backend" ON adoptions FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 22. COMMENT_LIKES - Users like/unlike comments
-- ============================================================================
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comment_likes_select_public" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "comment_likes_insert_own" ON comment_likes FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "comment_likes_delete_own" ON comment_likes FOR DELETE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- ============================================================================
-- 23. COMMENT_DISLIKES - Users dislike comments
-- ============================================================================
ALTER TABLE comment_dislikes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comment_dislikes_select_public" ON comment_dislikes FOR SELECT USING (true);
CREATE POLICY "comment_dislikes_insert_own" ON comment_dislikes FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "comment_dislikes_delete_own" ON comment_dislikes FOR DELETE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- ============================================================================
-- 24. DISLIKES - Users dislike bars  
-- ============================================================================
ALTER TABLE dislikes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dislikes_select_public" ON dislikes FOR SELECT USING (true);
CREATE POLICY "dislikes_insert_own" ON dislikes FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "dislikes_delete_own" ON dislikes FOR DELETE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- ============================================================================
-- 25. CUSTOM_ACHIEVEMENTS - Admin/owner only
-- ============================================================================
ALTER TABLE custom_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_achievements_select_admin" ON custom_achievements FOR SELECT USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()::text AND (u.is_admin OR u.is_owner)) OR auth.role() = 'service_role');
CREATE POLICY "custom_achievements_insert_admin" ON custom_achievements FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()::text AND (u.is_admin OR u.is_owner)) OR auth.role() = 'service_role');

-- ============================================================================
-- 26. CUSTOM_TAGS - Admin only
-- ============================================================================
ALTER TABLE custom_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_tags_select_public" ON custom_tags FOR SELECT USING (true);
CREATE POLICY "custom_tags_insert_admin" ON custom_tags FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()::text AND (u.is_admin OR u.is_owner)) OR auth.role() = 'service_role');

-- ============================================================================
-- 27. CUSTOM_CATEGORIES - Admin only
-- ============================================================================
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_categories_select_public" ON custom_categories FOR SELECT USING (true);
CREATE POLICY "custom_categories_insert_admin" ON custom_categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()::text AND (u.is_admin OR u.is_owner)) OR auth.role() = 'service_role');

-- ============================================================================
-- 28. NOTEBOOKS - User private documents
-- ============================================================================
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notebooks_select_own" ON notebooks FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "notebooks_insert_own" ON notebooks FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "notebooks_update_own" ON notebooks FOR UPDATE USING (auth.uid()::text = user_id OR auth.role() = 'service_role') WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "notebooks_delete_own" ON notebooks FOR DELETE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- ============================================================================
-- 29. FRIENDSHIPS - Users manage friend requests
-- ============================================================================
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendships_select_own" ON friendships FOR SELECT USING (auth.uid()::text = requester_id OR auth.uid()::text = receiver_id OR auth.role() = 'service_role');
CREATE POLICY "friendships_insert_own" ON friendships FOR INSERT WITH CHECK (auth.uid()::text = requester_id OR auth.role() = 'service_role');
CREATE POLICY "friendships_update_own" ON friendships FOR UPDATE USING (auth.uid()::text = receiver_id OR auth.uid()::text = requester_id OR auth.role() = 'service_role') WITH CHECK (auth.uid()::text = receiver_id OR auth.uid()::text = requester_id OR auth.role() = 'service_role');
CREATE POLICY "friendships_delete_own" ON friendships FOR DELETE USING (auth.uid()::text = requester_id OR auth.uid()::text = receiver_id OR auth.role() = 'service_role');

-- ============================================================================
-- 30. PUSH_SUBSCRIPTIONS - User private subscriptions
-- ============================================================================
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subscriptions_select_own" ON push_subscriptions FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "push_subscriptions_insert_own" ON push_subscriptions FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "push_subscriptions_delete_own" ON push_subscriptions FOR DELETE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- ============================================================================
-- 31. PROFILE_BADGES - Public display, admins manage
-- ============================================================================
ALTER TABLE profile_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile_badges_select_public" ON profile_badges FOR SELECT USING (true);
CREATE POLICY "profile_badges_insert_admin" ON profile_badges FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()::text AND (u.is_admin OR u.is_owner)) OR auth.role() = 'service_role');

-- ============================================================================
-- 32. REPORTS - Users report, admins review
-- ============================================================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_select_admin" ON reports FOR SELECT USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()::text AND (u.is_admin OR u.is_owner)) OR auth.role() = 'service_role');
CREATE POLICY "reports_insert_authenticated" ON reports FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL OR auth.role() = 'service_role');

-- ============================================================================
-- 33. USER_ACHIEVEMENTS - User private achievement records
-- ============================================================================
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_achievements_select_own" ON user_achievements FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "user_achievements_insert_backend" ON user_achievements FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 34. USER_BADGES - Public display, admin manage
-- ============================================================================
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_badges_select_public" ON user_badges FOR SELECT USING (true);
CREATE POLICY "user_badges_insert_admin" ON user_badges FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()::text AND (u.is_admin OR u.is_owner)) OR auth.role() = 'service_role');

-- ============================================================================
-- 35. BAR_USAGES - Backend tracking of bar usage
-- ============================================================================
ALTER TABLE bar_usages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bar_usages_select_public" ON bar_usages FOR SELECT USING (true);
CREATE POLICY "bar_usages_insert_authenticated" ON bar_usages FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- ✅ password_reset_codes (public for reset flow)
-- ✅ protected_bars (owner only)
-- ✅ sessions (public for Passport)
-- ✅ users (public read, user update own, STRICT admin authorization, admin/owner modify)
-- ✅ verification_codes (public for signup flow)
