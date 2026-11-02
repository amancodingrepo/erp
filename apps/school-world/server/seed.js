import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import initialStudents from '../src/student-data.js';

const academicYearNow = (date = new Date()) => {
  const year = date.getFullYear();
  const start = date.getMonth() >= 3 ? year : year - 1;
  return `${start}-${start + 1}`;
};
const pastYears = new Set(initialStudents.map((student) => student.academicYear).filter(Boolean));
const currentYear = academicYearNow();
const defaultRoutes = ['MP09AF3494', 'MP09AF6341', 'MP09AF6342', 'MP09AF6992'];

async function ensureAcademicYear(client, schoolId, label, current = false) {
  if (current) await client.query('UPDATE academic_years SET is_current=false WHERE school_id=$1', [schoolId]);
  const result = await client.query(
    `INSERT INTO academic_years(school_id,label,is_current) VALUES($1,$2,$3)
     ON CONFLICT(school_id,label) DO UPDATE SET is_current=EXCLUDED.is_current RETURNING id`,
    [schoolId, label, current]
  );
  return result.rows[0].id;
}

async function ensurePerson(client, schoolId, student) {
  const existing = await client.query('SELECT id FROM people WHERE school_id=$1 AND person_type=\'student\' AND external_id=$2', [schoolId, String(student.id)]);
  if (existing.rowCount) return existing.rows[0].id;
  const parts = String(student.name || '').trim().split(/\s+/);
  const lastSeenValue = String(student.lastSeen ?? '').trim();
  const placeholderTimestamps = new Set(['', '-', '—', '–', 'n/a', 'na', 'null', 'undefined']);
  const parsedLastSeen = placeholderTimestamps.has(lastSeenValue.toLowerCase()) ? null : new Date(lastSeenValue);
  const lastSeenAt = parsedLastSeen && !Number.isNaN(parsedLastSeen.getTime()) ? parsedLastSeen.toISOString() : null;
  const result = await client.query(
    `INSERT INTO people(school_id,person_type,external_id,first_name,last_name,full_name,contact_number,alternate_contact_number,class_name,section,roll_number,enrollment_number,parent_guardian_name,email,gender,date_of_birth,address,city,state,status,route_name,last_seen,metadata)
     VALUES($1,'student',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NULLIF($15,'')::date,$16,$17,$18,$19,$20,$21,$22::jsonb) RETURNING id`,
    [schoolId,String(student.id),parts[0]||'',parts.slice(1).join(' '),student.name||'',student.phone||'',student.alternatePhone||'',student.className||'',student.section||'',student.rollNumber||'',student.enrollmentNumber||String(student.id),student.parent||student.father||'',student.email||'',student.gender||'',student.dob||'',student.address||'',student.city||'',student.state||'',student.status||'Active',student.routeName||'',lastSeenAt,JSON.stringify({ source: 'seed-import' })]
  );
  return result.rows[0].id;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const schoolName = process.env.DEFAULT_SCHOOL_NAME || 'Sanford School';
    const schoolCode = process.env.DEFAULT_SCHOOL_CODE || 'SANFORD';
    let school = await client.query('SELECT id FROM schools WHERE code=$1', [schoolCode]);
    let schoolId;
    if (school.rowCount) schoolId = school.rows[0].id;
    else {
      const created = await client.query('INSERT INTO schools(name,code,slug,config) VALUES($1,$2,$3,$4::jsonb) RETURNING id', [schoolName,schoolCode,schoolCode.toLowerCase(),JSON.stringify({schoolName,classes:[]})]);
      schoolId = created.rows[0].id;
    }
    // Keep administrator-managed school branding; seed settings are used only when creating the tenant.

    await ensureAcademicYear(client, schoolId, currentYear, true);
    for (const label of pastYears) await ensureAcademicYear(client, schoolId, label, label === currentYear);

    const superEmail = (process.env.DEFAULT_SUPERADMIN_EMAIL || 'superadmin@schooldiary.local').toLowerCase();
    const superPassword = process.env.DEFAULT_SUPERADMIN_PASSWORD || 'SuperAdmin123!';
    const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@sanford.local').toLowerCase();
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!';
    if (!(await client.query('SELECT 1 FROM user_accounts WHERE lower(email)=lower($1)',[superEmail])).rowCount) {
      await client.query('INSERT INTO user_accounts(email,password_hash,role,first_name,last_name,must_change_password) VALUES($1,$2,\'super_admin\',$3,$4,true)', [superEmail, await bcrypt.hash(superPassword, 12), 'Super', 'Admin']);
    }
    if (!(await client.query('SELECT 1 FROM user_accounts WHERE lower(email)=lower($1)',[adminEmail])).rowCount) {
      await client.query('INSERT INTO user_accounts(school_id,email,password_hash,role,first_name,last_name,must_change_password) VALUES($1,$2,$3,\'school_admin\',$4,$5,true)', [schoolId,adminEmail,await bcrypt.hash(adminPassword,12),'School','Admin']);
    }
    let adminPerson = await client.query("SELECT id FROM people WHERE school_id=$1 AND person_type='staff' AND external_id=$2", [schoolId, `account:${adminEmail}`]);
    if (!adminPerson.rowCount) adminPerson = await client.query("INSERT INTO people(school_id,person_type,external_id,first_name,last_name,full_name,email,status) VALUES($1,'staff',$2,'School','Admin','School Admin',$3,'Active') RETURNING id", [schoolId, `account:${adminEmail}`, adminEmail]);
    await client.query('UPDATE user_accounts SET person_id=$2 WHERE school_id=$1 AND lower(email)=lower($3) AND person_id IS NULL', [schoolId, adminPerson.rows[0].id, adminEmail]);

    for (const student of initialStudents) {
      const personId = await ensurePerson(client, schoolId, student);
      await client.query(
        `INSERT INTO students(school_id,person_id,student_code,name,class_name,section,academic_year,original_class,dob,gender,father_name,parent_name,mother_name,primary_parent_name,primary_parent,phone,alternate_phone,email,address,city,state,pin_code,blood_group,category,nationality,house,last_seen,enrolled,enrollment_date,enrollment_number,roll_number,status,fee_defaulter,child_id_active,parent_id_active,rfid_mapped,rfid_number,siblings,photo_data_url,metadata)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,NULLIF($9,'')::date,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,NULLIF($29,'')::date,$30,$31,$32,$33,$34,$35,$36,$37,$38::jsonb,$39,$40::jsonb)
         ON CONFLICT(school_id,student_code) DO NOTHING`,
        [schoolId,personId,String(student.id),student.name||'',student.className||'',student.section||'',student.academicYear||currentYear,student.originalClass||'',student.dob||'',student.gender||'',student.father||'',student.parent||'',student.motherName||'',student.primaryParentName||'',student.primaryParent||'',student.phone||'',student.alternatePhone||'',student.email||'',student.address||'',student.city||'',student.state||'',student.pinCode||'',student.bloodGroup||'',student.category||'',student.nationality||'',student.house||'',student.lastSeen||'',student.enrolled||'',student.enrollmentDate||'',student.enrollmentNumber||String(student.id),student.rollNumber||'',student.status||'Active',Boolean(student.defaulter),student.childId!==false,student.parentId!==false,Boolean(student.rfid),student.rfidNumber||'',JSON.stringify(student.siblings||[]),student.photoDataUrl||'',JSON.stringify({ ...student, importedFromTemplate: true })]
      );
      await client.query(
        `UPDATE people SET class_name=$3,section=$4,roll_number=$5,enrollment_number=$6,parent_guardian_name=$7,contact_number=$8,alternate_contact_number=$9,email=$10,gender=$11,status=$12,updated_at=now() WHERE school_id=$1 AND id=$2`,
        [schoolId,personId,student.className||'',student.section||'',student.rollNumber||'',student.enrollmentNumber||String(student.id),student.parent||student.father||'',student.phone||'',student.alternatePhone||'',student.email||'',student.gender||'',student.status||'Active']
      );
      const studentRow = await client.query('SELECT id FROM students WHERE school_id=$1 AND student_code=$2', [schoolId, String(student.id)]);
      const parentName = String(student.parent || student.father || '').trim();
      if (parentName) {
        const parentKey = `parent:${String(student.phone || '').replace(/\D/g, '') || parentName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        let parentPerson = await client.query("SELECT id FROM people WHERE school_id=$1 AND person_type='parent' AND external_id=$2", [schoolId,parentKey]);
        if (!parentPerson.rowCount) {
          const names = parentName.split(/\s+/);
          parentPerson = await client.query("INSERT INTO people(school_id,person_type,external_id,first_name,last_name,full_name,contact_number,parent_guardian_name,status,metadata) VALUES($1,'parent',$2,$3,$4,$5,$6,$5,'Active',$7::jsonb) RETURNING id", [schoolId,parentKey,names[0]||'',names.slice(1).join(' '),parentName,student.phone||'',JSON.stringify({seededFromStudentCode:String(student.id)})]);
        }
        if (studentRow.rowCount && parentPerson.rowCount) {
          await client.query('INSERT INTO student_parents(school_id,student_id,parent_person_id,relationship,is_primary) VALUES($1,$2,$3,$4,true) ON CONFLICT(student_id,parent_person_id) DO NOTHING', [schoolId,studentRow.rows[0].id,parentPerson.rows[0].id,student.primaryParent || 'Guardian']);
        }
      }
      const match = String(student.className || '').match(/^(.*?)(?:\s+([A-Z]))?$/);
      if (match?.[1]) {
        const className = student.className;
        const gradeOrder = /^CLASS\s+(\d+)/i.test(className) ? Number(className.match(/^CLASS\s+(\d+)/i)[1]) : 0;
        await client.query('INSERT INTO school_classes(school_id,class_name,grade_order,section) VALUES($1,$2,$3,$4) ON CONFLICT(school_id,class_name) DO NOTHING',[schoolId,className,gradeOrder,student.section||'']);
      }
    }

    for (const route of defaultRoutes) await client.query('INSERT INTO school_routes(school_id,name) VALUES($1,$2) ON CONFLICT(school_id,name) DO NOTHING',[schoolId,route]);

    const noticeCount = await client.query('SELECT count(*)::int AS n FROM notices WHERE school_id=$1',[schoolId]);
    if (noticeCount.rows[0].n === 0) {
      const samples = [
        { year: currentYear, board: 'school', audience_key: '__SCHOOL__', type: 'News', message: 'Welcome to the new academic year. Please review the updated school timetable and important dates.', author: `${schoolName} School Office`, reply: false },
        { year: currentYear, board: 'school', audience_key: 'ALL_TEACHERS', type: 'Alert', message: 'Reminder: please submit your class activity updates before the end of the day.', author: 'Principal', reply: true },
        { year: [...pastYears][0] || currentYear, board: 'class', audience_key: 'CLASS 1 A', type: 'News', message: 'Please review the academic circular uploaded for this class.', author: 'Class Teacher', reply: false },
        { year: currentYear, board: 'route', audience_key: defaultRoutes[0], type: 'Alert', message: 'Transport update: the bus on this route may be delayed.', author: 'Transport Office', reply: true }
      ];
      for (const n of samples) {
        const result = await client.query('INSERT INTO notices(school_id,academic_year,board,audience_key,notice_type,message,author_name,allow_reply) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[schoolId,n.year,n.board,n.audience_key,n.type,n.message,n.author,n.reply]);
        // No fabricated views are seeded; every view count starts at zero.
        void result;
      }
    }
    await client.query('COMMIT');
    console.log(`Seed complete for ${schoolName}: ${initialStudents.length} template students checked, demo admin users and starter notices ready.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main().catch(error => { console.error('Database seed failed:', error); process.exitCode = 1; }).finally(() => pool.end());
