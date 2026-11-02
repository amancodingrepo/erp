import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, 'migrations');

export async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    description text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const files = ['001_initial_schema.sql', '002_admission_enquiries.sql', '003_message_center_features.sql', '004_message_attachment_batch_compatibility.sql', '005_fee_numeric_receipts.sql', '006_super_admin_template_assignments.sql', '007_fee_receipt_template_notes.sql', '008_staff_categories_one_way_communication.sql', '009_manage_external_links.sql', '010_seed_external_link_grades_from_legacy_classes.sql', '011_normalize_manage_classes.sql', '012_normalize_subject_catalog.sql', '013_fee_record_installment_name.sql', '014_student_optional_subject_selections.sql'];
  for (const file of files) {
    const version = file.split('_')[0];
    const found = await pool.query('SELECT 1 FROM schema_migrations WHERE version=$1', [version]);
    if (found.rowCount) continue;
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version,description) VALUES($1,$2)', [version, file.slice(version.length + 1).replace(/\.sql$/, '').replaceAll('_', ' ')]);
      await client.query('COMMIT');
      console.log(`Applied database migration ${file}`);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      const details = [
        error.code ? 'PostgreSQL ' + error.code : '',
        error.position ? 'SQL position ' + error.position : '',
        error.where ? 'context ' + error.where : ''
      ].filter(Boolean).join(', ');
      error.message = 'Database migration ' + file + ' failed' +
        (details ? ' (' + details + ')' : '') + ': ' + error.message;
      throw error;
    } finally { client.release(); }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrate().then(() => { console.log('Database migrations are up to date.'); return pool.end(); })
    .catch((error) => { console.error('Database migration failed:', error); process.exitCode = 1; pool.end(); });
}
