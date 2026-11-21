-- ====================================================================
-- GHALE VAJEGAN - MIGRATION 003: COMPETITIVE PROFILES & ACHIEVEMENTS
-- Version: v4.2
-- Architecture: Supabase Postgres + Idempotent Schema Alterations
-- ====================================================================

-- 1. Safely add competitive and gamification columns to gv_students
ALTER TABLE gv_students ADD COLUMN IF NOT EXISTS ranked_attempts JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE gv_students ADD COLUMN IF NOT EXISTS achievements JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE gv_students ADD COLUMN IF NOT EXISTS pinned_achievements JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE gv_students ADD COLUMN IF NOT EXISTS stats JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gv_students_ranked_attempts ON gv_students USING gin (ranked_attempts);
CREATE INDEX IF NOT EXISTS idx_gv_students_achievements ON gv_students USING gin (achievements);

-- 2. Ensure anti-tampering trigger protects account_status, rejection_reason, and reviewed_at
-- while allowing approved students to update gameplay columns (xp, ranked_attempts, achievements, etc.)
CREATE OR REPLACE FUNCTION gv_protect_student_status()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.account_status IS DISTINCT FROM OLD.account_status OR
        NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason OR
        NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at) THEN
      IF current_setting('gv.authorized_rpc', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'دسترسی غیرمجاز: تغییر مستقیم وضعیت حساب کاربری تنها از طریق توابع رسمی دبیر مجاز است.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gv_protect_student_status ON gv_students;
CREATE TRIGGER trg_gv_protect_student_status
  BEFORE UPDATE ON gv_students
  FOR EACH ROW
  EXECUTE FUNCTION gv_protect_student_status();
