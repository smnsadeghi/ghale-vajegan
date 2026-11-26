-- ====================================================================
-- GHALE VAJEGAN - MIGRATION 001: STUDENT REGISTRATION APPROVAL SYSTEM
-- Version: v4.1
-- Architecture: Supabase Postgres + RLS + Security Definer RPCs
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Safely add columns to gv_students
-- Default existing accounts to 'approved' so no active users are blocked
ALTER TABLE gv_students
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'approved'
  CHECK (account_status IN ('pending', 'approved', 'rejected'));

-- Ensure any existing rows without explicit status are marked as approved
UPDATE gv_students
  SET account_status = 'approved'
  WHERE account_status IS NULL OR account_status = 'pending';

-- Alter future default for all new student registrations to 'pending'
ALTER TABLE gv_students
  ALTER COLUMN account_status SET DEFAULT 'pending';

-- Add tracking and audit columns
ALTER TABLE gv_students
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE gv_students
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE gv_students
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE gv_students
  ADD COLUMN IF NOT EXISTS resubmission_count INT DEFAULT 0;

-- 2. Create In-App Notifications table (gv_notifications)
CREATE TABLE IF NOT EXISTS gv_notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('student', 'teacher')),
  student_phone TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gv_notif_student ON gv_notifications(student_phone, recipient_type, is_read);
CREATE INDEX IF NOT EXISTS idx_gv_notif_teacher ON gv_notifications(recipient_type, is_read);

-- Enable RLS on gv_notifications
ALTER TABLE gv_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_select_policy ON gv_notifications;
CREATE POLICY notif_select_policy ON gv_notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS notif_insert_policy ON gv_notifications;
CREATE POLICY notif_insert_policy ON gv_notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS notif_update_policy ON gv_notifications;
CREATE POLICY notif_update_policy ON gv_notifications FOR UPDATE USING (true);

-- 3. Anti-Tampering Trigger for account_status
-- Prevents public anon / student clients from directly modifying account_status via REST PATCH / PUT
CREATE OR REPLACE FUNCTION gv_protect_student_status()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.account_status IS DISTINCT FROM OLD.account_status) THEN
    IF current_setting('gv.authorized_rpc', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'دسترسی غیرمجاز: تغییر مستقیم وضعیت حساب کاربری تنها از طریق توابع رسمی دبیر مجاز است.';
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

-- 4. RPC 1: Student Registration (Strictly creates pending accounts)
CREATE OR REPLACE FUNCTION register_student(
  p_phone TEXT,
  p_pin_hash TEXT,
  p_name TEXT,
  p_major TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing gv_students%ROWTYPE;
  v_new gv_students%ROWTYPE;
BEGIN
  -- Phone format validation (Iranian 11-digit mobile: 09xxxxxxxxx)
  IF p_phone IS NULL OR p_phone !~ '^09[0-9]{9}$' THEN
    RAISE EXCEPTION 'شماره تلفن نامعتبر است. شماره همراه باید ۱۱ رقم بوده و با ۰۹ آغاز شود.';
  END IF;

  -- Name validation
  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'نام و نام خانوادگی الزامی است.';
  END IF;

  -- Duplicate check
  SELECT * INTO v_existing FROM gv_students WHERE code = p_phone;
  IF FOUND THEN
    RAISE EXCEPTION 'این شماره تلفن قبلاً در سامانه ثبت شده است.';
  END IF;

  -- Set session flag for trigger bypass
  PERFORM set_config('gv.authorized_rpc', 'true', true);

  INSERT INTO gv_students (
    code,
    name,
    major,
    pin_hash,
    xp,
    completed_stages,
    mistakes,
    account_status,
    rejection_reason,
    submitted_at,
    reviewed_at,
    resubmission_count
  ) VALUES (
    p_phone,
    trim(p_name),
    trim(COALESCE(p_major, 'عمومی')),
    p_pin_hash,
    0,
    '[]'::jsonb,
    '{}'::jsonb,
    'pending',
    NULL,
    now(),
    NULL,
    0
  )
  RETURNING * INTO v_new;

  -- Insert notification for the teacher queue
  INSERT INTO gv_notifications (
    recipient_type,
    student_phone,
    title,
    message
  ) VALUES (
    'teacher',
    p_phone,
    'ثبت‌نام جدید',
    'دانش‌آموز ' || trim(p_name) || ' (' || trim(COALESCE(p_major, 'عمومی')) || ') با شماره ' || p_phone || ' ثبت‌نام کرد و در انتظار تأیید است.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'code', v_new.code,
    'name', v_new.name,
    'major', v_new.major,
    'account_status', v_new.account_status,
    'submitted_at', v_new.submitted_at
  );
END;
$$;

-- 5. RPC 2: Resubmit Student Registration (Only from rejected state)
CREATE OR REPLACE FUNCTION resubmit_student_registration(
  p_phone TEXT,
  p_pin TEXT,
  p_name TEXT,
  p_major TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student gv_students%ROWTYPE;
  v_updated gv_students%ROWTYPE;
  v_calc_hash TEXT;
BEGIN
  SELECT * INTO v_student FROM gv_students WHERE code = p_phone;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'دانش‌آموز با این شماره تلفن یافت نشد.';
  END IF;

  -- Authenticate student PIN (accepts raw 4-digit PIN with salt or pre-hashed SHA256)
  IF v_student.pin_hash IS NOT NULL THEN
    IF length(p_pin) = 4 THEN
      v_calc_hash := encode(digest('gv_' || p_pin, 'sha256'), 'hex');
    ELSE
      v_calc_hash := p_pin;
    END IF;

    IF v_student.pin_hash <> v_calc_hash AND v_student.pin_hash <> p_pin THEN
      RAISE EXCEPTION 'رمز عبور (کد پین) وارد شده صحیح نیست.';
    END IF;
  END IF;

  -- Enforce transition validity: must be currently rejected
  IF v_student.account_status <> 'rejected' THEN
    RAISE EXCEPTION 'امکان ارسال مجدد تنها برای حساب‌های با وضعیت ردشده وجود دارد.';
  END IF;

  -- Name validation
  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'نام و نام خانوادگی معتبر الزامی است.';
  END IF;

  -- Set session flag for trigger bypass
  PERFORM set_config('gv.authorized_rpc', 'true', true);

  UPDATE gv_students
  SET
    account_status = 'pending',
    rejection_reason = NULL,
    name = trim(p_name),
    major = trim(COALESCE(p_major, major)),
    resubmission_count = COALESCE(resubmission_count, 0) + 1,
    submitted_at = now()
  WHERE code = p_phone
  RETURNING * INTO v_updated;

  -- Insert notification for teacher
  INSERT INTO gv_notifications (
    recipient_type,
    student_phone,
    title,
    message
  ) VALUES (
    'teacher',
    p_phone,
    'ارسال مجدد مشخصات',
    'دانش‌آموز ' || trim(v_updated.name) || ' (' || trim(v_updated.major) || ') اطلاعات ویرایش‌شده را جهت بررسی ارسال کرد (بار ' || v_updated.resubmission_count || ').'
  );

  RETURN jsonb_build_object(
    'success', true,
    'code', v_updated.code,
    'name', v_updated.name,
    'major', v_updated.major,
    'account_status', v_updated.account_status,
    'resubmission_count', v_updated.resubmission_count,
    'submitted_at', v_updated.submitted_at
  );
END;
$$;

-- 6. RPC 3: Teacher Review Student (Authorize via 431380, enforce valid transitions)
CREATE OR REPLACE FUNCTION teacher_review_student(
  p_admin_pass TEXT,
  p_student_phone TEXT,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student gv_students%ROWTYPE;
  v_updated gv_students%ROWTYPE;
BEGIN
  -- Strict server-side credential verification
  IF p_admin_pass IS DISTINCT FROM '431380' THEN
    RAISE EXCEPTION 'دسترسی غیرمجاز: رمز عبور دبیر اشتباه است.';
  END IF;

  -- Action validity
  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'عملیات نامعتبر است. وضعیت باید approved یا rejected باشد.';
  END IF;

  -- Enforce non-empty reason for rejections
  IF p_action = 'rejected' AND (p_reason IS NULL OR length(trim(p_reason)) = 0) THEN
    RAISE EXCEPTION 'ذکر دلیل رد درخواست الزامی است.';
  END IF;

  SELECT * INTO v_student FROM gv_students WHERE code = p_student_phone;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'دانش‌آموزی با این شماره تلفن یافت نشد.';
  END IF;

  -- Transition check: must be pending
  IF v_student.account_status <> 'pending' THEN
    RAISE EXCEPTION 'تنها حساب‌های با وضعیت در انتظار تأیید قابل بررسی هستند.';
  END IF;

  -- Set session flag for trigger bypass
  PERFORM set_config('gv.authorized_rpc', 'true', true);

  UPDATE gv_students
  SET
    account_status = p_action,
    rejection_reason = CASE WHEN p_action = 'rejected' THEN trim(p_reason) ELSE NULL END,
    reviewed_at = now()
  WHERE code = p_student_phone
  RETURNING * INTO v_updated;

  -- Create in-app notification for the student
  IF p_action = 'approved' THEN
    INSERT INTO gv_notifications (
      recipient_type,
      student_phone,
      title,
      message
    ) VALUES (
      'student',
      p_student_phone,
      'تأیید حساب کاربری',
      'حساب کاربری شما توسط دبیر با موفقیت تأیید شد. اکنون می‌توانید وارد برج‌های قلعه واژگان شوید.'
    );
  ELSE
    INSERT INTO gv_notifications (
      recipient_type,
      student_phone,
      title,
      message
    ) VALUES (
      'student',
      p_student_phone,
      'رد درخواست ثبت‌نام',
      'درخواست ثبت‌نام شما مورد تأیید قرار نگرفت. دلیل دبیر: ' || trim(p_reason)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'code', v_updated.code,
    'name', v_updated.name,
    'account_status', v_updated.account_status,
    'rejection_reason', v_updated.rejection_reason,
    'reviewed_at', v_updated.reviewed_at
  );
END;
$$;

-- 7. Grant table & execution privileges to anon & authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE gv_students TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE gv_notifications TO anon, authenticated;
GRANT ALL ON SEQUENCE gv_notifications_id_seq TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE gv_state TO anon, authenticated;

GRANT EXECUTE ON FUNCTION register_student(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION resubmit_student_registration(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION teacher_review_student(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
