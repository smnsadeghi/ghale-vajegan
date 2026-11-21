// ====================================================================
// GHALE VAJEGAN - STUDENT REGISTRATION APPROVAL & DELETION SYSTEM TESTS
// Specification: v4.1.1 (Node.js Built-in Test Runner)
// ====================================================================

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PROJECT_DIR = 'C:/Users/acer/.gemini/antigravity/scratch/ghale-vajegan';
const htmlContent = fs.readFileSync(path.join(PROJECT_DIR, 'index.html'), 'utf8');
const swContent = fs.readFileSync(path.join(PROJECT_DIR, 'sw.js'), 'utf8');
const sqlMigration1 = fs.readFileSync(path.join(PROJECT_DIR, 'supabase/migrations/001_student_approval_system.sql'), 'utf8');
const sqlMigration2 = fs.readFileSync(path.join(PROJECT_DIR, 'supabase/migrations/002_teacher_delete_student.sql'), 'utf8');

// Simulation of the Approval System logic (mirroring RPC & client models)
class ApprovalSystemSimulator {
  constructor() {
    this.students = new Map();
    this.notifications = [];
    this.authorizedRpc = false;
    this.TEACHER_PASS = '431380';
  }

  hashPin(pin) {
    return crypto.createHash('sha256').update('gv_' + pin).digest('hex');
  }

  // Simulated Database Trigger: checks tampering
  beforeUpdateStudent(oldRow, newRow) {
    if (newRow.account_status !== oldRow.account_status && !this.authorizedRpc) {
      throw new Error('دسترسی غیرمجاز: تغییر مستقیم وضعیت حساب کاربری تنها از طریق توابع رسمی دبیر مجاز است.');
    }
  }

  // RPC 1: register_student
  registerStudent(phone, pinHash, name, major) {
    if (!phone || !/^09\d{9}$/.test(phone)) {
      throw new Error('شماره تلفن نامعتبر است. شماره همراه باید ۱۱ رقم بوده و با ۰۹ آغاز شود.');
    }
    if (!name || name.trim().length < 2) {
      throw new Error('نام و نام خانوادگی الزامی است.');
    }
    if (this.students.has(phone)) {
      throw new Error('این شماره تلفن قبلاً در سامانه ثبت شده است.');
    }

    const student = {
      code: phone,
      name: name.trim(),
      major: (major || 'عمومی').trim(),
      pin_hash: pinHash,
      xp: 0,
      completed_stages: [],
      mistakes: {},
      account_status: 'pending',
      rejection_reason: null,
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      resubmission_count: 0
    };

    this.students.set(phone, student);

    this.notifications.push({
      id: Date.now() + Math.random(),
      recipient_type: 'teacher',
      student_phone: phone,
      title: 'ثبت‌نام جدید',
      message: `دانش‌آموز ${student.name} (${student.major}) با شماره ${phone} ثبت‌نام کرد و در انتظار تأیید است.`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      code: student.code,
      name: student.name,
      major: student.major,
      account_status: student.account_status,
      submitted_at: student.submitted_at
    };
  }

  // RPC 2: resubmit_student_registration
  resubmitRegistration(phone, pin, newName, newMajor) {
    const student = this.students.get(phone);
    if (!student) {
      throw new Error('دانش‌آموز با این شماره تلفن یافت نشد.');
    }

    // Verify PIN
    const hashedPin = (pin.length === 4) ? this.hashPin(pin) : pin;
    if (student.pin_hash && student.pin_hash !== hashedPin && student.pin_hash !== pin) {
      throw new Error('رمز عبور (کد پین) وارد شده صحیح نیست.');
    }

    if (student.account_status !== 'rejected') {
      throw new Error('امکان ارسال مجدد تنها برای حساب‌های با وضعیت ردشده وجود دارد.');
    }

    if (!newName || newName.trim().length < 2) {
      throw new Error('نام و نام خانوادگی معتبر الزامی است.');
    }

    const oldCopy = { ...student };

    this.authorizedRpc = true;
    try {
      student.account_status = 'pending';
      student.rejection_reason = null;
      student.name = newName.trim();
      student.major = (newMajor || student.major).trim();
      student.resubmission_count += 1;
      student.submitted_at = new Date().toISOString();

      this.beforeUpdateStudent(oldCopy, student);
    } finally {
      this.authorizedRpc = false;
    }

    this.notifications.push({
      id: Date.now() + Math.random(),
      recipient_type: 'teacher',
      student_phone: phone,
      title: 'ارسال مجدد مشخصات',
      message: `دانش‌آموز ${student.name} (${student.major}) اطلاعات ویرایش‌شده را جهت بررسی ارسال کرد (بار ${student.resubmission_count}).`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      code: student.code,
      name: student.name,
      major: student.major,
      account_status: student.account_status,
      resubmission_count: student.resubmission_count,
      submitted_at: student.submitted_at
    };
  }

  // RPC 3: teacher_review_student
  teacherReview(adminPass, studentPhone, action, reason = null) {
    if (adminPass !== this.TEACHER_PASS) {
      throw new Error('دسترسی غیرمجاز: رمز عبور دبیر اشتباه است.');
    }

    if (!['approved', 'rejected'].includes(action)) {
      throw new Error('عملیات نامعتبر است. وضعیت باید approved یا rejected باشد.');
    }

    if (action === 'rejected' && (!reason || reason.trim().length === 0)) {
      throw new Error('ذکر دلیل رد درخواست الزامی است.');
    }

    const student = this.students.get(studentPhone);
    if (!student) {
      throw new Error('دانش‌آموزی با این شماره تلفن یافت نشد.');
    }

    if (student.account_status !== 'pending') {
      throw new Error('تنها حساب‌های با وضعیت در انتظار تأیید قابل بررسی هستند.');
    }

    const oldCopy = { ...student };

    this.authorizedRpc = true;
    try {
      student.account_status = action;
      student.rejection_reason = (action === 'rejected') ? reason.trim() : null;
      student.reviewed_at = new Date().toISOString();

      this.beforeUpdateStudent(oldCopy, student);
    } finally {
      this.authorizedRpc = false;
    }

    this.notifications.push({
      id: Date.now() + Math.random(),
      recipient_type: 'student',
      student_phone: studentPhone,
      title: (action === 'approved') ? 'تأیید حساب کاربری' : 'رد درخواست ثبت‌نام',
      message: (action === 'approved')
        ? 'حساب کاربری شما توسط دبیر با موفقیت تأیید شد. اکنون می‌توانید وارد قلعه واژگان شوید.'
        : `درخواست ثبت‌نام شما مورد تأیید قرار نگرفت. دلیل دبیر: ${reason.trim()}`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      code: student.code,
      name: student.name,
      account_status: student.account_status,
      rejection_reason: student.rejection_reason,
      reviewed_at: student.reviewed_at
    };
  }

  // RPC 4: teacher_delete_student
  teacherDeleteStudent(adminPass, studentPhone) {
    if (adminPass !== this.TEACHER_PASS) {
      throw new Error('دسترسی غیرمجاز: رمز عبور دبیر اشتباه است.');
    }

    if (!studentPhone || !studentPhone.trim()) {
      throw new Error('شماره تلفن دانش‌آموز الزامی است.');
    }

    const phone = studentPhone.trim();

    // 1. Delete notifications
    this.notifications = this.notifications.filter(n => n.student_phone !== phone);

    // 2. Delete student record
    const existed = this.students.has(phone);
    this.students.delete(phone);

    return {
      success: true,
      deleted_phone: phone,
      rows_deleted: existed ? 1 : 0
    };
  }

  // Simulated direct REST client tampering attempt
  directClientUpdate(phone, payload) {
    const student = this.students.get(phone);
    if (!student) throw new Error('Student not found');
    const oldCopy = { ...student };
    const newCopy = { ...student, ...payload };
    this.beforeUpdateStudent(oldCopy, newCopy);
    Object.assign(student, payload);
    return student;
  }

  // Simulated Leaderboard query: strictly filters out non-approved
  getLeaderboard() {
    return Array.from(this.students.values())
      .filter(s => s.account_status === 'approved' || !s.account_status)
      .sort((a, b) => (b.xp || 0) - (a.xp || 0));
  }
}

// ==========================================
// TEST SUITES
// ==========================================

describe('Student Registration Approval System - Backend Logic & Transitions', () => {
  let sim;
  const testPhone = '09121234567';
  const testPin = '1234';

  beforeEach(() => {
    sim = new ApprovalSystemSimulator();
  });

  it('1. New student registration creates pending account with resubmission_count = 0', () => {
    const pinHash = sim.hashPin(testPin);
    const res = sim.registerStudent(testPhone, pinHash, 'رضا محمدی', 'شبکه و نرم‌افزار');

    assert.equal(res.success, true);
    assert.equal(res.account_status, 'pending');

    const student = sim.students.get(testPhone);
    assert.equal(student.account_status, 'pending');
    assert.equal(student.resubmission_count, 0);
    assert.equal(student.rejection_reason, null);
    assert.ok(student.submitted_at);
  });

  it('2. Teacher approves pending student: status transitions to approved and sets reviewed_at', () => {
    const pinHash = sim.hashPin(testPin);
    sim.registerStudent(testPhone, pinHash, 'رضا محمدی', 'شبکه و نرم‌افزار');

    const res = sim.teacherReview('431380', testPhone, 'approved');
    assert.equal(res.success, true);
    assert.equal(res.account_status, 'approved');

    const student = sim.students.get(testPhone);
    assert.equal(student.account_status, 'approved');
    assert.ok(student.reviewed_at);
  });

  it('3. Teacher rejects pending student with reason: status transitions to rejected and stores reason', () => {
    const pinHash = sim.hashPin(testPin);
    sim.registerStudent(testPhone, pinHash, 'رضا ناشناس', 'نامشخص');

    const reason = 'نام و نام خانوادگی باید با شناسنامه مطابقت داشته باشد.';
    const res = sim.teacherReview('431380', testPhone, 'rejected', reason);
    assert.equal(res.success, true);
    assert.equal(res.account_status, 'rejected');
    assert.equal(res.rejection_reason, reason);

    const student = sim.students.get(testPhone);
    assert.equal(student.account_status, 'rejected');
    assert.equal(student.rejection_reason, reason);
    assert.ok(student.reviewed_at);
  });

  it('4. Rejected student resubmits registration: status resets to pending, clears reason, and increments resubmission_count', () => {
    const pinHash = sim.hashPin(testPin);
    sim.registerStudent(testPhone, pinHash, 'علی ناخوانا', 'عمومی');
    sim.teacherReview('431380', testPhone, 'rejected', 'رشته خود را به درستی انتخاب کنید.');

    const resub = sim.resubmitRegistration(testPhone, testPin, 'علی علوی', 'مکانیک خودرو');
    assert.equal(resub.success, true);
    assert.equal(resub.account_status, 'pending');
    assert.equal(resub.name, 'علی علوی');
    assert.equal(resub.major, 'مکانیک خودرو');
    assert.equal(resub.resubmission_count, 1);

    const student = sim.students.get(testPhone);
    assert.equal(student.account_status, 'pending');
    assert.equal(student.rejection_reason, null);
    assert.equal(student.resubmission_count, 1);
  });
});

describe('Student Registration Approval System - Validation & Invalid Transitions', () => {
  let sim;
  const testPhone = '09129876543';
  const testPin = '5555';

  beforeEach(() => {
    sim = new ApprovalSystemSimulator();
  });

  it('1. Rejecting a student without providing a reason throws an error', () => {
    sim.registerStudent(testPhone, sim.hashPin(testPin), 'سارا حسینی', 'صنایع چوب');

    assert.throws(
      () => sim.teacherReview('431380', testPhone, 'rejected', ''),
      /ذکر دلیل رد درخواست الزامی است/
    );

    assert.throws(
      () => sim.teacherReview('431380', testPhone, 'rejected', null),
      /ذکر دلیل رد درخواست الزامی است/
    );
  });

  it('2. Resubmitting an already approved student throws an error', () => {
    sim.registerStudent(testPhone, sim.hashPin(testPin), 'سارا حسینی', 'صنایع چوب');
    sim.teacherReview('431380', testPhone, 'approved');

    assert.throws(
      () => sim.resubmitRegistration(testPhone, testPin, 'سارا جدید', 'صنایع چوب'),
      /امکان ارسال مجدد تنها برای حساب‌های با وضعیت ردشده وجود دارد/
    );
  });

  it('3. Resubmitting a currently pending student throws an error', () => {
    sim.registerStudent(testPhone, sim.hashPin(testPin), 'سارا حسینی', 'صنایع چوب');

    assert.throws(
      () => sim.resubmitRegistration(testPhone, testPin, 'سارا دیگر', 'صنایع چوب'),
      /امکان ارسال مجدد تنها برای حساب‌های با وضعیت ردشده وجود دارد/
    );
  });

  it('4. Attempting to review a student who is not in pending state throws an error', () => {
    sim.registerStudent(testPhone, sim.hashPin(testPin), 'سارا حسینی', 'صنایع چوب');
    sim.teacherReview('431380', testPhone, 'approved');

    assert.throws(
      () => sim.teacherReview('431380', testPhone, 'rejected', 'دلیل تاخیری'),
      /تنها حساب‌های با وضعیت در انتظار تأیید قابل بررسی هستند/
    );
  });

  it('5. Registration fails if phone number format is invalid', () => {
    assert.throws(
      () => sim.registerStudent('08123456789', 'hash', 'نام', 'رشته'),
      /شماره تلفن نامعتبر است/
    );
    assert.throws(
      () => sim.registerStudent('0912', 'hash', 'نام', 'رشته'),
      /شماره تلفن نامعتبر است/
    );
  });
});

describe('Student Registration Approval System - Security & Anti-Tampering', () => {
  let sim;
  const testPhone = '09351112233';
  const testPin = '9999';

  beforeEach(() => {
    sim = new ApprovalSystemSimulator();
    sim.registerStudent(testPhone, sim.hashPin(testPin), 'هکر احتمالی', 'شبکه');
  });

  it('1. Teacher review fails when incorrect admin password is provided', () => {
    assert.throws(
      () => sim.teacherReview('wrong_password', testPhone, 'approved'),
      /دسترسی غیرمجاز: رمز عبور دبیر اشتباه است/
    );
    assert.throws(
      () => sim.teacherReview('0000', testPhone, 'approved'),
      /دسترسی غیرمجاز: رمز عبور دبیر اشتباه است/
    );
  });

  it('2. Anti-tampering trigger blocks direct REST update of account_status', () => {
    assert.throws(
      () => sim.directClientUpdate(testPhone, { account_status: 'approved' }),
      /دسترسی غیرمجاز: تغییر مستقیم وضعیت حساب کاربری تنها از طریق توابع رسمی دبیر مجاز است/
    );

    const student = sim.students.get(testPhone);
    assert.equal(student.account_status, 'pending');
  });

  it('3. Resubmission fails if student PIN does not match', () => {
    sim.teacherReview('431380', testPhone, 'rejected', 'دلیل آزمایشی');

    assert.throws(
      () => sim.resubmitRegistration(testPhone, '0000', 'نام اصلاحی', 'رشته اصلاحی'),
      /رمز عبور \(کد پین\) وارد شده صحیح نیست/
    );
  });
});

describe('Student Deletion & Ghost Account Desync Prevention', () => {
  let sim;
  const testPhone = '09128887766';
  const testPin = '3344';

  beforeEach(() => {
    sim = new ApprovalSystemSimulator();
    sim.registerStudent(testPhone, sim.hashPin(testPin), 'دانش‌آموز تستی', 'شبکه و نرم‌افزار');
  });

  it('1. teacher_delete_student rejects wrong admin password', () => {
    assert.throws(
      () => sim.teacherDeleteStudent('wrong_pass', testPhone),
      /دسترسی غیرمجاز: رمز عبور دبیر اشتباه است/
    );
    assert.ok(sim.students.has(testPhone), 'Student must not be deleted on wrong password');
  });

  it('2. teacher_delete_student cleanly deletes student and associated notifications', () => {
    assert.ok(sim.students.has(testPhone));
    assert.ok(sim.notifications.some(n => n.student_phone === testPhone));

    const result = sim.teacherDeleteStudent('431380', testPhone);
    assert.equal(result.success, true);
    assert.equal(result.deleted_phone, testPhone);
    assert.equal(result.rows_deleted, 1);

    // Verify completely gone
    assert.equal(sim.students.has(testPhone), false);
    assert.equal(sim.notifications.some(n => n.student_phone === testPhone), false);
  });

  it('3. Deleted phone number can immediately re-register fresh without conflict', () => {
    // Delete student
    sim.teacherDeleteStudent('431380', testPhone);

    // Re-register with the same phone
    const newPinHash = sim.hashPin('9988');
    const newReg = sim.registerStudent(testPhone, newPinHash, 'نام جدید', 'الکتروتکنیک');

    assert.equal(newReg.success, true);
    assert.equal(newReg.account_status, 'pending');

    const freshStudent = sim.students.get(testPhone);
    assert.ok(freshStudent);
    assert.equal(freshStudent.name, 'نام جدید');
    assert.equal(freshStudent.major, 'الکتروتکنیک');
    assert.equal(freshStudent.resubmission_count, 0);
  });
});

describe('Student Registration Approval System - Leaderboard & Privacy', () => {
  let sim;

  beforeEach(() => {
    sim = new ApprovalSystemSimulator();
  });

  it('1. Public leaderboard strictly excludes pending and rejected students', () => {
    sim.registerStudent('09121111111', 'h1', 'دانش‌آموز فعال', 'رشته ۱');
    sim.teacherReview('431380', '09121111111', 'approved');
    sim.students.get('09121111111').xp = 1200;

    sim.registerStudent('09122222222', 'h2', 'دانش‌آموز منتظر', 'رشته ۱');
    sim.students.get('09122222222').xp = 5000;

    sim.registerStudent('09123333333', 'h3', 'دانش‌آموز ردشده', 'رشته ۱');
    sim.teacherReview('431380', '09123333333', 'rejected', 'دلیل رد');
    sim.students.get('09123333333').xp = 9999;

    const lb = sim.getLeaderboard();

    assert.equal(lb.length, 1);
    assert.equal(lb[0].code, '09121111111');
    assert.equal(lb[0].name, 'دانش‌آموز فعال');
  });
});

describe('Student Registration Approval System - In-App Notifications', () => {
  let sim;

  beforeEach(() => {
    sim = new ApprovalSystemSimulator();
  });

  it('1. Notifications are created for teacher on registration and student on review', () => {
    const phone = '09194445566';
    sim.registerStudent(phone, 'hash', 'مریم طاهری', 'متالورژی');

    const teacherNotif = sim.notifications.find(n => n.recipient_type === 'teacher' && n.student_phone === phone);
    assert.ok(teacherNotif);
    assert.equal(teacherNotif.title, 'ثبت‌نام جدید');

    sim.teacherReview('431380', phone, 'approved');

    const studentNotif = sim.notifications.find(n => n.recipient_type === 'student' && n.student_phone === phone);
    assert.ok(studentNotif);
    assert.equal(studentNotif.title, 'تأیید حساب کاربری');
  });
});

describe('Integration Verification with Production Code (HTML, SW, SQL v4.1.1)', () => {
  it('1. SQL Migration files contain all required schema changes, RLS, and RPCs', () => {
    assert.ok(sqlMigration1.includes('ALTER TABLE gv_students'), 'SQL alters gv_students');
    assert.ok(sqlMigration1.includes('account_status'), 'SQL has account_status');
    assert.ok(sqlMigration1.includes('rejection_reason'), 'SQL has rejection_reason');
    assert.ok(sqlMigration1.includes('resubmission_count'), 'SQL has resubmission_count');
    assert.ok(sqlMigration1.includes('gv_notifications'), 'SQL creates gv_notifications');
    assert.ok(sqlMigration1.includes('trg_gv_protect_student_status'), 'SQL has anti-tamper trigger');
    assert.ok(sqlMigration1.includes('CREATE OR REPLACE FUNCTION register_student'), 'SQL defines register_student');
    assert.ok(sqlMigration1.includes('CREATE OR REPLACE FUNCTION resubmit_student_registration'), 'SQL defines resubmit_student_registration');
    assert.ok(sqlMigration1.includes('CREATE OR REPLACE FUNCTION teacher_review_student'), 'SQL defines teacher_review_student');
    assert.ok(sqlMigration1.includes('SECURITY DEFINER'), 'RPCs are SECURITY DEFINER');

    // Migration 002
    assert.ok(sqlMigration2.includes('CREATE OR REPLACE FUNCTION teacher_delete_student'), 'SQL 002 defines teacher_delete_student');
    assert.ok(sqlMigration2.includes('SECURITY DEFINER'), 'teacher_delete_student is SECURITY DEFINER');
    assert.ok(sqlMigration2.includes('DELETE FROM gv_notifications'), 'teacher_delete_student deletes notifications');
    assert.ok(sqlMigration2.includes('DELETE FROM gv_students'), 'teacher_delete_student deletes from gv_students');
  });

  it('2. Service Worker cache name is bumped to ghale-vajegan-v4.2 (or v4.1.1+)', () => {
    assert.ok(swContent.includes("ghale-vajegan-v4.2") || swContent.includes("ghale-vajegan-v4.1.1"), 'sw.js has v4.1.1+ cache name');
  });

  it('3. Index.html has versionTrigger displaying version without hints', () => {
    assert.ok(htmlContent.includes('<div class="footer-ver" id="versionTrigger">v4.2</div>') || htmlContent.includes('<div class="footer-ver" id="versionTrigger">v4.1.1</div>'), 'versionTrigger is v4.2 or v4.1.1');
    const hasHint = /3\s*بار|سه\s*بار|۳\s*بار/i.test(htmlContent);
    assert.equal(hasHint, false, 'No visible or secret 3-tap hint text exists in index.html');
  });

  it('4. Index.html calls teacher_delete_student RPC and synchronizes cleanly', () => {
    assert.ok(htmlContent.includes('callSupabaseRPC("teacher_delete_student"'), 'deleteStudent calls teacher_delete_student RPC');
    assert.ok(htmlContent.includes('data.length === 0'), 'fetchStudentRecord handles deleted student by cleaning up local cache');
  });

  it('5. Index.html contains all views and approval UI components', () => {
    assert.ok(htmlContent.includes('id="viewPending"'), 'viewPending exists');
    assert.ok(htmlContent.includes('id="viewRejected"'), 'viewRejected exists');
    assert.ok(htmlContent.includes('id="studentNotifBanner"'), 'studentNotifBanner exists');
    assert.ok(htmlContent.includes('id="btnTeacherTabCurriculum"'), 'teacher tab curriculum exists');
    assert.ok(htmlContent.includes('id="btnTeacherTabApprovals"'), 'teacher tab approvals exists');
    assert.ok(htmlContent.includes('id="teacherPendingBadge"'), 'teacherPendingBadge exists');
    assert.ok(htmlContent.includes('id="teacherApprovalsBody"'), 'teacherApprovalsBody exists');
    assert.ok(htmlContent.includes('id="rejectReasonModal"'), 'rejectReasonModal exists');
  });

  it('6. Leaderboard in index.html filters non-approved students', () => {
    assert.ok(
      htmlContent.includes('accountStatus === "approved"') || htmlContent.includes("accountStatus === 'approved'"),
      'renderLeaderboardTable filters by approved accountStatus'
    );
  });
});
