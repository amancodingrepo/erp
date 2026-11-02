# School World — AWS relational database design

## Status and safe-use note

The target schema is `database/aws_school_world_relational_schema.sql`. It defines a normalized PostgreSQL schema with **no JSON or JSONB data columns**. It is a target design, not yet a drop-in replacement for the current Express API.

The current code and historical migrations still read/write legacy JSONB-based tables for some features (including generic module state, form configuration/answers, and some metadata). Do **not** apply this target schema to the existing Railway database, do not point the running application at a database containing only this schema, and do not remove legacy columns until the matching API/React migration and data migration have been implemented and tested. The schema file is deliberately separate from the existing migration runner.

## Table coverage by ERP area

The schema has 93 table definitions at the time of writing. It separates core identity records from roles, enrollments, answers, transactions, attachments, and preferences. A person has one row in `people`; student, parent/guardian and employee data is held in related profile tables, instead of copying their names/contact details into every module.

| ERP page or workflow | Principal tables |
|---|---|
| School profile, My Branch, school branding | `schools`, `school_branches`, `school_preferences`, `school_branding_assets`, `media_assets` |
| Login, accounts, security | `user_accounts`, `auth_sessions`, `password_reset_tokens`, `audit_logs`, `audit_log_changes` |
| Contacts, parents, teachers, staff | `people`, `parent_profiles`, `staff_profiles`, `broadcast_lists`, `broadcast_list_members`, `contact_column_preferences` |
| Manage Students and Edit Student | `students`, `student_profiles`, `student_enrollments`, `student_addresses`, `student_parent_links`, `student_siblings`, `student_academic_background`, `student_documents`, `student_immunizations` |
| Sensitive student/guardian information | `student_sensitive_details`, `student_health_records`, `parent_profiles` |
| Manage Classes, Sections and Subjects | `school_classes`, `class_sections`, `subjects`, `class_subjects`, `academic_years` |
| Admission and Enquiry Form builder | `admission_form_templates`, `admission_form_sections`, `admission_form_fields`, `admission_field_options`, `admission_enquiries`, `admission_enquiry_field_values`, `admission_enquiry_field_option_values` |
| Fees, fee defaulters, receipts, reversals | `fee_types`, `fee_templates`, `fee_template_items`, `student_fee_assignments`, `fee_records`, `fee_payments`, `fee_payment_allocations`, `fee_payment_reversals`, `fee_late_fee_rules`, `fee_receipt_assets` |
| Student and staff attendance | `student_attendance`, `staff_attendance` |
| Notice Board, view report, replies | `notices`, `notice_audiences`, `notice_attachments`, `notice_views`, `notice_replies` |
| Events and school calendar | `events`, `event_recipients` |
| Messages, schedules, receipts, attachments | `messages`, `message_recipients`, `message_attachments` |
| Transport routes, stops, vehicles, driver assignments | `routes`, `route_stops`, `vehicles`, `route_vehicle_assignments`, `student_transport_assignments` |
| Day Care | `day_care_enrollments`, `day_care_checkins` |
| Questionnaires / surveys / quizzes | `questionnaires`, `questionnaire_sections`, `questionnaire_questions`, `questionnaire_question_options`, `questionnaire_class_assignments`, `questionnaire_submissions`, `questionnaire_answers`, `questionnaire_answer_selected_options` |
| Performance Report, marks, report templates | `assessment_templates`, `assessments`, `assessment_scores`, `report_templates` |
| Super Admin template distribution | `admin_template_catalog`, `fee_receipt_template_settings`, `performance_template_settings`, `performance_template_terms`, `performance_template_subterms`, `school_admin_template_assignments` |
| Store inventory and vendors | `store_categories`, `store_items`, `store_stock_movements`, `store_vendors` |
| Dashboard and reports | Read from the normalized module tables above; summaries should be computed with scoped SQL queries/views rather than copying the same information into duplicate tables |
| UI preferences | `user_module_preferences`, `contact_column_preferences` |

## Supported input types

`input_type_catalog` provides a central controlled list. It includes text, textarea, email, telephone, password (authentication only), number, currency, date, time, date-time, month, year, URL, select, multiselect, checkbox, checkbox group, radio, Yes/No, file, image, signature, rating, color, range, computed/read-only, search and hidden.

Admission and questionnaire definitions only permit suitable persistent form field types. **Passwords, hidden values and search controls are not permitted as dynamic answer fields.** Password input is for login/account flows; only a slow password hash goes into `user_accounts.password_hash`, never the original password. Single-choice values link to option rows. Multi-select values are stored in bridge tables, one option per row—never as JSON arrays.

Typed answer storage is explicit: text, number, boolean, date/timestamp, selected option, media asset or encrypted value. Database constraints and triggers reject invalid type combinations, sensitive answers without ciphertext, and choices that belong to a different field/question or form.

## Photos, logos, attachments and file uploads

The database keeps file metadata and an opaque S3 object key in `media_assets`; it does not store image/file bytes or public URLs. `school_branding_assets`, student/profile photo links, notice/message attachment tables, admission documents, store item images and receipt attachments reference the media record.

For AWS, use a **private S3 bucket** with Block Public Access enabled, server-side encryption (preferably SSE-KMS), restrictive IAM permissions, content-type and size checks, malware scanning for uploaded files, and short-lived presigned URLs only after the API has checked the requesting user's school and role. Never put AWS credentials or permanent public object URLs in the browser. The unique object key and school/category content-hash index support duplicate detection.

## Keys, duplicates and tenant isolation

- Every entity has a primary key; operational identifiers (student code, admission number, employee code, class/section, receipt number, school-scoped vendor/item/route codes) have appropriate unique constraints or indexes.
- Composite foreign keys include `school_id` to prevent linking one school's record to another school's person, class, fee record, file or option.
- Form fields/options/questions are linked to the same form/questionnaire as their answers. Fee allocations must refer to the same student as both the payment and the fee record.
- Names and phone numbers are **not** universally unique: siblings may share a family phone, and two people can have the same name. Unique constraints are placed on identifiers and relationships, not ordinary names.
- Identifiers that should not be stored as plain text (Aadhaar/Samagra-style IDs and account details) use ciphertext columns. For duplicate checks, use keyed HMAC lookup values generated by the application with a secret kept outside PostgreSQL; do not use a plain hash of low-entropy identifiers. Sensitive values must be encrypted with an envelope-encryption design using AWS KMS. Keep health and identity details out of audit log summaries.
- The schema enables PostgreSQL row-level security for tenant tables. The application must set transaction-local `app.current_school_id`, `app.current_user_id`, and `app.is_super_admin` only after validating the authenticated session. The login and password-reset flows have narrowly scoped lookup settings. Do not accept these values from user-supplied form fields.
- The runtime database role must not own the tables and must not have `BYPASSRLS`; migrations should use a separate, restricted deployment role. RLS is defense-in-depth, not a replacement for authorization and scoped SQL queries.
- Backups must be encrypted, restoration must be tested, and audit logging must never include credentials, raw ID numbers, access tokens, or unencrypted health details.

## Required application migration before AWS cutover

1. Provision an isolated AWS test database (do not use the existing Railway database as the target for first execution) and apply the schema in a controlled migration run. Use an RDS PostgreSQL major version that supports the column-list form of `ON DELETE SET NULL` (PostgreSQL 15 or later); choose a currently supported RDS engine patch.
2. Refactor the Express data layer to use the normalized tables instead of legacy `module_records.payload`, JSONB metadata/configuration/answers, and data-URL file columns. Use typed SQL parameters, database transactions for linked writes, tenant context for RLS, and role checks on every read/write endpoint.
3. Refactor uploads to S3 and migrate logo/photo/attachment bytes; preserve existing IDs/relationships and verify checksums.
4. Export current data, map/clean it, import to the target, and compare row counts plus fee balances, attendance, recipient visibility, assessment results, and document counts.
5. Test two separate school tenants with negative tests (School A must not read or update School B records, assets, notices, fees or reports). Also test a normal teacher, parent, student and school admin role separately.
6. Run `database/aws_schema_validation.sql`, perform backup and restore tests, and complete application regression tests. Only switch DNS/API endpoints after the migration and rollback plan are approved.

## Current implementation status

- Target relational schema committed on `test/school-world-fee-flow-verified`.
- No AWS resources have been provisioned or changed by this commit.
- The target schema has not been executed against RDS; validate it on a disposable database before using it for live data.
- The running application's existing migrations/API are not yet converted away from JSONB. That conversion is a separate application/data migration and must be completed before cutover.
