-- ====================================================================
-- GHALE VAJEGAN - MIGRATION 004: CROSS-DEVICE REGISTRATION & APPROVAL SYNC
-- Version: v4.4
-- Architecture: Supabase Postgres + RLS + Security Definer RPCs
-- ====================================================================

-- 1. Grant schema usage and table privileges to anon & authenticated roles
-- This resolves the HTTP 401 'permission denied for table gv_students' error
-- that prevented other devices from fetching student records via REST.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE gv_students TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE gv_notifications TO anon, authenticated;
GRANT ALL ON SEQUENCE gv_notifications_id_seq TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE gv_state TO anon, authenticated;

-- Ensure RLS policies exist on gv_students for select
ALTER TABLE gv_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS students_select_policy ON gv_students;
CREATE POLICY students_select_policy ON gv_students FOR SELECT USING (true);

DROP POLICY IF EXISTS students_insert_policy ON gv_students;
CREATE POLICY students_insert_policy ON gv_students FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS students_update_policy ON gv_students;
CREATE POLICY students_update_policy ON gv_students FOR UPDATE USING (true);

-- Ensure RLS policies on gv_state
ALTER TABLE gv_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS state_select_policy ON gv_state;
CREATE POLICY state_select_policy ON gv_state FOR SELECT USING (true);

DROP POLICY IF EXISTS state_all_policy ON gv_state;
CREATE POLICY state_all_policy ON gv_state FOR ALL USING (true);

-- 2. Dedicated RPC: Teacher Full Queue Fetch (Bypasses any client REST permission issues)
CREATE OR REPLACE FUNCTION get_teacher_students_queue(
  p_admin_pass TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res JSONB;
BEGIN
  -- Strict credential verification
  IF p_admin_pass IS DISTINCT FROM '431380' THEN
    RAISE EXCEPTION 'دسترسی غیرمجاز: رمز عبور دبیر اشتباه است.';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
  INTO v_res
  FROM (
    SELECT * FROM gv_students
    ORDER BY submitted_at DESC NULLS LAST
  ) s;

  RETURN v_res;
END;
$$;

-- 3. Dedicated RPC: Single Student Status Query for Student Device Sync
CREATE OR REPLACE FUNCTION get_student_status(
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student gv_students%ROWTYPE;
BEGIN
  IF p_phone IS NULL OR p_phone !~ '^09[0-9]{9}$' THEN
    RAISE EXCEPTION 'شماره همراه نامعتبر است.';
  END IF;

  SELECT * INTO v_student FROM gv_students WHERE code = p_phone;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_student);
END;
$$;

-- 4. Grant execution privileges to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION get_teacher_students_queue(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_student_status(TEXT) TO anon, authenticated, service_role;
