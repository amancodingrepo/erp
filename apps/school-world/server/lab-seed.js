/**
 * Lab-only seed runner.
 *
 * The standard seed.js currently uses ON CONFLICT(school_id,class_name), but
 * migration 011 intentionally replaced that key with a case-insensitive unique
 * index on school_id/lower(class_name)/lower(section). For the lab only, this
 * runner patches that one query in a temporary copy and runs it against
 * school_world_lab. It never edits seed.js or any migration file.
 */
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function fail(message) {
  console.error('[LAB DB SEED BLOCKED]', message);
  process.exitCode = 1;
}

if (process.env.LAB_MODE !== 'true') {
  fail('LAB_MODE must be explicitly set to true. Product seeding is not run by this script.');
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
      fail('Refusing to seed host "' + hostname + '" database "' + database + '". Only the isolated school_world_lab DB is permitted.');
    } else if (process.env.LAB_SEED_DEMO_DATA === 'false') {
      console.log('[LAB DB SEED] LAB_SEED_DEMO_DATA=false; skipping demo seed.');
    } else {
      const here = path.dirname(fileURLToPath(import.meta.url));
      const sourcePath = path.join(here, 'seed.js');
      const temporaryPath = path.join(here, '.lab-seed-runner-' + process.pid + '.mjs');
      const oldQuery = "INSERT INTO school_classes(school_id,class_name,grade_order,section) VALUES($1,$2,$3,$4) ON CONFLICT(school_id,class_name) DO NOTHING";
      const compatibleQuery = "INSERT INTO school_classes(school_id,class_name,grade_order,section) VALUES($1,$2,$3,$4) ON CONFLICT (school_id,lower(class_name),lower(section)) DO NOTHING";
      try {
        let source = await readFile(sourcePath, 'utf8');
        if (!source.includes(oldQuery)) {
          throw new Error('Expected school_classes conflict query was not found. No source file was changed.');
        }
        source = source.replace(oldQuery, compatibleQuery);
        await writeFile(temporaryPath, source, { encoding: 'utf8', flag: 'wx' });
        console.log('[LAB DB SEED] Running a temporary copy of seed.js with its class conflict target aligned to migration 011. The original seed.js is unchanged.');
        const result = spawnSync(process.execPath, [temporaryPath], {
          cwd: path.resolve(here, '..'),
          stdio: 'inherit',
          env: { ...process.env, AUTO_MIGRATE: 'false', SEED_DEMO_DATA: 'false', LAB_MODE: 'true' }
        });
        if (result.error) throw result.error;
        if (result.status !== 0) {
          throw new Error('Isolated lab seed exited with status ' + result.status + '.');
        }
        console.log('[LAB DB SEED] Isolated demo data seed completed.');
      } catch (error) {
        console.error('[LAB DB SEED] FAILED:', error);
        process.exitCode = 1;
      } finally {
        await unlink(temporaryPath).catch(() => {});
      }
    }
  }
}
