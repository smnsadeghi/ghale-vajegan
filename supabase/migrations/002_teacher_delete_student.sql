-- ====================================================================
-- GHALE VAJEGAN - MIGRATION 002: TEACHER DELETE STUDENT RPC
-- Version: v4.1.1
-- Architecture: Supabase Postgres + Security Definer RPC
-- Purpose: Safely delete student record and associated notifications,
--          resolving ghost-account desync between cloud and local state.
-- ====================================================================

CREATE OR REPLACE FUNCTION teacher_delete_student(
  p_admin_pass TEXT,
  p_student_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INT := 0;
BEGIN
  -- 1. Strictly verify teacher admin credential
  IF p_admin_pass IS DISTINCT FROM '431380' THEN
    RAISE EXCEPTION 'دسترسی غیرمجاز: رمز عبور دبیر اشتباه است.';
  END IF;

  -- 2. Validate input
  IF p_student_phone IS NULL OR trim(p_student_phone) = '' THEN
    RAISE EXCEPTION 'شماره تلفن دانش‌آموز الزامی است.';
  END IF;

  -- 3. Delete related in-app notifications
  DELETE FROM gv_notifications
  WHERE student_phone = trim(p_student_phone);

  -- 4. Delete student record from gv_students
  -- (gv_students stores the student phone in code column; dynamically support phone column if present)
  DELETE FROM gv_students
  WHERE code = trim(p_student_phone);
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Check if a 'phone' column also exists in gv_students schema and delete if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gv_students' AND column_name = 'phone'
  ) THEN
    EXECUTE 'DELETE FROM gv_students WHERE phone = $1' USING trim(p_student_phone);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_phone', trim(p_student_phone),
    'rows_deleted', v_deleted_count
  );
END;
$$;

-- Grant execution privileges to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION teacher_delete_student(TEXT, TEXT) TO anon, authenticated, service_role;
