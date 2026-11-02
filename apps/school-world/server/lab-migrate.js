/**
 * Isolated lab-only migration runner.
 *
 * The existing migration 006 contains an unescaped apostrophe in the SQL text
 * "child's progress". This runner applies an in-memory, lab-only SQL quoting
 * correction. It does not modify any migration file or the intended product schema.
 *
 * Safety gates require LAB_MODE=true and DATABASE_URL to target school_world_lab
 * on the lab Docker service or local loopback.
 */
import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

function fail(message) {
  console.error('[LAB DB BOOTSTRAP BLOCKED]', message);
  process.exitCode = 1;
}

if (process.env.LAB_MODE !== 'true') {
  fail('LAB_MODE must be explicitly set to true. Product migrations are not run by this script.');
} else if (!process.env.DATABASE_URL) {
  fail('DATABASE_URL is required.');
} else {
  let parsed;
  try {
    parsed = new URL(process.env.DATABASE_URL);
  } catch {
    fail('DATABASE_URL is invalid.');
  }

  if (parsed) {
    const hostname = parsed.hostname.toLowerCase();
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    const permittedHost = ['lab-db', '127.0.0.1', 'localhost'].includes(hostname);
    if (!permittedHost || database !== 'school_world_lab') {
      fail('Refusing to migrate host "' + hostname + '" database "' + database + '". Only the isolated school_world_lab DB is permitted.');
    } else if (process.env.LAB_AUTO_MIGRATE === 'false') {
      console.log('[LAB DB BOOTSTRAP] LAB_AUTO_MIGRATE=false; preserving the existing lab database schema as requested.');
    } else {
      const here = path.dirname(fileURLToPath(import.meta.url));
      const migrationsDir = path.join(here, 'migrations');
      const files = [
        '001_initial_schema.sql',
        '002_admission_enquiries.sql',
        '003_message_center_features.sql',
        '004_message_attachment_batch_compatibility.sql',
        '005_fee_numeric_receipts.sql',
        '006_super_admin_template_assignments.sql',
        '007_fee_receipt_template_notes.sql',
        '008_staff_categories_one_way_communication.sql',
        '009_manage_external_links.sql',
        '010_seed_external_link_grades_from_legacy_classes.sql',
        '011_normalize_manage_classes.sql',
        '012_normalize_subject_catalog.sql',
        '013_fee_record_installment_name.sql',
        '014_student_optional_subject_selections.sql'
      ];
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 2,
        connectionTimeoutMillis: 8000,
        idleTimeoutMillis: 10000
      });

      try {
        await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (\n          version text PRIMARY KEY,\n          description text NOT NULL,\n          applied_at timestamptz NOT NULL DEFAULT now()\n        )");
        for (const file of files) {
          const version = file.split('_')[0];
          const existing = await pool.query('SELECT 1 FROM schema_migrations WHERE version=$1', [version]);
          if (existing.rowCount) {
            console.log('[LAB DB BOOTSTRAP] ' + file + ' already applied.');
            continue;
          }

          let sql = await readFile(path.join(migrationsDir, file), 'utf8');
          if (file === '006_super_admin_template_assignments.sql') {
            const faulty = "Please discuss your child's progress with the school.";
            const intended = "Please discuss your child''s progress with the school.";
            if (!sql.includes(faulty)) {
              throw new Error('Expected lab-only quoting correction in migration 006 was not found. No replacement was made.');
            }
            sql = sql.replace(faulty, intended);
            console.log('[LAB DB BOOTSTRAP] Applied an in-memory SQL string-escaping correction for migration 006 only; repository migration file remains unchanged.');
          }

          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query(
              'INSERT INTO schema_migrations(version,description) VALUES($1,$2)',
              [version, file.slice(version.length + 1).replace(/\.sql$/, '').replaceAll('_', ' ')]
            );
            await client.query('COMMIT');
            console.log('[LAB DB BOOTSTRAP] Applied ' + file + '.');
          } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw new Error('Isolated lab migration ' + file + ' failed: ' + error.message, { cause: error });
          } finally {
            client.release();
          }
        }
        const selectionTable = await pool.query("SELECT to_regclass('public.school_student_optional_subject_selections') AS table_name");
        if (!selectionTable.rows[0]?.table_name) {
          throw new Error('Student optional-subject selection table was not created by migration 014.');
        }
        console.log('[LAB DB BOOTSTRAP] Student optional-subject selection table verified.');
        console.log('[LAB DB BOOTSTRAP] All expected migrations are recorded in the isolated test DB.');
      } catch (error) {
        console.error('[LAB DB BOOTSTRAP] FAILED:', error);
        process.exitCode = 1;
      } finally {
        await pool.end();
      }
    }
  }
}
