-- ═══════════════════════════════════════════════════════════════════════
-- Community Management System — Supabase Schema
-- Run this entire script in your Supabase project's SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Platform-level key/value store
--    Stores: platform admin credentials, list of communities
CREATE TABLE IF NOT EXISTS platform_kv (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- 2. Community-scoped key/value store
--    Stores everything namespaced by community_id:
--    admin, owners, invoices, payments, expenses, staffList, notices, etc.
CREATE TABLE IF NOT EXISTS community_kv (
  community_id TEXT    NOT NULL,
  key          TEXT    NOT NULL,
  value        JSONB   NOT NULL,
  PRIMARY KEY (community_id, key)
);

-- ── Row-Level Security ────────────────────────────────────────────────
-- The app handles its own authentication logic, so we open both tables
-- to the anon key. Restrict these policies once you add Supabase Auth.

ALTER TABLE platform_kv  ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_kv ENABLE ROW LEVEL SECURITY;

-- Grant table access to the Supabase API roles used by the mobile app.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE platform_kv TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE community_kv TO anon, authenticated;

-- Drop policies if re-running this script
DROP POLICY IF EXISTS "open_all" ON platform_kv;
DROP POLICY IF EXISTS "open_all" ON community_kv;

CREATE POLICY "open_all" ON platform_kv
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "open_all" ON community_kv
  FOR ALL USING (true) WITH CHECK (true);

-- ── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_community_kv_cid ON community_kv (community_id);

-- ── Done ──────────────────────────────────────────────────────────────
-- After running this script, go back to the app and fill in your
-- SUPABASE_URL and SUPABASE_ANON_KEY constants.
