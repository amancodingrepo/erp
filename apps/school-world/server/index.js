import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { pool } from './db.js';
import { migrate } from './migrate.js';
import { mapOptionalSubjectRosterStudent, parseOptionalSubjectSelectionInput, selectionContainsOnlyAllowedSubjects } from './studentOptionalSubjectSelection.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === 'production';
const cookieName = 'school_diary_session';
const maxJsonBytes = process.env.MAX_JSON_SIZE || '12mb';
const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const jwtSecret = process.env.JWT_SECRET || 'development-only-change-this-secret-before-production-please';
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('replace-this'))) {
  throw new Error('Set a unique JWT_SECRET of at least 32 characters before running in production.');
}

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' }, contentSecurityPolicy: false }));
app.use(express.json({ limit: maxJsonBytes }));
app.use(cookieParser());
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fail = (status, message) => Object.assign(new Error(message), { status });
const clean = value => String(value ?? '').trim();
const lower = value => clean(value).toLowerCase();
const validRole = role => ['super_admin','school_admin','principal','teacher','staff','parent','student','transport_admin'].includes(role);

function setSessionCookie(res, token) {
  res.cookie(cookieName, token, { httpOnly: true, secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction, sameSite: 'lax', maxAge: 12 * 60 * 60 * 1000, path: '/' });
}
function signSession(user) {
  return jwt.sign({ sub: user.id, schoolId: user.school_id, personId: user.person_id, role: user.role }, jwtSecret, { expiresIn: '12h', issuer: 'school-diary-api', audience: 'school-diary-web' });
}
async function hydrateUser(accountId) {
  const result = await pool.query(
    `SELECT u.id,u.school_id,u.person_id,u.email,u.role,u.first_name,u.last_name,u.is_active,u.must_change_password,
      s.name AS school_name,s.code AS school_code,s.config AS school_config,s.address AS school_address,s.phone AS school_phone,s.email AS school_email,s.timezone AS school_timezone,
      p.full_name AS person_full_name,p.person_type
     FROM user_accounts u LEFT JOIN schools s ON s.id=u.school_id LEFT JOIN people p ON p.id=u.person_id WHERE u.id=$1`, [accountId]
  );
  return result.rows[0] || null;
}
async function authenticate(req, res, next) {
  try {
    const token = req.cookies[cookieName];
    if (!token) throw fail(401, 'Please sign in to continue.');
    const payload = jwt.verify(token, jwtSecret, { issuer: 'school-diary-api', audience: 'school-diary-web' });
    const user = await hydrateUser(payload.sub);
    if (!user || !user.is_active) throw fail(401, 'This account is inactive.');
    req.user = user;
    if (user.must_change_password && !['/api/auth/change-password', '/api/auth/me'].includes(req.path)) {
      return res.status(403).json({ error: 'You must change your temporary password before accessing school data.', code: 'PASSWORD_CHANGE_REQUIRED' });
    }
    next();
  } catch (error) {
    res.clearCookie(cookieName, { path: '/' });
    next(error.status ? error : fail(401, 'Your session expired. Please sign in again.'));
  }
}
function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user.role) ? next() : next(fail(403, 'You do not have permission to perform this action.'));
}
function assertSchoolScope(req, schoolId) {
  if (req.user.role !== 'super_admin' && req.user.school_id !== schoolId) throw fail(403, 'Cross-school access is not allowed.');
}
function csvCell(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }
function sendCsv(res, filename, rows) {
  const text = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^a-zA-Z0-9_.-]/g, '-') }"`);
  return res.send(text);
}
function decodeDataUrl(value) {
  const match = String(value || '').match(/^data:([^;,]+)?;base64,([a-zA-Z0-9+/=\r\n]+)$/);
  if (!match) throw fail(400, 'Attachment must be a base64 data URL.');
  return { mime: match[1] || 'application/octet-stream', buffer: Buffer.from(match[2], 'base64') };
}
function encodeDataUrl(mime, buffer) { return `data:${mime || 'application/octet-stream'};base64,${buffer.toString('base64')}`; }
function mapStudent(row) {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return {
    ...metadata,
    id: String(row.student_code), studentId: String(row.student_code), name: row.name, className: row.class_name,
    section: row.section, academicYear: row.academic_year, originalClass: row.original_class, dob: row.dob ? String(row.dob).slice(0,10) : '',
    gender: row.gender || metadata.gender || metadata.Gender || metadata.studentGender || metadata.student_gender || metadata.details?.gender || metadata.details?.student?.gender || '', father: row.father_name, parent: row.parent_name, motherName: row.mother_name,
    primaryParentName: row.primary_parent_name, primaryParent: row.primary_parent, phone: row.phone,
    alternatePhone: row.alternate_phone, email: row.email, address: row.address, city: row.city, state: row.state,
    pinCode: row.pin_code, bloodGroup: row.blood_group, category: row.category, nationality: row.nationality,
    house: row.house, lastSeen: row.last_seen, enrolled: row.enrolled, enrollmentDate: row.enrollment_date ? String(row.enrollment_date).slice(0,10) : '',
    enrollmentNumber: row.enrollment_number, rollNumber: row.roll_number, status: row.status,
    defaulter: row.fee_defaulter, childId: row.child_id_active, parentId: row.parent_id_active,
    rfid: row.rfid_mapped, rfidNumber: row.rfid_number, siblings: row.siblings || [], photoDataUrl: row.photo_data_url || ''
  };
}
const studentFieldMap = {
  name: 'name', className: 'class_name', section: 'section', academicYear: 'academic_year', originalClass: 'original_class',
  dob: 'dob', gender: 'gender', father: 'father_name', parent: 'parent_name', motherName: 'mother_name', primaryParentName: 'primary_parent_name',
  primaryParent: 'primary_parent', phone: 'phone', alternatePhone: 'alternate_phone', email: 'email', address: 'address', city: 'city', state: 'state',
  pinCode: 'pin_code', bloodGroup: 'blood_group', category: 'category', nationality: 'nationality', house: 'house', lastSeen: 'last_seen', enrolled: 'enrolled',
  enrollmentDate: 'enrollment_date', enrollmentNumber: 'enrollment_number', rollNumber: 'roll_number', status: 'status', defaulter: 'fee_defaulter',
  childId: 'child_id_active', parentId: 'parent_id_active', rfid: 'rfid_mapped', rfidNumber: 'rfid_number', siblings: 'siblings', photoDataUrl: 'photo_data_url'
};
const booleanStudentFields = new Set(['defaulter','childId','parentId','rfid']);
const jsonStudentFields = new Set(['siblings']);
const dateStudentFields = new Set(['dob','enrollmentDate']);
async function getSchoolIdForRequest(req) {
  if (!req.user.school_id) throw fail(400, 'Choose a school context before accessing school data.');
  return req.user.school_id;
}
async function writeAudit(req, action, entityType, entityId, details = {}) {
  if (!req.user.school_id) return;
  await pool.query('INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details,ip_address) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)', [req.user.school_id, req.user.id, action, entityType, entityId == null ? null : String(entityId), JSON.stringify(details), req.ip || null]);
}

app.get('/api/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, service: 'school-diary-api', database: 'connected', time: new Date().toISOString() });
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const email = lower(req.body?.email || req.body?.identifier || req.body?.phone);
  const password = String(req.body?.password || '');
  if (!email || !password) throw fail(400, 'Enter your email or phone number and password.');
  let result = await pool.query('SELECT * FROM user_accounts WHERE lower(email)=lower($1) LIMIT 1', [email]);
  if (!result.rowCount && !email.includes('@')) {
    const phoneDigits = email.replace(/\D/g, '');
    if (phoneDigits.length >= 7) {
      const phoneMatches = await pool.query(`SELECT DISTINCT u.* FROM user_accounts u JOIN people p ON p.id=u.person_id AND p.school_id=u.school_id
        WHERE (
          (u.role='parent' AND p.person_type='parent')
          OR (u.role IN ('teacher','staff','principal','school_admin','transport_admin')
            AND p.person_type IN ('teacher','staff')
            AND lower(COALESCE(p.metadata->'staffDetails'->>'loginMethod','Email'))='phone')
        )
        AND (
          regexp_replace(COALESCE(p.contact_number,''),'[^0-9]','','g')=$1
          OR (length($1)>=10 AND right(regexp_replace(COALESCE(p.contact_number,''),'[^0-9]','','g'),10)=right($1,10))
        )
        ORDER BY u.created_at DESC LIMIT 2`, [phoneDigits]);
      if (phoneMatches.rowCount > 1) throw fail(409, 'More than one school account uses this phone number. Please sign in with email.');
      result = phoneMatches;
    }
  }
  const account = result.rows[0];
  if (!account || !account.is_active || !(await bcrypt.compare(password, account.password_hash))) throw fail(401, 'Email/phone or password is incorrect.');
  await pool.query('UPDATE user_accounts SET last_login_at=now(),updated_at=now() WHERE id=$1', [account.id]);
  const token = signSession(account);
  setSessionCookie(res, token);
  const user = await hydrateUser(account.id);
  res.json({ user: publicUser(user) });
}));
app.post('/api/auth/logout', (_req, res) => { res.clearCookie(cookieName, { path: '/', sameSite: 'lax' }); res.json({ ok: true }); });
app.get('/api/auth/me', authenticate, asyncHandler(async (req, res) => res.json({ user: publicUser(await hydrateUser(req.user.id)) })));
app.post('/api/auth/change-password', authenticate, asyncHandler(async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (newPassword.length < 12) throw fail(400, 'Use a new password with at least 12 characters.');
  if (currentPassword === newPassword) throw fail(400, 'Choose a password different from the current password.');
  const account = await pool.query('SELECT password_hash FROM user_accounts WHERE id=$1', [req.user.id]);
  if (!account.rowCount || !(await bcrypt.compare(currentPassword, account.rows[0].password_hash))) throw fail(400, 'Current password is incorrect.');
  await pool.query('UPDATE user_accounts SET password_hash=$2,must_change_password=false,updated_at=now() WHERE id=$1', [req.user.id, await bcrypt.hash(newPassword, 12)]);
  const fresh = await hydrateUser(req.user.id);
  setSessionCookie(res, signSession(fresh));
  res.json({ user: publicUser(fresh) });
}));
function publicUser(user) {
  return { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name,
    personId: user.person_id, personType: user.person_type, personFullName: user.person_full_name,
    school: user.school_id ? { id: user.school_id, name: user.school_name, code: user.school_code, address: user.school_address || '', phone: user.school_phone || '', email: user.school_email || '', timezone: user.school_timezone || 'Asia/Kolkata', config: user.school_config || {} } : null,
    mustChangePassword: Boolean(user.must_change_password) };
}

app.get('/api/superadmin/schools', authenticate, requireRole('super_admin'), asyncHandler(async (_req, res) => {
  const result = await pool.query(`SELECT s.id,s.name,s.code,s.slug,s.is_active,s.created_at,s.address,s.phone,s.email,s.timezone, COALESCE(s.config ? 'logoDataUrl',false) AS has_logo,s.config->>'logoFileName' AS logo_file_name,
    (SELECT count(*)::int FROM students st WHERE st.school_id=s.id) AS student_count,
    (SELECT count(*)::int FROM user_accounts ua WHERE ua.school_id=s.id AND ua.is_active=true) AS account_count
    FROM schools s ORDER BY s.name`);
  res.json({ schools: result.rows });
}));

async function loadTemplateCatalog() {
  const [catalogResult, receiptResult, performanceResult, termResult, subtermResult] = await Promise.all([
    pool.query(`SELECT id,template_type AS "templateType",template_code AS "templateCode",template_name AS name,
      version,description,is_active AS "isActive",created_at AS "createdAt"
      FROM admin_template_catalog ORDER BY template_type,template_name,version DESC`),
    pool.query(`SELECT template_id AS "templateId",show_school_logo AS "showSchoolLogo",show_school_name AS "showSchoolName",
      show_school_address AS "showSchoolAddress",show_school_phone AS "showSchoolPhone",show_school_email AS "showSchoolEmail",
      show_student_name AS "showStudentName",show_student_code AS "showStudentCode",show_class_section AS "showClassSection",
      show_academic_year AS "showAcademicYear",show_parent_name AS "showParentName",show_fee_breakdown AS "showFeeBreakdown",
      show_payment_method AS "showPaymentMethod",show_receipt_number AS "showReceiptNumber",show_payment_reference AS "showPaymentReference",
      show_paid_amount AS "showPaidAmount",show_balance AS "showBalance",show_signature_line AS "showSignatureLine",
      page_orientation AS "pageOrientation",header_text AS "headerText",footer_text AS "footerText"
      FROM fee_receipt_template_settings`),
    pool.query(`SELECT template_id AS "templateId",academic_year AS "academicYear",report_title AS "reportTitle",
      show_student_photo AS "showStudentPhoto",show_marks AS "showMarks",show_grade AS "showGrade",
      show_remarks AS "showRemarks",footer_text AS "footerText"
      FROM performance_template_settings`),
    pool.query(`SELECT template_id AS "templateId",term_name AS name,sort_order AS "sortOrder"
      FROM performance_template_terms ORDER BY template_id,sort_order,term_name`),
    pool.query(`SELECT template_id AS "templateId",subterm_name AS name,sort_order AS "sortOrder"
      FROM performance_template_subterms ORDER BY template_id,sort_order,subterm_name`)
  ]);
  const receiptSettings = new Map(receiptResult.rows.map(row => [String(row.templateId), row]));
  const performanceSettings = new Map(performanceResult.rows.map(row => [String(row.templateId), row]));
  const terms = new Map();
  for (const row of termResult.rows) {
    const key = String(row.templateId);
    if (!terms.has(key)) terms.set(key, []);
    terms.get(key).push(row.name);
  }
  const subterms = new Map();
  for (const row of subtermResult.rows) {
    const key = String(row.templateId);
    if (!subterms.has(key)) subterms.set(key, []);
    subterms.get(key).push(row.name);
  }
  return catalogResult.rows.map(row => ({
    ...row,
    receiptSettings: receiptSettings.get(String(row.id)) || null,
    performanceSettings: performanceSettings.get(String(row.id)) || null,
    terms: terms.get(String(row.id)) || [],
    subterms: subterms.get(String(row.id)) || []
  }));
}

async function loadFeeReceiptNotes(schoolId, templateId) {
  if (!schoolId || !templateId) return [];
  try {
    const result = await pool.query(
      `SELECT id,note_text AS "noteText",sort_order AS "sortOrder"
       FROM fee_receipt_template_notes
       WHERE school_id=$1 AND template_id=$2
       ORDER BY sort_order,id`,
      [schoolId,templateId]
    );
    return result.rows;
  } catch (error) {
    if (error.code === '42P01') return null;
    throw error;
  }
}

async function loadAdminAssignedTemplates(user, schoolId) {
  // School-admin accounts keep independent assignments. Other roles can inherit a template only
  // when the school has exactly one active school-admin account, so an ambiguous assignment is never guessed.
  let assignmentUserId = user.id;
  if (user.role !== 'school_admin') {
    const adminAccounts = await pool.query(
      "SELECT id FROM user_accounts WHERE school_id=$1 AND role='school_admin' AND is_active=true ORDER BY created_at,id LIMIT 2",
      [schoolId]
    );
    if (adminAccounts.rowCount !== 1) return { feeReceipt: null, performanceReport: null };
    assignmentUserId = adminAccounts.rows[0].id;
  }
  const result = await pool.query(`SELECT a.id AS "assignmentId",a.school_admin_user_id AS "schoolAdminUserId",
      a.template_type AS "templateType",a.template_id AS "templateId",a.applied_by_user_id AS "appliedByUserId",
      a.applied_at AS "appliedAt"
    FROM school_admin_template_assignments a
    JOIN user_accounts admin ON admin.id=a.school_admin_user_id
    WHERE admin.school_id=$1 AND admin.role='school_admin' AND admin.is_active=true AND admin.id=$2
    ORDER BY a.template_type,a.applied_at DESC`,
    [schoolId, assignmentUserId]);
  const catalog = await loadTemplateCatalog();
  const byId = new Map(catalog.map(template => [String(template.id), template]));
  const assigned = { feeReceipt: null, performanceReport: null };
  for (const row of result.rows) {
    const key = row.templateType === 'fee_receipt' ? 'feeReceipt' : 'performanceReport';
    if (assigned[key]) continue;
    const template = byId.get(String(row.templateId));
    if (!template) continue;
    assigned[key] = {
      ...template,
      assignmentId: row.assignmentId,
      schoolAdminUserId: row.schoolAdminUserId,
      appliedByUserId: row.appliedByUserId,
      appliedAt: row.appliedAt
    };
  }
  if (assigned.feeReceipt) {
    const notes = await loadFeeReceiptNotes(schoolId, assigned.feeReceipt.id);
    assigned.feeReceipt.receiptNotes = notes || [];
    assigned.feeReceipt.receiptNotesAvailable = notes !== null;
  }
  return assigned;
}

app.get('/api/superadmin/templates', authenticate, requireRole('super_admin'), asyncHandler(async (_req, res) => {
  const templates = await loadTemplateCatalog();
  res.json({ templates });
}));

app.get('/api/superadmin/template-assignments', authenticate, requireRole('super_admin'), asyncHandler(async (_req, res) => {
  const result = await pool.query(`SELECT
      u.id,u.email,NULLIF(trim(concat_ws(' ',u.first_name,u.last_name)),'') AS "adminName",
      u.is_active AS "isActive",u.school_id AS "schoolId",s.name AS "schoolName",
      fee.template_id AS "feeTemplateId",fee.applied_at AS "feeAppliedAt",
      ft.template_name AS "feeTemplateName",ft.version AS "feeTemplateVersion",
      perf.template_id AS "performanceTemplateId",perf.applied_at AS "performanceAppliedAt",
      pt.template_name AS "performanceTemplateName",pt.version AS "performanceTemplateVersion"
    FROM user_accounts u
    JOIN schools s ON s.id=u.school_id
    LEFT JOIN school_admin_template_assignments fee
      ON fee.school_admin_user_id=u.id AND fee.template_type='fee_receipt'
    LEFT JOIN admin_template_catalog ft ON ft.id=fee.template_id
    LEFT JOIN school_admin_template_assignments perf
      ON perf.school_admin_user_id=u.id AND perf.template_type='performance_report'
    LEFT JOIN admin_template_catalog pt ON pt.id=perf.template_id
    WHERE u.role='school_admin'
    ORDER BY s.name,lower(u.email)`);
  const admins = await Promise.all(result.rows.map(async row => {
    const receiptNotes = row.feeTemplateId ? await loadFeeReceiptNotes(row.schoolId,row.feeTemplateId) : [];
    return {
      id: row.id,email: row.email,adminName: row.adminName || row.email,isActive: row.isActive,
      schoolId: row.schoolId,schoolName: row.schoolName,
      feeReceipt: row.feeTemplateId ? {
        templateId: row.feeTemplateId,name: row.feeTemplateName,version: row.feeTemplateVersion,appliedAt: row.feeAppliedAt,
        receiptNotes: receiptNotes || [],receiptNotesAvailable: receiptNotes !== null
      } : null,
      performanceReport: row.performanceTemplateId ? {
        templateId: row.performanceTemplateId,name: row.performanceTemplateName,version: row.performanceTemplateVersion,appliedAt: row.performanceAppliedAt
      } : null
    };
  }));
  res.json({ admins });
}));

app.post('/api/superadmin/template-assignments', authenticate, requireRole('super_admin'), asyncHandler(async (req, res) => {
  const schoolAdminUserId = clean(req.body?.schoolAdminUserId);
  const templateType = clean(req.body?.templateType);
  const templateId = clean(req.body?.templateId);
  if (!schoolAdminUserId || !templateId || !['fee_receipt','performance_report'].includes(templateType)) {
    throw fail(400,'Choose a school administrator, template type and template.');
  }
  const [adminResult, templateResult] = await Promise.all([
    pool.query(`SELECT id,school_id,is_active FROM user_accounts WHERE id=$1 AND role='school_admin'`,[schoolAdminUserId]),
    pool.query('SELECT id,template_type AS "templateType",template_name AS name,version,is_active AS "isActive" FROM admin_template_catalog WHERE id=$1',[templateId])
  ]);
  if (!adminResult.rowCount) throw fail(404,'The selected school administrator was not found.');
  if (!templateResult.rowCount || templateResult.rows[0].templateType !== templateType || !templateResult.rows[0].isActive) {
    throw fail(400,'Choose an active template that matches the selected template type.');
  }
  const client=await pool.connect();
  let assignment;
  try {
    await client.query('BEGIN');
    const saved=await client.query(`INSERT INTO school_admin_template_assignments
      (school_admin_user_id,template_type,template_id,applied_by_user_id,applied_at)
      VALUES($1,$2,$3,$4,now())
      ON CONFLICT(school_admin_user_id,template_type)
      DO UPDATE SET template_id=EXCLUDED.template_id,applied_by_user_id=EXCLUDED.applied_by_user_id,applied_at=now()
      RETURNING id,school_admin_user_id AS "schoolAdminUserId",template_type AS "templateType",
        template_id AS "templateId",applied_by_user_id AS "appliedByUserId",applied_at AS "appliedAt"`,
      [schoolAdminUserId,templateType,templateId,req.user.id]);
    assignment=saved.rows[0];
    await client.query('COMMIT');
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { client.release(); }
  res.json({ok:true,assignment,template:templateResult.rows[0],message:'Applied '+templateResult.rows[0].name+' v'+templateResult.rows[0].version+' to the selected school administrator.'});
}));

app.post('/api/superadmin/template-receipt-notes', authenticate, requireRole('super_admin'), asyncHandler(async (req,res) => {
  const schoolAdminUserId = clean(req.body?.schoolAdminUserId);
  const templateId = clean(req.body?.templateId);
  const inputNotes = Array.isArray(req.body?.notes) ? req.body.notes : [];
  if (!schoolAdminUserId || !templateId) throw fail(400,'Choose a school administrator and fee receipt template.');
  if (inputNotes.length > 100) throw fail(400,'A receipt template can contain up to 100 notes.');
  const notes = inputNotes.map((entry,index) => ({
    noteText: String(entry?.noteText ?? entry?.text ?? '').trim(),
    sortOrder: index + 1
  }));
  if (notes.some(note => !note.noteText || note.noteText.length > 500)) {
    throw fail(400,'Every receipt note must contain 1–500 characters.');
  }
  const [adminResult,templateResult] = await Promise.all([
    pool.query('SELECT id,school_id AS "schoolId" FROM user_accounts WHERE id=$1 AND role=\'school_admin\'',[schoolAdminUserId]),
    pool.query("SELECT id FROM admin_template_catalog WHERE id=$1 AND template_type='fee_receipt'",[templateId])
  ]);
  if (!adminResult.rowCount) throw fail(404,'The selected school administrator was not found.');
  if (!templateResult.rowCount) throw fail(400,'Choose a fee receipt template.');
  const tableCheck = await loadFeeReceiptNotes(adminResult.rows[0].schoolId,templateId);
  if (tableCheck === null) throw fail(503,'Receipt note storage is not installed. Migration 007 must be applied to the approved database first.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM fee_receipt_template_notes WHERE school_id=$1 AND template_id=$2',[adminResult.rows[0].schoolId,templateId]);
    for (const note of notes) {
      await client.query(
        'INSERT INTO fee_receipt_template_notes(school_id,template_id,note_text,sort_order) VALUES($1,$2,$3,$4)',
        [adminResult.rows[0].schoolId,templateId,note.noteText,note.sortOrder]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally {
    client.release();
  }
  res.json({ok:true,notes,message:'Saved '+notes.length+' school-specific receipt note(s).'});
}));

app.get('/api/my-template-assignments', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async (req, res) => {
  const schoolId=await getSchoolIdForRequest(req);
  const assigned=await loadAdminAssignedTemplates(req.user,schoolId);
  res.json(assigned);
}));

function validateSuperAdminLogoDataUrl(value) {
  const dataUrl = String(value || '');
  if (!dataUrl) return '';
  if (dataUrl.length > 1000000) throw fail(413, 'Please upload a smaller school logo. The optimized logo must be below 700 KB.');
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)) throw fail(400, 'School logo must be uploaded as a JPEG image through the logo upload control.');
  const decoded = decodeDataUrl(dataUrl);
  if (decoded.buffer.length > 700 * 1024) throw fail(413, 'Please upload a smaller school logo. The optimized logo must be below 700 KB.');
  return dataUrl;
}
app.get('/api/superadmin/schools/:schoolId/profile', authenticate, requireRole('super_admin'), asyncHandler(async (req,res) => {
  const result = await pool.query('SELECT id,name,code,slug,is_active,address,phone,email,timezone,config,created_at,updated_at FROM schools WHERE id=$1',[req.params.schoolId]);
  if (!result.rowCount) throw fail(404,'School not found.');
  res.json({ school: result.rows[0] });
}));
app.patch('/api/superadmin/schools/:schoolId/profile', authenticate, requireRole('super_admin'), asyncHandler(async (req,res) => {
  const schoolId = req.params.schoolId;
  const currentResult = await pool.query('SELECT id,name,config FROM schools WHERE id=$1',[schoolId]);
  if (!currentResult.rowCount) throw fail(404,'School not found.');
  const current = currentResult.rows[0];
  const body = req.body || {};
  const name = body.name === undefined ? clean(current.name) : clean(body.name);
  const address = body.address === undefined ? null : clean(body.address);
  const phone = body.phone === undefined ? null : clean(body.phone);
  const email = body.email === undefined ? null : lower(body.email);
  const timezone = body.timezone === undefined ? null : clean(body.timezone);
  if (name.length < 2 || name.length > 160) throw fail(400,'School name must contain between 2 and 160 characters.');
  if (address !== null && address.length > 800) throw fail(400,'School address must be 800 characters or fewer.');
  if (phone !== null && phone.length > 80) throw fail(400,'School phone number must be 80 characters or fewer.');
  if (email !== null && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400,'Enter a valid school contact email address.');
  if (email !== null && email.length > 254) throw fail(400,'School email must be 254 characters or fewer.');
  if (timezone !== null && timezone.length > 80) throw fail(400,'Timezone must be 80 characters or fewer.');
  const config = current.config && typeof current.config === 'object' && !Array.isArray(current.config) ? {...current.config} : {};
  config.schoolName = name;
  if (address !== null) config.address = address;
  if (phone !== null) config.phone = phone;
  if (email !== null) config.email = email;
  if (timezone !== null) config.timezone = timezone || 'Asia/Kolkata';
  let changedLogo = false;
  if (body.removeLogo === true) {
    delete config.logoDataUrl;
    delete config.logoFileName;
    delete config.logoMimeType;
    changedLogo = true;
  } else if (body.logoDataUrl !== undefined) {
    const dataUrl = validateSuperAdminLogoDataUrl(body.logoDataUrl);
    if (!dataUrl) throw fail(400,'Choose a logo image or use Remove logo.');
    config.logoDataUrl = dataUrl;
    config.logoMimeType = 'image/jpeg';
    config.logoFileName = clean(body.logoFileName).slice(0,180) || 'school-logo.jpg';
    changedLogo = true;
  }
  const result = await pool.query('UPDATE schools SET name=$2,address=COALESCE($3,address),phone=COALESCE($4,phone),email=COALESCE($5,email),timezone=COALESCE($6,timezone),config=$7::jsonb,updated_at=now() WHERE id=$1 RETURNING id,name,code,slug,is_active,address,phone,email,timezone,updated_at',[schoolId,name,address,phone,email,timezone,JSON.stringify(config)]);
  await writeAudit(req,'school.branding.updated','school',schoolId,{changedFields:Object.keys(body).filter(key=>key!=='logoDataUrl'),logoChanged:changedLogo,logoRemoved:body.removeLogo===true});
  res.json({school:{...result.rows[0],has_logo:Boolean(config.logoDataUrl),logo_file_name:config.logoFileName||''}});
}));
app.post('/api/superadmin/schools', authenticate, requireRole('super_admin'), asyncHandler(async (req, res) => {
  const name = clean(req.body?.name), code = clean(req.body?.code).toUpperCase();
  const adminEmail = lower(req.body?.adminEmail);
  const adminPassword = String(req.body?.adminPassword || '');
  const address = clean(req.body?.address);
  const phone = clean(req.body?.phone);
  const schoolEmail = lower(req.body?.email);
  const timezone = clean(req.body?.timezone) || 'Asia/Kolkata';
  const logoDataUrl = validateSuperAdminLogoDataUrl(req.body?.logoDataUrl);
  const logoFileName = clean(req.body?.logoFileName).slice(0,180);
  if (name.length < 2 || !/^[A-Z0-9_-]{3,24}$/.test(code) || !adminEmail.includes('@') || adminPassword.length < 10) throw fail(400, 'Provide a school name, a code of 3–24 letters/numbers, a valid admin email, and a password of at least 10 characters.');
  if (address.length > 800 || phone.length > 80 || schoolEmail.length > 254 || (schoolEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(schoolEmail))) throw fail(400,'Check the school address, phone, and contact email fields.');
  const initialConfig = { schoolName:name, address, phone, email:schoolEmail, timezone, classes:[] };
  if (logoDataUrl) { initialConfig.logoDataUrl=logoDataUrl; initialConfig.logoFileName=logoFileName || 'school-logo.jpg'; initialConfig.logoMimeType='image/jpeg'; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query('SELECT 1 FROM schools WHERE code=$1 OR lower(name)=lower($2)', [code,name]);
    if (exists.rowCount) throw fail(409, 'A school with that code or name already exists.');
    const created = await client.query('INSERT INTO schools(name,code,slug,address,phone,email,timezone,config) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING id,name,code,slug,address,phone,email,timezone,config', [name,code,code.toLowerCase(),address,phone,schoolEmail,timezone,JSON.stringify(initialConfig)]);
    const school = created.rows[0];
    await client.query('INSERT INTO academic_years(school_id,label,is_current) VALUES($1,$2,true)', [school.id, (new Date().getFullYear() - (new Date().getMonth()<3?1:0)) + '-' + (new Date().getFullYear() + (new Date().getMonth()<3?0:1))]);
    await client.query('INSERT INTO user_accounts(school_id,email,password_hash,role,first_name,last_name,must_change_password) VALUES($1,$2,$3,\'school_admin\',$4,$5,true)', [school.id,adminEmail,await bcrypt.hash(adminPassword,12),'School','Admin']);
    await client.query('INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,\'school.created\',\'school\',$3,$4::jsonb)', [school.id,req.user.id,school.id,JSON.stringify({ name,code,adminEmail })]);
    await client.query('COMMIT');
    res.status(201).json({ school, adminEmail, message: 'School and initial school-admin account created. Share credentials securely.' });
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));

app.get('/api/bootstrap', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async (req,res) => {
  const schoolId = await getSchoolIdForRequest(req);
  const [years,classes,school] = await Promise.all([
    pool.query('SELECT id,label,start_date,end_date,is_current FROM academic_years WHERE school_id=$1 ORDER BY label DESC',[schoolId]),
    pool.query('SELECT id,class_name,grade_order,section,is_active FROM school_classes WHERE school_id=$1 AND is_active=true ORDER BY grade_order,class_name',[schoolId]),
    pool.query('SELECT id,name,code,phone,email,address,timezone,config FROM schools WHERE id=$1',[schoolId])
  ]);
  res.json({ school: school.rows[0], academicYears: years.rows, classes: classes.rows, user: publicUser(await hydrateUser(req.user.id)) });
}));
app.post('/api/academic-years', authenticate, requireRole('school_admin','principal'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const body=req.body||{};
  const label=clean(body.label);
  if(!label||label.length>30) throw fail(400,'Academic year label is required and must be at most 30 characters.');
  const startDate=body.startDate?parseDbDate(body.startDate):null;
  const endDate=body.endDate?parseDbDate(body.endDate):null;
  if(startDate&&endDate&&startDate>endDate) throw fail(400,'Academic year end date must be on or after its start date.');
  const isCurrent=body.isCurrent===true;
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    if(isCurrent) await client.query('UPDATE academic_years SET is_current=false WHERE school_id=$1',[schoolId]);
    const result=await client.query(
      `INSERT INTO academic_years(school_id,label,start_date,end_date,is_current) VALUES($1,$2,$3,$4,$5)
       ON CONFLICT(school_id,label) DO UPDATE SET
         start_date=COALESCE(EXCLUDED.start_date,academic_years.start_date),
         end_date=COALESCE(EXCLUDED.end_date,academic_years.end_date),
         is_current=CASE WHEN EXCLUDED.is_current THEN true ELSE academic_years.is_current END
       RETURNING id,label,start_date,end_date,is_current`,
      [schoolId,label,startDate,endDate,isCurrent]
    );
    await client.query('INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details,ip_address) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)',
      [schoolId,req.user.id,'academic_year.created_or_updated','academic_year',result.rows[0].id,JSON.stringify({label,isCurrent}),req.ip||null]);
    await client.query('COMMIT');
    res.status(201).json({academicYear:result.rows[0]});
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));
app.patch('/api/academic-years/:yearId', authenticate, requireRole('school_admin','principal'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const body=req.body||{};
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const existing=await client.query('SELECT id,label,start_date,end_date,is_current FROM academic_years WHERE school_id=$1 AND id=$2 FOR UPDATE',[schoolId,req.params.yearId]);
    if(!existing.rowCount) throw fail(404,'Academic year not found.');
    const old=existing.rows[0];
    const label=body.label===undefined?old.label:clean(body.label);
    const startDate=body.startDate===undefined?old.start_date:(body.startDate?parseDbDate(body.startDate):null);
    const endDate=body.endDate===undefined?old.end_date:(body.endDate?parseDbDate(body.endDate):null);
    const isCurrent=body.isCurrent===undefined?Boolean(old.is_current):body.isCurrent===true;
    if(!label||label.length>30) throw fail(400,'Academic year label is required and must be at most 30 characters.');
    if(startDate&&endDate&&String(startDate).slice(0,10)>String(endDate).slice(0,10)) throw fail(400,'Academic year end date must be on or after its start date.');
    if(isCurrent) await client.query('UPDATE academic_years SET is_current=false WHERE school_id=$1 AND id<>$2',[schoolId,req.params.yearId]);
    const result=await client.query(
      'UPDATE academic_years SET label=$3,start_date=$4,end_date=$5,is_current=$6 WHERE school_id=$1 AND id=$2 RETURNING id,label,start_date,end_date,is_current',
      [schoolId,req.params.yearId,label,startDate,endDate,isCurrent]
    );
    await client.query('INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details,ip_address) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)',
      [schoolId,req.user.id,'academic_year.updated','academic_year',result.rows[0].id,JSON.stringify({label,isCurrent}),req.ip||null]);
    await client.query('COMMIT');
    res.json({academicYear:result.rows[0]});
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

app.patch('/api/school/settings', authenticate, requireRole('school_admin','principal'), asyncHandler(async (req,res) => {
  const schoolId=await getSchoolIdForRequest(req);
  const current=(await pool.query('SELECT config FROM schools WHERE id=$1',[schoolId])).rows[0];
  const name = req.body?.name === undefined ? undefined : clean(req.body.name);
  const config = { ...(current?.config||{}), ...(req.body?.config||{}) };
  if (name !== undefined && name.length < 2) throw fail(400,'School name must contain at least 2 characters.');
  const result = await pool.query('UPDATE schools SET name=COALESCE($2,name),phone=COALESCE($3,phone),email=COALESCE($4,email),address=COALESCE($5,address),config=$6::jsonb,updated_at=now() WHERE id=$1 RETURNING id,name,code,phone,email,address,timezone,config', [schoolId,name ?? null,req.body?.phone ?? null,req.body?.email ?? null,req.body?.address ?? null,JSON.stringify(config)]);
  await writeAudit(req,'school.settings.updated','school',schoolId,{ changedFields:Object.keys(req.body||{}) });
  res.json({ school: result.rows[0] });
}));

app.get('/api/students', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async (req,res) => {
  const schoolId=await getSchoolIdForRequest(req);
  const q=clean(req.query.q); const status=clean(req.query.status); const year=clean(req.query.year); const className=clean(req.query.className);
  const result=await pool.query(`SELECT s.*,
      COALESCE(NULLIF(s.gender,''),NULLIF(p.gender,''),NULLIF(s.metadata->>'gender',''),NULLIF(s.metadata->>'Gender',''),NULLIF(s.metadata->>'studentGender',''),NULLIF(s.metadata #>> '{details,gender}',''),NULLIF(s.metadata #>> '{details,student,gender}','')) AS gender
    FROM students s
    LEFT JOIN people p ON p.id=s.person_id AND p.school_id=s.school_id
    WHERE s.school_id=$1
      AND ($2='' OR s.name ILIKE '%'||$2||'%' OR s.student_code ILIKE '%'||$2||'%' OR s.phone ILIKE '%'||$2||'%' OR s.parent_name ILIKE '%'||$2||'%')
      AND ($3='' OR s.status=$3) AND ($4='' OR s.academic_year=$4)
    ORDER BY lower(s.name),s.student_code`,[schoolId,q,status,year]);
  const configuredClasses = await getConfiguredClassesForSchool(pool, schoolId);
  const mappedStudents = result.rows.map(row => mapStudentWithConfiguredClass(row, configuredClasses));
  const filteredStudents = className ? mappedStudents.filter(student => student.className === className) : mappedStudents;
  res.json({ students:filteredStudents });
}));
function parseDbDate(value) {
  // node-postgres can return DATE columns as native JavaScript Date objects.
  // Support those as well as ISO strings, day-first form input, and the
  // Date.toString() representation used by existing UI data.
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw fail(400, 'Invalid date. Use YYYY-MM-DD or DD-MM-YYYY.');
    return value.toISOString().slice(0, 10);
  }
  const s = clean(value);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2,'0')}-${String(dmy[1]).padStart(2,'0')}`;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  throw fail(400, `Invalid date "${s}". Use YYYY-MM-DD or DD-MM-YYYY.`);
}
function asBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1','true','yes','y','active','mapped'].includes(String(value).trim().toLowerCase());
}
function titleParts(value) {
  const parts = clean(value).split(/\s+/).filter(Boolean);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') };
}
function classNameMatchKey(value) {
  return clean(value)
    .toLocaleLowerCase()
    .replace(/^(class|grade|standard|std)\s*/i, '')
    .replace(/\b(\d+)(st|nd|rd|th)\b/gi, '$1')
    .replace(/[^a-z0-9]/g, '');
}
function normalizedSection(value) {
  return clean(value).replace(/^section\s*/i, '').toLocaleUpperCase();
}
function resolveConfiguredClass(classNameInput, sectionInput, classRecords) {
  const originalName = clean(classNameInput);
  let name = originalName;
  let section = normalizedSection(sectionInput);
  const suffix = name.match(/^(.*?)(?:\s+|[-–])(?:section\s*)?([a-z])$/i);
  if (suffix) {
    const suffixSection = normalizedSection(suffix[2]);
    if (!section || section === suffixSection) {
      name = clean(suffix[1]);
      section = suffixSection;
    }
  }
  const key = classNameMatchKey(name);
  if (!key || !Array.isArray(classRecords) || !classRecords.length) {
    return { name: originalName, section: normalizedSection(sectionInput) };
  }
  const activeClasses = classRecords.filter(item => item && clean(item.name) && item.status !== 'Inactive');
  let matches = activeClasses.filter(item =>
    classNameMatchKey(item.name) === key && normalizedSection(item.section) === section
  );
  if (!matches.length && !section) {
    const byName = activeClasses.filter(item => classNameMatchKey(item.name) === key);
    if (byName.length === 1) matches = byName;
  }
  if (matches.length === 1) {
    return { name: clean(matches[0].name), section: normalizedSection(matches[0].section) };
  }
  return { name: originalName, section: normalizedSection(sectionInput) };
}
async function getConfiguredClassesForSchool(db, schoolId) {
  const result = await db.query(
    "SELECT class_name AS name, COALESCE(section,'') AS section, CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END AS status, grade_order AS \"displayOrder\", display_name AS \"displayName\" FROM school_classes WHERE school_id=$1 ORDER BY grade_order, lower(class_name), lower(section)",
    [schoolId]
  );
  return result.rows;
}
function mapStudentWithConfiguredClass(row, classRecords) {
  const student = mapStudent(row);
  const canonical = resolveConfiguredClass(student.className, student.section, classRecords);
  return { ...student, className: canonical.name, section: canonical.section };
}

async function upsertImportedStudent(client, schoolId, input, configuredClasses = null) {
  let parentAccountCreated = false;
  let parentAccountReused = false;
  const b = input && typeof input === 'object' ? input : {};
  const { parentPassword: importParentPassword, password: discardedPassword, sourceRowNumber: discardedSourceRowNumber, ...safeInput } = b;
  const code = clean(b.studentId || b.studentCode || b.id || b.enrollmentNumber || b.enrollmentNo) ||
    (b.importSource === 'excel-bulk-import' ? 'SW-' + randomBytes(5).toString('hex').toUpperCase() : '');
  const name = clean(b.name || b.studentName || b.fullName);
  if (!code || !name) throw fail(400, 'Each imported row must include StudentID and StudentName.');
  const rawClassName = clean(b.className || b.class || b.grade);
  let section = clean(b.section);
  const configuredClass = resolveConfiguredClass(rawClassName, section, configuredClasses);
  const className = configuredClass.name;
  section = configuredClass.section;
  if (safeInput.details && typeof safeInput.details === 'object') {
    const detailCopy = { ...safeInput.details, className, section };
    if (detailCopy.admitNewStudent && typeof detailCopy.admitNewStudent === 'object') {
      detailCopy.admitNewStudent = {
        ...detailCopy.admitNewStudent,
        student: { ...(detailCopy.admitNewStudent.student || {}), className, section }
      };
    }
    safeInput.details = detailCopy;
  }
  const year = clean(b.academicYear || b.year) || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const status = clean(b.status).toLowerCase() === 'inactive' ? 'Inactive' : 'Active';
  const fatherName = clean(b.father || b.fatherName);
  const parentName = clean(b.parent || b.parentName || fatherName || b.primaryParentName);
  const phone = clean(b.phone || b.parentPhone || b.contactNumber || b.mobileNumber);
  const alternatePhone = clean(b.alternatePhone || b.alternateContactNumber);
  const dob = parseDbDate(b.dob || b.dateOfBirth);
  const enrollmentDate = parseDbDate(b.enrollmentDate || b.enrolledDate);
  const siblings = Array.isArray(b.siblings) ? b.siblings : clean(b.siblings || b.siblingIds).split(/[;,]/).map(v=>v.trim()).filter(Boolean);
  const { first, last } = titleParts(name);
  const routeName = clean(b.routeName || b.route || b.busRoute || b.busNumber);
  const lastSeenText = clean(b.lastSeen);
  const lastSeen = lastSeenText && !['—','-','n/a','never'].includes(lastSeenText.toLowerCase()) && !Number.isNaN(Date.parse(lastSeenText)) ? new Date(lastSeenText).toISOString() : null;
  const studentPerson = await client.query(`INSERT INTO people(school_id,person_type,external_id,first_name,last_name,full_name,contact_number,alternate_contact_number,class_name,section,roll_number,enrollment_number,parent_guardian_name,email,gender,date_of_birth,address,city,state,status,route_name,last_seen,metadata)
    VALUES($1,'student',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22::jsonb)
    ON CONFLICT(school_id,person_type,external_id) WHERE external_id IS NOT NULL DO UPDATE SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,full_name=EXCLUDED.full_name,contact_number=EXCLUDED.contact_number,alternate_contact_number=EXCLUDED.alternate_contact_number,class_name=EXCLUDED.class_name,section=EXCLUDED.section,roll_number=EXCLUDED.roll_number,enrollment_number=EXCLUDED.enrollment_number,parent_guardian_name=EXCLUDED.parent_guardian_name,email=EXCLUDED.email,gender=EXCLUDED.gender,date_of_birth=EXCLUDED.date_of_birth,address=EXCLUDED.address,city=EXCLUDED.city,state=EXCLUDED.state,status=EXCLUDED.status,route_name=EXCLUDED.route_name,last_seen=EXCLUDED.last_seen,metadata=EXCLUDED.metadata,updated_at=now() RETURNING id`,
    [schoolId,code,first,last,name,phone,alternatePhone,className,section,clean(b.rollNumber),clean(b.enrollmentNumber || code),parentName,lower(b.email),clean(b.gender),dob,clean(b.address),clean(b.city),clean(b.state),status,routeName,lastSeen,JSON.stringify({ source:clean(b.importSource) || 'csv-import', ...safeInput })]);
  const personId = studentPerson.rows[0].id;
  const existing = await client.query('SELECT id FROM students WHERE school_id=$1 AND student_code=$2',[schoolId,code]);
  const values = [schoolId,personId,code,name,className,section,year,clean(b.originalClass),dob,clean(b.gender),fatherName || parentName,parentName,clean(b.motherName || b.mother),clean(b.primaryParentName),clean(b.primaryParent),phone,alternatePhone,lower(b.email),clean(b.address),clean(b.city),clean(b.state),clean(b.pinCode || b.pin),clean(b.bloodGroup),clean(b.category),clean(b.nationality)||'Indian',clean(b.house),lastSeenText,clean(b.enrolled),enrollmentDate,clean(b.enrollmentNumber || code),clean(b.rollNumber),status,asBoolean(b.defaulter ?? b.feeDefaulter),asBoolean(b.childId ?? b.childIdActive,true) && status !== 'Inactive',asBoolean(b.parentId ?? b.parentIdActive,true),asBoolean(b.rfid ?? b.rfidMapped),clean(b.rfidNumber),JSON.stringify(siblings),clean(b.photoDataUrl),JSON.stringify({ ...safeInput, importedAt:new Date().toISOString() })];
  const placeholders = values.map((_,i) => [38,40].includes(i+1) ? `$${i+1}::jsonb` : `$${i+1}`).join(',');
  const updateFields = `person_id=EXCLUDED.person_id,name=EXCLUDED.name,class_name=EXCLUDED.class_name,section=EXCLUDED.section,academic_year=EXCLUDED.academic_year,original_class=EXCLUDED.original_class,dob=EXCLUDED.dob,gender=EXCLUDED.gender,father_name=EXCLUDED.father_name,parent_name=EXCLUDED.parent_name,mother_name=EXCLUDED.mother_name,primary_parent_name=EXCLUDED.primary_parent_name,primary_parent=EXCLUDED.primary_parent,phone=EXCLUDED.phone,alternate_phone=EXCLUDED.alternate_phone,email=EXCLUDED.email,address=EXCLUDED.address,city=EXCLUDED.city,state=EXCLUDED.state,pin_code=EXCLUDED.pin_code,blood_group=EXCLUDED.blood_group,category=EXCLUDED.category,nationality=EXCLUDED.nationality,house=EXCLUDED.house,last_seen=EXCLUDED.last_seen,enrolled=EXCLUDED.enrolled,enrollment_date=EXCLUDED.enrollment_date,enrollment_number=EXCLUDED.enrollment_number,roll_number=EXCLUDED.roll_number,status=EXCLUDED.status,fee_defaulter=EXCLUDED.fee_defaulter,child_id_active=EXCLUDED.child_id_active,parent_id_active=EXCLUDED.parent_id_active,rfid_mapped=EXCLUDED.rfid_mapped,rfid_number=EXCLUDED.rfid_number,siblings=EXCLUDED.siblings,photo_data_url=EXCLUDED.photo_data_url,metadata=EXCLUDED.metadata,updated_at=now()`;
  const studentRow = await client.query(`INSERT INTO students(school_id,person_id,student_code,name,class_name,section,academic_year,original_class,dob,gender,father_name,parent_name,mother_name,primary_parent_name,primary_parent,phone,alternate_phone,email,address,city,state,pin_code,blood_group,category,nationality,house,last_seen,enrolled,enrollment_date,enrollment_number,roll_number,status,fee_defaulter,child_id_active,parent_id_active,rfid_mapped,rfid_number,siblings,photo_data_url,metadata)
    VALUES(${placeholders}) ON CONFLICT(school_id,student_code) DO UPDATE SET ${updateFields} RETURNING id`, values);
  const studentDbId = studentRow.rows[0].id;
  if (parentName) {
    const parentParts = titleParts(parentName);
    const parentKey = `parent:${phone.replace(/\D/g,'') || parentName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;
    const parentPerson = await client.query(`INSERT INTO people(school_id,person_type,external_id,first_name,last_name,full_name,contact_number,parent_guardian_name,email,status,metadata)
      VALUES($1,'parent',$2,$3,$4,$5,$6,$5,$7,'Active',$8::jsonb)
      ON CONFLICT(school_id,person_type,external_id) WHERE external_id IS NOT NULL DO UPDATE SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,full_name=EXCLUDED.full_name,contact_number=EXCLUDED.contact_number,email=EXCLUDED.email,updated_at=now() RETURNING id`,
      [schoolId,parentKey,parentParts.first,parentParts.last,parentName,phone,lower(b.parentEmail || b.email),JSON.stringify({ importedFor:code })]);
    await client.query(`INSERT INTO student_parents(school_id,student_id,parent_person_id,relationship,is_primary) VALUES($1,$2,$3,$4,true) ON CONFLICT(student_id,parent_person_id) DO UPDATE SET relationship=EXCLUDED.relationship,is_primary=true`,[schoolId,studentDbId,parentPerson.rows[0].id,clean(b.primaryParent)||'Guardian']);
    await client.query(`UPDATE people p SET class_name=COALESCE(NULLIF($3,''),p.class_name),section=COALESCE(NULLIF($4,''),p.section),route_name=COALESCE(NULLIF($5,''),p.route_name),updated_at=now() WHERE p.school_id=$1 AND p.id=$2`,[schoolId,parentPerson.rows[0].id,className,section,routeName]);
    if (importParentPassword && String(importParentPassword).length >= 6) {
      const existingParentAccount = await client.query("SELECT id FROM user_accounts WHERE school_id=$1 AND person_id=$2 AND role='parent' ORDER BY created_at LIMIT 1",[schoolId,parentPerson.rows[0].id]);
      if (existingParentAccount.rowCount) {
        parentAccountReused = true;
      } else {
        const loginMethod = clean(b.parentLoginMethod || b.loginMethod) === 'Email' ? 'Email' : 'Phone';
        const parentEmail = lower(b.parentEmail || b.email);
        const phoneDigits = phone.replace(/\D/g,'');
        const accountEmail = loginMethod === 'Email'
          ? parentEmail
          : ('phone.' + phoneDigits + '.' + String(parentPerson.rows[0].id).replace(/-/g,'').slice(-8) + '@phone.schoolworld.local');
        const duplicateAccount = await client.query('SELECT id,person_id FROM user_accounts WHERE lower(email)=lower($1) LIMIT 1',[accountEmail]);
        if (duplicateAccount.rowCount && String(duplicateAccount.rows[0].person_id || '') !== String(parentPerson.rows[0].id)) {
          throw fail(409,'Parent email is already used by another account. Use Phone as Login Method or enter a different email.');
        }
        if (!duplicateAccount.rowCount) {
          await client.query("INSERT INTO user_accounts(school_id,person_id,email,password_hash,role,first_name,last_name,is_active,must_change_password) VALUES($1,$2,$3,$4,'parent',$5,$6,true,false)",
            [schoolId,parentPerson.rows[0].id,accountEmail,await bcrypt.hash(String(importParentPassword),12),parentParts.first,parentParts.last]);
          parentAccountCreated = true;
        } else {
          parentAccountReused = true;
        }
      }
    }
  }
  if (className) {
    const grade = className.match(/(?:CLASS\s*)?(\d+)/i);
    await client.query('INSERT INTO school_classes(school_id,class_name,grade_order,section) VALUES($1,$2,$3,$4) ON CONFLICT(school_id,class_name) DO UPDATE SET section=EXCLUDED.section,is_active=true',[schoolId,className,grade?Number(grade[1]):0,section]);
  }
  await client.query('INSERT INTO academic_years(school_id,label,is_current) VALUES($1,$2,false) ON CONFLICT(school_id,label) DO NOTHING',[schoolId,year]);
  if (b.details && typeof b.details === 'object') await client.query(`INSERT INTO student_details(school_id,student_id,details) VALUES($1,$2,$3::jsonb) ON CONFLICT(student_id) DO UPDATE SET details=EXCLUDED.details,updated_at=now()`,[schoolId,studentDbId,JSON.stringify(b.details)]);
  return { created: !existing.rowCount, code, name, parentAccountCreated, parentAccountReused };
}
function bulkImportDateIsValid(value) {
  const source = clean(value);
  if (!source) return false;
  let match = source.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }
  try {
    const parsed = parseDbDate(source);
    if (!parsed) return false;
    match = String(parsed).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  } catch {
    return false;
  }
}

function validateBulkStudentImportRows(rows) {
  const issues = [];
  const seenCodes = new Map();
  rows.forEach((row, index) => {
    const item = row && typeof row === 'object' ? row : {};
    const rowNumber = Number(item.sourceRowNumber) || index + 2;
    const fields = [];
    const add = message => { if (!fields.includes(message)) fields.push(message); };
    const name = clean(item.name || item.studentName || item.fullName);
    const details = item.details && typeof item.details === 'object' ? item.details : {};
    const admissionParent = details.admitNewStudent && typeof details.admitNewStudent === 'object'
      && details.admitNewStudent.parent && typeof details.admitNewStudent.parent === 'object'
      ? details.admitNewStudent.parent : {};
    const isExcelImport = clean(item.importSource) === 'excel-bulk-import';
    if (isExcelImport && !clean(details.firstName)) add('First Name is required.');
    else if (!name || !name.split(/\s+/)[0]) add('First Name is required.');
    if (!bulkImportDateIsValid(item.dob || item.dateOfBirth)) add('Date of Birth is required and must be a valid date.');
    const gender = clean(item.gender).toLowerCase();
    if (!gender) add('Gender is required.');
    else if (!['male','female','other','not specified'].includes(gender)) add('Gender must be Male, Female, Other or Not specified.');
    if (!clean(item.academicYear || item.year)) add('Academic Year is required.');
    if (!clean(item.className || item.class || item.grade)) add('Class is required.');
    const relation = clean(item.primaryParent || details.primaryParent || admissionParent.relation);
    if (!['Mother','Father','Guardian'].includes(relation)) add('Primary Parent / Relation must be Mother, Father or Guardian.');
    if (!clean(item.parent || item.primaryParentName)) add('The First Name for the selected primary parent / guardian is required.');
    if (isExcelImport) {
      const selectedParentFirstName = relation === 'Mother' ? clean(details.motherFirst || admissionParent.motherFirst)
        : relation === 'Father' ? clean(details.fatherFirst || admissionParent.fatherFirst)
        : relation === 'Guardian' ? clean(details.guardianFirst || admissionParent.guardianFirst) : '';
      if (!selectedParentFirstName) add(relation + ' First Name is required for the selected primary parent / guardian.');
    }
    const phone = clean(item.phone || item.parentPhone || item.contactNumber || item.mobileNumber);
    if (phone.replace(/\D/g,'').length < 7) add('Parent Phone is required and must contain at least 7 digits.');
    const password = String(item.parentPassword || '');
    if (password.length < 6) add('Parent Portal Password is required and must contain at least 6 characters.');
    const requestedLoginMethod = clean(item.parentLoginMethod || item.loginMethod);
    if (requestedLoginMethod && !['phone','email'].includes(requestedLoginMethod.toLowerCase())) add('Login Method must be Phone or Email.');
    const loginMethod = requestedLoginMethod.toLowerCase() === 'email' ? 'Email' : 'Phone';
    const parentEmail = lower(item.parentEmail || item.email);
    if (loginMethod === 'Email' && !parentEmail) add('Parent Email is required when Login Method is Email.');
    if (loginMethod === 'Email' && parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) add('Parent Email must be a valid email address.');
    if (!clean(item.studentId || item.studentCode || item.id) && item.importSource !== 'excel-bulk-import') add('Student ID is required for this import.');
    const code = clean(item.studentId || item.studentCode || item.id);
    if (code) {
      const key = code.toLowerCase();
      if (seenCodes.has(key)) add('Student ID duplicates Excel row ' + seenCodes.get(key) + '.');
      else seenCodes.set(key, rowNumber);
    }
    if (fields.length) issues.push({ rowNumber, fields });
  });
  return issues;
}

function bulkImportValidationMessage(issues) {
  const displayed = issues.slice(0, 100).map(issue =>
    'Excel row ' + issue.rowNumber + ': ' + issue.fields.join(' ')
  );
  if (issues.length > 100) displayed.push('And ' + (issues.length - 100) + ' additional row(s) with errors.');
  return 'Bulk upload validation failed. No student records were saved. Please correct these fields and upload again:\n' + displayed.join('\n');
}

app.post('/api/students/bulk-import', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const rows = req.body?.students;
  if (!Array.isArray(rows) || !rows.length) throw fail(400,'Select an Excel workbook with a header row and at least one student row.');
  if (rows.length > 2000) throw fail(413,'Bulk Excel import is limited to 2,000 students per upload.');
  const issues = validateBulkStudentImportRows(rows);
  if (issues.length) throw fail(400, bulkImportValidationMessage(issues));

  const schoolId = await getSchoolIdForRequest(req);
  const client = await pool.connect();
  const counts = { created:0, updated:0, parentAccountsCreated:0, parentAccountsReused:0 };
  try {
    await client.query('BEGIN');
    const configuredClasses = await getConfiguredClassesForSchool(client, schoolId);
    for (let index = 0; index < rows.length; index++) {
      try {
        const result = await upsertImportedStudent(client, schoolId, rows[index], configuredClasses);
        counts[result.created ? 'created' : 'updated']++;
        if (result.parentAccountCreated) counts.parentAccountsCreated++;
        if (result.parentAccountReused) counts.parentAccountsReused++;
      } catch (error) {
        throw fail(error.status || 400, 'Excel row ' + (Number(rows[index]?.sourceRowNumber) || index + 2) + ': ' + (error.message || 'Student could not be imported.'));
      }
    }
    await client.query(
      "INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,details) VALUES($1,$2,'students.excel_bulk_imported','student_import',$3::jsonb)",
      [schoolId, req.user.id, JSON.stringify({ rows:rows.length, ...counts })]
    );
    await client.query('COMMIT');
    res.status(200).json({ ok:true, total:rows.length, ...counts });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.post('/api/students/import', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const rows = req.body?.students;
  if(!Array.isArray(rows) || !rows.length) throw fail(400,'Select a CSV file with a header row and at least one student.');
  if(rows.length > 2000) throw fail(413,'Import is limited to 2,000 students per upload.');
  const schoolId=await getSchoolIdForRequest(req); const client=await pool.connect(); const counts={created:0,updated:0};
  try {
    await client.query('BEGIN');
    for(let index=0;index<rows.length;index++){
      try { const result=await upsertImportedStudent(client,schoolId,rows[index]); counts[result.created?'created':'updated']++; }
      catch(error){ throw fail(error.status||400,`CSV row ${index+2}: ${error.message}`); }
    }
    await client.query("INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,details) VALUES($1,$2,'students.csv_imported','student_import',$3::jsonb)",[schoolId,req.user.id,JSON.stringify({ rows:rows.length,...counts })]);
    await client.query('COMMIT'); res.status(200).json({ ok:true, total:rows.length,...counts });
  } catch(error){ await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));

app.post('/api/students', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async (req,res) => {
  const schoolId=await getSchoolIdForRequest(req); const body=req.body||{};
  const code=clean(body.studentId||body.id||`SD-${Date.now()}`); const name=clean(body.name);
  if (!name) throw fail(400,'Student name is required.');
  const exists=await pool.query('SELECT 1 FROM students WHERE school_id=$1 AND student_code=$2',[schoolId,code]); if(exists.rowCount)throw fail(409,'Student ID already exists.');
  const gender=clean(body.gender || body.Gender || body.studentGender);
  const person=await pool.query(`INSERT INTO people(school_id,person_type,external_id,first_name,last_name,full_name,contact_number,class_name,section,enrollment_number,status,gender)
    VALUES($1,'student',$2,$3,$4,$5,$6,$7,$8,$2,$9,$10) RETURNING id`,[schoolId,code,name.split(/\s+/)[0],name.split(/\s+/).slice(1).join(' '),name,clean(body.phone),clean(body.className),clean(body.section),clean(body.status)||'Active',gender]);
  const rows=await pool.query(`INSERT INTO students(school_id,person_id,student_code,name,class_name,section,gender,academic_year,father_name,parent_name,phone,status,fee_defaulter,child_id_active,parent_id_active,metadata)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb) RETURNING *`,[schoolId,person.rows[0].id,code,name,clean(body.className),clean(body.section),gender,clean(body.academicYear),clean(body.father),clean(body.parent),clean(body.phone),clean(body.status)||'Active',Boolean(body.defaulter),body.childId!==false,body.parentId!==false,JSON.stringify(body)]);
  await writeAudit(req,'student.created','student',code,{ name }); res.status(201).json({ student:mapStudent(rows.rows[0]) });
}));
app.post('/api/students/admit', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId = await getSchoolIdForRequest(req);
  const input = req.body || {};
  const student = input.student && typeof input.student === 'object' ? input.student : {};
  const parent = input.parent && typeof input.parent === 'object' ? input.parent : {};
  const fees = input.fees && typeof input.fees === 'object' ? input.fees : {};
  const dayCare = input.dayCare && typeof input.dayCare === 'object' ? input.dayCare : {};
  const transport = input.transport && typeof input.transport === 'object' ? input.transport : {};
  const immunizationSchedule = Array.isArray(input.immunizationSchedule) ? input.immunizationSchedule : [];

  const firstName = clean(student.firstName);
  const middleName = clean(student.middleName);
  const lastName = clean(student.lastName);
  const studentName = [firstName,middleName,lastName].filter(Boolean).join(' ');
  const dob = parseDbDate(student.dob);
  const academicYear = clean(student.academicYear);
  const className = clean(student.className);
  const relationship = clean(parent.relation);
  const parentPhone = clean(parent.phone);
  const phoneDigits = parentPhone.replace(/\D/g,'');
  const loginMethod = clean(parent.loginMethod) === 'Email' ? 'Email' : 'Phone';
  const parentEmail = lower(parent.email);
  const password = String(parent.password || '');

  if (!firstName || !studentName) throw fail(400,'Student first name is required.');
  if (!dob) throw fail(400,'Student date of birth is required.');
  if (!academicYear) throw fail(400,'Academic year is required.');
  if (!className) throw fail(400,'Class is required.');
  if (!relationship || relationship === 'Not Specified') throw fail(400,'Select the primary parent relationship.');
  const chosenParentName = relationship === 'Mother' ? clean(parent.motherFirst)
    : relationship === 'Father' ? clean(parent.fatherFirst)
    : relationship === 'Guardian' ? clean(parent.guardianFirst)
    : clean(parent.motherFirst || parent.fatherFirst || parent.guardianFirst);
  if (!chosenParentName) throw fail(400,'Enter the first name for the selected primary parent or guardian.');
  if (phoneDigits.length < 7) throw fail(400,'Enter a valid primary parent phone number.');
  if (password.length < 6) throw fail(400,'Parent password must contain at least 6 characters.');
  if (loginMethod === 'Email' && !parentEmail) throw fail(400,'Parent email is required when Login Method is Email.');
  if (loginMethod === 'Email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) throw fail(400,'Enter a valid parent email address.');

  const classResult = await pool.query('SELECT class_name,section FROM school_classes WHERE school_id=$1 AND is_active=true AND class_name=$2 LIMIT 1', [schoolId,className]);
  if (!classResult.rowCount) throw fail(400,'The selected class is not active. Refresh the page and choose an active class.');
  const activeSection = clean(classResult.rows[0].section);
  const enrollmentDate = parseDbDate(student.enrollmentDate);
  const studentCode = clean(student.studentCode) || ('SW-' + randomBytes(5).toString('hex').toUpperCase());
  const enrollmentNumber = clean(student.enrollmentNumber) || ('ENR-' + academicYear.split('-')[0] + '-' + randomBytes(3).toString('hex').toUpperCase());
  const photoDataUrl = String(student.photoDataUrl || '');
  if (photoDataUrl) {
    const decodedPhoto = decodeDataUrl(photoDataUrl);
    if (!decodedPhoto.mime.startsWith('image/')) throw fail(400,'Student photo must be an image.');
    if (!decodedPhoto.buffer.length || decodedPhoto.buffer.length > 1_800_000) throw fail(413,'Photo must be smaller than 1.8 MB after compression.');
  }

  const nameFromParts = prefix => [parent[prefix + 'First'],parent[prefix + 'Middle'],parent[prefix + 'Last']].map(clean).filter(Boolean).join(' ');
  const motherName = nameFromParts('mother');
  const fatherName = nameFromParts('father');
  const guardianName = nameFromParts('guardian');
  const relationName = relationship === 'Mother' ? motherName : relationship === 'Father' ? fatherName : relationship === 'Guardian' ? guardianName : [motherName,fatherName,guardianName].find(Boolean) || '';
  const primaryParentName = relationName || ('Parent of ' + studentName);
  const parentExternalId = 'parent:' + (phoneDigits || primaryParentName.toLowerCase().replace(/[^a-z0-9]+/g,'-'));
  const parentSafe = { ...parent };
  delete parentSafe.password;
  const studentSafe = { ...student };
  delete studentSafe.photoDataUrl;
  const details = {
    admitNewStudent: {
      student: studentSafe, parent: parentSafe, fees, dayCare, transport, immunizationSchedule,
      savedAt: new Date().toISOString()
    }
  };
  const metadata = {
    ...studentSafe,
    source: 'admit-new-student',
    routeName: clean(transport.routeName),
    dayCare: { ...dayCare },
    parent: parentSafe, fees, transport, immunizationSchedule
  };

  const client = await pool.connect();
  let studentRow;
  let parentAccountCreated = false;
  let parentAccountReused = false;
  try {
    await client.query('BEGIN');
    const duplicateCode = await client.query('SELECT 1 FROM students WHERE school_id=$1 AND student_code=$2',[schoolId,studentCode]);
    if (duplicateCode.rowCount) throw fail(409,'The generated student ID already exists. Please generate a new enrollment number and save again.');

    await client.query('INSERT INTO academic_years(school_id,label,is_current) VALUES($1,$2,false) ON CONFLICT(school_id,label) DO NOTHING',[schoolId,academicYear]);

    const parentNames = primaryParentName.split(/\s+/).filter(Boolean);
    const parentInsert = await client.query(
      "INSERT INTO people(school_id,person_type,external_id,first_name,middle_name,last_name,full_name,email,contact_number,alternate_contact_number,parent_guardian_name,address,city,state,status,metadata) VALUES($1,'parent',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Active',$14::jsonb) ON CONFLICT(school_id,person_type,external_id) WHERE external_id IS NOT NULL DO UPDATE SET first_name=EXCLUDED.first_name,middle_name=EXCLUDED.middle_name,last_name=EXCLUDED.last_name,full_name=EXCLUDED.full_name,email=COALESCE(NULLIF(EXCLUDED.email,''),people.email),contact_number=EXCLUDED.contact_number,alternate_contact_number=EXCLUDED.alternate_contact_number,parent_guardian_name=EXCLUDED.parent_guardian_name,address=EXCLUDED.address,city=EXCLUDED.city,state=EXCLUDED.state,metadata=EXCLUDED.metadata,updated_at=now() RETURNING id",
      [schoolId,parentExternalId,parentNames[0]||'Parent',String(parentNames.length>2?parentNames.slice(1,-1).join(' '):''),parentNames.length>1?parentNames[parentNames.length-1]:'',primaryParentName,parentEmail||null,parentPhone,clean(parent.alternatePhone),primaryParentName,clean(parent.address),clean(parent.city),clean(parent.state),JSON.stringify({ ...parentSafe, parentSource:'admit-new-student' })]
    );
    const parentPersonId = parentInsert.rows[0].id;
    const existingParentAccount = await client.query("SELECT id FROM user_accounts WHERE school_id=$1 AND person_id=$2 AND role='parent' ORDER BY created_at LIMIT 1",[schoolId,parentPersonId]);

    const studentPerson = await client.query(
      "INSERT INTO people(school_id,person_type,external_id,first_name,middle_name,last_name,full_name,contact_number,alternate_contact_number,class_name,section,roll_number,enrollment_number,parent_guardian_name,email,gender,date_of_birth,address,city,state,status,route_name,day_care,metadata) VALUES($1,'student',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'Active',$20,$21,$22::jsonb) RETURNING id",
      [schoolId,studentCode,firstName,middleName,lastName,studentName,parentPhone,clean(parent.alternatePhone),className,activeSection,clean(student.rollNumber),enrollmentNumber,primaryParentName,parentEmail||null,clean(student.gender),dob,clean(parent.address),clean(parent.city),clean(parent.state),clean(transport.routeName),clean(dayCare.enabled)==='Yes',JSON.stringify(metadata)]
    );

    const insertedStudent = await client.query(
      "INSERT INTO students(school_id,person_id,student_code,name,class_name,section,academic_year,original_class,dob,gender,father_name,parent_name,mother_name,primary_parent_name,primary_parent,phone,alternate_phone,email,address,city,state,pin_code,blood_group,category,nationality,house,enrolled,enrollment_date,enrollment_number,roll_number,status,photo_data_url,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$5,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,'Yes',$26,$27,$28,'Active',$29,$30::jsonb) RETURNING *",
      [schoolId,studentPerson.rows[0].id,studentCode,studentName,className,activeSection,academicYear,dob,clean(student.gender),fatherName,primaryParentName,motherName,primaryParentName,relationship,parentPhone,clean(parent.alternatePhone),parentEmail,clean(parent.address),clean(parent.city),clean(parent.state),clean(parent.zip),clean(student.bloodGroup),clean(student.category),clean(student.nationality)||'Indian',clean(student.house),enrollmentDate,enrollmentNumber,clean(student.rollNumber),photoDataUrl,JSON.stringify(metadata)]
    );
    studentRow = insertedStudent.rows[0];

    await client.query("INSERT INTO student_parents(school_id,student_id,parent_person_id,relationship,is_primary) VALUES($1,$2,$3,$4,true) ON CONFLICT(student_id,parent_person_id) DO UPDATE SET relationship=EXCLUDED.relationship,is_primary=true",[schoolId,studentRow.id,parentPersonId,relationship]);
    await client.query("INSERT INTO student_details(school_id,student_id,details,updated_by) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT(student_id) DO UPDATE SET details=EXCLUDED.details,updated_by=EXCLUDED.updated_by,updated_at=now()",[schoolId,studentRow.id,JSON.stringify(details),req.user.id]);

    if (existingParentAccount.rowCount) {
      parentAccountReused = true;
    } else {
      const accountEmail = loginMethod === 'Email'
        ? parentEmail
        : ('phone.' + phoneDigits + '.' + String(parentPersonId).replace(/-/g,'').slice(-8) + '@phone.schoolworld.local');
      const duplicateAccountEmail = await client.query('SELECT id,person_id FROM user_accounts WHERE lower(email)=lower($1) LIMIT 1',[accountEmail]);
      if (duplicateAccountEmail.rowCount && String(duplicateAccountEmail.rows[0].person_id || '') !== String(parentPersonId)) {
        throw fail(409,'The parent email is already used by another account. Use Phone as Login Method or enter a different email.');
      }
      if (!duplicateAccountEmail.rowCount) {
        await client.query("INSERT INTO user_accounts(school_id,person_id,email,password_hash,role,first_name,last_name,is_active,must_change_password) VALUES($1,$2,$3,$4,'parent',$5,$6,true,false)",[schoolId,parentPersonId,accountEmail,await bcrypt.hash(password,12),parentNames[0]||'Parent',parentNames.slice(1).join(' ')]);
        parentAccountCreated = true;
      } else {
        parentAccountReused = true;
      }
    }

    await writeAudit(req,'student.admitted','student',studentCode,{name:studentName,className,academicYear,parentRelation:relationship,parentAccountCreated,parentAccountReused,selectedFeeTemplate:clean(fees.templateName),dayCare:clean(dayCare.enabled)==='Yes',transport:clean(transport.enabled)==='Yes',immunizationEntries:immunizationSchedule.length});
    await client.query('COMMIT');
    res.status(201).json({student:mapStudent(studentRow),parentAccountCreated,parentAccountReused,enrollmentNumber,studentCode});
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.patch('/api/students/:studentCode', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async (req,res) => {
  const schoolId=await getSchoolIdForRequest(req);
  const code=String(req.params.studentCode);
  const patch=req.body||{};
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const current=await client.query('SELECT * FROM students WHERE school_id=$1 AND student_code=$2 FOR UPDATE',[schoolId,code]);
    if(!current.rowCount) throw fail(404,'Student not found.');
    const sets=[];
    const values=[schoolId,code];
    let n=3;
    const meta={...(current.rows[0].metadata||{})};
    for(const [key,value] of Object.entries(patch)){
      const col=studentFieldMap[key];
      if(!col){ meta[key]=value; continue; }
      if(key==='status' && !['Active','Inactive'].includes(value)) throw fail(400,'Student status must be Active or Inactive.');
      let dbValue=value;
      if(booleanStudentFields.has(key)) dbValue=asBoolean(value);
      if(jsonStudentFields.has(key)) dbValue=JSON.stringify(Array.isArray(value)?value:[]);
      if(dateStudentFields.has(key)) dbValue=parseDbDate(value);
      sets.push(`${col}=$${n++}${jsonStudentFields.has(key)?'::jsonb':''}`);
      values.push(dbValue);
    }
    if(Object.keys(patch).some(key=>!studentFieldMap[key])){
      sets.push(`metadata=$${n++}::jsonb`);
      values.push(JSON.stringify(meta));
    }
    if(!sets.length){
      await client.query('COMMIT');
      return res.json({student:mapStudent(current.rows[0])});
    }
    sets.push('updated_at=now()');
    const row=await client.query(`UPDATE students SET ${sets.join(',')} WHERE school_id=$1 AND student_code=$2 RETURNING *`,values);
    const student=row.rows[0];
    if(student.person_id){
      await client.query(
        'UPDATE people SET full_name=$3,first_name=$4,last_name=$5,class_name=$6,section=$7,contact_number=$8,parent_guardian_name=$9,status=$10,email=$11,alternate_contact_number=$12,address=$13,city=$14,state=$15,date_of_birth=$16,route_name=$17,updated_at=now() WHERE school_id=$1 AND id=$2',
        [schoolId,student.person_id,student.name,student.name.split(/\s+/)[0],student.name.split(/\s+/).slice(1).join(' '),student.class_name,student.section,student.phone,student.parent_name||student.father_name,student.status,student.email,student.alternate_phone,student.address,student.city,student.state,parseDbDate(student.dob),(student.metadata||{}).routeName || (student.metadata||{}).route || '']
      );
      if(patch.parent!==undefined || patch.father!==undefined || patch.phone!==undefined){
        const primaryParent=await client.query('SELECT p.id FROM student_parents sp JOIN people p ON p.id=sp.parent_person_id WHERE sp.school_id=$1 AND sp.student_id=$2 AND sp.is_primary=true LIMIT 1',[schoolId,student.id]);
        if(primaryParent.rowCount){
          const parentName=clean(student.parent_name||student.father_name);
          await client.query('UPDATE people SET full_name=$3,first_name=$4,last_name=$5,contact_number=$6,parent_guardian_name=$3,updated_at=now() WHERE school_id=$1 AND id=$2',[schoolId,primaryParent.rows[0].id,parentName,parentName.split(/\s+/)[0]||'',parentName.split(/\s+/).slice(1).join(' '),student.phone]);
        }
      }
    }
    await client.query(
      'INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details,ip_address) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)',
      [schoolId,req.user.id,'student.updated','student',code,JSON.stringify({fields:Object.keys(patch)}),req.ip||null]
    );
    await client.query('COMMIT');
    res.json({student:mapStudent(student)});
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.put('/api/students/:studentCode/photo', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const code=String(req.params.studentCode);
  const photoDataUrl=typeof req.body?.photoDataUrl==='string' ? req.body.photoDataUrl : '';
  if(!photoDataUrl) throw fail(400,'Choose a student photo before saving.');
  if(photoDataUrl.length>2_500_000) throw fail(413,'Photo is too large after compression. Choose a smaller image.');
  const match=photoDataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match) throw fail(400,'The photo format is not supported. Please choose a JPG, PNG, or WebP image.');
  const photoBytes=Buffer.from(match[2],'base64');
  if(!photoBytes.length || photoBytes.length>1_800_000) throw fail(413,'Photo must be smaller than 1.8 MB after compression.');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const current=await client.query('SELECT id FROM students WHERE school_id=$1 AND student_code=$2 FOR UPDATE',[schoolId,code]);
    if(!current.rowCount) throw fail(404,'Student not found in this school.');
    const saved=await client.query(
      'UPDATE students SET photo_data_url=$3,updated_at=now() WHERE school_id=$1 AND student_code=$2 RETURNING *',
      [schoolId,code,photoDataUrl]
    );
    await client.query(
      'INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details,ip_address) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)',
      [schoolId,req.user.id,'student.photo.updated','student',code,JSON.stringify({mimeType:'image/'+match[1],bytes:photoBytes.length}),req.ip||null]
    );
    await client.query('COMMIT');
    res.json({ok:true,student:mapStudent(saved.rows[0])});
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/api/student-details', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req); const result=await pool.query('SELECT s.student_code,d.details FROM student_details d JOIN students s ON s.id=d.student_id WHERE d.school_id=$1 AND s.school_id=$1',[schoolId]);
  res.json({ detailsById:Object.fromEntries(result.rows.map(row=>[String(row.student_code),row.details||{}])) });
}));
app.put('/api/students/:studentCode/details', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const code=String(req.params.studentCode);
  const patch=req.body?.student && typeof req.body.student==='object' && !Array.isArray(req.body.student) ? req.body.student : {};
  const details=req.body?.details && typeof req.body.details==='object' && !Array.isArray(req.body.details) ? req.body.details : {};
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const current=await client.query('SELECT * FROM students WHERE school_id=$1 AND student_code=$2 FOR UPDATE',[schoolId,code]);
    if(!current.rowCount) throw fail(404,'Student not found.');
    let studentRow=current.rows[0];
    const sets=[];
    const values=[schoolId,code];
    let n=3;
    const metadata={...(studentRow.metadata||{})};
    for(const [key,value] of Object.entries(patch)){
      const column=studentFieldMap[key];
      if(!column){ metadata[key]=value; continue; }
      if(key==='status' && !['Active','Inactive'].includes(value)) throw fail(400,'Student status must be Active or Inactive.');
      let dbValue=value;
      if(booleanStudentFields.has(key)) dbValue=asBoolean(value);
      if(jsonStudentFields.has(key)) dbValue=JSON.stringify(Array.isArray(value)?value:[]);
      if(dateStudentFields.has(key)) dbValue=parseDbDate(value);
      sets.push(`${column}=$${n++}${jsonStudentFields.has(key)?'::jsonb':''}`);
      values.push(dbValue);
    }
    if(Object.keys(patch).some(key=>!studentFieldMap[key])){
      sets.push(`metadata=$${n++}::jsonb`);
      values.push(JSON.stringify(metadata));
    }
    if(sets.length){
      sets.push('updated_at=now()');
      const updated=await client.query(`UPDATE students SET ${sets.join(',')} WHERE school_id=$1 AND student_code=$2 RETURNING *`,values);
      studentRow=updated.rows[0];
      if(studentRow.person_id){
        await client.query(
          'UPDATE people SET full_name=$3,first_name=$4,last_name=$5,class_name=$6,section=$7,contact_number=$8,parent_guardian_name=$9,status=$10,email=$11,alternate_contact_number=$12,address=$13,city=$14,state=$15,date_of_birth=$16,route_name=$17,updated_at=now() WHERE school_id=$1 AND id=$2',
          [schoolId,studentRow.person_id,studentRow.name,studentRow.name.split(/\s+/)[0],studentRow.name.split(/\s+/).slice(1).join(' '),studentRow.class_name,studentRow.section,studentRow.phone,studentRow.parent_name||studentRow.father_name,studentRow.status,studentRow.email,studentRow.alternate_phone,studentRow.address,studentRow.city,studentRow.state,parseDbDate(studentRow.dob),clean((studentRow.metadata||{}).routeName || (studentRow.metadata||{}).route || '')]
        );
        if(patch.parent!==undefined || patch.father!==undefined || patch.phone!==undefined){
          const primaryParent=await client.query('SELECT p.id FROM student_parents sp JOIN people p ON p.id=sp.parent_person_id WHERE sp.school_id=$1 AND sp.student_id=$2 AND sp.is_primary=true LIMIT 1',[schoolId,studentRow.id]);
          if(primaryParent.rowCount){
            const parentName=clean(studentRow.parent_name||studentRow.father_name);
            await client.query('UPDATE people SET full_name=$3,first_name=$4,last_name=$5,contact_number=$6,parent_guardian_name=$3,updated_at=now() WHERE school_id=$1 AND id=$2',[schoolId,primaryParent.rows[0].id,parentName,parentName.split(/\s+/)[0]||'',parentName.split(/\s+/).slice(1).join(' '),studentRow.phone]);
          }
        }
      }
    }
    await client.query(
      `INSERT INTO student_details(school_id,student_id,details,updated_by) VALUES($1,$2,$3::jsonb,$4)
       ON CONFLICT(student_id) DO UPDATE SET details=EXCLUDED.details,updated_by=EXCLUDED.updated_by,updated_at=now()`,
      [schoolId,studentRow.id,JSON.stringify(details),req.user.id]
    );
    await client.query(
      'INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details,ip_address) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)',
      [schoolId,req.user.id,'student.details.updated','student',code,JSON.stringify({fields:Object.keys(patch),detailKeys:Object.keys(details).length}),req.ip||null]
    );
    await client.query('COMMIT');
    res.json({ok:true,student:mapStudent(studentRow)});
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.post('/api/students/:studentCode/reset-password', authenticate, requireRole('school_admin','principal'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req); const code=String(req.params.studentCode);
  const student=await pool.query('SELECT person_id FROM students WHERE school_id=$1 AND student_code=$2',[schoolId,code]);
  if(!student.rowCount) throw fail(404,'Student not found.');
  if(!student.rows[0].person_id) throw fail(409,'This student is not linked to a recipient person record.');
  const user=await pool.query('SELECT id FROM user_accounts WHERE school_id=$1 AND person_id=$2 AND role IN (\'student\',\'parent\') ORDER BY role LIMIT 1',[schoolId,student.rows[0].person_id]);
  if(!user.rowCount) throw fail(404,'No student login account is linked to this student. Create/link the account first.');
  const temporaryPassword=randomBytes(12).toString('base64url');
  await pool.query('UPDATE user_accounts SET password_hash=$2,must_change_password=true,updated_at=now() WHERE id=$1',[user.rows[0].id,await bcrypt.hash(temporaryPassword,12)]);
  await writeAudit(req,'user.password_reset','user_account',user.rows[0].id,{ studentCode:code });
  res.json({ok:true,temporaryPassword,message:'Share the temporary password securely. The user must change it on their next sign-in.'});
}));

app.get('/api/admissions', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const result=await pool.query(`SELECT id,form_number AS "formNumber",academic_year AS "academicYear",enquiry_date AS "enquiryDate",enquiry_status AS "enquiryStatus",student_name AS "studentName",primary_contact AS "primaryContact",email,class_applied AS "classApplied",data,created_at AS "createdAt",updated_at AS "updatedAt"
    FROM admission_enquiries WHERE school_id=$1 ORDER BY created_at DESC LIMIT 500`,[schoolId]);
  res.json({ admissions: result.rows });
}));
app.post('/api/admissions', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req); const b=req.body||{};
  const studentName=clean(b.studentName); const primaryContact=clean(b.primaryContact);
  const academicYear=clean(b.academicYear); const enquiryStatus=clean(b.enquiryStatus)||'Cold Enquiry';
  const allowedStatuses=new Set(['Cold Enquiry','Warm Enquiry','Hot Enquiry','Admitted','Not Interested']);
  if(studentName.length<2||!primaryContact||!academicYear) throw fail(400,'Student name, primary contact number, and academic year are required.');
  if(!allowedStatuses.has(enquiryStatus)) throw fail(400,'Choose a valid enquiry status.');
  const enquiryDate=clean(b.enquiryDate)||null;
  if(enquiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(enquiryDate)) throw fail(400,'Enquiry date must be a valid date.');
  const formNumber=clean(b.formNumber)||`ENQ-${randomBytes(5).toString('hex').toUpperCase()}`;
  const result=await pool.query(`INSERT INTO admission_enquiries(school_id,form_number,academic_year,enquiry_date,enquiry_status,student_name,primary_contact,email,class_applied,data,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
    RETURNING id,form_number AS "formNumber",academic_year AS "academicYear",enquiry_date AS "enquiryDate",enquiry_status AS "enquiryStatus",student_name AS "studentName",primary_contact AS "primaryContact",email,class_applied AS "classApplied",data,created_at AS "createdAt"`,
    [schoolId,formNumber,academicYear,enquiryDate,enquiryStatus,studentName,primaryContact,clean(b.email)||null,clean(b.classApplied)||null,JSON.stringify(b),req.user.id]);
  await writeAudit(req,'admission.enquiry.created','admission_enquiry',result.rows[0].id,{formNumber,studentName});
  res.status(201).json({admission:result.rows[0]});
}));


function isSchoolWorldQuestionnaire(options) {
  return Boolean(options && typeof options === 'object' && !Array.isArray(options) && options.module === 'Questionnaires' && options.schemaVersion === 1);
}
function questionnaireAttachment(value) {
  if (!value || typeof value !== 'object') return null;
  const fileName = clean(value.fileName).slice(0, 255);
  const mimeType = clean(value.mimeType) || 'application/octet-stream';
  const dataUrl = String(value.dataUrl || '');
  if (!fileName || !dataUrl) return { fileName, mimeType, size: Number(value.size) || 0, hasFile: Boolean(value.hasFile) };
  const match = dataUrl.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match) throw fail(400, 'Question attachment must be a valid base64 data URL.');
  const size = Math.floor(match[2].replace(/\s/g, '').length * 3 / 4) - (match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0);
  const limit = mimeType === 'application/pdf' ? 5 * 1024 * 1024 : 1.5 * 1024 * 1024;
  if (size > limit) throw fail(413, 'Attachment "' + fileName + '" exceeds the allowed file size.');
  return { fileName, mimeType, dataUrl, size, hasFile: true };
}
function normalizeQuestionnairePayload(input) {
  const source = input && typeof input === 'object' ? input : {};
  const title = clean(source.title || source.question).slice(0, 220);
  const subject = clean(source.subject).slice(0, 160);
  const type = clean(source.type || source.answer_type || 'Survey');
  const allowedTypes = new Set(['Survey','Approval','Quiz','Whizzard']);
  if (title.length < 2) throw fail(400, 'Questionnaire title must contain at least 2 characters.');
  if (!allowedTypes.has(type)) throw fail(400, 'Choose a valid questionnaire type.');
  const validFrom = clean(source.validFrom);
  const validTo = clean(source.validTo);
  if (!validFrom || Number.isNaN(Date.parse(validFrom))) throw fail(400, 'Choose a valid Valid From date and time.');
  if (!validTo || Number.isNaN(Date.parse(validTo))) throw fail(400, 'Choose a valid Valid Till date and time.');
  if (Date.parse(validTo) <= Date.parse(validFrom)) throw fail(400, 'Valid Till must be later than Valid From.');
  if (!Array.isArray(source.sections) || !source.sections.length) throw fail(400, 'Add at least one questionnaire section.');
  if (source.sections.length > 50) throw fail(413, 'A questionnaire can contain at most 50 sections.');
  let questionCount = 0;
  let attachmentBytes = 0;
  const sections = source.sections.map((section, sectionIndex) => {
    const sectionTitle = clean(section?.title) || ('Section ' + (sectionIndex + 1));
    const sectionId = clean(section?.id) || randomUUID();
    const questions = Array.isArray(section?.questions) ? section.questions : [];
    if (!questions.length) throw fail(400, 'Each section must contain at least one question.');
    return {
      id: sectionId.slice(0, 120),
      title: sectionTitle.slice(0, 160),
      questions: questions.map((question, questionIndex) => {
        questionCount += 1;
        if (questionCount > 250) throw fail(413, 'A questionnaire can contain at most 250 questions.');
        const questionText = clean(question?.question);
        if (!questionText) throw fail(400, 'Question ' + (questionIndex + 1) + ' in ' + sectionTitle + ' is empty.');
        const marks = Number(question?.marks);
        if (!Number.isFinite(marks) || marks < 0 || marks > 1000) throw fail(400, 'Question marks must be between 0 and 1000.');
        const allowedInputs = new Set(['Text','SingleChoice','MultipleChoice','Documents','Canvas']);
        const inputType = clean(question?.inputType) || 'SingleChoice';
        if (!allowedInputs.has(inputType)) throw fail(400, 'Choose a valid question input type.');
        const attachment = questionnaireAttachment(question?.attachment);
        if (attachment?.dataUrl) attachmentBytes += attachment.size || 0;
        const answers = (Array.isArray(question?.answers) ? question.answers : []).slice(0, 80).map((answer, answerIndex) => ({
          id: (clean(answer?.id) || randomUUID()).slice(0, 120),
          text: String(answer?.text ?? '').slice(0, 3000),
          isCorrect: Boolean(answer?.isCorrect)
        }));
        return {
          id: (clean(question?.id) || randomUUID()).slice(0, 120),
          question: questionText.slice(0, 12000),
          marks,
          topic: clean(question?.topic).slice(0, 180),
          subTopic: clean(question?.subTopic).slice(0, 180),
          inputType,
          attachment,
          answers
        };
      })
    };
  });
  if (attachmentBytes > 8 * 1024 * 1024) throw fail(413, 'Questionnaire attachments together must be 8 MB or smaller.');
  const totalMarks = sections.reduce((sum, section) => sum + section.questions.reduce((questionSum, question) => questionSum + question.marks, 0), 0);
  const metadata = {
    module: 'Questionnaires',
    schemaVersion: 1,
    title,
    subject,
    type,
    validFrom,
    validTo,
    totalMarks,
    allClasses: Boolean(source.allClasses),
    classes: (Array.isArray(source.classes) ? source.classes : []).map(item => ({ id: clean(item?.id), className: clean(item?.className || item?.class_name || item?.name), section: clean(item?.section) })).filter(item => item.id),
    sections,
    createdAt: clean(source.createdAt) || new Date().toISOString(),
    updatedAt: clean(source.updatedAt) || new Date().toISOString()
  };
  if (Buffer.byteLength(JSON.stringify(metadata), 'utf8') > 10 * 1024 * 1024) throw fail(413, 'Questionnaire data must be 10 MB or smaller.');
  return metadata;
}
async function resolveQuestionnaireClasses(schoolId, input, allClasses) {
  const available = await pool.query('SELECT id,class_name,section FROM school_classes WHERE school_id=$1 AND is_active=true ORDER BY grade_order,class_name,section', [schoolId]);
  if (allClasses) return available.rows.map(row => ({ id: row.id, className: row.class_name, section: row.section || '' }));
  const wanted = new Set((Array.isArray(input) ? input : []).map(item => clean(item?.id)).filter(Boolean));
  return available.rows.filter(row => wanted.has(row.id)).map(row => ({ id: row.id, className: row.class_name, section: row.section || '' }));
}
function questionnaireWithoutFiles(metadata) {
  const copy = JSON.parse(JSON.stringify(metadata));
  for (const section of copy.sections || []) {
    for (const question of section.questions || []) {
      if (question.attachment) {
        const hasFile = Boolean(question.attachment.dataUrl || question.attachment.hasFile);
        delete question.attachment.dataUrl;
        question.attachment.hasFile = hasFile;
      }
    }
  }
  return copy;
}
function mapQuestionnaireRecord(row, includeFiles = false) {
  const metadata = row.options && typeof row.options === 'object' && !Array.isArray(row.options) ? row.options : null;
  if (isSchoolWorldQuestionnaire(metadata)) {
    const mapped = {
      ...metadata,
      id: row.id,
      active: Boolean(row.active),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    };
    return includeFiles ? mapped : questionnaireWithoutFiles(mapped);
  }
  const oldOptions = Array.isArray(row.options) ? row.options : [];
  const oldType = clean(row.answer_type) || 'Text';
  const inputType = /multiple/i.test(oldType) ? 'MultipleChoice'
    : /single|choice|yes\s*\/\s*no|rating/i.test(oldType) ? 'SingleChoice' : 'Text';
  const legacy = {
    module: 'Questionnaires', schemaVersion: 1,
    id: row.id,
    title: clean(row.question) || 'Untitled questionnaire',
    subject: '',
    type: oldType === 'Survey' || oldType === 'Approval' || oldType === 'Whizzard' ? oldType : 'Survey',
    validFrom: '',
    validTo: '',
    totalMarks: 0,
    allClasses: false,
    classes: [],
    sections: [{
      id: 'legacy-section-' + row.id,
      title: 'Section 1',
      questions: [{
        id: 'legacy-question-' + row.id,
        question: clean(row.question),
        marks: 0,
        topic: '',
        subTopic: '',
        inputType,
        attachment: null,
        answers: oldOptions.map((option, index) => ({
          id: 'legacy-answer-' + index + '-' + row.id,
          text: typeof option === 'string' ? option : clean(option?.text || option?.label),
          isCorrect: Boolean(option?.isCorrect || option?.correct)
        }))
      }]
    }],
    active: Boolean(row.active),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    legacy: true
  };
  return legacy;
}

app.get('/api/questionnaires/classes', authenticate, requireRole('school_admin','principal','teacher','staff'), asyncHandler(async(req,res) => {
  const schoolId = await getSchoolIdForRequest(req);
  const result = await pool.query('SELECT id,class_name,grade_order,section FROM school_classes WHERE school_id=$1 AND is_active=true ORDER BY grade_order,class_name,section', [schoolId]);
  res.json({ classes: result.rows });
}));
app.get('/api/questionnaires', authenticate, requireRole('school_admin','principal','teacher','staff'), asyncHandler(async(req,res) => {
  const schoolId = await getSchoolIdForRequest(req);
  const result = await pool.query('SELECT id,question,answer_type,options,active,created_at FROM questionnaires WHERE school_id=$1 AND active=true ORDER BY created_at DESC', [schoolId]);
  res.json({ questionnaires: result.rows.map(row => mapQuestionnaireRecord(row, false)) });
}));
app.post('/api/questionnaires', authenticate, requireRole('school_admin','principal','teacher','staff'), asyncHandler(async(req,res) => {
  const schoolId = await getSchoolIdForRequest(req);
  const metadata = normalizeQuestionnairePayload(req.body?.questionnaire || req.body);
  metadata.classes = await resolveQuestionnaireClasses(schoolId, metadata.classes, metadata.allClasses);
  const result = await pool.query(
    'INSERT INTO questionnaires(school_id,question,answer_type,options,active,created_by) VALUES($1,$2,$3,$4::jsonb,true,$5) RETURNING id,question,answer_type,options,active,created_at',
    [schoolId, metadata.title, metadata.type, JSON.stringify(metadata), req.user.id]
  );
  await writeAudit(req, 'questionnaire.created', 'questionnaire', result.rows[0].id, { title: metadata.title, type: metadata.type, sectionCount: metadata.sections.length, questionCount: metadata.sections.reduce((sum, section) => sum + section.questions.length, 0) });
  res.status(201).json({ questionnaire: mapQuestionnaireRecord(result.rows[0], false) });
}));
app.get('/api/questionnaires/:questionnaireId', authenticate, requireRole('school_admin','principal','teacher','staff'), asyncHandler(async(req,res) => {
  const schoolId = await getSchoolIdForRequest(req);
  const result = await pool.query('SELECT id,question,answer_type,options,active,created_at FROM questionnaires WHERE school_id=$1 AND id=$2', [schoolId, req.params.questionnaireId]);
  if (!result.rowCount) throw fail(404, 'Questionnaire not found.');
  res.json({ questionnaire: mapQuestionnaireRecord(result.rows[0], true) });
}));
app.put('/api/questionnaires/:questionnaireId', authenticate, requireRole('school_admin','principal','teacher','staff'), asyncHandler(async(req,res) => {
  const schoolId = await getSchoolIdForRequest(req);
  const current = await pool.query('SELECT id,options FROM questionnaires WHERE school_id=$1 AND id=$2', [schoolId, req.params.questionnaireId]);
  if (!current.rowCount) throw fail(404, 'Questionnaire not found.');
  const metadata = normalizeQuestionnairePayload(req.body?.questionnaire || req.body);
  metadata.classes = await resolveQuestionnaireClasses(schoolId, metadata.classes, metadata.allClasses);
  const result = await pool.query(
    'UPDATE questionnaires SET question=$3,answer_type=$4,options=$5::jsonb,active=true WHERE school_id=$1 AND id=$2 RETURNING id,question,answer_type,options,active,created_at',
    [schoolId, req.params.questionnaireId, metadata.title, metadata.type, JSON.stringify(metadata)]
  );
  await writeAudit(req, 'questionnaire.updated', 'questionnaire', req.params.questionnaireId, { title: metadata.title, type: metadata.type });
  res.json({ questionnaire: mapQuestionnaireRecord(result.rows[0], false) });
}));
app.patch('/api/questionnaires/:questionnaireId/classes', authenticate, requireRole('school_admin','principal','teacher','staff'), asyncHandler(async(req,res) => {
  const schoolId = await getSchoolIdForRequest(req);
  const current = await pool.query('SELECT id,question,answer_type,options,active,created_at FROM questionnaires WHERE school_id=$1 AND id=$2 AND active=true', [schoolId, req.params.questionnaireId]);
  if (!current.rowCount) throw fail(404, 'Questionnaire not found.');
  const row = current.rows[0];
  let metadata = isSchoolWorldQuestionnaire(row.options) ? row.options : mapQuestionnaireRecord(row, true);
  const allClasses = Boolean(req.body?.allClasses);
  metadata = {
    ...metadata,
    allClasses,
    classes: await resolveQuestionnaireClasses(schoolId, req.body?.classes, allClasses),
    updatedAt: new Date().toISOString()
  };
  const result = await pool.query('UPDATE questionnaires SET options=$3::jsonb WHERE school_id=$1 AND id=$2 RETURNING id,question,answer_type,options,active,created_at', [schoolId, req.params.questionnaireId, JSON.stringify(metadata)]);
  await writeAudit(req, 'questionnaire.classes_assigned', 'questionnaire', req.params.questionnaireId, { title: metadata.title, allClasses, classes: metadata.classes.map(item => item.className) });
  res.json({ questionnaire: mapQuestionnaireRecord(result.rows[0], true) });
}));
app.get('/api/questionnaires/:questionnaireId/submissions', authenticate, requireRole('school_admin','principal','teacher','staff'), asyncHandler(async(req,res) => {
  const schoolId = await getSchoolIdForRequest(req);
  const questionnaire = await pool.query('SELECT id FROM questionnaires WHERE school_id=$1 AND id=$2', [schoolId, req.params.questionnaireId]);
  if (!questionnaire.rowCount) throw fail(404, 'Questionnaire not found.');
  const result = await pool.query(
    'SELECT r.id,r.answer,r.submitted_at AS "submittedAt",COALESCE(NULLIF(p.full_name,\'\'),NULLIF(trim(concat_ws(\' \',p.first_name,p.last_name)),\'\'),s.name,\'Unknown student\') AS name,COALESCE(NULLIF(p.class_name,\'\'),s.class_name,\'\') AS "className" FROM questionnaire_responses r JOIN people p ON p.id=r.respondent_person_id AND p.school_id=r.school_id LEFT JOIN students s ON s.person_id=p.id AND s.school_id=p.school_id WHERE r.school_id=$1 AND r.questionnaire_id=$2 ORDER BY r.submitted_at DESC',
    [schoolId, req.params.questionnaireId]
  );
  res.json({ submissions: result.rows.map(row => ({
    id: row.id,
    name: row.name,
    className: row.className,
    marks: row.answer && typeof row.answer === 'object' ? (row.answer.marks ?? row.answer.score ?? null) : null,
    totalMarks: row.answer && typeof row.answer === 'object' ? (row.answer.totalMarks ?? null) : null,
    date: row.submittedAt instanceof Date ? row.submittedAt.toISOString() : row.submittedAt
  })) });
}));

app.get('/api/fees', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const code=clean(req.query.studentCode);
  const receiptNumber=clean(req.query.receiptNumber);
  if(receiptNumber && !/^\d+$/.test(receiptNumber)) throw fail(400,'Receipt number must contain digits only.');
  const result=await pool.query(`SELECT f.id,f.academic_year AS "academicYear",f.fee_name AS "feeName",f.installment_name AS "installmentName",f.amount::float8 AS amount,f.amount_paid::float8 AS "amountPaid",f.due_date AS "dueDate",f.paid_at AS "paidAt",f.status,f.reference,f.metadata,s.student_code AS "studentCode",s.name AS "studentName",s.class_name AS "className"
    FROM fee_records f JOIN students s ON s.id=f.student_id AND s.school_id=f.school_id
    WHERE f.school_id=$1 AND ($2='' OR s.student_code=$2)
      AND ($3='' OR f.metadata @> jsonb_build_object('paymentHistory',jsonb_build_array(jsonb_build_object('receiptNumber',$3))))
    ORDER BY f.due_date NULLS LAST,lower(s.name),f.fee_name`,[schoolId,code,receiptNumber]);
  res.json({fees:result.rows});
}));
app.post('/api/fees', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);const b=req.body||{};const code=clean(b.studentCode);const feeName=clean(b.feeName);const installmentName=clean(b.installmentName)||"Single Installment";const amount=Number(b.amount);const amountPaid=Number(b.amountPaid||0);
  if(!code||!feeName||!installmentName||installmentName.length>100||!Number.isFinite(amount)||amount<0||!Number.isFinite(amountPaid)||amountPaid<0||amountPaid>amount)throw fail(400,'Enter a student, fee name, installment (up to 100 characters), valid amount and amount paid not greater than the amount.');
  const student=await pool.query('SELECT id FROM students WHERE school_id=$1 AND student_code=$2',[schoolId,code]);if(!student.rowCount)throw fail(404,'Student not found in this school.');
  const dueDate=parseDbDate(b.dueDate);const status=amountPaid>=amount?'Paid':amountPaid>0?'Partial':'Pending';
  const row=await pool.query(`INSERT INTO fee_records(school_id,student_id,academic_year,fee_name,installment_name,amount,amount_paid,due_date,paid_at,status,reference,metadata)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $9='Paid' THEN now() ELSE NULL END,$9,$10,$11::jsonb)
    RETURNING id,academic_year AS "academicYear",fee_name AS "feeName",installment_name AS "installmentName",amount::float8 AS amount,amount_paid::float8 AS "amountPaid",due_date AS "dueDate",paid_at AS "paidAt",status,reference,metadata`,[schoolId,student.rows[0].id,clean(b.academicYear)||`${new Date().getFullYear()}-${new Date().getFullYear()+1}`,feeName,installmentName,amount,amountPaid,dueDate,status,clean(b.reference),JSON.stringify(b.metadata||{})]);
  await writeAudit(req,'fee.created','fee_record',row.rows[0].id,{studentCode:code,feeName,amount});res.status(201).json({fee:{...row.rows[0],studentCode:code}});
}));
app.post('/api/fees/apply-template', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const body=req.body||{};
  const replaceExistingTemplate = body.replaceExistingTemplate === true;
  const templateId=clean(body.templateId);
  const templateName=clean(body.templateName);
  const academicYear=clean(body.academicYear);
  const studentCodes=Array.from(new Set((Array.isArray(body.studentCodes)?body.studentCodes:[]).map(value=>clean(value)).filter(Boolean)));
  const feeName=clean(body.feeName);
  const installmentName=clean(body.installmentName)||'Single Installment';
  const rawItems=Array.isArray(body.feeItems)?body.feeItems:[];
  const notes=clean(body.notes);
  const lateFeeCharges=Number(body.lateFeeCharges||0);
  const dueDate=parseDbDate(body.dueDate);
  if(!templateId||!templateName||!academicYear)throw fail(400,'Fee template, name and academic year are required.');
  if(!studentCodes.length||studentCodes.length>500)throw fail(400,'Select between 1 and 500 students to apply the fee template.');
  if(!feeName||!rawItems.length)throw fail(400,'The template must include at least one fee type.');
  if(!Number.isFinite(lateFeeCharges)||lateFeeCharges!==0)throw fail(400,'Late-fee charges are managed separately in Fee Management. Apply a template with late-fee charges set to zero.');
  const feeItems=rawItems.map(item=>{
    const baseAmount=Number(item?.baseAmount??item?.amount);
    const discountType=clean(item?.discountType);
    const discountValue=Number(item?.discountValue||0);
    const taxes={cgst:Boolean(item?.taxes?.cgst),sgst:Boolean(item?.taxes?.sgst),igst:Boolean(item?.taxes?.igst)};
    if(!clean(item?.name)||!Number.isFinite(baseAmount)||baseAmount<0||!Number.isFinite(discountValue)||discountValue<0||(discountType==='Percentage'&&discountValue>100))throw fail(400,'One or more fee rows contains an invalid name, amount or discount.');
    const rawDiscountAmount=discountType==='Percentage'?Math.min(baseAmount,baseAmount*discountValue/100):discountType==='Fixed Amount'?Math.min(baseAmount,discountValue):0;
    const discountAmount=Math.round(rawDiscountAmount*100)/100;
    const taxableAmount=Math.max(0,baseAmount-discountAmount);
    const taxRate=(taxes.cgst?9:0)+(taxes.sgst?9:0)+(taxes.igst?18:0);
    const taxAmount=Math.round(taxableAmount*taxRate)/100;
    return {
      feeTypeId:clean(item?.feeTypeId),name:clean(item?.name),baseAmount,
      discountType,discountValue,discountAmount,
      taxes,taxAmount:Math.round(taxAmount*100)/100,notes:clean(item?.notes),
      originalInstallment:clean(item?.originalInstallment),
      originalDueDate:item?.originalDueDate||null,
      installmentNotes:clean(item?.installmentNotes)
    };
  });
  if(!feeItems.length)throw fail(400,'The template must include at least one valid fee row.');
  if(feeItems.length>1000)throw fail(413,'The template contains too many fee rows to apply safely at once.');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const studentResult=await client.query('SELECT id,student_code AS "studentCode" FROM students WHERE school_id=$1 AND student_code=ANY($2::text[]) FOR UPDATE',[schoolId,studentCodes]);
    const found=new Set(studentResult.rows.map(row=>String(row.studentCode)));
    const missing=studentCodes.filter(code=>!found.has(String(code)));
    if(missing.length)throw fail(404,'Student(s) not found in this school: '+missing.join(', ')+'.');
    const studentIds=studentResult.rows.map(row=>row.id);
    const existing=await client.query("SELECT s.student_code AS \"studentCode\",f.student_id AS \"studentId\",f.id AS \"feeId\",f.metadata->>'feeTemplateId' AS \"templateId\",f.metadata->>'feeTemplateName' AS \"feeTemplateName\",f.amount_paid::float8 AS \"amountPaid\" FROM fee_records f JOIN students s ON s.id=f.student_id AND s.school_id=f.school_id WHERE f.school_id=$1 AND f.student_id=ANY($2::uuid[]) AND NULLIF(f.metadata->>'feeTemplateId','') IS NOT NULL FOR UPDATE OF f",[schoolId,studentIds]);
    if(existing.rowCount){
      const assigned=[...new Set(existing.rows.map(row=>String(row.studentCode)))];
      if(!replaceExistingTemplate) {
        throw fail(409,'A fee template is already assigned to these student(s): '+assigned.join(', ')+'. Reverse linked payments and remove the previous assignment before applying another template.');
      }
      if(existing.rows.some(row=>Number(row.amountPaid||0)>0)) {
        throw fail(409,'The existing fee template has recorded payments. Reverse all linked payments before replacing it.');
      }
      const assignments = new Map();
      existing.rows.forEach(row => assignments.set(String(row.studentId)+'|'+String(row.templateId),row));
      for(const assignment of assignments.values()) {
        const removed = await client.query("DELETE FROM fee_records WHERE school_id=$1 AND student_id=$2 AND metadata->>'feeTemplateId'=$3 AND amount_paid=0 RETURNING id",[schoolId,assignment.studentId,assignment.templateId]);
        await client.query("INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,'fee.template.removed','fee_template',$3,$4::jsonb)",
          [schoolId,req.user.id,assignment.templateId,JSON.stringify({studentCode:assignment.studentCode,templateName:assignment.feeTemplateName||'',recordsRemoved:removed.rowCount,replacedByTemplateId:templateId})]);
      }
    }
    const totalRecords = studentResult.rows.length * feeItems.length;
    if(totalRecords>5000)throw fail(413,'This application would create too many fee rows. Apply to fewer students at a time.');
    const allFeeAmount = Math.round(feeItems.reduce((sum,item)=>sum+Math.max(0,item.baseAmount-item.discountAmount+item.taxAmount),0)*100)/100;
    if(!Number.isFinite(allFeeAmount)||allFeeAmount<=0)throw fail(400,'The template must create a total fee amount greater than zero.');
    let createdRecords=0;
    const installmentNames=[...new Set(feeItems.map(item=>item.originalInstallment).filter(Boolean))];
    for(const student of studentResult.rows){
      for(const item of feeItems){
        const lineAmount=Math.round((item.baseAmount-item.discountAmount+item.taxAmount)*100)/100;
        const lineName=(item.name+(item.originalInstallment?' - '+item.originalInstallment:'')).slice(0,240);
        const lineInstallment=item.originalInstallment||installmentName||'Single Installment';
        const lineDueDate=parseDbDate(item.originalDueDate||body.dueDate);
        const lineNotes=[item.installmentNotes,item.notes].filter(Boolean).join(' | ').slice(0,500);
        const lineMetadata={
          feeTemplateId:templateId,
          feeTemplateName:templateName,
          installmentName:lineInstallment,
          subAmount:item.baseAmount,
          discount:item.discountAmount,
          appliedTaxes:item.taxAmount,
          lateFeeCharges:0,
          totalAmount:lineAmount,
          notes:lineNotes,
          templateFeeItems:[{...item,totalAmount:lineAmount,notes:lineNotes}]
        };
        const reference=('Template: '+templateName+' | '+lineInstallment).slice(0,180);
        await client.query("INSERT INTO fee_records(school_id,student_id,academic_year,fee_name,installment_name,amount,amount_paid,due_date,paid_at,status,reference,metadata) VALUES($1,$2,$3,$4,$5,$6,0,$7,NULL,'Pending',$8,$9::jsonb)",
          [schoolId,student.id,academicYear,lineName,lineInstallment,lineAmount,lineDueDate,reference,JSON.stringify(lineMetadata)]);
        createdRecords++;
      }
    }
    await client.query("INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,'fee.template.applied','fee_template',$3,$4::jsonb)",
      [schoolId,req.user.id,templateId,JSON.stringify({templateName,academicYear,installmentNames,studentsApplied:studentResult.rows.length,feeRowsPerStudent:feeItems.length,feeRecordsCreated:createdRecords,totalFeeAmountForAllStudents:Math.round(allFeeAmount*studentResult.rows.length*100)/100})]);
    await client.query('COMMIT');
    res.status(201).json({ok:true,templateId,templateName,studentsApplied:studentResult.rows.length,feeRowsPerStudent:feeItems.length,feeRecordsCreated:createdRecords,installmentNames,totalFeeAmountPerStudent:allFeeAmount});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}));
/* Transactional installment-level edits, payment receipts, and deletion for the student Fees tab. */
function feeInstallmentGroupIdentity(row) {
  const metadata = row.metadata || {};
  const templateId = clean(metadata.feeTemplateId);
  const installment = clean(metadata.installmentName || (Array.isArray(metadata.templateFeeItems) ? metadata.templateFeeItems[0]?.originalInstallment : ''));
  const dueDate = row.due_date ? (row.due_date instanceof Date ? row.due_date.toISOString().slice(0,10) : String(row.due_date).slice(0,10)) : '';
  return [String(row.student_id), String(row.academic_year || ''), templateId, installment, dueDate].join('|');
}
function feeMoney(value) { return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100; }
function feeDateText(value) {
  if (!value) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0,10);
  return String(value).slice(0,10);
}
function schoolReceiptLogo(configValue) {
  const config = configValue && typeof configValue === 'object' ? configValue : {};
  const sources = [config, config.branding, config.schoolProfile, config.receipt, config.profile, config.school, config.settings].filter(value => value && typeof value === 'object');
  for (const source of sources) {
    for (const key of ['logoDataUrl','logoDataURL','schoolLogoDataUrl','schoolLogoURL','logoUrl','logo_url','logo','schoolLogo','logoPath','logoSrc']) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (value && typeof value === 'object') {
        for (const nestedKey of ['dataUrl','dataURL','url','src','path']) {
          if (typeof value[nestedKey] === 'string' && value[nestedKey].trim()) return value[nestedKey].trim();
        }
      }
    }
  }
  return '';
}
app.get('/api/fees/:feeId/receipt-data', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId = await getSchoolIdForRequest(req);
  const selected = await pool.query(
    'SELECT f.*, s.student_code AS student_code, s.name AS student_name, s.class_name AS student_class, ' +
    's.section AS student_section, s.academic_year AS student_academic_year, s.mother_name, s.father_name, ' +
    's.parent_name, s.primary_parent_name, s.phone AS student_phone, s.email AS student_email, ' +
    's.address AS student_address, s.city AS student_city, s.state AS student_state, s.metadata AS student_metadata, ' +
    'd.details AS student_details, sc.id AS school_id, sc.name AS school_name, sc.code AS school_code, ' +
    'sc.phone AS school_phone, sc.email AS school_email, sc.address AS school_address, ' +
    'sc.timezone AS school_timezone, sc.config AS school_config ' +
    'FROM fee_records f JOIN students s ON s.id=f.student_id AND s.school_id=f.school_id ' +
    'JOIN schools sc ON sc.id=f.school_id ' +
    'LEFT JOIN student_details d ON d.student_id=s.id AND d.school_id=s.school_id ' +
    'WHERE f.school_id=$1 AND f.id=$2',
    [schoolId, req.params.feeId]
  );
  if (!selected.rowCount) throw fail(404, 'Fee record not found.');
  const first = selected.rows[0];
  const metadata = first.metadata && typeof first.metadata === 'object' ? first.metadata : {};
  const templateId = clean(metadata.feeTemplateId);
  let feeRows = [first];
  if (templateId) {
    const siblings = await pool.query(
      "SELECT * FROM fee_records WHERE school_id=$1 AND student_id=$2 AND academic_year=$3 AND metadata->>'feeTemplateId'=$4 ORDER BY due_date NULLS LAST, created_at, id",
      [schoolId, first.student_id, first.academic_year, templateId]
    );
    feeRows = siblings.rows.filter(row => feeInstallmentGroupIdentity(row) === feeInstallmentGroupIdentity(first));
    if (!feeRows.length) feeRows = [first];
  }

  const allHistory = feeRows.flatMap(row => {
    const history = Array.isArray(row.metadata?.paymentHistory) ? row.metadata.paymentHistory : [];
    return history.map((entry,index) => ({...entry, feeId:String(row.id), feeName:clean(row.metadata?.templateFeeItems?.[0]?.name || row.fee_name), amount:Number(entry.amountPaid || 0), _index:index, _recordedAt:String(entry.recordedAt || entry.paymentDate || '')}));
  }).filter(entry => entry.amount > 0).sort((a,b) => b._recordedAt.localeCompare(a._recordedAt));
  const requestedReceipt = clean(req.query.receiptNumber).slice(0,120);
  const latestReceipt = allHistory.find(entry => entry.receiptNumber)?.receiptNumber || '';
  const receiptNumber = requestedReceipt || latestReceipt || ('LEGACY-' + String(first.id).replace(/-/g,'').slice(-10).toUpperCase());
  const selectedHistory = allHistory.filter(entry => entry.receiptNumber && entry.receiptNumber === receiptNumber);
  let selectedPayments = [];
  if (selectedHistory.length) {
    selectedPayments = selectedHistory;
  } else {
    selectedPayments = feeRows.map(row => {
      const history = Array.isArray(row.metadata?.paymentHistory) ? row.metadata.paymentHistory.filter(entry => Number(entry.amountPaid || 0) > 0) : [];
      const latest = history.sort((a,b)=>String(b.recordedAt || b.paymentDate || '').localeCompare(String(a.recordedAt || a.paymentDate || '')))[0] || null;
      return {
        feeId:String(row.id),
        feeName:clean(row.metadata?.templateFeeItems?.[0]?.name || row.fee_name),
        amount:Number(latest?.amountPaid ?? row.amount_paid ?? 0),
        paymentDate:latest?.paymentDate || (row.paid_at ? String(row.paid_at).slice(0,10) : ''),
        paymentMethod:latest?.paymentMethod || '',
        cashDepositNumber:latest?.cashDepositNumber || '',
        notes:latest?.notes || row.metadata?.notes || '',
        lateFeeCharges:Number(latest?.lateFeeCharges ?? row.metadata?.lateFeeCharges ?? 0),
        receiptNumber:latest?.receiptNumber || receiptNumber,
        recordedAt:latest?.recordedAt || ''
      };
    }).filter(entry => entry.amount > 0);
  }
  if (!selectedPayments.length && Number(first.amount_paid || 0) > 0) {
    selectedPayments = [{
      feeId:String(first.id), feeName:clean(first.metadata?.templateFeeItems?.[0]?.name || first.fee_name),
      amount:Number(first.amount_paid), paymentDate:first.paid_at ? String(first.paid_at).slice(0,10) : '',
      paymentMethod:'', cashDepositNumber:'', notes:first.metadata?.notes || '',
      lateFeeCharges:Number(first.metadata?.lateFeeCharges || 0), receiptNumber, recordedAt:''
    }];
  }
  if (!selectedPayments.length) throw fail(409, 'No recorded payment was found for this fee installment.');

  const byFeeId = new Map(feeRows.map(row => [String(row.id),row]));
  const selectedFeeRecords = selectedPayments.map(payment => {
    const row = byFeeId.get(String(payment.feeId)) || first;
    const rowMetadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const templateItem = Array.isArray(rowMetadata.templateFeeItems) ? rowMetadata.templateFeeItems[0] : null;
    return {
      id:String(row.id), feeName:clean(templateItem?.name || row.fee_name),
      installment:clean(rowMetadata.installmentName || templateItem?.originalInstallment || 'Single Installment'),
      academicYear:String(row.academic_year || ''), amount:Number(row.amount || 0), amountPaid:Number(row.amount_paid || 0),
      amountPaidThisReceipt:Number(payment.amount || 0), dueDate:feeDateText(row.due_date),
      paidAt:payment.paymentDate || feeDateText(row.paid_at),
      paymentMethod:clean(payment.paymentMethod), reference:clean(payment.cashDepositNumber),
      notes:clean(payment.notes || rowMetadata.notes),
      feeNotes:clean(templateItem?.notes || templateItem?.note || templateItem?.description || rowMetadata.installmentNotes || rowMetadata.feeNotes),
      lateFeeCharges:Number(payment.lateFeeCharges || 0),
      paymentHistory:Array.isArray(rowMetadata.paymentHistory) ? rowMetadata.paymentHistory : []
    };
  });
  const studentDetails = first.student_details && typeof first.student_details === 'object' ? first.student_details : {};
  const studentMetadata = first.student_metadata && typeof first.student_metadata === 'object' ? first.student_metadata : {};
  const schoolConfig = first.school_config && typeof first.school_config === 'object' ? first.school_config : {};
  const student = {
    id:String(first.student_code), name:clean(first.student_name), className:clean(first.student_class),
    section:clean(first.student_section), academicYear:String(first.academic_year || first.student_academic_year || ''),
    motherName:clean(first.mother_name || studentDetails.motherName || studentDetails.mother?.name || studentMetadata.motherName),
    fatherName:clean(first.father_name || studentDetails.fatherName || studentDetails.father?.name || studentMetadata.fatherName),
    parentName:clean(first.primary_parent_name || first.parent_name || studentDetails.parentName || studentDetails.guardianName),
    phone:clean(first.student_phone), email:clean(first.student_email),
    address:[first.student_address,first.student_city,first.student_state].map(clean).filter(Boolean).join(', ')
  };
  const school = {
    name:clean(first.school_name), code:clean(first.school_code),
    address:clean(first.school_address || schoolConfig.address || schoolConfig.schoolAddress),
    phone:clean(first.school_phone || schoolConfig.phone || schoolConfig.schoolPhone),
    email:clean(first.school_email || schoolConfig.email || schoolConfig.schoolEmail),
    timezone:clean(first.school_timezone || 'Asia/Kolkata'), logo:schoolReceiptLogo(schoolConfig)
  };
  const dates = selectedPayments.map(item=>clean(item.paymentDate)).filter(Boolean).sort();
  const methods = [...new Set(selectedPayments.map(item=>clean(item.paymentMethod)).filter(Boolean))];
  const references = [...new Set(selectedPayments.map(item=>clean(item.cashDepositNumber)).filter(Boolean))];
  const notes = [...new Set(selectedPayments.map(item=>clean(item.notes)).filter(Boolean))];
  const assignedTemplates = await loadAdminAssignedTemplates(req.user,schoolId);
  res.json({
    ok:true, receiptNumber,
    feeReceiptTemplate: assignedTemplates.feeReceipt,
    receiptDate:dates[dates.length-1] || feeDateText(first.paid_at) || new Date().toISOString().slice(0,10),
    paymentDate:dates[dates.length-1] || '', paymentMethod:methods.join(', '), reference:references.join(', '), notes:notes.join(' | '),
    totalPaid:selectedFeeRecords.reduce((sum,item)=>sum+Number(item.amountPaidThisReceipt||0),0),
    school, student, records:selectedFeeRecords, logoSource:'database'
  });
}));

app.post('/api/fees/pay-installment', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId = await getSchoolIdForRequest(req);
  const body = req.body || {};
  const records = Array.isArray(body.records) ? body.records : [];
  const paymentMethod = clean(body.paymentMethod);
  const paymentDate = parseDbDate(body.paymentDate);
  const cashDepositNumber = clean(body.cashDepositNumber).slice(0,120);
  const notes = clean(body.notes).slice(0,1000);
  if (!records.length || records.length > 100) throw fail(400, 'Select a valid fee installment to pay.');
  if (!paymentMethod) throw fail(400, 'Choose a payment method.');
  if (!paymentDate) throw fail(400, 'Choose a payment date.');
  const ids = records.map(record => clean(record.feeId));
  if (ids.some(id=>!id) || new Set(ids).size !== ids.length) throw fail(400, 'The fee rows are invalid or duplicated.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockedRows = [];
    for (const id of ids) {
      const result = await client.query('SELECT * FROM fee_records WHERE school_id=$1 AND id=$2 FOR UPDATE',[schoolId,id]);
      if (!result.rowCount) throw fail(404, 'One of the selected fee records was not found in this school.');
      lockedRows.push(result.rows[0]);
    }
    const identity = feeInstallmentGroupIdentity(lockedRows[0]);
    if (lockedRows.some(row=>feeInstallmentGroupIdentity(row)!==identity)) throw fail(400, 'All fee rows must belong to the same student installment.');
    if (lockedRows.length > 1 && !clean(lockedRows[0].metadata?.feeTemplateId)) throw fail(400, 'Multiple fee rows can only be paid together when they belong to one template installment.');
    const inputById = new Map(records.map(record=>[clean(record.feeId),record]));
    const updates = [];
    const receiptNumberResult = await client.query("SELECT nextval('fee_receipt_number_seq')::text AS \"receiptNumber\"");
    const receiptNumber = receiptNumberResult.rows[0].receiptNumber;
    let totalPaidThisTransaction = 0;
    let totalLateFeeAdded = 0;
    for (const row of lockedRows) {
      const input = inputById.get(String(row.id));
      const metadata = row.metadata && typeof row.metadata === 'object' ? {...row.metadata} : {};
      const amountPaidThisTransaction = feeMoney(input.amountToPay);
      const lateFeeCharges = feeMoney(input.lateFeeCharges);
      if (!Number.isFinite(amountPaidThisTransaction) || amountPaidThisTransaction < 0) throw fail(400, 'Each amount to pay must be zero or positive.');
      if (!Number.isFinite(lateFeeCharges) || lateFeeCharges < 0) throw fail(400, 'Late-fee charges must be zero or positive.');
      const oldAmount = Number(row.amount || 0);
      const oldPaid = Number(row.amount_paid || 0);
      const oldLateFee = Number(metadata.lateFeeCharges || 0);
      if (oldPaid >= oldAmount - 0.001) {
        if (amountPaidThisTransaction > 0 || feeMoney(lateFeeCharges) !== feeMoney(oldLateFee)) {
          throw fail(409, 'This fee is already fully paid and cannot be modified.');
        }
        continue;
      }
      let newAmount;
      if (metadata.subAmount !== undefined) {
        newAmount = feeMoney(Number(metadata.subAmount || 0) - Number(metadata.discount || 0) + Number(metadata.appliedTaxes || 0) + lateFeeCharges);
      } else {
        newAmount = feeMoney(oldAmount - oldLateFee + lateFeeCharges);
      }
      const newPaid = feeMoney(oldPaid + amountPaidThisTransaction);
      if (newAmount < oldPaid) throw fail(409, 'The updated fee total cannot be lower than the amount already paid.');
      if (newPaid > newAmount) throw fail(400, 'The amount to pay exceeds the outstanding balance for ' + clean(row.fee_name) + '.');
      if (amountPaidThisTransaction > 0) totalPaidThisTransaction += amountPaidThisTransaction;
      if (lateFeeCharges > oldLateFee) totalLateFeeAdded += lateFeeCharges - oldLateFee;
      metadata.lateFeeCharges = lateFeeCharges;
      const history = Array.isArray(metadata.paymentHistory) ? metadata.paymentHistory : [];
      if (amountPaidThisTransaction > 0) {
        history.push({
          receiptNumber,
          paymentMethod,
          paymentDate,
          cashDepositNumber,
          notes,
          amountPaid: amountPaidThisTransaction,
          lateFeeCharges,
          recordedAt: new Date().toISOString(),
          recordedBy: String(req.user.id)
        });
        metadata.paymentHistory = history.slice(-100);
      }
      const status = newPaid >= newAmount ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';
      const reference = cashDepositNumber || clean(row.reference) || '';
      const updated = await client.query(
        'UPDATE fee_records SET amount=$3,amount_paid=$4,status=$5,paid_at=CASE WHEN $6::date IS NOT NULL AND $7>0 THEN $6::date ELSE paid_at END,reference=$8,metadata=$9::jsonb WHERE school_id=$1 AND id=$2 RETURNING id,student_id AS "studentId",academic_year AS "academicYear",fee_name AS "feeName",amount::float8 AS amount,amount_paid::float8 AS "amountPaid",due_date AS "dueDate",paid_at AS "paidAt",status,reference,metadata',
        [schoolId,row.id,newAmount,newPaid,status,paymentDate,amountPaidThisTransaction,reference,JSON.stringify(metadata)]
      );
      updates.push(updated.rows[0]);
      await client.query('INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)',
        [schoolId,req.user.id,'fee.payment.recorded','fee_record',String(row.id),JSON.stringify({receiptNumber,paymentMethod,paymentDate,amountPaidThisTransaction,lateFeeCharges,cashDepositNumber,notes,newAmount,newPaid,status})]);
    }
    if (totalPaidThisTransaction <= 0) throw fail(400, 'Enter an amount greater than zero to record a payment.');
    await client.query('COMMIT');
    res.status(201).json({ok:true,fees:updates,receiptNumber,totalPaidThisTransaction:feeMoney(totalPaidThisTransaction),totalLateFeeAdded:feeMoney(totalLateFeeAdded),paymentMethod,paymentDate,cashDepositNumber,notes});
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { client.release(); }
}));
app.patch('/api/fees/update-installment', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId = await getSchoolIdForRequest(req);
  const records = Array.isArray(req.body?.records) ? req.body.records : [];
  if (!records.length || records.length > 100) throw fail(400, 'Select a valid fee installment to edit.');
  const ids = records.map(record=>clean(record.feeId));
  if (ids.some(id=>!id) || new Set(ids).size !== ids.length) throw fail(400, 'The fee rows are invalid or duplicated.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockedRows=[];
    for (const id of ids) {
      const result=await client.query('SELECT * FROM fee_records WHERE school_id=$1 AND id=$2 FOR UPDATE',[schoolId,id]);
      if (!result.rowCount) throw fail(404, 'One of the selected fee records was not found in this school.');
      lockedRows.push(result.rows[0]);
    }
    const identity=feeInstallmentGroupIdentity(lockedRows[0]);
    if (lockedRows.some(row=>feeInstallmentGroupIdentity(row)!==identity)) throw fail(400, 'All fee rows must belong to the same student installment.');
    if (lockedRows.length>1 && !clean(lockedRows[0].metadata?.feeTemplateId)) throw fail(400, 'Multiple fee rows can only be edited together when they belong to one template installment.');
    const inputs=new Map(records.map(record=>[clean(record.feeId),record]));
    const updates=[];
    for (const row of lockedRows) {
      const input=inputs.get(String(row.id));
      const metadata=row.metadata && typeof row.metadata==='object'?{...row.metadata}:{};
      const amount=feeMoney(input.amount);
      const paid=Number(row.amount_paid||0);
      const dueDate=parseDbDate(input.dueDate);
      const reference=clean(input.reference).slice(0,500);
      const currentAmount=Number(row.amount||0);
      const currentDueDate=row.due_date ? String(row.due_date instanceof Date ? row.due_date.toISOString().slice(0,10) : row.due_date).slice(0,10) : '';
      const requestedDueDate=dueDate ? String(dueDate instanceof Date ? dueDate.toISOString().slice(0,10) : dueDate).slice(0,10) : '';
      if (paid >= currentAmount - 0.001) {
        if (feeMoney(amount)!==feeMoney(currentAmount) || requestedDueDate!==currentDueDate || reference!==clean(row.reference)) {
          throw fail(409, 'This fee is already fully paid and cannot be modified.');
        }
        continue;
      }
      if (!Number.isFinite(amount)||amount<0||amount<paid) throw fail(400, 'Fee total cannot be less than the amount already paid.');
      if (metadata.subAmount !== undefined) {
        metadata.subAmount=feeMoney(amount + Number(metadata.discount||0) - Number(metadata.appliedTaxes||0) - Number(metadata.lateFeeCharges||0));
      }
      const status=paid>=amount?'Paid':paid>0?'Partial':'Pending';
      const updated=await client.query(
        'UPDATE fee_records SET amount=$3,due_date=$4,status=$5,reference=$6,metadata=$7::jsonb WHERE school_id=$1 AND id=$2 RETURNING id,student_id AS "studentId",academic_year AS "academicYear",fee_name AS "feeName",amount::float8 AS amount,amount_paid::float8 AS "amountPaid",due_date AS "dueDate",paid_at AS "paidAt",status,reference,metadata',
        [schoolId,row.id,amount,dueDate,status,reference,JSON.stringify(metadata)]
      );
      updates.push(updated.rows[0]);
      await client.query('INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)',
        [schoolId,req.user.id,'fee.installment.updated','fee_record',String(row.id),JSON.stringify({amount,dueDate,reference})]);
    }
    if (!updates.length) throw fail(409, 'These fee installments are already fully paid and cannot be modified.');
    await client.query('COMMIT');
    res.json({ok:true,fees:updates});
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { client.release(); }
}));
app.delete('/api/fees/:feeId/installment', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const current=await client.query('SELECT id,student_id,academic_year,due_date,metadata FROM fee_records WHERE school_id=$1 AND id=$2 FOR UPDATE',[schoolId,req.params.feeId]);
    if(!current.rowCount)throw fail(404,'Fee record not found.');
    const record=current.rows[0];
    const metadata=record.metadata||{};
    const templateId=clean(metadata.feeTemplateId);
    const installment=clean(metadata.installmentName||(Array.isArray(metadata.templateFeeItems)?metadata.templateFeeItems[0]?.originalInstallment:''));
    if(!templateId)throw fail(409,'This record is not a template-backed installment. Delete an individual unpaid fee instead.');
    const linked=await client.query(`SELECT id,amount_paid,due_date,metadata FROM fee_records WHERE school_id=$1 AND student_id=$2 AND academic_year=$3 AND metadata->>'feeTemplateId'=$4 FOR UPDATE`,
      [schoolId,record.student_id,record.academic_year,templateId]);
    const dueKey=record.due_date?String(record.due_date).slice(0,10):'';
    const matching=linked.rows.filter(item=>{
      const itemMetadata=item.metadata||{};
      const itemInstallment=clean(itemMetadata.installmentName||(Array.isArray(itemMetadata.templateFeeItems)?itemMetadata.templateFeeItems[0]?.originalInstallment:''));
      const itemDueDate=item.due_date?(item.due_date instanceof Date?item.due_date.toISOString().slice(0,10):String(item.due_date).slice(0,10)):'';
      return itemInstallment===installment && itemDueDate===dueKey;
    });
    if(!matching.length)throw fail(404,'No fee records were found for this installment.');
    if(matching.some(item=>Number(item.amount_paid||0)>0))throw fail(409,'Reverse the payments for this installment before deleting it.');
    for(const item of matching) await client.query('DELETE FROM fee_records WHERE school_id=$1 AND id=$2',[schoolId,item.id]);
    await client.query('INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)',
      [schoolId,req.user.id,'fee.installment.deleted','fee_installment',String(record.id),JSON.stringify({templateId,installment,dueDate:dueKey,recordsRemoved:matching.length})]);
    await client.query('COMMIT');
    res.json({ok:true,recordsRemoved:matching.length,templateId,installment});
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { client.release(); }
}));
app.patch('/api/fees/:feeId', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);const current=await pool.query('SELECT * FROM fee_records WHERE school_id=$1 AND id=$2',[schoolId,req.params.feeId]);if(!current.rowCount)throw fail(404,'Fee record not found.');
  const f=current.rows[0],b=req.body||{};if(Number(f.amount_paid||0)>=Number(f.amount||0)-0.001)throw fail(409,'This fee is already fully paid and cannot be modified.');const amount=b.amount===undefined?Number(f.amount):Number(b.amount);const amountPaid=b.amountPaid===undefined?Number(f.amount_paid):Number(b.amountPaid);
  if(!Number.isFinite(amount)||amount<0||!Number.isFinite(amountPaid)||amountPaid<0||amountPaid>amount)throw fail(400,'Amount paid must be between zero and the fee amount.');if(amountPaid<Number(f.amount_paid||0))throw fail(409,'Recorded payments cannot be reduced directly. Use Reverse Payment so the reversal is audited.');
  const status=amountPaid>=amount?'Paid':amountPaid>0?'Partial':'Pending';const row=await pool.query(`UPDATE fee_records SET amount=$3,amount_paid=$4,status=$5,paid_at=CASE WHEN $5='Paid' THEN COALESCE(paid_at,now()) ELSE NULL END,reference=COALESCE($6,reference),due_date=COALESCE($7,due_date) WHERE school_id=$1 AND id=$2 RETURNING id,academic_year AS "academicYear",fee_name AS "feeName",amount::float8 AS amount,amount_paid::float8 AS "amountPaid",due_date AS "dueDate",paid_at AS "paidAt",status,reference,metadata`,[schoolId,req.params.feeId,amount,amountPaid,status,b.reference===undefined?null:clean(b.reference),b.dueDate===undefined?null:parseDbDate(b.dueDate)]);
  await writeAudit(req,'fee.updated','fee_record',req.params.feeId,{amount,amountPaid,status});res.json({fee:row.rows[0]});
}));
app.delete('/api/fees/:feeId', authenticate, requireRole('school_admin','principal'), asyncHandler(async(req,res)=>{const schoolId=await getSchoolIdForRequest(req);const current=await pool.query('SELECT metadata,amount_paid FROM fee_records WHERE school_id=$1 AND id=$2',[schoolId,req.params.feeId]);if(!current.rowCount)throw fail(404,'Fee record not found.');if(clean(current.rows[0].metadata?.feeTemplateId))throw fail(409,'This is a template-backed fee. Reverse any payment and use Remove Template to remove the full assignment safely.');if(Number(current.rows[0].amount_paid||0)>0)throw fail(409,'Paid fee records cannot be deleted until their payment is reversed and audited.');const row=await pool.query('DELETE FROM fee_records WHERE school_id=$1 AND id=$2 RETURNING id',[schoolId,req.params.feeId]);await writeAudit(req,'fee.deleted','fee_record',req.params.feeId,{});res.json({ok:true});}));
app.post('/api/fees/:feeId/reverse-payment', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const current=await client.query('SELECT * FROM fee_records WHERE school_id=$1 AND id=$2 FOR UPDATE',[schoolId,req.params.feeId]);
    if(!current.rowCount)throw fail(404,'Fee record not found.');
    const fee=current.rows[0];const amountPaid=Number(fee.amount_paid||0);const reason=clean(req.body?.reason);
    if(amountPaid<=0)throw fail(409,'There is no recorded payment to reverse.');
    if(!reason)throw fail(400,'Enter a reason for reversing this payment.');
    if(reason.length>500)throw fail(400,'The reversal reason must be 500 characters or fewer.');
    const updated=await client.query("UPDATE fee_records SET amount_paid=0,status='Pending',paid_at=NULL WHERE school_id=$1 AND id=$2 RETURNING id,academic_year AS \"academicYear\",fee_name AS \"feeName\",amount::float8 AS amount,amount_paid::float8 AS \"amountPaid\",due_date AS \"dueDate\",paid_at AS \"paidAt\",status,reference,metadata",[schoolId,req.params.feeId]);
    await client.query("INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,'fee.payment.reversed','fee_record',$3,$4::jsonb)",
      [schoolId,req.user.id,req.params.feeId,JSON.stringify({reversedAmount:amountPaid,feeTemplateId:fee.metadata?.feeTemplateId||null,reference:fee.reference,reason})]);
    await client.query('COMMIT');
    res.json({ok:true,fee:updated.rows[0],reversedAmount:amountPaid});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}));
app.delete('/api/fees/:feeId/template-assignment', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const current=await client.query('SELECT id,student_id,metadata FROM fee_records WHERE school_id=$1 AND id=$2 FOR UPDATE',[schoolId,req.params.feeId]);
    if(!current.rowCount)throw fail(404,'Fee record not found.');
    const record=current.rows[0];const templateId=clean(record.metadata?.feeTemplateId);
    if(!templateId)throw fail(409,'This fee record is not linked to a fee template.');
    const linked=await client.query("SELECT id,amount_paid FROM fee_records WHERE school_id=$1 AND student_id=$2 AND metadata->>'feeTemplateId'=$3 FOR UPDATE",[schoolId,record.student_id,templateId]);
    if(!linked.rowCount)throw fail(404,'No linked fee-template assignment was found.');
    if(linked.rows.some(row=>Number(row.amount_paid||0)>0))throw fail(409,'This fee template cannot be removed while any linked payment remains. Reverse all linked payments first.');
    const removed=await client.query("DELETE FROM fee_records WHERE school_id=$1 AND student_id=$2 AND metadata->>'feeTemplateId'=$3 RETURNING id",[schoolId,record.student_id,templateId]);
    await client.query("INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,'fee.template.removed','fee_template',$3,$4::jsonb)",
      [schoolId,req.user.id,templateId,JSON.stringify({studentId:record.student_id,recordsRemoved:removed.rowCount})]);
    await client.query('COMMIT');
    res.json({ok:true,templateId,recordsRemoved:removed.rowCount});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}));

/* Direct fee reminders are delivered only to active parent accounts linked to the selected student. */
app.post('/api/students/:studentCode/fee-reminder', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId = await getSchoolIdForRequest(req);
  const studentCode = clean(req.params.studentCode);
  const academicYear = clean(req.body?.academicYear);
  if (!studentCode || !academicYear) throw fail(400, 'Student ID and academic year are required.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const studentResult = await client.query(
      'SELECT id,student_code,name,class_name FROM students WHERE school_id=$1 AND student_code=$2 FOR SHARE',
      [schoolId, studentCode]
    );
    if (!studentResult.rowCount) throw fail(404, 'Student not found in this school.');
    const student = studentResult.rows[0];

    const feeResult = await client.query(
      `SELECT COALESCE(SUM(GREATEST(amount-amount_paid,0)),0)::float8 AS "outstandingBalance",
              COUNT(*) FILTER (WHERE amount>amount_paid)::int AS "unpaidCount"
       FROM fee_records
       WHERE school_id=$1 AND student_id=$2 AND academic_year=$3`,
      [schoolId, student.id, academicYear]
    );
    const outstandingBalance = Number(feeResult.rows[0]?.outstandingBalance || 0);
    const unpaidCount = Number(feeResult.rows[0]?.unpaidCount || 0);
    if (unpaidCount < 1 || outstandingBalance <= 0) {
      throw fail(409, `No outstanding fees found for Student ID ${studentCode} in academic year ${academicYear}. No reminder was sent.`);
    }

    const recipients = await client.query(
      `SELECT DISTINCT u.id
       FROM student_parents sp
       JOIN people p ON p.id=sp.parent_person_id AND p.school_id=sp.school_id
       JOIN user_accounts u ON u.person_id=p.id AND u.school_id=p.school_id
       WHERE sp.school_id=$1 AND sp.student_id=$2
         AND u.role='parent' AND u.is_active=true
         AND p.status NOT IN ('Inactive','Deactivated')`,
      [schoolId, student.id]
    );
    if (!recipients.rowCount) {
      throw fail(409, `No active parent login is linked to Student ID ${studentCode}. Link the child's parent profile and login before sending a reminder.`);
    }

    const amountText = outstandingBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const subject = `Fee Reminder — ${student.name} (${studentCode})`;
    const body = `Dear Parent/Guardian,

This is a fee reminder for ${student.name} (Student ID: ${studentCode}, Class: ${student.class_name || '—'}) for academic year ${academicYear}. The current outstanding balance is ₹${amountText}, across ${unpaidCount} unpaid fee record(s).

Please contact the school office if you have already paid or need a fee statement.

This reminder applies only to ${student.name} (Student ID: ${studentCode}).`;

    for (const recipient of recipients.rows) {
      await client.query(
        'INSERT INTO messages(school_id,sender_id,recipient_id,subject,body) VALUES($1,$2,$3,$4,$5)',
        [schoolId, req.user.id, recipient.id, subject, body]
      );
    }
    await client.query(
      'INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details,ip_address) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)',
      [schoolId, req.user.id, 'fee.reminder.sent', 'student', studentCode,
        JSON.stringify({ academicYear, recipientCount: recipients.rowCount, unpaidCount, outstandingBalance }), req.ip || null]
    );
    await client.query('COMMIT');
    res.status(201).json({
      ok: true,
      studentId: studentCode,
      academicYear,
      recipientCount: recipients.rowCount,
      unpaidCount,
      outstandingBalance,
      message: `Fee reminder sent to ${recipients.rowCount} linked parent account(s) for ${student.name} (Student ID: ${studentCode}).`
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}));


/* Messages: direct delivery, broadcast lists, attachments, inbox/sent folders, and scheduling. */
const MESSAGE_BROADCAST_ROLES = {
  all_parents: ['parent'],
  all_students: ['student'],
  all_teachers: ['teacher'],
  all_staff: ['staff','transport_admin'],
  all_recipients: ['parent','student','teacher','staff','transport_admin']
};

app.get('/api/messages/recipients', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId = await getSchoolIdForRequest(req);
  const [peopleResult, rolesResult, classesResult] = await Promise.all([
    pool.query(`SELECT p.id AS "personId",p.person_type AS "personType",p.full_name AS "fullName",
        p.contact_number AS "contactNumber",p.email,p.class_name AS "className",p.section,
        string_agg(DISTINCT u.role, ', ') AS "accountRoles",
        COALESCE(child.child_names,'') AS "childNames",
        COALESCE(child.child_classes,'') AS "childClasses"
      FROM people p
      JOIN user_accounts u ON u.person_id=p.id AND u.school_id=p.school_id AND u.is_active=true
        AND u.role IN ('parent','student','teacher','staff')
      LEFT JOIN LATERAL (
        SELECT string_agg(DISTINCT s.name, ', ') AS child_names,
               string_agg(DISTINCT concat_ws(' ',s.class_name,NULLIF(s.section,'')), ', ') AS child_classes
        FROM students s
        LEFT JOIN student_parents sp ON sp.school_id=s.school_id AND sp.student_id=s.id
        WHERE s.school_id=p.school_id AND (s.person_id=p.id OR sp.parent_person_id=p.id)
      ) child ON true
      WHERE p.school_id=$1 AND p.status NOT IN ('Inactive','Deactivated')
      GROUP BY p.id,child.child_names,child.child_classes
      ORDER BY lower(p.full_name)`, [schoolId]),
    pool.query(`SELECT u.role,COUNT(DISTINCT u.id)::int AS count
      FROM user_accounts u JOIN people p ON p.id=u.person_id AND p.school_id=u.school_id
      WHERE u.school_id=$1 AND u.is_active=true AND p.status NOT IN ('Inactive','Deactivated')
        AND u.role IN ('parent','student','teacher','staff','transport_admin')
      GROUP BY u.role`, [schoolId]),
    pool.query(`SELECT DISTINCT class_name AS "className" FROM students
      WHERE school_id=$1 AND status='Active' AND trim(class_name)<>'' ORDER BY class_name`, [schoolId])
  ]);
  const counts = Object.fromEntries(rolesResult.rows.map(row=>[row.role,Number(row.count)]));
  const broadcastLists = [
    { key:'all_parents', label:'All Parents', count:counts.parent||0 },
    { key:'all_students', label:'All Students', count:counts.student||0 },
    { key:'all_teachers', label:'All Teachers', count:counts.teacher||0 },
    { key:'all_staff', label:'All Staff', count:(counts.staff||0)+(counts.transport_admin||0) },
    { key:'all_recipients', label:'All Active Recipients', count:Object.values(counts).reduce((sum,count)=>sum+count,0) },
    ...classesResult.rows.map(row=>({key:'class:'+row.className,label:row.className+' — Parents & Students',className:row.className}))
  ];
  res.json({ people:peopleResult.rows, broadcastLists });
}));

app.post('/api/messages', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId = await getSchoolIdForRequest(req);
  const b = req.body || {};
  const body = String(b.body || '').trim();
  const subject = clean(b.subject) || 'Message from School World';
  const recipientPersonIds = Array.isArray(b.recipientPersonIds) ? [...new Set(b.recipientPersonIds.map(String))] : [];
  const broadcastList = clean(b.broadcastList);
  const attachments = Array.isArray(b.attachments) ? b.attachments : [];
  if (!body && !attachments.length) throw fail(400,'Write a message or attach a file before posting.');
  if (attachments.length > 5) throw fail(413,'A message can contain up to 5 attachments.');
  if ((recipientPersonIds.length && broadcastList) || (!recipientPersonIds.length && !broadcastList)) {
    throw fail(400,'Choose individual contacts or one broadcast list.');
  }
  if (recipientPersonIds.length > 500) throw fail(413,'Select no more than 500 contacts in one message.');
  if (recipientPersonIds.some(id=>! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
    throw fail(400,'One or more selected contact IDs are invalid.');
  }
  let scheduleAt = null;
  if (b.scheduleAt) {
    scheduleAt = new Date(String(b.scheduleAt));
    if (Number.isNaN(scheduleAt.getTime())) throw fail(400,'Choose a valid schedule date and time.');
    if (scheduleAt.getTime() <= Date.now()) throw fail(400,'The scheduled date and time must be in the future.');
    if (scheduleAt.getTime() > Date.now() + 366*24*60*60*1000) throw fail(400,'Messages can be scheduled up to one year ahead.');
  }
  const decodedAttachments = [];
  let totalBytes = 0;
  for (const file of attachments) {
    const decoded = decodeDataUrl(file.dataUrl);
    totalBytes += decoded.buffer.length;
    if (decoded.buffer.length > 5*1024*1024 || totalBytes > 5*1024*1024) {
      throw fail(413,'Message attachments are limited to 5 MB total.');
    }
    decodedAttachments.push({name:clean(file.name)||'attachment',mime:decoded.mime,buffer:decoded.buffer});
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let recipients;
    if (broadcastList.startsWith('class:')) {
      const className = clean(broadcastList.slice(6));
      if (!className) throw fail(400,'Choose a valid class broadcast list.');
      recipients = await client.query(`SELECT DISTINCT u.id AS "userId",p.id AS "personId"
        FROM user_accounts u JOIN people p ON p.id=u.person_id AND p.school_id=u.school_id
        WHERE u.school_id=$1 AND u.is_active=true AND p.status NOT IN ('Inactive','Deactivated')
          AND u.role IN ('parent','student')
          AND (lower(trim(COALESCE(p.class_name,'')))=lower(trim($2))
            OR EXISTS (SELECT 1 FROM student_parents sp JOIN students child ON child.id=sp.student_id AND child.school_id=sp.school_id
              WHERE sp.school_id=p.school_id AND sp.parent_person_id=p.id AND lower(trim(child.class_name))=lower(trim($2))))`,
        [schoolId,className]);
    } else if (broadcastList) {
      const allowedRoles = MESSAGE_BROADCAST_ROLES[broadcastList];
      if (!allowedRoles) throw fail(400,'Choose a supported broadcast list.');
      recipients = await client.query(`SELECT DISTINCT u.id AS "userId",p.id AS "personId"
        FROM user_accounts u JOIN people p ON p.id=u.person_id AND p.school_id=u.school_id
        WHERE u.school_id=$1 AND u.is_active=true AND p.status NOT IN ('Inactive','Deactivated')
          AND u.role=ANY($2::text[])`,[schoolId,allowedRoles]);
    } else {
      recipients = await client.query(`SELECT DISTINCT u.id AS "userId",p.id AS "personId"
        FROM user_accounts u JOIN people p ON p.id=u.person_id AND p.school_id=u.school_id
        WHERE u.school_id=$1 AND u.is_active=true AND p.status NOT IN ('Inactive','Deactivated')
          AND u.role IN ('parent','student','teacher','staff') AND p.id=ANY($2::uuid[])`,
        [schoolId,recipientPersonIds]);
      const matchedPeople = new Set(recipients.rows.map(row=>row.personId));
      const missing = recipientPersonIds.filter(id=>!matchedPeople.has(id));
      if (missing.length) throw fail(409,'One or more selected contacts no longer have an active recipient login. Refresh the contact list and try again.');
    }
    const recipientIds = [...new Set(recipients.rows.map(row=>row.userId).filter(id=>id!==req.user.id))];
    if (!recipientIds.length) throw fail(409,'No active recipient accounts were found for that selection.');
    if (decodedAttachments.length && recipientIds.length > 100) throw fail(413,'For messages with attachments, select no more than 100 recipients.');
    const batchId = randomUUID();
    const status = scheduleAt ? 'scheduled' : 'sent';
    for (const recipientId of recipientIds) {
      await client.query(`INSERT INTO messages(school_id,batch_id,sender_id,recipient_id,subject,body,status,scheduled_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [schoolId,batchId,req.user.id,recipientId,subject,body,status,scheduleAt]);
    }
    for (const file of decodedAttachments) {
      await client.query(`INSERT INTO message_attachments(school_id,batch_id,file_name,content_type,file_size,file_data)
        VALUES($1,$2,$3,$4,$5,$6)`,[schoolId,batchId,file.name,file.mime,file.buffer.length,file.buffer]);
    }
    await client.query('INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details,ip_address) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)',
      [schoolId,req.user.id,scheduleAt?'message.scheduled':'message.sent','message_batch',batchId,JSON.stringify({recipientCount:recipientIds.length,attachmentCount:decodedAttachments.length,scheduledAt:scheduleAt}),req.ip||null]);
    await client.query('COMMIT');
    const message = scheduleAt
      ? 'Message scheduled for '+scheduleAt.toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' for '+recipientIds.length+' recipient account(s).'
      : 'Message posted to '+recipientIds.length+' recipient account(s).';
    res.status(201).json({ok:true,batchId,recipientCount:recipientIds.length,status,scheduledAt:scheduleAt,message});
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { client.release(); }
}));

// Parent-to-staff messaging is permitted only for staff with an active, allowed category.
app.get('/api/parent/messages/recipients', authenticate, requireRole('parent'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const result=await pool.query('SELECT p.id AS "personId",p.full_name AS "fullName",p.person_type AS "personType",c.id AS "categoryId",c.name AS "categoryName" FROM people p JOIN staff_category_assignments a ON a.school_id=p.school_id AND a.person_id=p.id JOIN staff_categories c ON c.school_id=a.school_id AND c.id=a.staff_category_id AND c.is_active=true JOIN user_accounts u ON u.school_id=p.school_id AND u.person_id=p.id AND u.is_active=true AND u.role IN (\'school_admin\',\'principal\',\'teacher\',\'staff\',\'transport_admin\') LEFT JOIN one_way_communication_category_restrictions r ON r.school_id=c.school_id AND r.staff_category_id=c.id WHERE p.school_id=$1 AND p.person_type IN (\'staff\',\'teacher\') AND p.status NOT IN (\'Inactive\',\'Deactivated\') AND r.staff_category_id IS NULL ORDER BY lower(c.name),lower(p.full_name)',[schoolId]);
  res.json({people:result.rows});
}));
app.post('/api/parent/messages', authenticate, requireRole('parent'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const recipientPersonId=String(req.body?.recipientPersonId||'');
  const body=String(req.body?.body||'').trim();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(recipientPersonId)) throw fail(400,'Choose a valid staff member.');
  if(!body) throw fail(400,'Write a message before sending.');
  if(body.length>10000) throw fail(413,'Messages must be 10,000 characters or fewer.');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const recipient=await client.query('SELECT u.id AS "userId",p.full_name AS "fullName",c.name AS "categoryName" FROM people p JOIN staff_category_assignments a ON a.school_id=p.school_id AND a.person_id=p.id JOIN staff_categories c ON c.school_id=a.school_id AND c.id=a.staff_category_id AND c.is_active=true JOIN user_accounts u ON u.school_id=p.school_id AND u.person_id=p.id AND u.is_active=true AND u.role IN (\'school_admin\',\'principal\',\'teacher\',\'staff\',\'transport_admin\') LEFT JOIN one_way_communication_category_restrictions r ON r.school_id=c.school_id AND r.staff_category_id=c.id WHERE p.school_id=$1 AND p.id=$2 AND p.person_type IN (\'staff\',\'teacher\') AND p.status NOT IN (\'Inactive\',\'Deactivated\') AND r.staff_category_id IS NULL ORDER BY CASE u.role WHEN \'principal\' THEN 1 WHEN \'teacher\' THEN 2 ELSE 3 END LIMIT 1 FOR UPDATE OF p,c',[schoolId,recipientPersonId]);
    if(!recipient.rowCount) throw fail(403,'This staff member is not available for parent messages. Their category may be restricted or inactive.');
    const batchId=randomUUID();
    await client.query('INSERT INTO messages(school_id,batch_id,sender_id,recipient_id,subject,body,status,scheduled_at) VALUES($1,$2,$3,$4,$5,$6,\'sent\',NULL)',[schoolId,batchId,req.user.id,recipient.rows[0].userId,'Message from Parent',body]);
    await client.query('COMMIT');
    res.status(201).json({ok:true,batchId,recipientName:recipient.rows[0].fullName,message:'Message sent to '+recipient.rows[0].fullName+'.'});
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { client.release(); }
}));

app.get('/api/messages', authenticate, asyncHandler(async(req,res)=>{
  const schoolId = await getSchoolIdForRequest(req);
  const administrator = ['school_admin','principal','staff'].includes(req.user.role);
  const wantsSent = administrator && clean(req.query.folder)==='sent';
  if (wantsSent) {
    const result = await pool.query(`SELECT m.batch_id AS id,m.batch_id AS "batchId",m.subject,m.body,
        MIN(m.sent_at) AS "sentAt",MIN(m.scheduled_at) AS "scheduledAt",MAX(m.status) AS status,
        COUNT(DISTINCT m.recipient_id)::int AS "recipientCount",
        COALESCE(array_agg(DISTINCT COALESCE(p.full_name,u.email)) FILTER (WHERE p.full_name IS NOT NULL OR u.email IS NOT NULL),'{}') AS recipients,
        COALESCE((SELECT json_agg(json_build_object('id',a.id,'name',a.file_name,'type',a.content_type,'size',a.file_size,
          'downloadUrl','/api/messages/'||m.batch_id::text||'/attachments/'||a.id::text) ORDER BY a.created_at)
          FROM message_attachments a WHERE a.school_id=m.school_id AND a.batch_id=m.batch_id),'[]'::json) AS attachments
      FROM messages m
      LEFT JOIN user_accounts u ON u.id=m.recipient_id AND u.school_id=m.school_id
      LEFT JOIN people p ON p.id=u.person_id AND p.school_id=u.school_id
      WHERE m.school_id=$1 AND m.sender_id=$2
      GROUP BY m.school_id,m.batch_id,m.subject,m.body
      ORDER BY MIN(m.sent_at) DESC LIMIT 500`,[schoolId,req.user.id]);
    res.json({folder:'sent',messages:result.rows});
    return;
  }
  const result = await pool.query(`SELECT m.id,m.batch_id AS "batchId",m.subject,m.body,m.sent_at AS "sentAt",
      m.scheduled_at AS "scheduledAt",m.status,m.read_at AS "readAt",
      COALESCE(NULLIF(sp.full_name,''),NULLIF(concat_ws(' ',su.first_name,su.last_name),''),su.email,'School user') AS "senderName",
      COALESCE((SELECT string_agg(DISTINCT s.name || ' - ' || concat_ws(' ',s.class_name,NULLIF(s.section,'')), ', ')
        FROM student_parents spx JOIN students s ON s.id=spx.student_id AND s.school_id=spx.school_id
        WHERE spx.school_id=m.school_id AND spx.parent_person_id=su.person_id),'') AS "senderChildInfo",
      COALESCE((SELECT json_agg(json_build_object('id',a.id,'name',a.file_name,'type',a.content_type,'size',a.file_size,
        'downloadUrl','/api/messages/'||m.batch_id::text||'/attachments/'||a.id::text) ORDER BY a.created_at)
        FROM message_attachments a WHERE a.school_id=m.school_id AND a.batch_id=m.batch_id),'[]'::json) AS attachments
    FROM messages m
    LEFT JOIN user_accounts su ON su.id=m.sender_id AND su.school_id=m.school_id
    LEFT JOIN people sp ON sp.id=su.person_id AND sp.school_id=su.school_id
    WHERE m.school_id=$1 AND m.recipient_id=$2 AND m.status='sent'
    ORDER BY m.sent_at DESC LIMIT 500`,[schoolId,req.user.id]);
  res.json({folder:'inbox',messages:result.rows});
}));

app.get('/api/messages/:batchId/attachments/:attachmentId', authenticate, asyncHandler(async(req,res)=>{
  const schoolId = await getSchoolIdForRequest(req);
  const result = await pool.query(`SELECT a.file_name,a.content_type,a.file_size,a.file_data
    FROM message_attachments a
    WHERE a.school_id=$1 AND a.batch_id=$2 AND a.id=$3
      AND EXISTS (SELECT 1 FROM messages m WHERE m.school_id=a.school_id AND m.batch_id=a.batch_id
        AND (m.sender_id=$4 OR m.recipient_id=$4) AND (m.sender_id=$4 OR m.status='sent'))`,
    [schoolId,req.params.batchId,req.params.attachmentId,req.user.id]);
  if(!result.rowCount)throw fail(404,'Message attachment not found in this account.');
  const file=result.rows[0];
  const filename=String(file.file_name||'attachment').replace(/[\\r\\n\\"]+/g,'_').replace(/[^\\x20-\\x7E]/g,'_');
  res.setHeader('Content-Type',file.content_type||'application/octet-stream');
  res.setHeader('Content-Length',String(file.file_size));
  res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
  res.setHeader('Cache-Control','private, no-store');
  res.send(file.file_data);
}));

app.post('/api/messages/:messageId/read', authenticate, asyncHandler(async(req,res)=>{
  const schoolId = await getSchoolIdForRequest(req);
  const result = await pool.query(`UPDATE messages SET read_at=COALESCE(read_at,now())
    WHERE school_id=$1 AND id=$2 AND recipient_id=$3 AND status='sent'
    RETURNING id,read_at AS "readAt"`,[schoolId,req.params.messageId,req.user.id]);
  if (!result.rowCount) throw fail(404, 'Message not found in this account inbox.');
  res.json({ ok:true, message:result.rows[0] });
}));

app.delete('/api/messages/:messageId', authenticate, asyncHandler(async(req,res)=>{
  const schoolId = await getSchoolIdForRequest(req);
  const identifier = String(req.params.messageId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sentBatch = await client.query('SELECT batch_id FROM messages WHERE school_id=$1 AND sender_id=$2 AND batch_id::text=$3 LIMIT 1', [schoolId,req.user.id,identifier]);
    let batchId = null;
    let deletedRows = 0;
    if (sentBatch.rowCount) {
      batchId = sentBatch.rows[0].batch_id;
      await client.query('DELETE FROM message_attachments WHERE school_id=$1 AND batch_id=$2', [schoolId,batchId]);
      const deleted = await client.query('DELETE FROM messages WHERE school_id=$1 AND sender_id=$2 AND batch_id=$3 RETURNING id', [schoolId,req.user.id,batchId]);
      deletedRows = deleted.rowCount;
    } else {
      const deleted = await client.query('DELETE FROM messages WHERE school_id=$1 AND recipient_id=$2 AND id::text=$3 RETURNING id,batch_id', [schoolId,req.user.id,identifier]);
      if (!deleted.rowCount) throw fail(404,'Message not found in this account.');
      batchId = deleted.rows[0].batch_id;
      deletedRows = deleted.rowCount;
      const remaining = await client.query('SELECT 1 FROM messages WHERE school_id=$1 AND batch_id=$2 LIMIT 1', [schoolId,batchId]);
      if (!remaining.rowCount) await client.query('DELETE FROM message_attachments WHERE school_id=$1 AND batch_id=$2', [schoolId,batchId]);
    }
    await client.query('COMMIT');
    await writeAudit(req,'message.deleted','message_batch',identifier,{deletedRows});
    res.json({ok:true,deletedRows});
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { client.release(); }
}));

app.get('/api/attendance/summary', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const startDate=parseDbDate(req.query.startDate);
  const endDate=parseDbDate(req.query.endDate);
  if(!startDate||!endDate)throw fail(400,'Provide startDate and endDate for the attendance calendar.');
  if(startDate>endDate)throw fail(400,'startDate cannot be later than endDate.');
  const className=clean(req.query.className);
  const academicYear=clean(req.query.academicYear);
  const result=await pool.query(`SELECT to_char(ar.attendance_date,'YYYY-MM-DD') AS date,
    COUNT(*)::int AS marked,
    COUNT(*) FILTER (WHERE ar.status='Present')::int AS present,
    COUNT(*) FILTER (WHERE ar.status='Absent')::int AS absent,
    COUNT(*) FILTER (WHERE ar.status='Late')::int AS late,
    COUNT(*) FILTER (WHERE ar.status='Excused')::int AS excused
    FROM attendance_records ar
    JOIN students s ON s.id=ar.student_id AND s.school_id=ar.school_id
    WHERE ar.school_id=$1 AND ar.attendance_date BETWEEN $2 AND $3
      AND ($4='' OR s.class_name=$4) AND ($5='' OR s.academic_year=$5)
    GROUP BY ar.attendance_date ORDER BY ar.attendance_date`,[schoolId,startDate,endDate,className,academicYear]);
  res.json({startDate,endDate,summaries:result.rows});
}));

app.get('/api/attendance', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);const date=parseDbDate(req.query.date)||new Date().toISOString().slice(0,10);
  const result=await pool.query(`SELECT ar.id,s.student_code AS "studentCode",s.name AS "studentName",s.class_name AS "className",s.section,ar.attendance_date AS "attendanceDate",ar.status,ar.note FROM attendance_records ar JOIN students s ON s.id=ar.student_id AND s.school_id=ar.school_id WHERE ar.school_id=$1 AND ar.attendance_date=$2 ORDER BY lower(s.name)`,[schoolId,date]);
  res.json({date,records:result.rows});
}));
app.post('/api/attendance/bulk', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);const date=parseDbDate(req.body?.date);const records=req.body?.records;
  if(!date||!Array.isArray(records)||!records.length||records.length>2000)throw fail(400,'Provide an attendance date and between 1 and 2,000 student records.');
  const allowed=new Set(['Present','Absent','Late','Excused']);const client=await pool.connect();
  try{await client.query('BEGIN');for(const item of records){const code=clean(item.studentCode);const status=clean(item.status);if(!code||!allowed.has(status))throw fail(400,'Each attendance row requires a student ID and a supported status.');const student=await client.query('SELECT id FROM students WHERE school_id=$1 AND student_code=$2',[schoolId,code]);if(!student.rowCount)throw fail(404,`Student ${code} was not found in this school.`);await client.query(`INSERT INTO attendance_records(school_id,student_id,attendance_date,status,marked_by,note) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(student_id,attendance_date) DO UPDATE SET status=EXCLUDED.status,marked_by=EXCLUDED.marked_by,note=EXCLUDED.note,created_at=now()`,[schoolId,student.rows[0].id,date,status,req.user.id,clean(item.note)]);}
    await client.query("INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,details) VALUES($1,$2,'attendance.saved','attendance',$3::jsonb)",[schoolId,req.user.id,JSON.stringify({date,count:records.length})]);await client.query('COMMIT');res.json({ok:true,date,saved:records.length});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}));

app.get('/api/routes', authenticate, requireRole('school_admin','principal','staff','teacher','transport_admin'), asyncHandler(async(req,res)=>{const schoolId=await getSchoolIdForRequest(req);const result=await pool.query('SELECT name FROM school_routes WHERE school_id=$1 AND is_active=true ORDER BY name',[schoolId]);res.json({routes:result.rows.map(row=>row.name)});}));
app.get('/api/transport/routes', authenticate, requireRole('school_admin','principal','staff','transport_admin'), asyncHandler(async(req,res)=>{const schoolId=await getSchoolIdForRequest(req);const result=await pool.query('SELECT name,stops,vehicle_number AS vehicle,driver_name AS driver FROM school_routes WHERE school_id=$1 AND is_active=true ORDER BY name',[schoolId]);res.json({routes:result.rows});}));
app.post('/api/transport/routes', authenticate, requireRole('school_admin','principal','staff','transport_admin'), asyncHandler(async(req,res)=>{const schoolId=await getSchoolIdForRequest(req);const b=req.body||{};const name=clean(b.name);if(!name)throw fail(400,'Route name is required.');const result=await pool.query(`INSERT INTO school_routes(school_id,name,stops,vehicle_number,driver_name) VALUES($1,$2,$3,$4,$5) ON CONFLICT(school_id,name) DO UPDATE SET stops=EXCLUDED.stops,vehicle_number=EXCLUDED.vehicle_number,driver_name=EXCLUDED.driver_name,is_active=true,updated_at=now() RETURNING name,stops,vehicle_number AS vehicle,driver_name AS driver`,[schoolId,name,clean(b.stops),clean(b.vehicle),clean(b.driver)]);res.status(201).json({route:result.rows[0]});}));
app.delete('/api/transport/routes/:name', authenticate, requireRole('school_admin','principal','staff','transport_admin'), asyncHandler(async(req,res)=>{const schoolId=await getSchoolIdForRequest(req);const result=await pool.query('UPDATE school_routes SET is_active=false,updated_at=now() WHERE school_id=$1 AND name=$2 RETURNING name',[schoolId,req.params.name]);if(!result.rowCount)throw fail(404,'Route not found.');res.json({ok:true});}));
app.post('/api/routes', authenticate, requireRole('school_admin','principal','transport_admin'), asyncHandler(async(req,res)=>{const schoolId=await getSchoolIdForRequest(req);const name=clean(req.body?.name);if(!name)throw fail(400,'Route name is required.');const r=await pool.query('INSERT INTO school_routes(school_id,name) VALUES($1,$2) ON CONFLICT(school_id,name) DO UPDATE SET is_active=true RETURNING name',[schoolId,name]);res.status(201).json({route:r.rows[0].name});}));
app.patch('/api/routes/:name', authenticate, requireRole('school_admin','principal','transport_admin'), asyncHandler(async(req,res)=>{const schoolId=await getSchoolIdForRequest(req);const oldName=String(req.params.name);const name=clean(req.body?.name);if(!name)throw fail(400,'Route name is required.');const client=await pool.connect();try{await client.query('BEGIN');const result=await client.query('UPDATE school_routes SET name=$3,updated_at=now() WHERE school_id=$1 AND name=$2 RETURNING id,name',[schoolId,oldName,name]);if(!result.rowCount)throw fail(404,'Route not found.');await client.query('UPDATE notices SET audience_key=$3,updated_at=now() WHERE school_id=$1 AND board=\'route\' AND audience_key=$2',[schoolId,oldName,name]);await client.query('UPDATE people SET route_name=$3,updated_at=now() WHERE school_id=$1 AND route_name=$2',[schoolId,oldName,name]);await client.query('COMMIT');res.json({route:result.rows[0].name});}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}));
app.delete('/api/routes/:name', authenticate, requireRole('school_admin','principal','transport_admin'), asyncHandler(async(req,res)=>{const schoolId=await getSchoolIdForRequest(req);const result=await pool.query('UPDATE school_routes SET is_active=false,updated_at=now() WHERE school_id=$1 AND name=$2 RETURNING name',[schoolId,req.params.name]);if(!result.rowCount)throw fail(404,'Route not found.');res.json({ok:true});}));

function mapNotice(row, attachments=[], viewRecords=[]) {
  return { id:row.id, year:row.academic_year, board:row.board, audience:row.audience_key, type:row.notice_type, message:row.message, author:row.author_name, createdAt:row.created_at, attachments, allowReply:row.allow_reply, views:viewRecords.length, viewRecords, isPublished:row.is_published };
}
async function fetchNotices(schoolId) {
  const [noticeRows, attachments, views] = await Promise.all([
    pool.query('SELECT * FROM notices WHERE school_id=$1 AND is_published=true ORDER BY created_at DESC',[schoolId]),
    pool.query('SELECT a.id,a.notice_id,a.file_name,a.content_type,a.file_size,a.created_at FROM notice_attachments a JOIN notices n ON n.id=a.notice_id AND n.school_id=a.school_id WHERE a.school_id=$1 ORDER BY a.created_at',[schoolId]),
    pool.query(`SELECT v.notice_id,v.viewed_at,p.id AS person_id,p.person_type,p.external_id,p.first_name,p.last_name,p.full_name,p.class_name,p.section,p.roll_number,p.enrollment_number,p.contact_number,p.alternate_contact_number,p.parent_guardian_name,p.email,p.gender,p.date_of_birth,p.address,p.city,p.state,p.status,p.last_seen,
      s.student_code,s.name AS student_name,s.father_name,s.parent_name,s.phone AS student_phone,s.academic_year,s.enrolled,s.metadata AS student_metadata
      FROM notice_views v JOIN notices n ON n.id=v.notice_id JOIN people p ON p.id=v.viewer_person_id LEFT JOIN students s ON s.person_id=p.id WHERE n.school_id=$1 ORDER BY v.viewed_at`,[schoolId])
  ]);
  const attachmentMap=new Map(); for(const row of attachments.rows){ if(!attachmentMap.has(row.notice_id)) attachmentMap.set(row.notice_id,[]); attachmentMap.get(row.notice_id).push({id:row.id,name:row.file_name,type:row.content_type,size:row.file_size,downloadUrl:`/api/notices/${row.notice_id}/attachments/${row.id}`}); }
  const viewMap=new Map(); for(const row of views.rows){ if(!viewMap.has(row.notice_id)) viewMap.set(row.notice_id,[]); viewMap.get(row.notice_id).push({userId:row.external_id||row.person_id,personId:row.person_id,studentId:row.student_code||'',firstName:row.first_name,lastName:row.last_name,fullName:row.full_name||row.student_name||`${row.first_name} ${row.last_name}`.trim(),userType:row.person_type,className:row.class_name||'',section:row.section||'',rollNumber:row.roll_number||'',enrollmentNumber:row.enrollment_number||'',contactNumber:row.contact_number||row.student_phone||'',alternateContactNumber:row.alternate_contact_number||'',parentGuardianName:row.parent_guardian_name||row.parent_name||row.father_name||'',email:row.email||'',gender:row.gender||'',dateOfBirth:row.date_of_birth?String(row.date_of_birth).slice(0,10):'',address:row.address||'',city:row.city||'',state:row.state||'',status:row.status||'',lastSeen:row.last_seen||'',viewedAt:row.viewed_at,viewStatus:'Viewed'}); }
  return noticeRows.rows.map(row=>mapNotice(row,attachmentMap.get(row.id)||[],viewMap.get(row.id)||[]));
}
app.get('/api/notices', authenticate, asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req); let notices=await fetchNotices(schoolId); const year=clean(req.query.year);
  if (!['school_admin','principal','staff'].includes(req.user.role)) {
    if (!req.user.person_id) notices=[];
    else {
      const client=await pool.connect();
      try {
        const allowed=[];
        for (const item of notices) {
          const recipients=await eligiblePeople(client,schoolId,{board:item.board,audience_key:item.audience});
          if(recipients.some(person=>person.id===req.user.person_id)) allowed.push({ ...item, viewRecords: [] });
        }
        notices=allowed;
      } finally { client.release(); }
    }
  }
  res.json({notices:year?notices.filter(item=>item.year===year):notices});
}));
app.get('/api/notices/:noticeId/attachments/:attachmentId', authenticate, asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const result=await pool.query(`SELECT a.id,a.file_name,a.content_type,a.file_size,a.file_data,n.id AS notice_id,n.board,n.audience_key
    FROM notice_attachments a JOIN notices n ON n.id=a.notice_id AND n.school_id=a.school_id
    WHERE a.school_id=$1 AND n.id=$2 AND a.id=$3 AND n.is_published=true`,[schoolId,req.params.noticeId,req.params.attachmentId]);
  if(!result.rowCount)throw fail(404,'Attachment not found.');
  const file=result.rows[0];
  if(!['school_admin','principal','staff'].includes(req.user.role)){
    if(!req.user.person_id)throw fail(403,'This account is not linked to a recipient profile.');
    const client=await pool.connect();
    try{
      const eligible=await eligiblePeople(client,schoolId,{board:file.board,audience_key:file.audience_key});
      if(!eligible.some(person=>person.id===req.user.person_id))throw fail(403,'You are not an eligible recipient for this notice.');
      await pool.query('INSERT INTO notice_views(school_id,notice_id,viewer_person_id) VALUES($1,$2,$3) ON CONFLICT(notice_id,viewer_person_id) DO NOTHING',[schoolId,file.notice_id,req.user.person_id]);
    }finally{client.release();}
  }
  const filename=String(file.file_name||'attachment').replace(/[\r\n\"]+/g,'_').replace(/[^\x20-\x7E]/g,'_');
  res.setHeader('Content-Type',file.content_type||'application/octet-stream');
  res.setHeader('Content-Length',String(file.file_size));
  res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
  res.setHeader('Cache-Control','private, no-store');
  res.send(file.file_data);
}));

app.post('/api/notices', authenticate, requireRole('school_admin','principal','teacher','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);const b=req.body||{};const year=clean(b.year);const board=clean(b.board);const audience=clean(b.audience);const type=clean(b.type);const message=String(b.message||'').trim();
  if(!year||!['school','class','route'].includes(board)||!audience||!['News','Alert','Homework - Worksheet','Homework - Assignment'].includes(type)||(!message&&!(b.attachments||[]).length))throw fail(400,'Provide academic year, category, audience, notice type and message or attachment.');
  if((b.attachments||[]).length>5)throw fail(400,'A notice may contain at most 5 attachments.');
  const client=await pool.connect();try{await client.query('BEGIN');const notice=(await client.query(`INSERT INTO notices(school_id,academic_year,board,audience_key,notice_type,message,author_user_id,author_name,allow_reply)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[schoolId,year,board,audience,type,message,req.user.id,clean(b.author)||`${req.user.first_name} ${req.user.last_name}`.trim(),Boolean(b.allowReply)])).rows[0];
    let total=0;for(const file of b.attachments||[]){const decoded=decodeDataUrl(file.dataUrl);total+=decoded.buffer.length;if(decoded.buffer.length>2*1024*1024||total>2*1024*1024)throw fail(413,'Attachments are limited to 2 MB total per notice.');await client.query('INSERT INTO notice_attachments(school_id,notice_id,file_name,content_type,file_size,file_data) VALUES($1,$2,$3,$4,$5,$6)',[schoolId,notice.id,clean(file.name)||'attachment',decoded.mime,decoded.buffer.length,decoded.buffer]);}
    await client.query('INSERT INTO audit_logs(school_id,actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,\'notice.created\',\'notice\',$3,$4::jsonb)',[schoolId,req.user.id,notice.id,JSON.stringify({board,audience,type,year})]);await client.query('COMMIT');res.status(201).json({notice:mapNotice(notice,(b.attachments||[]),[])});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}));
app.delete('/api/notices/:noticeId', authenticate, requireRole('school_admin','principal','teacher','staff'), asyncHandler(async(req,res)=>{const schoolId=await getSchoolIdForRequest(req);const result=await pool.query('DELETE FROM notices WHERE school_id=$1 AND id=$2 RETURNING id',[schoolId,req.params.noticeId]);if(!result.rowCount)throw fail(404,'Notice not found.');await writeAudit(req,'notice.deleted','notice',req.params.noticeId,{});res.json({ok:true});}));
function normalizeClass(value){return clean(value).toLowerCase().replace(/^class\s+/,'').replace(/\s+/g,' ');}
async function eligiblePeople(client, schoolId, notice) {
  let predicate="p.status NOT IN ('Inactive','Deactivated')"; const args=[schoolId];
  if(notice.board==='school' && notice.audience_key==='ALL_TEACHERS') predicate += " AND p.person_type IN ('teacher','staff')";
  else if(notice.board==='school' && notice.audience_key==='DAY_CARE') predicate += " AND (p.person_type='day_care' OR p.day_care=true)";
  else if(notice.board==='school' && notice.audience_key==='__SCHOOL__') predicate += " AND p.person_type IN ('student','parent','teacher','staff','day_care','guardian','other')";
  else if(notice.board==='class'){
    args.push(notice.audience_key);
    const target = `lower(regexp_replace(regexp_replace($${args.length}, '^class\\s+', '', 'i'), '[()\\s]+', '', 'g'))`;
    const personClass = `lower(regexp_replace(regexp_replace(p.class_name, '^class\\s+', '', 'i'), '[()\\s]+', '', 'g'))`;
    const childClass = `lower(regexp_replace(regexp_replace(child.class_name, '^class\\s+', '', 'i'), '[()\\s]+', '', 'g'))`;
    predicate += ` AND (${personClass}=${target} OR EXISTS (SELECT 1 FROM student_parents sp JOIN students child ON child.id=sp.student_id AND child.school_id=sp.school_id WHERE sp.school_id=p.school_id AND sp.parent_person_id=p.id AND ${childClass}=${target}))`;
  }
  else if(notice.board==='route'){
    args.push(notice.audience_key);
    predicate += ` AND (lower(p.route_name)=lower($${args.length}) OR EXISTS (SELECT 1 FROM student_parents sp JOIN students child ON child.id=sp.student_id AND child.school_id=sp.school_id JOIN people student_person ON student_person.id=child.person_id AND student_person.school_id=child.school_id WHERE sp.school_id=p.school_id AND sp.parent_person_id=p.id AND lower(student_person.route_name)=lower($${args.length})))`;
  }
  else predicate += ' AND false';
  const result=await client.query(`SELECT p.*,s.student_code,s.name AS student_name,s.father_name,s.parent_name,s.phone AS student_phone,s.enrollment_number AS student_enrollment,s.roll_number AS student_roll,s.academic_year,s.enrolled FROM people p LEFT JOIN students s ON s.person_id=p.id AND s.school_id=p.school_id WHERE p.school_id=$1 AND ${predicate} ORDER BY lower(p.full_name)`,args);
  return result.rows;
}
app.post('/api/notices/:noticeId/views', authenticate, asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);const client=await pool.connect();try{const n=await client.query('SELECT * FROM notices WHERE school_id=$1 AND id=$2',[schoolId,req.params.noticeId]);if(!n.rowCount)throw fail(404,'Notice not found.');if(!req.user.person_id)throw fail(409,'This account is not linked to a recipient profile. View tracking requires a linked student, parent, teacher or staff profile.');const notice=n.rows[0];
    const person=await client.query('SELECT * FROM people WHERE school_id=$1 AND id=$2',[schoolId,req.user.person_id]);if(!person.rowCount)throw fail(403,'Recipient profile not found.');const eligible=await eligiblePeople(client,schoolId,notice);if(!eligible.some(p=>p.id===req.user.person_id))throw fail(403,'This account is not an eligible recipient for this notice.');
    const result=await client.query('INSERT INTO notice_views(school_id,notice_id,viewer_person_id) VALUES($1,$2,$3) ON CONFLICT(notice_id,viewer_person_id) DO NOTHING RETURNING viewed_at',[schoolId,notice.id,req.user.person_id]);const existing=await client.query('SELECT viewed_at FROM notice_views WHERE notice_id=$1 AND viewer_person_id=$2',[notice.id,req.user.person_id]);res.json({ok:true,alreadyViewed:result.rowCount===0,viewedAt:existing.rows[0]?.viewed_at||null});
  }finally{client.release();}
}));
app.get('/api/notices/:noticeId/report', authenticate, requireRole('school_admin','principal','teacher','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);const status=clean(req.query.status)==='not-viewed'?'not-viewed':'viewed';const client=await pool.connect();try{const n=await client.query('SELECT * FROM notices WHERE school_id=$1 AND id=$2',[schoolId,req.params.noticeId]);if(!n.rowCount)throw fail(404,'Notice not found.');const notice=n.rows[0];const eligible=await eligiblePeople(client,schoolId,notice);const views=(await client.query('SELECT viewer_person_id,viewed_at FROM notice_views WHERE school_id=$1 AND notice_id=$2',[schoolId,notice.id])).rows;const viewMap=new Map(views.map(v=>[v.viewer_person_id,v.viewed_at]));const people=status==='viewed'?eligible.filter(p=>viewMap.has(p.id)):eligible.filter(p=>!viewMap.has(p.id));
    const label=notice.board==='school'?'School Notice Board':notice.board==='class'?'Class Notice Board':'Route Notice Board';const headers=['Notice ID','Message','Academic Year','Notice Category','Audience','Notice Type','User Type','First Name','Last Name','Full Name','User ID','Student ID','Class','Section','Roll Number','Enrollment Number','Contact Number','Alternate Contact Number','Parent / Guardian','Email','Gender','Date of Birth','Address','City','State','Account Status','View Status','Viewed At','Last Seen'];
    const rows=[headers,...people.map(p=>[notice.id,notice.message,notice.academic_year,label,notice.audience_key,notice.notice_type,p.person_type,p.first_name,p.last_name,p.full_name,p.external_id||p.id,p.student_code||(p.person_type==='student'?p.external_id:'')||'',p.class_name,p.section,p.student_roll||p.roll_number,p.student_enrollment||p.enrollment_number,p.contact_number||p.student_phone,p.alternate_contact_number,p.parent_guardian_name||p.parent_name||p.father_name,p.email,p.gender,p.date_of_birth?String(p.date_of_birth).slice(0,10):'',p.address,p.city,p.state,p.status,status==='viewed'?'Viewed':'Not Viewed',viewMap.get(p.id)||'',p.last_seen||''])];
    if(!people.length)rows.push([notice.id,notice.message,notice.academic_year,label,notice.audience_key,notice.notice_type,'','','','','','','','','','','','','','','','','','','','',status==='viewed'?'No eligible views recorded.':'No eligible people are configured for this audience.','','']);
    sendCsv(res,`notice-${notice.id}-${status}.csv`,rows);
  }finally{client.release();}
}));

app.get('/api/module-data/:moduleKey', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{const schoolId=await getSchoolIdForRequest(req);const result=await pool.query('SELECT payload,updated_at FROM module_records WHERE school_id=$1 AND module_key=$2 AND record_key=\'state\'',[schoolId,req.params.moduleKey]);res.json({data:result.rows[0]?.payload??null,updatedAt:result.rows[0]?.updated_at??null});}));
app.put('/api/module-data/:moduleKey', authenticate, requireRole('school_admin','principal','staff','transport_admin'), asyncHandler(async(req,res)=>{const schoolId=await getSchoolIdForRequest(req);const raw=JSON.stringify(req.body?.data??{});if(raw.length>2*1024*1024)throw fail(413,'Module data exceeds 2 MB.');const result=await pool.query(`INSERT INTO module_records(school_id,module_key,record_key,payload,updated_by) VALUES($1,$2,'state',$3::jsonb,$4)
  ON CONFLICT(school_id,module_key,record_key) DO UPDATE SET payload=EXCLUDED.payload,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING updated_at`,[schoolId,req.params.moduleKey,raw,req.user.id]);res.json({ok:true,updatedAt:result.rows[0].updated_at});}));

// Staff categories and parent-message permissions use normalized relational tables only.
app.get('/api/staff-categories', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const result=await pool.query('SELECT id,name,description,is_active AS "isActive",created_at AS "createdAt",updated_at AS "updatedAt" FROM staff_categories WHERE school_id=$1 ORDER BY is_active DESC,lower(name)',[schoolId]);
  res.json({categories:result.rows});
}));
app.post('/api/staff-categories', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const name=clean(req.body?.name);
  const description=clean(req.body?.description);
  if(!name) throw fail(400,'Staff category name is required.');
  if(name.length>100) throw fail(400,'Staff category name must be 100 characters or fewer.');
  if(description.length>500) throw fail(400,'Description must be 500 characters or fewer.');
  try {
    const result=await pool.query('INSERT INTO staff_categories(school_id,name,description) VALUES($1,$2,$3) RETURNING id,name,description,is_active AS "isActive",created_at AS "createdAt",updated_at AS "updatedAt"',[schoolId,name,description]);
    res.status(201).json({category:result.rows[0]});
  } catch(error) {
    if(error.code==='23505') throw fail(409,'A staff category with this name already exists.');
    throw error;
  }
}));
app.patch('/api/staff-categories/:categoryId', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const categoryId=String(req.params.categoryId);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoryId)) throw fail(400,'Invalid staff category ID.');
  const body=req.body||{};
  const has=key=>Object.prototype.hasOwnProperty.call(body,key);
  if(!has('name')&&!has('description')&&!has('isActive')) throw fail(400,'Provide a category name, description, or status to update.');
  const name=has('name')?clean(body.name):'';
  const description=has('description')?clean(body.description):'';
  if(has('name')&&!name) throw fail(400,'Staff category name is required.');
  if(name.length>100) throw fail(400,'Staff category name must be 100 characters or fewer.');
  if(description.length>500) throw fail(400,'Description must be 500 characters or fewer.');
  if(has('isActive')&&typeof body.isActive!=='boolean') throw fail(400,'Category status must be true or false.');
  try {
    const result=await pool.query('UPDATE staff_categories SET name=CASE WHEN $3::boolean THEN $4 ELSE name END,description=CASE WHEN $5::boolean THEN $6 ELSE description END,is_active=CASE WHEN $7::boolean THEN $8 ELSE is_active END,updated_at=now() WHERE school_id=$1 AND id=$2 RETURNING id,name,description,is_active AS "isActive",created_at AS "createdAt",updated_at AS "updatedAt"',
      [schoolId,categoryId,has('name'),name,has('description'),description,has('isActive'),has('isActive')?body.isActive:false]);
    if(!result.rowCount) throw fail(404,'Staff category not found.');
    res.json({category:result.rows[0]});
  } catch(error) {
    if(error.code==='23505') throw fail(409,'A staff category with this name already exists.');
    throw error;
  }
}));
app.get('/api/staff-category-assignments', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const result=await pool.query('SELECT a.person_id AS "personId",a.staff_category_id AS "categoryId",c.name AS "categoryName",c.is_active AS "categoryActive" FROM staff_category_assignments a JOIN staff_categories c ON c.school_id=a.school_id AND c.id=a.staff_category_id JOIN people p ON p.id=a.person_id AND p.school_id=a.school_id WHERE a.school_id=$1 AND p.person_type IN (\'staff\',\'teacher\') ORDER BY lower(p.full_name)',[schoolId]);
  res.json({assignments:result.rows});
}));
app.put('/api/staff-category-assignments/:personId', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const personId=String(req.params.personId);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(personId)) throw fail(400,'Invalid staff person ID.');
  const person=await pool.query('SELECT id FROM people WHERE school_id=$1 AND id=$2 AND person_type IN (\'staff\',\'teacher\')',[schoolId,personId]);
  if(!person.rowCount) throw fail(404,'Staff member not found.');
  const categoryId=clean(req.body?.categoryId);
  if(!categoryId){
    await pool.query('DELETE FROM staff_category_assignments WHERE school_id=$1 AND person_id=$2',[schoolId,personId]);
    return res.json({ok:true,personId,categoryId:null});
  }
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoryId)) throw fail(400,'Invalid staff category ID.');
  const category=await pool.query('SELECT id,name,is_active AS "isActive" FROM staff_categories WHERE school_id=$1 AND id=$2',[schoolId,categoryId]);
  if(!category.rowCount) throw fail(400,'Choose a staff category created in Manage Staff Category.');
  if(!category.rows[0].isActive){
    const current=await pool.query('SELECT 1 FROM staff_category_assignments WHERE school_id=$1 AND person_id=$2 AND staff_category_id=$3',[schoolId,personId,categoryId]);
    if(!current.rowCount) throw fail(400,'Choose an active staff category.');
  }
  await pool.query('INSERT INTO staff_category_assignments(school_id,person_id,staff_category_id) VALUES($1,$2,$3) ON CONFLICT(school_id,person_id) DO UPDATE SET staff_category_id=EXCLUDED.staff_category_id,updated_at=now()',[schoolId,personId,categoryId]);
  res.json({ok:true,personId,categoryId:category.rows[0].id,categoryName:category.rows[0].name});
}));

app.get('/api/one-way-communication', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const result=await pool.query('SELECT c.id,c.name,c.description,c.is_active AS "isActive",(r.staff_category_id IS NOT NULL) AS "parentsBlocked" FROM staff_categories c LEFT JOIN one_way_communication_category_restrictions r ON r.school_id=c.school_id AND r.staff_category_id=c.id WHERE c.school_id=$1 AND c.is_active=true ORDER BY lower(c.name)',[schoolId]);
  res.json({categories:result.rows});
}));
app.put('/api/one-way-communication', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const requested=Array.isArray(req.body?.blockedCategoryIds)?[...new Set(req.body.blockedCategoryIds.map(String))]:[];
  if(requested.length>500) throw fail(413,'Choose no more than 500 staff categories.');
  if(requested.some(id=>!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) throw fail(400,'One or more staff category IDs are invalid.');
  const active=await pool.query('SELECT id FROM staff_categories WHERE school_id=$1 AND is_active=true',[schoolId]);
  const activeIds=active.rows.map(row=>row.id);
  const allowed=new Set(activeIds);
  if(requested.some(id=>!allowed.has(id))) throw fail(409,'A selected category is no longer active. Refresh the page and try again.');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    if(activeIds.length) await client.query('SELECT id FROM staff_categories WHERE school_id=$1 AND id=ANY($2::uuid[]) FOR UPDATE',[schoolId,activeIds]);
    await client.query('DELETE FROM one_way_communication_category_restrictions WHERE school_id=$1 AND staff_category_id=ANY($2::uuid[])',[schoolId,activeIds]);
    if(requested.length) await client.query('INSERT INTO one_way_communication_category_restrictions(school_id,staff_category_id) SELECT $1,unnest($2::uuid[]) ON CONFLICT(school_id,staff_category_id) DO NOTHING',[schoolId,requested]);
    await client.query('COMMIT');
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { client.release(); }
  res.json({ok:true,blockedCount:requested.length});
}));

// Manage External Links is backed only by normalized relational tables.
const externalLinkRoles = ['school_admin','principal','staff'];
const validUuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
function externalLinkInput(body = {}) {
  const url = clean(body.url || body.link);
  const description = clean(body.description);
  const availableFrom = clean(body.availableFrom || '05:00');
  const availableTo = clean(body.availableTo || '23:00');
  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { throw fail(400,'Enter a valid external link URL beginning with http:// or https://.'); }
  if (!['http:','https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) throw fail(400,'External links must use http:// or https://.');
  if (description.length > 1000) throw fail(400,'Description must be 1,000 characters or fewer.');
  const validTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!validTime(availableFrom) || !validTime(availableTo)) throw fail(400,'Enter Available From and Available To as valid times.');
  const allGrades = body.availableToAllGrades !== false && body.availableToAllGrades !== 'false';
  const gradeIds = Array.isArray(body.gradeIds) ? [...new Set(body.gradeIds.map(String))] : [];
  if (gradeIds.some(id => !validUuid(id))) throw fail(400,'One or more selected grades are invalid.');
  if (!allGrades && !gradeIds.length) throw fail(400,'Choose at least one grade, or select Available to all grades.');
  return {
    url: parsedUrl.href,
    description,
    onlyDaycareStudent: asBoolean(body.onlyDaycareStudent),
    onlyDaycareTiming: asBoolean(body.onlyDaycareTiming),
    availableToAllGrades: allGrades,
    availableFrom,
    availableTo,
    isCctvCameraLink: asBoolean(body.isCctvCameraLink),
    gradeIds: allGrades ? [] : gradeIds
  };
}
async function validateExternalLinkGrades(db, schoolId, gradeIds) {
  if (!gradeIds.length) return;
  const result = await db.query(
    'SELECT id FROM school_classes WHERE school_id=$1 AND id=ANY($2::uuid[])',
    [schoolId, gradeIds]
  );
  if (result.rowCount !== gradeIds.length) throw fail(400,'One or more selected classes are no longer active. Refresh Manage Classes and try again.');
}
async function replaceExternalLinkGrades(db, schoolId, externalLinkId, input) {
  await db.query('DELETE FROM external_link_classes WHERE school_id=$1 AND external_link_id=$2',[schoolId,externalLinkId]);
  if (!input.availableToAllGrades && input.gradeIds.length) {
    await db.query(
      'INSERT INTO external_link_classes(school_id,external_link_id,school_class_id) SELECT $1,$2,unnest($3::uuid[])',
      [schoolId,externalLinkId,input.gradeIds]
    );
  }
}
async function readSchoolClassRows(db, schoolId) {
  const classResult = await db.query(
    'SELECT id,class_name AS "name",COALESCE(section,\'\') AS "section",display_name AS "displayName",to_char(available_from,\'YYYY-MM-DD\') AS "availableFrom",to_char(available_to,\'YYYY-MM-DD\') AS "availableTo",virtual_classroom AS "virtualClassroom",hidden_grade AS "hiddenGrade",CASE WHEN is_active THEN \'Active\' ELSE \'Inactive\' END AS "status",grade_order AS "displayOrder",created_at AS "createdAt",updated_at AS "updatedAt" FROM school_classes WHERE school_id=$1 ORDER BY grade_order,lower(class_name),lower(section)',
    [schoolId]
  );
  const mappingResult = await db.query(
    'SELECT m.school_class_id AS "classId",s.id AS "subjectId",s.name AS "subjectName",true AS enabled,m.extra_curricular AS "extraCurricular",m.is_optional AS optional,m.package_subject AS "packageSubject",m.is_language AS language,m.teacher_person_id AS "teacherId" FROM school_class_subject_mappings m JOIN school_subjects s ON s.school_id=m.school_id AND s.id=m.subject_id WHERE m.school_id=$1 ORDER BY lower(s.name)',
    [schoolId]
  );
  const byClass = new Map(classResult.rows.map(row => [String(row.id), { ...row, subjectMappings: [] }]));
  for (const mapping of mappingResult.rows) {
    const item = byClass.get(String(mapping.classId));
    if (item) {
      const { classId, ...rest } = mapping;
      item.subjectMappings.push(rest);
    }
  }
  return [...byClass.values()];
}

async function readSchoolSubjectRows(db, schoolId) {
  const subjectResult=await db.query(
    'SELECT s.id,s.name,s.code,COALESCE(c.name,\'\') AS category,s.description,CASE WHEN s.is_active THEN \'Active\' ELSE \'Inactive\' END AS status,s.created_at AS "createdAt",s.updated_at AS "updatedAt" FROM school_subjects s LEFT JOIN school_subject_categories c ON c.id=s.category_id AND c.school_id=s.school_id WHERE s.school_id=$1 ORDER BY lower(s.name)',
    [schoolId]
  );
  const typeResult=await db.query(
    'SELECT a.school_subject_id AS "subjectId",t.name FROM school_subject_type_assignments a JOIN school_subject_types t ON t.school_id=a.school_id AND t.id=a.subject_type_id WHERE a.school_id=$1 ORDER BY lower(t.name)',
    [schoolId]
  );
  const classResult=await db.query(
    'SELECT school_subject_id AS "subjectId",class_name AS "className" FROM school_subject_applicable_classes WHERE school_id=$1 ORDER BY lower(class_name)',
    [schoolId]
  );
  const byId=new Map(subjectResult.rows.map(row=>[String(row.id),{...row,subjectTypes:[],classes:[]}]));
  for(const row of typeResult.rows){const subject=byId.get(String(row.subjectId));if(subject)subject.subjectTypes.push(row.name);}
  for(const row of classResult.rows){const subject=byId.get(String(row.subjectId));if(subject)subject.classes.push(row.className);}
  return [...byId.values()];
}
// Student choices are stored as normalized school/student/class/academic-year relations.
app.get('/api/student-optional-subjects', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const classId=clean(req.query.classId);
  const academicYear=clean(req.query.academicYear);
  if(!validUuid(classId)) throw fail(400,'Choose a valid configured class.');
  if(!academicYear||academicYear.length>32) throw fail(400,'Academic year is required and must be 32 characters or fewer.');
  const classes=await readSchoolClassRows(pool,schoolId);
  const classRecord=classes.find(item=>String(item.id)===classId&&item.status!=='Inactive');
  if(!classRecord) throw fail(404,'Active class was not found. Refresh Performance Report and try again.');
  const subjectResult=await pool.query('SELECT s.id,s.name,s.code FROM school_class_subject_mappings m JOIN school_subjects s ON s.school_id=m.school_id AND s.id=m.subject_id WHERE m.school_id=$1 AND m.school_class_id=$2 AND m.is_optional=true AND s.is_active=true ORDER BY lower(s.name)',[schoolId,classId]);
  const configuredClasses=await getConfiguredClassesForSchool(pool,schoolId);
  const studentResult=await pool.query("SELECT s.* FROM students s WHERE s.school_id=$1 AND s.academic_year=$2 AND s.status='Active' ORDER BY lower(s.name),s.student_code",[schoolId,academicYear]);
  const roster=studentResult.rows.map(row=>({...mapStudentWithConfiguredClass(row,configuredClasses),studentDbId:String(row.id)})).filter(student=>student.className===classRecord.name&&normalizedSection(student.section)===normalizedSection(classRecord.section));
  const selectionResult=await pool.query('SELECT student_id AS "studentId",subject_id AS "subjectId" FROM school_student_optional_subject_selections WHERE school_id=$1 AND school_class_id=$2 AND academic_year=$3',[schoolId,classId,academicYear]);
  const allowed=new Set(subjectResult.rows.map(row=>String(row.id))), byStudent=new Map();
  for(const row of selectionResult.rows){const sid=String(row.studentId),sub=String(row.subjectId);if(!allowed.has(sub))continue;if(!byStudent.has(sid))byStudent.set(sid,[]);byStudent.get(sid).push(sub);}
  res.json({class:{id:String(classRecord.id),name:classRecord.name,section:classRecord.section,displayName:classRecord.displayName||''},academicYear,subjects:subjectResult.rows,
    students:roster.map(student=>mapOptionalSubjectRosterStudent(student,student.studentDbId,byStudent.get(String(student.studentDbId))||[]))});
}));
app.put('/api/student-optional-subjects/:studentId', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req), studentId=clean(req.params.studentId);
  if(!validUuid(studentId)) throw fail(400,'Choose a valid student record.');
  const parsed=parseOptionalSubjectSelectionInput(req.body,validUuid);
  if(!parsed.ok) throw fail(400,parsed.message);
  const {classId,academicYear,subjectIds}=parsed.value, client=await pool.connect();
  try{
    await client.query('BEGIN');
    const cr=await client.query("SELECT id,class_name AS name,COALESCE(section,'') AS section FROM school_classes WHERE school_id=$1 AND id=$2 AND is_active=true FOR UPDATE",[schoolId,classId]);
    const cls=cr.rows[0];if(!cls)throw fail(404,'Active class was not found. Refresh and try again.');
    const sr=await client.query('SELECT * FROM students WHERE school_id=$1 AND id=$2 FOR UPDATE',[schoolId,studentId]);
    const student=sr.rows[0];if(!student)throw fail(404,'Student was not found in this school.');
    if(student.status!=='Active')throw fail(409,'Optional subjects can be assigned only to active students.');
    if(clean(student.academic_year)!==academicYear)throw fail(409,'Student academic year has changed. Refresh the selection list.');
    const configured=await getConfiguredClassesForSchool(client,schoolId), mapped=mapStudentWithConfiguredClass(student,configured);
    if(classNameMatchKey(mapped.className)!==classNameMatchKey(cls.name)||normalizedSection(mapped.section)!==normalizedSection(cls.section))throw fail(409,'Student is no longer assigned to this class and section. Refresh the selection list.');
    const allowedRows=await client.query('SELECT m.subject_id AS id FROM school_class_subject_mappings m JOIN school_subjects s ON s.school_id=m.school_id AND s.id=m.subject_id WHERE m.school_id=$1 AND m.school_class_id=$2 AND m.is_optional=true AND s.is_active=true',[schoolId,classId]);
    const allowed=new Set(allowedRows.rows.map(row=>String(row.id)));
    if(!selectionContainsOnlyAllowedSubjects(subjectIds,allowed))throw fail(400,'Every selected subject must be an active optional subject mapped to the chosen class.');
    await client.query('DELETE FROM school_student_optional_subject_selections WHERE school_id=$1 AND student_id=$2 AND school_class_id=$3 AND academic_year=$4',[schoolId,studentId,classId,academicYear]);
    for(const subjectId of subjectIds) await client.query('INSERT INTO school_student_optional_subject_selections(school_id,student_id,school_class_id,subject_id,academic_year,selected_by) VALUES($1,$2,$3,$4,$5,$6)',[schoolId,studentId,classId,subjectId,academicYear,req.user.id]);
    await client.query('COMMIT');res.json({ok:true,studentId,classId,academicYear,subjectIds});
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}));
app.get('/api/school-subjects', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  res.json({subjects:await readSchoolSubjectRows(pool,schoolId)});
}));
app.put('/api/school-subjects/sync', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const raw= req.body?.subjects;
  if(!Array.isArray(raw)||raw.length>1000) throw fail(400,'Manage Subjects must send up to 1,000 subject records.');
  const names=new Set(),codes=new Set();
  const subjects=raw.map(item=>{
    const id=clean(item?.id),name=clean(item?.name),code=clean(item?.code),category=clean(item?.category),description=clean(item?.description);
    const status=String(item?.status||'Active').toLowerCase()==='inactive'?'Inactive':'Active';
    if(!name) throw fail(400,'Subject name is required.');
    if(name.length>150||code.length>50||category.length>100||description.length>1000) throw fail(400,'Subject name, code, category, or description exceeds the allowed length.');
    if(id&&!validUuid(id)) throw fail(400,'A subject has an invalid database ID. Refresh Manage Subjects and try again.');
    const nk=name.toLocaleLowerCase(),ck=code.toLocaleLowerCase();
    if(names.has(nk)) throw fail(409,'Duplicate subject name: '+name+'.');
    if(code&&codes.has(ck)) throw fail(409,'Duplicate subject code: '+code+'.');
    names.add(nk);if(code)codes.add(ck);
    const subjectTypes=[...new Set((Array.isArray(item?.subjectTypes)?item.subjectTypes:[]).map(clean).filter(Boolean))];
    if(subjectTypes.some(type=>type.length>150)) throw fail(400,'Subject type names must be 150 characters or fewer.');
    const classes=[...new Set((Array.isArray(item?.classes)?item.classes:String(item?.classesText||'').split(',')).map(clean).filter(Boolean))];
    if(classes.some(className=>className.length>180)) throw fail(400,'Applicable class names must be 180 characters or fewer.');
    return {id:id||null,name,code,category,description,status,subjectTypes,classes};
  });
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const current=await client.query('SELECT id FROM school_subjects WHERE school_id=$1',[schoolId]);
    const currentIds=new Set(current.rows.map(row=>String(row.id)));
    const retained=[];
    for(const item of subjects){
      let categoryId=null;
      if(item.category){
        const result=await client.query('INSERT INTO school_subject_categories(school_id,name) VALUES($1,$2) ON CONFLICT (school_id,lower(name)) DO UPDATE SET is_active=true,updated_at=now() RETURNING id',[schoolId,item.category]);
        categoryId=result.rows[0].id;
      }
      let subjectId;
      if(item.id){
        if(!currentIds.has(item.id)) throw fail(404,'Subject record was not found. Refresh Manage Subjects and try again.');
        const result=await client.query('UPDATE school_subjects SET name=$3,code=$4,category_id=$5,description=$6,is_active=$7,updated_at=now() WHERE school_id=$1 AND id=$2 RETURNING id',[schoolId,item.id,item.name,item.code,categoryId,item.description,item.status==='Active']);
        subjectId=result.rows[0]?.id;
      }else{
        const result=await client.query('INSERT INTO school_subjects(school_id,name,code,category_id,description,is_active) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[schoolId,item.name,item.code,categoryId,item.description,item.status==='Active']);
        subjectId=result.rows[0].id;
      }
      retained.push(String(subjectId));
      await client.query('DELETE FROM school_subject_type_assignments WHERE school_id=$1 AND school_subject_id=$2',[schoolId,subjectId]);
      await client.query('DELETE FROM school_subject_applicable_classes WHERE school_id=$1 AND school_subject_id=$2',[schoolId,subjectId]);
      for(const typeName of item.subjectTypes){
        const typeResult=await client.query('INSERT INTO school_subject_types(school_id,name) VALUES($1,$2) ON CONFLICT (school_id,lower(name)) DO UPDATE SET is_active=true,updated_at=now() RETURNING id',[schoolId,typeName]);
        await client.query('INSERT INTO school_subject_type_assignments(school_id,school_subject_id,subject_type_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[schoolId,subjectId,typeResult.rows[0].id]);
      }
      for(const className of item.classes){
        await client.query('INSERT INTO school_subject_applicable_classes(school_id,school_subject_id,class_name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[schoolId,subjectId,className]);
      }
    }
    await client.query('DELETE FROM school_subjects WHERE school_id=$1 AND NOT (id=ANY($2::uuid[]))',[schoolId,retained]);
    await client.query('COMMIT');
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    if(error.code==='23505') throw fail(409,'A subject name or code is already in use.');
    throw error;
  }finally{client.release();}
  res.json({ok:true,subjects:await readSchoolSubjectRows(pool,schoolId)});
}));

app.get('/api/school-subject-categories', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const result=await pool.query('SELECT id,name,is_active AS "isActive",created_at AS "createdAt",updated_at AS "updatedAt" FROM school_subject_categories WHERE school_id=$1 ORDER BY lower(name)',[schoolId]);
  res.json({categories:result.rows});
}));
app.put('/api/school-subject-categories/sync', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const raw=Array.isArray(req.body?.categories)?req.body.categories:[];
  if(raw.length>500) throw fail(400,'Up to 500 subject categories can be saved at once.');
  const items=raw.map(item=>({name:clean(item?.name),id:clean(item?.id)})).filter(item=>item.name);
  const seenNames=new Set(), seenIds=new Set();
  for(const item of items){
    if(item.name.length>100) throw fail(400,'Category names must be 100 characters or fewer.');
    const key=item.name.toLocaleLowerCase();
    if(seenNames.has(key)) throw fail(409,'Duplicate subject category: '+item.name+'.');
    seenNames.add(key);
    if(item.id){
      if(!validUuid(item.id)) throw fail(400,'A subject category has an invalid database ID. Refresh and try again.');
      if(seenIds.has(item.id)) throw fail(409,'A subject category was included more than once.');
      seenIds.add(item.id);
    }
  }
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const current=await client.query('SELECT id FROM school_subject_categories WHERE school_id=$1',[schoolId]);
    const currentIds=new Set(current.rows.map(row=>String(row.id)));
    const retained=[];
    for(const item of items){
      let id;
      if(item.id){
        if(!currentIds.has(item.id)) throw fail(404,'Subject category not found. Refresh and try again.');
        const result=await client.query('UPDATE school_subject_categories SET name=$3,is_active=true,updated_at=now() WHERE school_id=$1 AND id=$2 RETURNING id',[schoolId,item.id,item.name]);
        id=result.rows[0]?.id;
      }else{
        const result=await client.query('INSERT INTO school_subject_categories(school_id,name) VALUES($1,$2) RETURNING id',[schoolId,item.name]);
        id=result.rows[0].id;
      }
      retained.push(String(id));
    }
    await client.query('DELETE FROM school_subject_categories WHERE school_id=$1 AND NOT (id=ANY($2::uuid[]))',[schoolId,retained]);
    await client.query('COMMIT');
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    if(error.code==='23505') throw fail(409,'A subject category name is already in use.');
    throw error;
  }finally{client.release();}
  const result=await pool.query('SELECT id,name,is_active AS "isActive",created_at AS "createdAt",updated_at AS "updatedAt" FROM school_subject_categories WHERE school_id=$1 ORDER BY lower(name)',[schoolId]);
  res.json({ok:true,categories:result.rows});
}));

app.get('/api/school-subject-types', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const result=await pool.query('SELECT id,name,is_active AS "isActive",created_at AS "createdAt",updated_at AS "updatedAt" FROM school_subject_types WHERE school_id=$1 ORDER BY lower(name)',[schoolId]);
  res.json({subjectTypes:result.rows});
}));
app.put('/api/school-subject-types/sync', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const raw=Array.isArray(req.body?.subjectTypes)?req.body.subjectTypes:[];
  if(raw.length>500) throw fail(400,'Up to 500 subject types can be saved at once.');
  const items=raw.map(item=>({name:clean(item?.name),id:clean(item?.id)})).filter(item=>item.name);
  const seenNames=new Set(), seenIds=new Set();
  for(const item of items){
    if(item.name.length>150) throw fail(400,'Subject type names must be 150 characters or fewer.');
    const key=item.name.toLocaleLowerCase();
    if(seenNames.has(key)) throw fail(409,'Duplicate subject type: '+item.name+'.');
    seenNames.add(key);
    if(item.id){
      if(!validUuid(item.id)) throw fail(400,'A subject type has an invalid database ID. Refresh and try again.');
      if(seenIds.has(item.id)) throw fail(409,'A subject type was included more than once.');
      seenIds.add(item.id);
    }
  }
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const current=await client.query('SELECT id FROM school_subject_types WHERE school_id=$1',[schoolId]);
    const currentIds=new Set(current.rows.map(row=>String(row.id)));
    const retained=[];
    for(const item of items){
      let id;
      if(item.id){
        if(!currentIds.has(item.id)) throw fail(404,'Subject type not found. Refresh and try again.');
        const result=await client.query('UPDATE school_subject_types SET name=$3,is_active=true,updated_at=now() WHERE school_id=$1 AND id=$2 RETURNING id',[schoolId,item.id,item.name]);
        id=result.rows[0]?.id;
      }else{
        const result=await client.query('INSERT INTO school_subject_types(school_id,name) VALUES($1,$2) RETURNING id',[schoolId,item.name]);
        id=result.rows[0].id;
      }
      retained.push(String(id));
    }
    await client.query('DELETE FROM school_subject_types WHERE school_id=$1 AND NOT (id=ANY($2::uuid[]))',[schoolId,retained]);
    await client.query('COMMIT');
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    if(error.code==='23505') throw fail(409,'A subject type name is already in use.');
    throw error;
  }finally{client.release();}
  const result=await pool.query('SELECT id,name,is_active AS "isActive",created_at AS "createdAt",updated_at AS "updatedAt" FROM school_subject_types WHERE school_id=$1 ORDER BY lower(name)',[schoolId]);
  res.json({ok:true,subjectTypes:result.rows});
}));

app.get('/api/school-classes', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  res.json({classes:await readSchoolClassRows(pool,schoolId)});
}));

app.put('/api/school-classes/sync', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const rawClasses=req.body?.classes;
  if(!Array.isArray(rawClasses)||rawClasses.length>500) throw fail(400,'Manage Classes must send a class list of up to 500 records.');
  const seen=new Set();
  const classes=rawClasses.map((item,index)=>{
    const name=clean(item?.name);
    const section=clean(item?.section);
    const displayName=clean(item?.displayName);
    const displayOrderRaw=Number(item?.displayOrder ?? index+1);
    const displayOrder=Number.isFinite(displayOrderRaw)?Math.max(0,Math.min(100000,Math.trunc(displayOrderRaw))):index+1;
    const status=String(item?.status||'Active').toLowerCase()==='inactive'?'Inactive':'Active';
    const availableFrom=clean(item?.availableFrom);
    const availableTo=clean(item?.availableTo);
    const id=clean(item?.id);
    if(!name) throw fail(400,'Every class must have a class name.');
    if(name.length>100||section.length>50||displayName.length>120) throw fail(400,'Class name, section, or display name exceeds its maximum length.');
    if(availableFrom&&!/^\d{4}-\d{2}-\d{2}$/.test(availableFrom)) throw fail(400,'Available From must be a valid date.');
    if(availableTo&&!/^\d{4}-\d{2}-\d{2}$/.test(availableTo)) throw fail(400,'Available To must be a valid date.');
    if(availableFrom&&availableTo&&availableFrom>availableTo) throw fail(400,'Available To must be on or after Available From.');
    if(id&&!validUuid(id)) throw fail(400,'A class record has an invalid database ID. Refresh Manage Classes and try again.');
    const key=name.toLocaleLowerCase()+'::'+section.toLocaleLowerCase();
    if(seen.has(key)) throw fail(409,'Duplicate class and section: '+name+(section?' '+section:'')+'.');
    seen.add(key);
    const subjectMappings=(Array.isArray(item?.subjectMappings)?item.subjectMappings:[])
      .filter(mapping=>mapping&&mapping.enabled!==false)
      .map(mapping=>{
        const subjectId=clean(mapping.subjectId);
        const subjectName=clean(mapping.subjectName);
        const teacherId=clean(mapping.teacherId);
        if(!validUuid(subjectId)) throw fail(400,'Choose a saved subject from Manage Subjects.');
        if(subjectName.length>150) throw fail(400,'Subject names must be 150 characters or fewer.');
        if(teacherId&&!validUuid(teacherId)) throw fail(400,'A teacher mapping has an invalid ID. Refresh Manage Classes and try again.');
        return {
          subjectId,
          subjectName,
          extraCurricular:Boolean(mapping.extraCurricular),
          optional:Boolean(mapping.optional),
          packageSubject:Boolean(mapping.packageSubject),
          language:Boolean(mapping.language)
        };
      });
    const subjectKeys=new Set();
    for(const mapping of subjectMappings){
      if(subjectKeys.has(mapping.subjectId)) throw fail(409,'A subject is mapped more than once to '+name+(section?' '+section:'')+'.');
      subjectKeys.add(mapping.subjectId);
    }
    return {
      id:id||null,name,section,displayName,displayOrder,status,
      availableFrom:availableFrom||null,availableTo:availableTo||null,
      virtualClassroom:Boolean(item?.virtualClassroom),hiddenGrade:Boolean(item?.hiddenGrade),
      subjectMappings
    };
  });
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const current=await client.query('SELECT id FROM school_classes WHERE school_id=$1',[schoolId]);
    const currentIds=new Set(current.rows.map(row=>String(row.id)));
    const retainedIds=[];
    for(const item of classes){
      let classId;
      const values=[schoolId,item.name,item.section,item.displayOrder,item.status==='Active',item.displayName,item.availableFrom,item.availableTo,item.virtualClassroom,item.hiddenGrade];
      if(item.id){
        if(!currentIds.has(item.id)) throw fail(404,'Class record was not found. Refresh Manage Classes and try again.');
        const updated=await client.query(
          'UPDATE school_classes SET class_name=$3,section=$4,grade_order=$5,is_active=$6,display_name=$7,available_from=$8::date,available_to=$9::date,virtual_classroom=$10,hidden_grade=$11,updated_at=now() WHERE school_id=$1 AND id=$2 RETURNING id',
          [schoolId,item.id,...values.slice(1)]
        );
        classId=updated.rows[0]?.id;
      }else{
        const inserted=await client.query(
          'INSERT INTO school_classes(school_id,class_name,section,grade_order,is_active,display_name,available_from,available_to,virtual_classroom,hidden_grade) VALUES($1,$2,$3,$4,$5,$6,$7::date,$8::date,$9,$10) RETURNING id',
          values
        );
        classId=inserted.rows[0].id;
      }
      if(!classId) throw fail(500,'Class record could not be saved.');
      retainedIds.push(String(classId));
      await client.query('DELETE FROM school_class_subject_mappings WHERE school_id=$1 AND school_class_id=$2',[schoolId,classId]);
      for(const mapping of item.subjectMappings){
        const subject=await client.query('SELECT id FROM school_subjects WHERE school_id=$1 AND id=$2 AND is_active=true', [schoolId,mapping.subjectId]);
        if(!subject.rowCount) throw fail(400,'Choose an active subject saved in Manage Subjects.');
        if(mapping.teacherId){
          const teacher=await client.query('SELECT id FROM people WHERE school_id=$1 AND id=$2 AND person_type=\'teacher\' AND status=\'Active\'',[schoolId,mapping.teacherId]);
          if(!teacher.rowCount) throw fail(400,'Choose an active teacher belonging to this school.');
        }
        await client.query(
          'INSERT INTO school_class_subject_mappings(school_id,school_class_id,subject_id,teacher_person_id,extra_curricular,is_optional,package_subject,is_language) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
          [schoolId,classId,mapping.subjectId,mapping.teacherId,mapping.extraCurricular,mapping.optional,mapping.packageSubject,mapping.language]
        );
      }
    }
    await client.query('DELETE FROM school_classes WHERE school_id=$1 AND NOT (id=ANY($2::uuid[]))',[schoolId,retainedIds]);
    await client.query('COMMIT');
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    if(error.code==='23505') throw fail(409,'A class with this name and section already exists.');
    throw error;
  } finally { client.release(); }
  res.json({ok:true,classes:await readSchoolClassRows(pool,schoolId)});
}));

app.get('/api/external-link-grades', authenticate, requireRole(...externalLinkRoles), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const result=await pool.query(
    'SELECT id,CASE WHEN COALESCE(section,\'\')<>\'\' AND lower(right(btrim(class_name),length(btrim(section))))<>lower(btrim(section)) THEN btrim(class_name)||\' \'||btrim(section) ELSE btrim(class_name) END AS "className",class_name AS "baseClassName",COALESCE(section,\'\') AS section,grade_order AS "gradeOrder",is_active AS "isActive" FROM school_classes WHERE school_id=$1 ORDER BY grade_order,lower(class_name),lower(section)',
    [schoolId]
  );
  res.json({grades:result.rows});
}));
app.get('/api/external-links', authenticate, requireRole(...externalLinkRoles), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const result=await pool.query(
    `SELECT l.id,l.url,l.description,l.only_daycare_student AS "onlyDaycareStudent",l.only_daycare_timing AS "onlyDaycareTiming",l.available_to_all_grades AS "availableToAllGrades",to_char(l.available_from,'HH24:MI') AS "availableFrom",to_char(l.available_to,'HH24:MI') AS "availableTo",l.is_cctv_camera_link AS "isCctvCameraLink",l.created_at AS "createdAt",l.updated_at AS "updatedAt",COALESCE(array_agg(lc.school_class_id) FILTER (WHERE lc.school_class_id IS NOT NULL),ARRAY[]::uuid[]) AS "gradeIds" FROM external_links l LEFT JOIN external_link_classes lc ON lc.school_id=l.school_id AND lc.external_link_id=l.id WHERE l.school_id=$1 GROUP BY l.id ORDER BY lower(l.url),l.created_at DESC`,
    [schoolId]
  );
  res.json({links:result.rows});
}));
app.post('/api/external-links', authenticate, requireRole(...externalLinkRoles), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const input=externalLinkInput(req.body);
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await validateExternalLinkGrades(client,schoolId,input.gradeIds);
    const result=await client.query(
      'INSERT INTO external_links(school_id,url,description,only_daycare_student,only_daycare_timing,available_to_all_grades,available_from,available_to,is_cctv_camera_link) VALUES($1,$2,$3,$4,$5,$6,$7::time,$8::time,$9) RETURNING id',
      [schoolId,input.url,input.description,input.onlyDaycareStudent,input.onlyDaycareTiming,input.availableToAllGrades,input.availableFrom,input.availableTo,input.isCctvCameraLink]
    );
    await replaceExternalLinkGrades(client,schoolId,result.rows[0].id,input);
    await client.query('COMMIT');
    res.status(201).json({ok:true,id:result.rows[0].id});
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { client.release(); }
}));
app.patch('/api/external-links/:linkId', authenticate, requireRole(...externalLinkRoles), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const linkId=String(req.params.linkId);
  if(!validUuid(linkId)) throw fail(400,'Invalid external link ID.');
  const input=externalLinkInput(req.body);
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const current=await client.query('SELECT id FROM external_links WHERE school_id=$1 AND id=$2 FOR UPDATE',[schoolId,linkId]);
    if(!current.rowCount) throw fail(404,'External link not found.');
    await validateExternalLinkGrades(client,schoolId,input.gradeIds);
    await client.query(
      'UPDATE external_links SET url=$3,description=$4,only_daycare_student=$5,only_daycare_timing=$6,available_to_all_grades=$7,available_from=$8::time,available_to=$9::time,is_cctv_camera_link=$10,updated_at=now() WHERE school_id=$1 AND id=$2',
      [schoolId,linkId,input.url,input.description,input.onlyDaycareStudent,input.onlyDaycareTiming,input.availableToAllGrades,input.availableFrom,input.availableTo,input.isCctvCameraLink]
    );
    await replaceExternalLinkGrades(client,schoolId,linkId,input);
    await client.query('COMMIT');
    res.json({ok:true,id:linkId});
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { client.release(); }
}));
app.delete('/api/external-links/:linkId', authenticate, requireRole(...externalLinkRoles), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const linkId=String(req.params.linkId);
  if(!validUuid(linkId)) throw fail(400,'Invalid external link ID.');
  const result=await pool.query('DELETE FROM external_links WHERE school_id=$1 AND id=$2 RETURNING id',[schoolId,linkId]);
  if(!result.rowCount) throw fail(404,'External link not found.');
  res.json({ok:true});
}));

// Directory endpoints allow administrators to create real recipient identities for notice targeting and view reports.
app.get('/api/people', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const type=clean(req.query.type);
  const result=await pool.query(`SELECT id,person_type AS "personType",external_id AS "externalId",
    first_name AS "firstName",middle_name AS "middleName",last_name AS "lastName",full_name AS "fullName",
    email,contact_number AS "contactNumber",alternate_contact_number AS "alternateContactNumber",
    date_of_birth AS "dateOfBirth",address,city,state,class_name AS "className",section,
    roll_number AS "rollNumber",enrollment_number AS "enrollmentNumber",status,route_name AS "routeName",
    day_care AS "dayCare",gender,last_seen AS "lastSeen",parent_guardian_name AS "parentGuardianName",
    metadata,created_at AS "createdAt",updated_at AS "updatedAt"
    FROM people WHERE school_id=$1 AND ($2='' OR person_type=$2) ORDER BY lower(full_name)`,[schoolId,type]);
  res.json({people:result.rows});
}));
app.post('/api/people', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const b=req.body||{};
  const type=clean(b.personType);
  const name=clean(b.fullName);
  if(!['student','parent','teacher','staff','day_care','guardian','other'].includes(type)||!name) throw fail(400,'Provide a valid person type and full name.');
  const nameParts=name.split(/\s+/);
  const metadata=b.metadata && typeof b.metadata==='object' && !Array.isArray(b.metadata) ? b.metadata : {};
  let externalId=clean(b.externalId)||null;
  if(['staff','teacher'].includes(type)){
    const staffDetails=metadata.staffDetails && typeof metadata.staffDetails==='object' ? metadata.staffDetails : {};
    if(!clean(staffDetails.joiningDate)) throw fail(400,'Joining date is required for staff.');
    const codeIsTaken=async code=>{
      const existing=await pool.query(`SELECT 1 FROM people
        WHERE school_id=$1 AND person_type IN ('staff','teacher') AND upper(external_id)=upper($2) LIMIT 1`,[schoolId,code]);
      return existing.rowCount>0;
    };
    if(!externalId || await codeIsTaken(externalId)){
      for(let attempt=0;attempt<12;attempt++){
        const candidate=`STF-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
        if(!(await codeIsTaken(candidate))){ externalId=candidate; break; }
      }
      if(!externalId || await codeIsTaken(externalId)) throw fail(503,'A unique employee code could not be generated. Please try again.');
    }
  }
  const result=await pool.query(`INSERT INTO people(
      school_id,person_type,external_id,first_name,middle_name,last_name,full_name,email,
      contact_number,alternate_contact_number,date_of_birth,address,city,state,gender,
      class_name,section,roll_number,enrollment_number,parent_guardian_name,status,route_name,day_care,metadata
    ) VALUES(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12,$13,$14,$15,
      $16,$17,$18,$19,$20,$21,$22,$23,$24::jsonb
    ) RETURNING id,person_type AS "personType",external_id AS "externalId",first_name AS "firstName",
      middle_name AS "middleName",last_name AS "lastName",full_name AS "fullName",email,
      contact_number AS "contactNumber",alternate_contact_number AS "alternateContactNumber",
      date_of_birth AS "dateOfBirth",address,city,state,gender,status,metadata`,
    [schoolId,type,externalId,clean(b.firstName)||nameParts[0],clean(b.middleName),
      clean(b.lastName)||nameParts.slice(1).join(' '),name,lower(b.email)||null,clean(b.contactNumber)||null,
      clean(b.alternateContactNumber)||null,clean(b.dateOfBirth)||null,clean(b.address)||null,clean(b.city)||null,
      clean(b.state)||null,clean(b.gender)||null,clean(b.className)||null,clean(b.section)||null,clean(b.rollNumber)||null,
      clean(b.enrollmentNumber)||null,clean(b.parentGuardianName)||null,clean(b.status)||'Active',
      clean(b.routeName)||null,Boolean(b.dayCare),JSON.stringify(metadata)]);
  await writeAudit(req,'person.created','person',result.rows[0].id,{personType:type});
  res.status(201).json({person:result.rows[0]});
}));
app.patch('/api/people/:personId', authenticate, requireRole('school_admin','principal','staff'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const b=req.body||{};
  const has=key=>Object.prototype.hasOwnProperty.call(b,key);
  const fullName=has('fullName')?clean(b.fullName):null;
  const parts=fullName?titleParts(fullName):null;
  const status=has('status')?clean(b.status):null;
  const type=has('personType')?clean(b.personType):null;
  if(status!==null&&!['Active','Inactive','Deactivated'].includes(status)) throw fail(400,'Contact status must be Active or Inactive.');
  if(type!==null&&!['student','parent','teacher','staff','day_care','guardian','other'].includes(type)) throw fail(400,'Choose a valid person type.');
  const metadata=has('metadata')&&b.metadata&&typeof b.metadata==='object'&&!Array.isArray(b.metadata)?b.metadata:null;
  const result=await pool.query(`UPDATE people SET
      full_name=CASE WHEN $3::boolean THEN $4 ELSE full_name END,
      first_name=CASE WHEN $5::boolean THEN $6 ELSE first_name END,
      middle_name=CASE WHEN $7::boolean THEN $8 ELSE middle_name END,
      last_name=CASE WHEN $9::boolean THEN $10 ELSE last_name END,
      external_id=CASE WHEN $11::boolean THEN $12 ELSE external_id END,
      email=CASE WHEN $13::boolean THEN $14 ELSE email END,
      contact_number=CASE WHEN $15::boolean THEN $16 ELSE contact_number END,
      alternate_contact_number=CASE WHEN $17::boolean THEN $18 ELSE alternate_contact_number END,
      date_of_birth=CASE WHEN $19::boolean THEN $20::date ELSE date_of_birth END,
      address=CASE WHEN $21::boolean THEN $22 ELSE address END,
      city=CASE WHEN $23::boolean THEN $24 ELSE city END,
      state=CASE WHEN $25::boolean THEN $26 ELSE state END,
      gender=CASE WHEN $27::boolean THEN $28 ELSE gender END,
      class_name=CASE WHEN $29::boolean THEN $30 ELSE class_name END,
      section=CASE WHEN $31::boolean THEN $32 ELSE section END,
      roll_number=CASE WHEN $33::boolean THEN $34 ELSE roll_number END,
      status=CASE WHEN $35::boolean THEN $36 ELSE status END,
      person_type=CASE WHEN $37::boolean THEN $38 ELSE person_type END,
      metadata=CASE WHEN $39::boolean THEN COALESCE(metadata,'{}'::jsonb) || $40::jsonb ELSE metadata END,
      updated_at=now()
    WHERE school_id=$1 AND id=$2 AND person_type<>'student' RETURNING id`,
    [schoolId,req.params.personId,
      has('fullName'),fullName,has('firstName'),has('firstName')?clean(b.firstName):(parts?.first||null),
      has('middleName'),clean(b.middleName),has('lastName'),has('lastName')?clean(b.lastName):(parts?.last||null),
      has('externalId'),clean(b.externalId)||null,has('email'),lower(b.email)||null,
      has('contactNumber'),clean(b.contactNumber)||null,has('alternateContactNumber'),clean(b.alternateContactNumber)||null,
      has('dateOfBirth'),clean(b.dateOfBirth)||null,has('address'),clean(b.address)||null,
      has('city'),clean(b.city)||null,has('state'),clean(b.state)||null,has('gender'),clean(b.gender)||null,
      has('className'),clean(b.className)||null,has('section'),clean(b.section)||null,
      has('rollNumber'),clean(b.rollNumber)||null,has('status'),status,has('personType'),type,
      metadata!==null,JSON.stringify(metadata||{})]);
  if(!result.rowCount) throw fail(404,'Contact not found in this school.');
  await writeAudit(req,'contact.updated','person',req.params.personId,{fields:Object.keys(b)});
  res.json({ok:true,id:result.rows[0].id});
}));
app.get('/api/users', authenticate, requireRole('school_admin','principal'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const result=await pool.query(`SELECT u.id,u.person_id AS "personId",u.email,u.role,u.first_name AS "firstName",u.last_name AS "lastName",u.is_active AS "isActive",u.must_change_password AS "mustChangePassword",u.last_login_at AS "lastLoginAt",u.created_at AS "createdAt",p.full_name AS "linkedPerson",p.person_type AS "personType"
    FROM user_accounts u LEFT JOIN people p ON p.id=u.person_id AND p.school_id=u.school_id WHERE u.school_id=$1 ORDER BY u.created_at DESC`,[schoolId]);
  res.json({users:result.rows});
}));
app.patch('/api/users/:userId', authenticate, requireRole('school_admin','principal'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const body=req.body||{};
  if(typeof body.isActive==='boolean'){
    if(req.params.userId===req.user.id&&!body.isActive) throw fail(400,'You cannot deactivate your own signed-in account.');
    const result=await pool.query(`UPDATE user_accounts SET is_active=$3,updated_at=now() WHERE school_id=$1 AND id=$2 AND role<>'super_admin' RETURNING id,email,role,is_active AS "isActive",person_id AS "personId",last_login_at AS "lastLoginAt"`,[schoolId,req.params.userId,body.isActive]);
    if(!result.rowCount) throw fail(404,'User account not found in this school.');
    await writeAudit(req,body.isActive?'user.activated':'user.deactivated','user_account',req.params.userId,{});
    return res.json({user:result.rows[0]});
  }
  if(Object.prototype.hasOwnProperty.call(body,'email')){
    const email=lower(body.email);
    if(!email.includes('@')) throw fail(400,'Provide a valid email address or phone-login identifier.');
    const result=await pool.query(`UPDATE user_accounts SET email=$3,updated_at=now() WHERE school_id=$1 AND id=$2 AND role<>'super_admin' RETURNING id,email,role,is_active AS "isActive",person_id AS "personId",last_login_at AS "lastLoginAt"`,[schoolId,req.params.userId,email]);
    if(!result.rowCount) throw fail(404,'User account not found in this school.');
    await writeAudit(req,'user.email_updated','user_account',req.params.userId,{});
    return res.json({user:result.rows[0]});
  }
  const role=clean(body.role);
  if(!role||!['school_admin','principal','teacher','staff','transport_admin'].includes(role)) throw fail(400,'Provide a valid school role.');
  const result=await pool.query(`UPDATE user_accounts SET role=$3,updated_at=now() WHERE school_id=$1 AND id=$2 AND role<>'super_admin' RETURNING id,email,role,is_active AS "isActive",person_id AS "personId",last_login_at AS "lastLoginAt"`,[schoolId,req.params.userId,role]);
  if(!result.rowCount) throw fail(404,'User account not found in this school.');
  await writeAudit(req,'user.role_updated','user_account',req.params.userId,{role});
  res.json({user:result.rows[0]});
}));
app.post('/api/users/:userId/reset-password', authenticate, requireRole('school_admin','principal'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);const target=await pool.query(`SELECT id,email FROM user_accounts WHERE school_id=$1 AND id=$2 AND role<>'super_admin'`, [schoolId,req.params.userId]);
  if(!target.rowCount)throw fail(404,'User account not found in this school.');
  const temporaryPassword=randomBytes(12).toString('base64url');
  await pool.query('UPDATE user_accounts SET password_hash=$3,must_change_password=true,updated_at=now() WHERE school_id=$1 AND id=$2',[schoolId,req.params.userId,await bcrypt.hash(temporaryPassword,12)]);
  await writeAudit(req,'user.password_reset','user_account',req.params.userId,{});
  res.json({ok:true,email:target.rows[0].email,temporaryPassword,message:'Share this temporary password securely. The user must change it after signing in.'});
}));
app.patch('/api/users/:userId/password', authenticate, requireRole('school_admin','principal'), asyncHandler(async(req,res)=>{
  const schoolId=await getSchoolIdForRequest(req);
  const newPassword=String(req.body?.newPassword||'');
  if(newPassword.length<10) throw fail(400,'Password must contain at least 10 characters.');
  const result=await pool.query(`UPDATE user_accounts SET password_hash=$3,must_change_password=true,updated_at=now()
    WHERE school_id=$1 AND id=$2 AND role<>'super_admin' RETURNING id,email,role`,
    [schoolId,req.params.userId,await bcrypt.hash(newPassword,12)]);
  if(!result.rowCount) throw fail(404,'User account not found in this school.');
  await writeAudit(req,'user.password_changed_by_admin','user_account',req.params.userId,{});
  res.json({ok:true,message:'Password updated. The user must change it after signing in.'});
}));


app.post('/api/users', authenticate, requireRole('school_admin','principal'), asyncHandler(async(req,res)=>{const schoolId=await getSchoolIdForRequest(req);const b=req.body||{};const email=lower(b.email);const password=String(b.password||'');const role=clean(b.role);if(!email.includes('@')||password.length<10||!validRole(role)||role==='super_admin')throw fail(400,'Provide a valid email, a password of at least 10 characters, and a school role.');const personId=clean(b.personId)||null;if(personId){const person=await pool.query('SELECT id FROM people WHERE school_id=$1 AND id=$2',[schoolId,personId]);if(!person.rowCount)throw fail(404,'Linked person does not belong to this school.');const linked=await pool.query('SELECT id FROM user_accounts WHERE school_id=$1 AND person_id=$2 AND is_active=true LIMIT 1',[schoolId,personId]);if(linked.rowCount)throw fail(409,'This person already has an active login account.');}const result=await pool.query('INSERT INTO user_accounts(school_id,person_id,email,password_hash,role,first_name,last_name,must_change_password) VALUES($1,$2,$3,$4,$5,$6,$7,true) RETURNING id,email,role,first_name,last_name,person_id',[schoolId,personId,email,await bcrypt.hash(password,12),role,clean(b.firstName),clean(b.lastName)]);res.status(201).json({user:result.rows[0]});}));

// Static production web bundle; Vite proxies /api to this server during development.
const distPath = path.join(projectRoot, 'dist');
try {
  await readFile(path.join(distPath, 'index.html'));
  app.use(express.static(distPath, { index: false, maxAge: isProduction ? '1h' : 0 }));
  app.get('*', (req,res,next)=>{ if(req.path.startsWith('/api/')) return next(); res.sendFile(path.join(distPath,'index.html')); });
} catch { /* Development mode serves the web client through Vite. */ }

app.use((error, req, res, _next) => {
  const status=Number(error.status||500);
  if(status>=500)console.error(error);
  res.status(status).json({ error: status>=500 ? 'An unexpected server error occurred.' : error.message, code: status===401?'UNAUTHENTICATED':status===403?'FORBIDDEN':status===404?'NOT_FOUND':'API_ERROR' });
});

async function start(){
  // Database changes are opt-in. Run "npm run db:migrate" explicitly after approval.
  if(process.env.AUTO_MIGRATE==='true') await migrate();
  // Demo seeding is also opt-in to avoid modifying an existing school database on every startup.
  if(process.env.SEED_DEMO_DATA==='true'){
    const { spawnSync }=await import('node:child_process');
    const result=spawnSync(process.execPath,[path.join(here,'seed.js')],{stdio:'inherit',env:process.env});
    if(result.status!==0) throw new Error('Database seed failed. Check the database connection and environment values.');
  }
  const messageScheduler = setInterval(async () => {
    try {
      await pool.query("UPDATE messages SET status='sent',sent_at=now() WHERE status='scheduled' AND scheduled_at IS NOT NULL AND scheduled_at<=now()");
    } catch (error) {
      console.error('Scheduled message delivery check failed:', error.message);
    }
  }, 15000);
  messageScheduler.unref();
  app.listen(port,'0.0.0.0',()=>console.log(`School Diary full-stack server listening on http://localhost:${port}`));
}
start().catch(error=>{console.error('Could not start School Diary:',error.message);process.exit(1);});
