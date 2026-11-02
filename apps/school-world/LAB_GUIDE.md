# School World isolated full-stack testing lab

This lab is separate from the working ERP runtime. It is meant to test code from the existing Git checkout before a change is considered for the product.

## Safety rules built into the lab

- The scripts require the existing branch \`test/school-world-fee-flow-verified\`; they never switch branches or reset the working tree.
- Lab frontend/API ports are **5174 / 3002**, not your normal **5173 / 3001**.
- The default database is a separate local PostgreSQL database/volume named for the lab. Migrations and demo seeding run only against that lab database.
- Lab credentials live in ignored \`.env.lab\`. The example file is intentionally not a production secret.
- The Installment Dialog test mounts just \`FeeTemplateInstallmentDialog\` with the fee-page CSS scope. It does not navigate to Create Fee Template or submit/save a template.
- The browser tests use Chromium, hit-testing, computed styles, screenshots, and JavaScript-error collection. Test output is kept under \`test-results/\`, which is ignored by Git.
- The AI prototypes live under \`lab/ai-innovation/\`; they do not import the main app, use the ERP API, access a database, call an LLM, or write school records.

## Start the lab on Windows

Open PowerShell in the existing checkout and go to:

\`\`\`powershell
cd C:\Users\Master\school-world\school_diary_fullstack_release_v2
.\scripts\lab\start-lab.ps1
\`\`\`

If Docker Desktop is available and running, this starts an isolated Docker PostgreSQL + API + Vite stack. If Docker is not installed, the script falls back to native Windows mode using the PostgreSQL server already installed on the laptop; it creates a dedicated \`school_world_lab\` database and \`school_world_lab\` database role, provided those names are unused or already owned by the lab role. It will not alter an unrelated database or role. In native mode, the script asks for local PostgreSQL administrator credentials; they are used only for the local PostgreSQL service.

Open these lab URLs:

- Frontend: http://127.0.0.1:5174/
- Isolated dialog harness: http://127.0.0.1:5174/tests/fee-installment-dialog.html
- AI innovation playground: http://127.0.0.1:5174/lab/ai-innovation/index.html
- Lab API/database health: http://127.0.0.1:3002/api/health

The API health route runs a live PostgreSQL query. The browser dialog harness has a local-only Save callback; it never sends a Fee Template save request.

Run the test suite:

\`\`\`powershell
.\scripts\lab\run-tests.ps1
\`\`\`

It checks the API/database connection, opens Add and Edit dialog modes at multiple viewport sizes, verifies whether another element covers each button, measures the actual CSS and overlay, checks dialog save/close state transitions, and runs the isolated AI prototype tests. Screenshots and JSON diagnostics are saved under \`test-results/\`.

Stop the services:

\`\`\`powershell
.\scripts\lab\stop-lab.ps1
\`\`\`

For native Windows mode, the stop script is \`.\scripts\lab\stop-native-lab.ps1\`. Stopping services does not delete the local lab database. No stop script targets port 5173 or 3001.

## Optional AWS RDS test-database snapshot

The lab uses fake/seed data by default; AWS is not contacted during normal startup or tests. If a realistic database copy is required, use only the dedicated RDS test instance named \`school-world-test-db\`, never production.

\`\`\`powershell
# In Docker mode, match this image's PostgreSQL major version to the AWS RDS source:
.\scripts\lab\clone-aws-test-db.ps1 -PgClientImage postgres:16-alpine

# If Docker is unavailable but local pg_dump/pg_restore tools are installed:
.\scripts\lab\clone-aws-test-db.ps1 -UseLocalPostgresTools
\`\`\`

The script requests the database URL through a hidden prompt, requires a specific confirmation phrase, and refuses hostnames that do not match the \`school-world-test-db.*.rds.amazonaws.com\` pattern. It performs a read-only dump of the AWS source and imports the dump into the isolated local lab database only; it does not execute migrations, updates, or deletes against AWS. It backs up the current lab DB before import and attempts recovery if an import fails. After importing, it disables automatic migrations/seeding so startup will not reshape the copied test schema.

Before using a snapshot, make sure it is permitted for local use and contains no production-only credentials. A database copy may contain names, contact details, messages, or other student information. Keep the dump and copied data local and never commit them or attach real-student screenshots/logs to a public issue or artifact. The dump is held outside the Git checkout. If the source major version differs, choose a matching PostgreSQL client image (for example, \`postgres:15-alpine\`) or use a sufficiently new local client. A test snapshot can still fail to restore if the source uses unavailable extensions or permissions; the report/logs should be reviewed rather than bypassing that failure.

## Lab structure

- \`docker-compose.lab.yml\`: isolated PostgreSQL, API and frontend with separate host ports and a unique database volume.
- \`vite.lab.config.js\`: lab-only Vite proxy; the regular Vite configuration is not changed.
- \`Dockerfile.lab-tests\`: Chromium test runner, separate from the app image.
- \`tests/fee_installment_dialog_browser_lab.py\`: the dialog-only browser checks; Add/Edit, X, Close, Save Installment and hit-testing.
- \`tests/full_stack_lab_smoke.py\`: checks the live backend and database through \`/api/health\`.
- \`tests/ai_prototype_lab_test.py\`: verifies the isolated AI prototype UI and prevents ERP API calls.
- \`lab/ai-innovation/index.html\`: four stand-alone feature prototypes.

## AI features to evaluate in the sandbox

The prototypes are deliberately transparent local simulations; no model is connected yet.

1. **Lesson & Worksheet Studio:** teacher-reviewable lesson plans and practice sheets. Better alternative to compare: curriculum-linked approved templates versus an approved LLM grounded in teacher-provided objectives. Measure factuality, syllabus alignment and teacher editing time.
2. **Parent Communication Copilot:** English/Hindi message drafts only; no sending. Better alternative: approved message templates and translation memory versus AI-assisted tone/translation. Never let a model invent fee amounts, dates, attendance facts or delivery status.
3. **Attendance Pattern Review:** sample-only, explainable thresholds with reasons and suggested human follow-up. Better alternative: simple policy thresholds versus a validated predictor. Compare false positives across groups; never use a signal alone for punishment, grading, enrolment or access.
4. **Practice Question Builder:** locally generated sample prompts, not an exam. Better alternative: teacher-approved question-bank retrieval with AI-created variations, followed by answer-key, age-suitability and accessibility checks.

Additional ideas in the UI include sourced school-policy Q&A, timetable conflict explanation and an admin workload summariser. Any move from prototype to product must be a separate request and receive approval before an existing ERP component is touched.

## How to interpret results

Every failure should include the viewport, click hit target or computed CSS evidence, console errors, and a screenshot. Compare the smallest safe alternatives first: (a) keep the dialog inline in its page context, (b) fix only the identified blocking overlay if one exists, or (c) use a portal only if proven necessary and reproduce the same page CSS scope in a browser test. Do not make global z-index changes based on guesswork.


## Performance Report Studio (isolated prototype)

- Lab launcher: `http://127.0.0.1:5174/lab/`
- Performance Report module: `http://127.0.0.1:5174/lab/performance-report/index.html`
- Four starting templates: MPBSE secondary/higher-secondary, CBSE primary, CBSE middle, and CBSE secondary/senior. Subjects, component maxima, assessment weights and sample pass threshold can be configured in the Super Admin view.
- Assign by School ID, academic session and class range. School workspace supports manual marks or CSV imports after full-file validation. Report Cards generates sub-term, term and annual draft cards with browser print/Save PDF.
- This prototype persists only in browser `localStorage`; it has no real login, server-side authorization, ERP API, database, school record or schema change. Use fictional data only and do not treat outputs as official proformas.
- Current official references are linked inside the module. Verify the CBSE session curriculum/subject-specific scheme and MPBSE class IX–XII syllabus/marking/project documents before approving calculations. `tests/performance_report_lab_test.py` covers assignments, class guards, weight validation, manual marks, atomic CSV import, annual cards, mobile layout and absence of ERP API calls; evidence is included in lab CI artifacts.


## Primary and optional subjects

- Super Admin template configuration separates **Primary / compulsory subjects** from **Optional / choice subjects**. A subject must appear in exactly one list.
- In marks entry, optional choices are selected per fictional student. Primary marks are required; optional marks are required only for selected choices. Unselected optional cells are disabled and cleared.
- CSV templates include `optionalSubjects` (multiple choices separated by semicolons) plus subject columns. Import rejects invalid choices, scores above the maximum and marks for optional subjects not selected by that learner; imports are all-or-nothing.
- Draft report cards label subject types. This prototype computes primary overall percentage from primary subjects only and shows optional results separately. This is illustrative, not a universal MPBSE/CBSE rule; confirm current class/session/subject rules before production use.
- Browser tests cover optional choices per student, disabled unselected marks, CSV validation and report-card subject labels.
