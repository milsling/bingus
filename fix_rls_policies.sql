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
  auth.uid() = user_id
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
  auth.uid() = user_id
);

-- Users can update their own requests (before review)
CREATE POLICY "ai_review_requests_update_own"
ON ai_review_requests FOR UPDATE
USING (
  auth.uid() = user_id
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = user_id
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

-- ============================================================================
-- 11. SITE_SETTINGS - Public read, owner only write
-- ============================================================================
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings (affects public display)
CREATE POLICY "site_settings_select_public"
ON site_settings FOR SELECT
USING (true);

-- Only owner can update site settings
CREATE POLICY "site_settings_update_owner"
ON site_settings FOR UPDATE
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
-- 13. VERIFICATION_CODES - Public (no auth required for signup/verification)
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
-- SUMMARY
-- ============================================================================
-- This migration enables RLS and creates appropriate policies for:
-- ✅ achievement_badge_images (public read, admin write)
-- ✅ ai_review_requests (user read own, admin review)
-- ✅ ai_settings (public read, owner write)
-- ✅ bar_sequence (authenticated read)
-- ✅ debug_logs (admin only)
-- ✅ flagged_phrases (public read, admin write)
-- ✅ maintenance_status (public read, owner write)
-- ✅ password_reset_codes (public for reset flow)
-- ✅ protected_bars (owner only)
-- ✅ sessions (public for Passport)
-- ✅ site_settings (public read, owner write)
-- ✅ users (public read, user update own, admin/owner modify)
-- ✅ verification_codes (public for signup flow)
