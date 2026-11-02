-- School World relational schema for AWS PostgreSQL.
-- Target schema: normalized, tenant-scoped, no JSON/JSONB columns.
-- File bytes live in private Amazon S3; PostgreSQL stores asset metadata and object keys.
-- Apply only after the application API has been migrated to this schema. The current
-- legacy migrations/server still use JSONB and are intentionally not replaced by this file.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(180) NOT NULL,
  code varchar(60) NOT NULL,
  slug varchar(180),
  email varchar(254),
  phone varchar(32),
  address_line_1 varchar(250),
  address_line_2 varchar(250),
  city varchar(100),
  state varchar(100),
  postal_code varchar(20),
  country_code char(2) NOT NULL DEFAULT 'IN',
  timezone varchar(80) NOT NULL DEFAULT 'Asia/Kolkata',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_schools_code UNIQUE (code),
  CONSTRAINT uq_schools_slug UNIQUE (slug),
  CONSTRAINT uq_schools_id UNIQUE (id)
);

CREATE TABLE academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  label varchar(20) NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_academic_year_dates CHECK (ends_on >= starts_on),
  CONSTRAINT uq_academic_year_label UNIQUE (school_id, label),
  CONSTRAINT uq_academic_year_school_id UNIQUE (school_id, id)
);
CREATE UNIQUE INDEX uq_one_current_academic_year_per_school
  ON academic_years(school_id) WHERE is_current;

CREATE TABLE school_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  default_locale varchar(10) NOT NULL DEFAULT 'en',
  date_format varchar(24) NOT NULL DEFAULT 'DD-MM-YYYY',
  time_format varchar(8) NOT NULL DEFAULT '12h',
  currency_code char(3) NOT NULL DEFAULT 'INR',
  theme_key varchar(40) NOT NULL DEFAULT 'school-world-default',
  parent_portal_enabled boolean NOT NULL DEFAULT true,
  student_portal_enabled boolean NOT NULL DEFAULT true,
  staff_portal_enabled boolean NOT NULL DEFAULT true,
  attendance_grace_minutes smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE school_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_code varchar(60) NOT NULL,
  name varchar(180) NOT NULL,
  email varchar(254),
  phone varchar(32),
  address_line_1 varchar(250),
  address_line_2 varchar(250),
  city varchar(100),
  state varchar(100),
  postal_code varchar(20),
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_school_branch_code UNIQUE (school_id, branch_code),
  CONSTRAINT uq_school_branch_name UNIQUE (school_id, name),
  CONSTRAINT uq_school_branches_tenant_id UNIQUE (school_id, id)
);
CREATE UNIQUE INDEX uq_school_primary_branch ON school_branches(school_id) WHERE is_primary;

-- Shared input type catalog; passwords are auth-only and are never persisted as form answers.
CREATE TABLE input_type_catalog (
  input_type varchar(24) PRIMARY KEY,
  label varchar(80) NOT NULL UNIQUE,
  value_kind varchar(20) NOT NULL CHECK (value_kind IN ('text','number','boolean','date','timestamp','option','multi_option','media','derived','secret')),
  allowed_in_dynamic_forms boolean NOT NULL DEFAULT true,
  stores_raw_answer boolean NOT NULL DEFAULT true
);
INSERT INTO input_type_catalog(input_type,label,value_kind,allowed_in_dynamic_forms,stores_raw_answer) VALUES
 ('text','Text','text',true,true),
 ('textarea','Long text','text',true,true),
 ('email','Email','text',true,true),
 ('tel','Telephone','text',true,true),
 ('password','Password','secret',false,false),
 ('number','Number','number',true,true),
 ('currency','Currency','number',true,true),
 ('date','Date','date',true,true),
 ('time','Time','text',true,true),
 ('datetime','Date and time','timestamp',true,true),
 ('month','Month','text',true,true),
 ('year','Year','number',true,true),
 ('url','URL','text',true,true),
 ('select','Single select','option',true,true),
 ('multiselect','Multiple select','multi_option',true,true),
 ('checkbox','Checkbox','boolean',true,true),
 ('checkbox_group','Checkbox group','multi_option',true,true),
 ('radio','Radio group','option',true,true),
 ('boolean','Yes / No','boolean',true,true),
 ('file','File upload','media',true,true),
 ('image','Image upload','media',true,true),
 ('signature','Signature','media',true,true),
 ('rating','Rating','number',true,true),
 ('color','Color picker','text',true,true),
 ('range','Range slider','number',true,true),
 ('computed','Computed / read-only','derived',true,false),
 ('search','Search','text',false,false),
 ('hidden','Hidden field','text',false,false)
ON CONFLICT (input_type) DO NOTHING;

CREATE TABLE people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  person_type varchar(20) NOT NULL CHECK (person_type IN ('student','parent','guardian','teacher','staff','day_care','vendor_contact','other')),
  external_id varchar(100),
  first_name varchar(100) NOT NULL,
  middle_name varchar(100),
  last_name varchar(100),
  preferred_name varchar(120),
  email varchar(254),
  phone varchar(32),
  alternate_phone varchar(32),
  gender varchar(30),
  date_of_birth date,
  address_line_1 varchar(250),
  address_line_2 varchar(250),
  city varchar(100),
  state varchar(100),
  postal_code varchar(20),
  country_code char(2) NOT NULL DEFAULT 'IN',
  status varchar(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Deactivated','Archived')),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_people_school_id UNIQUE (school_id, id),
  CONSTRAINT uq_people_external_id UNIQUE (school_id, person_type, external_id)
);
CREATE INDEX ix_people_school_type_name ON people(school_id, person_type, last_name, first_name);
CREATE INDEX ix_people_school_phone ON people(school_id, phone);

CREATE TABLE user_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  person_id uuid,
  email varchar(254) NOT NULL,
  password_hash text NOT NULL,
  role varchar(30) NOT NULL CHECK (role IN ('super_admin','school_admin','principal','teacher','staff','parent','student','transport_admin','day_care_staff')),
  is_active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false,
  failed_login_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  password_changed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_person_tenant FOREIGN KEY (school_id, person_id) REFERENCES people(school_id, id) ON DELETE SET NULL (person_id),
  CONSTRAINT uq_user_accounts_id UNIQUE (id),
  CONSTRAINT uq_user_accounts_tenant_id UNIQUE (school_id, id)
);
CREATE UNIQUE INDEX uq_user_accounts_email_lower ON user_accounts(lower(email));
CREATE INDEX ix_user_accounts_school_role ON user_accounts(school_id, role, is_active);

CREATE TABLE parent_profiles (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  person_id uuid PRIMARY KEY,
  qualification varchar(140),
  occupation varchar(140),
  office_address varchar(250),
  company_name varchar(160),
  designation varchar(140),
  annual_income_ciphertext bytea,
  bank_account_holder_ciphertext bytea,
  bank_name_ciphertext bytea,
  bank_account_number_ciphertext bytea,
  bank_ifsc_ciphertext bytea,
  bank_branch_ciphertext bytea,
  bank_account_lookup_hmac bytea,
  encryption_key_version varchar(80),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_parent_profile_person FOREIGN KEY (school_id, person_id) REFERENCES people(school_id, id) ON DELETE CASCADE
);
CREATE TABLE staff_profiles (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  person_id uuid PRIMARY KEY,
  user_id uuid,
  employee_code varchar(80),
  job_title varchar(120),
  department varchar(120),
  qualification varchar(160),
  joining_date date,
  employment_end_date date,
  login_method varchar(12) NOT NULL DEFAULT 'Email' CHECK (login_method IN ('Email','Phone')),
  emergency_contact_name varchar(140),
  emergency_contact_phone varchar(32),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_staff_profile_person FOREIGN KEY (school_id, person_id) REFERENCES people(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_profile_user FOREIGN KEY (school_id, user_id) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (user_id),
  CONSTRAINT uq_staff_employee_code UNIQUE (school_id, employee_code)
);

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  ip_address inet,
  user_agent varchar(500),
  CONSTRAINT ck_auth_session_expiry CHECK (expires_at > created_at)
);
CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE TABLE school_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_name varchar(80) NOT NULL,
  grade_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_school_class_name UNIQUE (school_id, class_name),
  CONSTRAINT uq_school_classes_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE class_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL,
  academic_year_id uuid NOT NULL,
  section_name varchar(30) NOT NULL,
  capacity smallint,
  room_number varchar(30),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_section_class_tenant FOREIGN KEY (school_id, class_id) REFERENCES school_classes(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_section_year_tenant FOREIGN KEY (school_id, academic_year_id) REFERENCES academic_years(school_id, id) ON DELETE CASCADE,
  CONSTRAINT ck_section_capacity CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT uq_class_section_year UNIQUE (school_id, class_id, section_name, academic_year_id),
  CONSTRAINT uq_class_sections_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_code varchar(40),
  subject_name varchar(120) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_subject_code UNIQUE (school_id, subject_code),
  CONSTRAINT uq_subject_name UNIQUE (school_id, subject_name),
  CONSTRAINT uq_subjects_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE class_subjects (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_section_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  teacher_person_id uuid,
  periods_per_week smallint,
  PRIMARY KEY (class_section_id, subject_id),
  CONSTRAINT fk_class_subject_section FOREIGN KEY (school_id, class_section_id) REFERENCES class_sections(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_class_subject_subject FOREIGN KEY (school_id, subject_id) REFERENCES subjects(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_class_subject_teacher FOREIGN KEY (school_id, teacher_person_id) REFERENCES people(school_id, id) ON DELETE SET NULL (teacher_person_id)
);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  uploaded_by uuid,
  storage_provider varchar(20) NOT NULL DEFAULT 's3' CHECK (storage_provider IN ('s3')),
  bucket_name varchar(128) NOT NULL,
  object_key varchar(1024) NOT NULL,
  original_file_name varchar(255) NOT NULL,
  safe_file_name varchar(255) NOT NULL,
  media_category varchar(30) NOT NULL CHECK (media_category IN ('logo','student_photo','person_photo','notice_attachment','message_attachment','admission_document','questionnaire_attachment','store_image','event_image','other')),
  mime_type varchar(127) NOT NULL,
  file_extension varchar(16),
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  sha256_hex char(64) NOT NULL,
  is_private boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_media_uploader_tenant FOREIGN KEY (school_id, uploaded_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (uploaded_by),
  CONSTRAINT uq_media_object_key UNIQUE (bucket_name, object_key),
  CONSTRAINT uq_media_tenant_id UNIQUE (school_id, id)
);
CREATE INDEX ix_media_school_category_date ON media_assets(school_id, media_category, created_at DESC);
CREATE UNIQUE INDEX uq_media_duplicate_hash ON media_assets(school_id, media_category, sha256_hex);

CREATE TABLE school_branding_assets (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  asset_type varchar(30) NOT NULL CHECK (asset_type IN ('primary_logo','secondary_logo','favicon','login_background','report_header')),
  media_asset_id uuid NOT NULL,
  alt_text varchar(180),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, asset_type),
  CONSTRAINT fk_branding_asset_tenant FOREIGN KEY (school_id, media_asset_id) REFERENCES media_assets(school_id, id) ON DELETE RESTRICT
);

CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  person_id uuid NOT NULL,
  student_code varchar(80) NOT NULL,
  enrollment_number varchar(80),
  admission_number varchar(80),
  registration_number varchar(80),
  status varchar(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Graduated','Transferred','Withdrawn')),
  child_id_active boolean NOT NULL DEFAULT true,
  parent_id_active boolean NOT NULL DEFAULT true,
  rfid_mapped boolean NOT NULL DEFAULT false,
  rfid_number varchar(100),
  enrolled_on date,
  left_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_student_person_tenant FOREIGN KEY (school_id, person_id) REFERENCES people(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT uq_student_code UNIQUE (school_id, student_code),
  CONSTRAINT uq_student_enrollment UNIQUE (school_id, enrollment_number),
  CONSTRAINT uq_student_admission UNIQUE (school_id, admission_number),
  CONSTRAINT uq_students_tenant_id UNIQUE (school_id, id)
);
CREATE INDEX ix_students_school_status ON students(school_id, status);
CREATE TABLE student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  academic_year_id uuid NOT NULL,
  class_section_id uuid NOT NULL,
  roll_number varchar(30),
  enrollment_status varchar(20) NOT NULL DEFAULT 'Active' CHECK (enrollment_status IN ('Active','Inactive','Promoted','Repeated','Transferred')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_student_enrollment_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_student_enrollment_year FOREIGN KEY (school_id, academic_year_id) REFERENCES academic_years(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_student_enrollment_class FOREIGN KEY (school_id, class_section_id) REFERENCES class_sections(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT ck_enrollment_dates CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT uq_student_enrollment_year UNIQUE (school_id, student_id, academic_year_id),
  CONSTRAINT uq_enrollment_roll UNIQUE (school_id, class_section_id, roll_number)
);
CREATE INDEX ix_enrollment_class_year ON student_enrollments(school_id, academic_year_id, class_section_id, enrollment_status);

CREATE TABLE student_profiles (
  student_id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  photo_asset_id uuid,
  blood_group varchar(3),
  nationality varchar(80),
  category varchar(40),
  house_name varchar(60),
  mother_tongue varchar(80),
  religion varchar(60),
  caste_category varchar(40),
  minority_status varchar(40),
  transport_required boolean NOT NULL DEFAULT false,
  emergency_contact_name varchar(150),
  emergency_contact_phone varchar(32),
  preferred_contact_method varchar(20) CHECK (preferred_contact_method IN ('Phone','SMS','Email','WhatsApp')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_student_profile_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_student_photo_asset FOREIGN KEY (school_id, photo_asset_id) REFERENCES media_assets(school_id, id) ON DELETE SET NULL (photo_asset_id)
);

CREATE TABLE student_parent_links (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  parent_person_id uuid NOT NULL,
  relationship varchar(24) NOT NULL CHECK (relationship IN ('Mother','Father','Guardian','Other')),
  is_primary_contact boolean NOT NULL DEFAULT false,
  receives_notices boolean NOT NULL DEFAULT true,
  can_view_fees boolean NOT NULL DEFAULT true,
  can_pick_up boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, parent_person_id),
  CONSTRAINT fk_student_parent_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_student_parent_person FOREIGN KEY (school_id, parent_person_id) REFERENCES people(school_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX uq_student_primary_parent ON student_parent_links(school_id, student_id) WHERE is_primary_contact;

CREATE TABLE student_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  address_type varchar(20) NOT NULL CHECK (address_type IN ('permanent','current','hostel','other')),
  line_1 varchar(250) NOT NULL,
  line_2 varchar(250),
  landmark varchar(180),
  city varchar(100) NOT NULL,
  district varchar(100),
  state varchar(100) NOT NULL,
  postal_code varchar(20),
  country_code char(2) NOT NULL DEFAULT 'IN',
  is_primary boolean NOT NULL DEFAULT false,
  CONSTRAINT fk_student_address_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_student_address_type UNIQUE (school_id, student_id, address_type)
);

-- Sensitive identity/bank values should be envelope-encrypted by the application using AWS KMS.
CREATE TABLE student_sensitive_details (
  student_id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  aadhaar_ciphertext bytea,
  aadhaar_lookup_hmac bytea,
  jan_aadhaar_ciphertext bytea,
  jan_aadhaar_lookup_hmac bytea,
  sssm_id_ciphertext bytea,
  sssm_id_lookup_hmac bytea,
  samagra_id_ciphertext bytea,
  samagra_id_lookup_hmac bytea,
  scholar_number_ciphertext bytea,
  scholar_number_lookup_hmac bytea,
  national_student_id_ciphertext bytea,
  national_student_id_lookup_hmac bytea,
  nationality_proof_asset_id uuid,
  bank_account_holder_ciphertext bytea,
  bank_name_ciphertext bytea,
  bank_account_number_ciphertext bytea,
  bank_ifsc_ciphertext bytea,
  bank_branch_ciphertext bytea,
  encryption_key_version varchar(80),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_student_sensitive_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_nationality_proof_asset FOREIGN KEY (school_id, nationality_proof_asset_id) REFERENCES media_assets(school_id, id) ON DELETE SET NULL (nationality_proof_asset_id)
);
CREATE UNIQUE INDEX uq_student_aadhaar_lookup_hmac ON student_sensitive_details(school_id,aadhaar_lookup_hmac) WHERE aadhaar_lookup_hmac IS NOT NULL;
CREATE UNIQUE INDEX uq_student_jan_aadhaar_lookup_hmac ON student_sensitive_details(school_id,jan_aadhaar_lookup_hmac) WHERE jan_aadhaar_lookup_hmac IS NOT NULL;
CREATE UNIQUE INDEX uq_student_sssm_lookup_hmac ON student_sensitive_details(school_id,sssm_id_lookup_hmac) WHERE sssm_id_lookup_hmac IS NOT NULL;
CREATE UNIQUE INDEX uq_student_samagra_lookup_hmac ON student_sensitive_details(school_id,samagra_id_lookup_hmac) WHERE samagra_id_lookup_hmac IS NOT NULL;
CREATE UNIQUE INDEX uq_student_scholar_number_lookup_hmac ON student_sensitive_details(school_id,scholar_number_lookup_hmac) WHERE scholar_number_lookup_hmac IS NOT NULL;
CREATE UNIQUE INDEX uq_student_national_id_lookup_hmac ON student_sensitive_details(school_id,national_student_id_lookup_hmac) WHERE national_student_id_lookup_hmac IS NOT NULL;
CREATE UNIQUE INDEX uq_parent_bank_account_lookup_hmac ON parent_profiles(school_id,bank_account_lookup_hmac) WHERE bank_account_lookup_hmac IS NOT NULL;
CREATE UNIQUE INDEX uq_parent_bank_account_lookup_hmac ON parent_profiles(school_id,bank_account_lookup_hmac) WHERE bank_account_lookup_hmac IS NOT NULL;
CREATE TABLE student_health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  health_conditions_ciphertext bytea,
  previous_operations_ciphertext bytea,
  chronic_illness_ciphertext bytea,
  regular_medication_ciphertext bytea,
  allergies_ciphertext bytea,
  other_health_info_ciphertext bytea,
  doctor_contact_ciphertext bytea,
  special_learning_needs_ciphertext bytea,
  physical_disability_ciphertext bytea,
  disability_details_ciphertext bytea,
  learning_support_ciphertext bytea,
  encrypted_by_key_version varchar(80),
  recorded_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_health_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_health_recorder FOREIGN KEY (school_id, recorded_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (recorded_by),
  CONSTRAINT uq_student_health UNIQUE (school_id, student_id)
);
CREATE UNIQUE INDEX uq_student_photo_asset ON student_profiles(school_id, photo_asset_id) WHERE photo_asset_id IS NOT NULL;

CREATE TABLE student_academic_background (
  student_id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  previous_school varchar(180),
  previous_board varchar(80),
  previous_school_address varchar(250),
  previous_class varchar(80),
  last_exam_name varchar(140),
  last_exam_year smallint,
  last_exam_marks varchar(80),
  last_exam_percentage numeric(5,2),
  last_exam_grade varchar(20),
  transfer_reason text,
  sports_activities text,
  hobbies text,
  special_achievements text,
  academic_remarks text,
  referral_source varchar(140),
  person_responsible_at_home varchar(140),
  special_remarks text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_student_academic_background FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT ck_last_exam_percentage CHECK (last_exam_percentage IS NULL OR last_exam_percentage BETWEEN 0 AND 100)
);
CREATE TABLE student_immunizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  vaccine_name varchar(120) NOT NULL,
  scheduled_date date,
  administered_date date,
  status varchar(20) NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled','Administered','Deferred','Declined','Overdue')),
  remarks text,
  evidence_asset_id uuid,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_student_immunization_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_student_immunization_asset FOREIGN KEY (school_id, evidence_asset_id) REFERENCES media_assets(school_id, id) ON DELETE SET NULL (evidence_asset_id),
  CONSTRAINT fk_student_immunization_recorder FOREIGN KEY (school_id, recorded_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (recorded_by),
  CONSTRAINT ck_immunization_dates CHECK (administered_date IS NULL OR scheduled_date IS NULL OR administered_date >= scheduled_date)
);
CREATE TABLE student_siblings (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  sibling_student_id uuid NOT NULL,
  relationship varchar(30) NOT NULL DEFAULT 'Sibling',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, sibling_student_id),
  CONSTRAINT ck_student_not_own_sibling CHECK (student_id <> sibling_student_id),
  CONSTRAINT fk_sibling_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_sibling_linked_student FOREIGN KEY (school_id, sibling_student_id) REFERENCES students(school_id, id) ON DELETE CASCADE
);
CREATE TABLE student_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  media_asset_id uuid NOT NULL,
  document_type varchar(60) NOT NULL,
  verification_status varchar(20) NOT NULL DEFAULT 'Pending' CHECK (verification_status IN ('Pending','Verified','Rejected','Expired')),
  expires_on date,
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_student_document_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_student_document_asset FOREIGN KEY (school_id, media_asset_id) REFERENCES media_assets(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_student_document_verifier FOREIGN KEY (school_id, verified_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (verified_by),
  CONSTRAINT uq_student_document_asset UNIQUE (school_id, student_id, media_asset_id)
);

CREATE TABLE admission_form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  academic_year_id uuid NOT NULL,
  form_type varchar(20) NOT NULL CHECK (form_type IN ('enquiry','admission')),
  status varchar(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Closed','Archived')),
  terms_and_conditions text,
  mobile_admission_enabled boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_admission_template_year FOREIGN KEY (school_id, academic_year_id) REFERENCES academic_years(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_admission_template_creator FOREIGN KEY (school_id, created_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (created_by),
  CONSTRAINT uq_admission_template_name UNIQUE (school_id, academic_year_id, name, form_type),
  CONSTRAINT uq_admission_template_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE admission_form_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  template_id uuid NOT NULL,
  section_key varchar(80) NOT NULL,
  label varchar(180) NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  CONSTRAINT fk_admission_section_template FOREIGN KEY (school_id, template_id) REFERENCES admission_form_templates(school_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_admission_section_order UNIQUE (school_id, template_id, display_order),
  CONSTRAINT uq_admission_section_key UNIQUE (school_id, template_id, section_key),
  CONSTRAINT uq_admission_sections_tenant_id UNIQUE (school_id, id),
  CONSTRAINT uq_admission_sections_template_ref UNIQUE (school_id, id, template_id)
);
CREATE TABLE admission_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  template_id uuid NOT NULL,
  section_id uuid NOT NULL,
  field_key varchar(100) NOT NULL,
  label varchar(180) NOT NULL,
  input_type varchar(24) NOT NULL REFERENCES input_type_catalog(input_type),
  requirement varchar(20) NOT NULL DEFAULT 'Optional' CHECK (requirement IN ('Required','Optional','Not Required')),
  is_sensitive boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  placeholder varchar(180),
  help_text text,
  minimum_number numeric(14,4),
  maximum_number numeric(14,4),
  minimum_length integer,
  maximum_length integer,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT fk_admission_field_template FOREIGN KEY (school_id, template_id) REFERENCES admission_form_templates(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_admission_field_section FOREIGN KEY (school_id, section_id, template_id) REFERENCES admission_form_sections(school_id, id, template_id) ON DELETE CASCADE,
  CONSTRAINT uq_admission_field_key UNIQUE (school_id, template_id, field_key),
  CONSTRAINT uq_admission_field_order UNIQUE (school_id, section_id, display_order),
  CONSTRAINT uq_admission_fields_tenant_id UNIQUE (school_id, id),
  CONSTRAINT uq_admission_fields_template_ref UNIQUE (school_id, id, template_id),
  CONSTRAINT ck_admission_input_allowed CHECK (input_type IN ('text','textarea','email','tel','number','currency','date','time','datetime','month','year','url','select','multiselect','checkbox','checkbox_group','radio','boolean','file','image','signature','rating','color','range','computed'))
);
CREATE TABLE admission_field_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  field_id uuid NOT NULL,
  option_value varchar(180) NOT NULL,
  option_label varchar(180) NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT fk_admission_option_field FOREIGN KEY (school_id, field_id) REFERENCES admission_form_fields(school_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_admission_option_value UNIQUE (school_id, field_id, option_value),
  CONSTRAINT uq_admission_option_order UNIQUE (school_id, field_id, display_order),
  CONSTRAINT uq_admission_options_tenant_id UNIQUE (school_id, id),
  CONSTRAINT uq_admission_options_field_ref UNIQUE (school_id, id, field_id)
);
CREATE TABLE admission_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  template_id uuid,
  form_number varchar(60) NOT NULL,
  form_type varchar(20) NOT NULL CHECK (form_type IN ('enquiry','admission')),
  status varchar(24) NOT NULL DEFAULT 'New' CHECK (status IN ('New','Contacted','In Review','Accepted','Rejected','Enrolled','Closed')),
  first_name varchar(100) NOT NULL,
  middle_name varchar(100),
  last_name varchar(100),
  gender varchar(30),
  date_of_birth date,
  primary_contact varchar(32) NOT NULL,
  alternate_contact varchar(32),
  email varchar(254),
  class_applied varchar(80) NOT NULL,
  academic_year_id uuid NOT NULL,
  photo_asset_id uuid,
  terms_accepted boolean NOT NULL DEFAULT false,
  terms_accepted_at timestamptz,
  submitted_by uuid,
  assigned_to uuid,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_enquiry_template FOREIGN KEY (school_id, template_id) REFERENCES admission_form_templates(school_id, id) ON DELETE SET NULL (template_id),
  CONSTRAINT fk_enquiry_year FOREIGN KEY (school_id, academic_year_id) REFERENCES academic_years(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_enquiry_photo FOREIGN KEY (school_id, photo_asset_id) REFERENCES media_assets(school_id, id) ON DELETE SET NULL (photo_asset_id),
  CONSTRAINT fk_enquiry_submitter FOREIGN KEY (school_id, submitted_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (submitted_by),
  CONSTRAINT fk_enquiry_assignee FOREIGN KEY (school_id, assigned_to) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (assigned_to),
  CONSTRAINT uq_enquiry_form_number UNIQUE (school_id, form_number),
  CONSTRAINT uq_admission_enquiries_tenant_id UNIQUE (school_id, id),
  CONSTRAINT uq_admission_enquiries_template_ref UNIQUE (school_id, id, template_id)
);
CREATE INDEX ix_admission_enquiries_school_status_date ON admission_enquiries(school_id, status, submitted_at DESC);
CREATE TABLE admission_enquiry_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  enquiry_id uuid NOT NULL,
  template_id uuid NOT NULL,
  field_id uuid NOT NULL,
  text_value text,
  number_value numeric(16,4),
  boolean_value boolean,
  date_value date,
  timestamp_value timestamptz,
  option_id uuid,
  media_asset_id uuid,
  encrypted_value bytea,
  CONSTRAINT fk_enquiry_value_enquiry FOREIGN KEY (school_id, enquiry_id, template_id) REFERENCES admission_enquiries(school_id, id, template_id) ON DELETE CASCADE,
  CONSTRAINT fk_enquiry_value_field FOREIGN KEY (school_id, field_id, template_id) REFERENCES admission_form_fields(school_id, id, template_id) ON DELETE RESTRICT,
  CONSTRAINT fk_enquiry_value_option FOREIGN KEY (school_id, option_id, field_id) REFERENCES admission_field_options(school_id, id, field_id) ON DELETE RESTRICT,
  CONSTRAINT fk_enquiry_value_asset FOREIGN KEY (school_id, media_asset_id) REFERENCES media_assets(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT ck_enquiry_value_single_type CHECK (num_nonnulls(text_value, number_value, boolean_value, date_value, timestamp_value, option_id, media_asset_id, encrypted_value) = 1),
  CONSTRAINT ck_enquiry_encrypted_value_exclusive CHECK (encrypted_value IS NULL OR (text_value IS NULL AND number_value IS NULL AND boolean_value IS NULL AND date_value IS NULL AND timestamp_value IS NULL AND option_id IS NULL AND media_asset_id IS NULL)),
  CONSTRAINT uq_enquiry_field_value UNIQUE (school_id, enquiry_id, field_id)
);

-- Multi-select values are stored as rows, never arrays/JSON.
CREATE TABLE admission_enquiry_field_option_values (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  enquiry_id uuid NOT NULL,
  template_id uuid NOT NULL,
  field_id uuid NOT NULL,
  option_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, enquiry_id, field_id, option_id),
  CONSTRAINT fk_enquiry_multi_value_enquiry FOREIGN KEY (school_id, enquiry_id, template_id) REFERENCES admission_enquiries(school_id, id, template_id) ON DELETE CASCADE,
  CONSTRAINT fk_enquiry_multi_value_field FOREIGN KEY (school_id, field_id, template_id) REFERENCES admission_form_fields(school_id, id, template_id) ON DELETE RESTRICT,
  CONSTRAINT fk_enquiry_multi_value_option FOREIGN KEY (school_id, option_id, field_id) REFERENCES admission_field_options(school_id, id, field_id) ON DELETE RESTRICT
);

CREATE FUNCTION validate_admission_field_value() RETURNS trigger
LANGUAGE plpgsql AS $
DECLARE field_is_sensitive boolean; field_input_type varchar(24); value_count integer;
BEGIN
  SELECT is_sensitive,input_type INTO field_is_sensitive,field_input_type
    FROM admission_form_fields WHERE school_id=NEW.school_id AND id=NEW.field_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown admission field'; END IF;
  value_count := num_nonnulls(NEW.text_value,NEW.number_value,NEW.boolean_value,NEW.date_value,NEW.timestamp_value,NEW.option_id,NEW.media_asset_id,NEW.encrypted_value);
  IF field_is_sensitive AND NEW.encrypted_value IS NULL THEN
    RAISE EXCEPTION 'Sensitive admission values must be encrypted before database storage';
  END IF;
  IF NOT field_is_sensitive AND NEW.encrypted_value IS NOT NULL THEN
    RAISE EXCEPTION 'Encrypted value supplied for a field not marked sensitive';
  END IF;
  IF field_input_type = 'computed' THEN
    RAISE EXCEPTION 'Computed admission fields cannot be stored as responses';
  END IF;
  IF field_input_type IN ('multiselect','checkbox_group') THEN
    IF field_is_sensitive AND NEW.encrypted_value IS NOT NULL AND value_count = 1 THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Non-sensitive multi-select values must use dedicated relational option rows';
  END IF;
  IF value_count <> 1 THEN RAISE EXCEPTION 'Exactly one typed value must be stored for this admission field'; END IF;
  RETURN NEW;
END;
$;
CREATE TRIGGER trg_validate_admission_field_value
BEFORE INSERT OR UPDATE ON admission_enquiry_field_values
FOR EACH ROW EXECUTE FUNCTION validate_admission_field_value();

CREATE FUNCTION validate_admission_multi_option() RETURNS trigger
LANGUAGE plpgsql AS $
DECLARE field_input_type varchar(24); field_is_sensitive boolean;
BEGIN
  SELECT input_type,is_sensitive INTO field_input_type,field_is_sensitive FROM admission_form_fields
    WHERE school_id=NEW.school_id AND id=NEW.field_id;
  IF field_is_sensitive THEN RAISE EXCEPTION 'Sensitive multi-select choices must be encrypted as a single answer'; END IF;
  IF field_input_type NOT IN ('multiselect','checkbox_group') THEN
    RAISE EXCEPTION 'Selected option rows are only valid for multiselect/checkbox-group fields';
  END IF;
  RETURN NEW;
END;
$;
CREATE TRIGGER trg_validate_admission_multi_option
BEFORE INSERT OR UPDATE ON admission_enquiry_field_option_values
FOR EACH ROW EXECUTE FUNCTION validate_admission_multi_option();

CREATE TABLE routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  route_code varchar(60),
  route_name varchar(120) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_route_code UNIQUE (school_id, route_code),
  CONSTRAINT uq_route_name UNIQUE (school_id, route_name),
  CONSTRAINT uq_routes_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  route_id uuid NOT NULL,
  stop_name varchar(140) NOT NULL,
  stop_order integer NOT NULL,
  pickup_time time,
  drop_time time,
  address varchar(250),
  CONSTRAINT fk_route_stop_route FOREIGN KEY (school_id, route_id) REFERENCES routes(school_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_route_stop_order UNIQUE (school_id, route_id, stop_order),
  CONSTRAINT uq_route_stop_name UNIQUE (school_id, route_id, stop_name),
  CONSTRAINT uq_route_stops_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  vehicle_number varchar(40) NOT NULL,
  vehicle_type varchar(40),
  capacity smallint,
  insurance_expiry date,
  fitness_expiry date,
  permit_expiry date,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT uq_vehicle_number UNIQUE (school_id, vehicle_number),
  CONSTRAINT uq_vehicles_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE route_vehicle_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  route_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  driver_person_id uuid,
  attendant_person_id uuid,
  valid_from date NOT NULL,
  valid_to date,
  CONSTRAINT fk_route_vehicle_route FOREIGN KEY (school_id, route_id) REFERENCES routes(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_route_vehicle_vehicle FOREIGN KEY (school_id, vehicle_id) REFERENCES vehicles(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_route_vehicle_driver FOREIGN KEY (school_id, driver_person_id) REFERENCES people(school_id, id) ON DELETE SET NULL (driver_person_id),
  CONSTRAINT fk_route_vehicle_attendant FOREIGN KEY (school_id, attendant_person_id) REFERENCES people(school_id, id) ON DELETE SET NULL (attendant_person_id),
  CONSTRAINT ck_route_vehicle_dates CHECK (valid_to IS NULL OR valid_to >= valid_from)
);
CREATE TABLE student_transport_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  route_id uuid NOT NULL,
  pickup_stop_id uuid,
  drop_stop_id uuid,
  pickup_point varchar(180),
  drop_point varchar(180),
  valid_from date NOT NULL,
  valid_to date,
  CONSTRAINT fk_student_transport_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_student_transport_route FOREIGN KEY (school_id, route_id) REFERENCES routes(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_student_transport_pickup FOREIGN KEY (school_id, pickup_stop_id) REFERENCES route_stops(school_id, id) ON DELETE SET NULL (pickup_stop_id),
  CONSTRAINT fk_student_transport_drop FOREIGN KEY (school_id, drop_stop_id) REFERENCES route_stops(school_id, id) ON DELETE SET NULL (drop_stop_id),
  CONSTRAINT ck_student_transport_dates CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id uuid,
  title varchar(200),
  board_type varchar(20) NOT NULL CHECK (board_type IN ('school','class','route')),
  notice_type varchar(30) NOT NULL CHECK (notice_type IN ('News','Alert','Homework - Worksheet','Homework - Assignment')),
  message text NOT NULL,
  author_user_id uuid,
  allow_reply boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  publish_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_notice_year FOREIGN KEY (school_id, academic_year_id) REFERENCES academic_years(school_id, id) ON DELETE SET NULL (academic_year_id),
  CONSTRAINT fk_notice_author FOREIGN KEY (school_id, author_user_id) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (author_user_id),
  CONSTRAINT uq_notices_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE notice_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  notice_id uuid NOT NULL,
  audience_type varchar(20) NOT NULL CHECK (audience_type IN ('school','role','class_section','route','person')),
  role_name varchar(30),
  class_section_id uuid,
  route_id uuid,
  person_id uuid,
  CONSTRAINT fk_notice_audience_notice FOREIGN KEY (school_id, notice_id) REFERENCES notices(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_notice_audience_section FOREIGN KEY (school_id, class_section_id) REFERENCES class_sections(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_notice_audience_route FOREIGN KEY (school_id, route_id) REFERENCES routes(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_notice_audience_person FOREIGN KEY (school_id, person_id) REFERENCES people(school_id, id) ON DELETE CASCADE,
  CONSTRAINT ck_notice_audience_target CHECK (
    (audience_type='school' AND role_name IS NULL AND class_section_id IS NULL AND route_id IS NULL AND person_id IS NULL) OR
    (audience_type='role' AND role_name IS NOT NULL AND class_section_id IS NULL AND route_id IS NULL AND person_id IS NULL) OR
    (audience_type='class_section' AND class_section_id IS NOT NULL AND route_id IS NULL AND person_id IS NULL) OR
    (audience_type='route' AND route_id IS NOT NULL AND class_section_id IS NULL AND person_id IS NULL) OR
    (audience_type='person' AND person_id IS NOT NULL AND class_section_id IS NULL AND route_id IS NULL)
  )
);
CREATE TABLE notice_attachments (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  notice_id uuid NOT NULL,
  media_asset_id uuid NOT NULL,
  PRIMARY KEY (notice_id, media_asset_id),
  CONSTRAINT fk_notice_attachment_notice FOREIGN KEY (school_id, notice_id) REFERENCES notices(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_notice_attachment_asset FOREIGN KEY (school_id, media_asset_id) REFERENCES media_assets(school_id, id) ON DELETE RESTRICT
);
CREATE TABLE notice_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  notice_id uuid NOT NULL,
  viewer_person_id uuid NOT NULL,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  view_count integer NOT NULL DEFAULT 1 CHECK (view_count > 0),
  CONSTRAINT fk_notice_view_notice FOREIGN KEY (school_id, notice_id) REFERENCES notices(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_notice_view_person FOREIGN KEY (school_id, viewer_person_id) REFERENCES people(school_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_notice_view_person UNIQUE (school_id, notice_id, viewer_person_id)
);
CREATE TABLE notice_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  notice_id uuid NOT NULL,
  author_person_id uuid NOT NULL,
  reply_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_notice_reply_notice FOREIGN KEY (school_id, notice_id) REFERENCES notices(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_notice_reply_person FOREIGN KEY (school_id, author_person_id) REFERENCES people(school_id, id) ON DELETE CASCADE
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text,
  event_category varchar(40) NOT NULL CHECK (event_category IN ('Academic','Sports','Cultural','Holiday','Birthday','Meeting','Exam','Other')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  venue varchar(180),
  status varchar(20) NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled','Completed','Cancelled')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_event_creator FOREIGN KEY (school_id, created_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (created_by),
  CONSTRAINT ck_event_dates CHECK (ends_at IS NULL OR ends_at >= starts_at),
  CONSTRAINT uq_events_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE event_recipients (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  recipient_person_id uuid NOT NULL,
  recipient_role varchar(30),
  PRIMARY KEY (event_id, recipient_person_id),
  CONSTRAINT fk_event_recipient_event FOREIGN KEY (school_id, event_id) REFERENCES events(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_event_recipient_person FOREIGN KEY (school_id, recipient_person_id) REFERENCES people(school_id, id) ON DELETE CASCADE
);
CREATE TABLE broadcast_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  recipient_type varchar(30) NOT NULL CHECK (recipient_type IN ('parents','students','teachers','staff','all','custom')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_broadcast_list_creator FOREIGN KEY (school_id, created_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (created_by),
  CONSTRAINT uq_broadcast_list_name UNIQUE (school_id, name),
  CONSTRAINT uq_broadcast_list_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE broadcast_list_members (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  broadcast_list_id uuid NOT NULL,
  person_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (broadcast_list_id, person_id),
  CONSTRAINT fk_broadcast_member_list FOREIGN KEY (school_id, broadcast_list_id) REFERENCES broadcast_lists(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_broadcast_member_person FOREIGN KEY (school_id, person_id) REFERENCES people(school_id, id) ON DELETE CASCADE
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_user_id uuid,
  subject varchar(200) NOT NULL,
  body text NOT NULL,
  scheduled_at timestamptz,
  sent_at timestamptz,
  delivery_status varchar(20) NOT NULL DEFAULT 'Draft' CHECK (delivery_status IN ('Draft','Scheduled','Queued','Sent','Failed','Cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_message_sender FOREIGN KEY (school_id, sender_user_id) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (sender_user_id),
  CONSTRAINT uq_messages_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE message_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  message_id uuid NOT NULL,
  recipient_user_id uuid,
  recipient_person_id uuid,
  delivered_at timestamptz,
  read_at timestamptz,
  delivery_status varchar(20) NOT NULL DEFAULT 'Pending' CHECK (delivery_status IN ('Pending','Delivered','Read','Failed','Skipped')),
  failure_reason varchar(250),
  CONSTRAINT fk_message_recipient_message FOREIGN KEY (school_id, message_id) REFERENCES messages(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_message_recipient_user FOREIGN KEY (school_id, recipient_user_id) REFERENCES user_accounts(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_message_recipient_person FOREIGN KEY (school_id, recipient_person_id) REFERENCES people(school_id, id) ON DELETE SET NULL (recipient_person_id),
  CONSTRAINT ck_message_recipient_identity CHECK (recipient_user_id IS NOT NULL OR recipient_person_id IS NOT NULL)
);
CREATE UNIQUE INDEX uq_message_recipient_user ON message_recipients(message_id,recipient_user_id) WHERE recipient_user_id IS NOT NULL;
CREATE UNIQUE INDEX uq_message_recipient_person ON message_recipients(message_id,recipient_person_id) WHERE recipient_person_id IS NOT NULL;

CREATE TABLE message_attachments (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  message_id uuid NOT NULL,
  media_asset_id uuid NOT NULL,
  PRIMARY KEY (message_id, media_asset_id),
  CONSTRAINT fk_message_attachment_message FOREIGN KEY (school_id, message_id) REFERENCES messages(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_message_attachment_asset FOREIGN KEY (school_id, media_asset_id) REFERENCES media_assets(school_id, id) ON DELETE RESTRICT
);

CREATE TABLE fee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  description text,
  is_recurring boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_fee_type_name UNIQUE (school_id, name),
  CONSTRAINT uq_fee_types_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE fee_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  academic_year_id uuid NOT NULL,
  class_section_id uuid,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_fee_template_year FOREIGN KEY (school_id, academic_year_id) REFERENCES academic_years(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_fee_template_section FOREIGN KEY (school_id, class_section_id) REFERENCES class_sections(school_id, id) ON DELETE SET NULL (class_section_id),
  CONSTRAINT fk_fee_template_creator FOREIGN KEY (school_id, created_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (created_by),
  CONSTRAINT uq_fee_template_name UNIQUE (school_id, academic_year_id, name),
  CONSTRAINT uq_fee_templates_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE fee_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  template_id uuid NOT NULL,
  fee_type_id uuid NOT NULL,
  installment_label varchar(100) NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  due_offset_days integer,
  display_order integer NOT NULL DEFAULT 0,
  CONSTRAINT fk_fee_template_item_template FOREIGN KEY (school_id, template_id) REFERENCES fee_templates(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_template_item_type FOREIGN KEY (school_id, fee_type_id) REFERENCES fee_types(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT uq_fee_template_item UNIQUE (school_id, template_id, fee_type_id, installment_label),
  CONSTRAINT uq_fee_template_item_id UNIQUE (school_id, id)
);
CREATE TABLE student_fee_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  template_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  status varchar(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Removed','Completed')),
  CONSTRAINT fk_fee_assignment_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_assignment_template FOREIGN KEY (school_id, template_id) REFERENCES fee_templates(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_fee_assignment_assigner FOREIGN KEY (school_id, assigned_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (assigned_by),
  CONSTRAINT uq_student_fee_assignment UNIQUE (school_id, student_id, template_id),
  CONSTRAINT uq_student_fee_assignments_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE fee_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  fee_type_id uuid NOT NULL,
  template_item_id uuid,
  assignment_id uuid,
  academic_year_id uuid NOT NULL,
  fee_name varchar(120) NOT NULL,
  amount_due numeric(12,2) NOT NULL CHECK (amount_due >= 0),
  due_date date,
  status varchar(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Partial','Paid','Waived','Cancelled','Overdue')),
  reference varchar(120),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_fee_record_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_record_type FOREIGN KEY (school_id, fee_type_id) REFERENCES fee_types(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_fee_record_template_item FOREIGN KEY (school_id, template_item_id) REFERENCES fee_template_items(school_id, id) ON DELETE SET NULL (template_item_id),
  CONSTRAINT fk_fee_record_assignment FOREIGN KEY (school_id, assignment_id) REFERENCES student_fee_assignments(school_id, id) ON DELETE SET NULL (assignment_id),
  CONSTRAINT fk_fee_record_year FOREIGN KEY (school_id, academic_year_id) REFERENCES academic_years(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_fee_record_creator FOREIGN KEY (school_id, created_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (created_by),
  CONSTRAINT uq_fee_records_tenant_id UNIQUE (school_id, id),
  CONSTRAINT uq_fee_records_student_ref UNIQUE (school_id, id, student_id)
);
CREATE INDEX ix_fee_records_student_year ON fee_records(school_id, student_id, academic_year_id, due_date);
CREATE UNIQUE INDEX uq_fee_record_student_item_year ON fee_records(school_id,student_id,academic_year_id,template_item_id) WHERE template_item_id IS NOT NULL;

CREATE TABLE fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  receipt_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  student_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method varchar(30) NOT NULL CHECK (payment_method IN ('Cash','Card','UPI','Bank Transfer','Cheque','Online','Other')),
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  reference_number varchar(120),
  cash_deposit_number varchar(120),
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_fee_payment_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_fee_payment_recorder FOREIGN KEY (school_id, recorded_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (recorded_by),
  CONSTRAINT uq_fee_payments_tenant_id UNIQUE (school_id, id),
  CONSTRAINT uq_fee_payments_student_ref UNIQUE (school_id, id, student_id)
);
CREATE TABLE fee_payment_allocations (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL,
  fee_record_id uuid NOT NULL,
  student_id uuid NOT NULL,
  amount_allocated numeric(12,2) NOT NULL CHECK (amount_allocated > 0),
  PRIMARY KEY (payment_id, fee_record_id),
  CONSTRAINT fk_payment_allocation_payment FOREIGN KEY (school_id, payment_id, student_id) REFERENCES fee_payments(school_id, id, student_id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_allocation_fee FOREIGN KEY (school_id, fee_record_id, student_id) REFERENCES fee_records(school_id, id, student_id) ON DELETE RESTRICT
);
CREATE FUNCTION validate_fee_payment_allocation() RETURNS trigger
LANGUAGE plpgsql AS $
DECLARE payment_amount numeric(12,2); fee_amount numeric(12,2);
        paid_for_payment numeric(14,2); paid_for_fee numeric(14,2);
BEGIN
  SELECT amount INTO payment_amount FROM fee_payments
    WHERE school_id=NEW.school_id AND id=NEW.payment_id FOR UPDATE;
  SELECT amount_due INTO fee_amount FROM fee_records
    WHERE school_id=NEW.school_id AND id=NEW.fee_record_id FOR UPDATE;
  IF payment_amount IS NULL OR fee_amount IS NULL THEN
    RAISE EXCEPTION 'Payment or fee record not found in this school';
  END IF;
  IF EXISTS (SELECT 1 FROM fee_payment_reversals r
             WHERE r.school_id=NEW.school_id AND r.payment_id=NEW.payment_id) THEN
    RAISE EXCEPTION 'A reversed payment cannot be allocated';
  END IF;
  SELECT COALESCE(sum(amount_allocated),0) INTO paid_for_payment
    FROM fee_payment_allocations
    WHERE school_id=NEW.school_id AND payment_id=NEW.payment_id
      AND (payment_id,fee_record_id) <> (NEW.payment_id,NEW.fee_record_id);
  SELECT COALESCE(sum(amount_allocated),0) INTO paid_for_fee
    FROM fee_payment_allocations
    WHERE school_id=NEW.school_id AND fee_record_id=NEW.fee_record_id
      AND (payment_id,fee_record_id) <> (NEW.payment_id,NEW.fee_record_id)
      AND NOT EXISTS (
        SELECT 1 FROM fee_payment_reversals r
        WHERE r.school_id=fee_payment_allocations.school_id
          AND r.payment_id=fee_payment_allocations.payment_id
      );
  IF paid_for_payment + NEW.amount_allocated > payment_amount THEN
    RAISE EXCEPTION 'Allocations cannot exceed the payment amount';
  END IF;
  IF paid_for_fee + NEW.amount_allocated > fee_amount THEN
    RAISE EXCEPTION 'Allocations cannot exceed the fee amount due';
  END IF;
  RETURN NEW;
END;
$;
CREATE TRIGGER trg_validate_fee_payment_allocation
BEFORE INSERT OR UPDATE ON fee_payment_allocations
FOR EACH ROW EXECUTE FUNCTION validate_fee_payment_allocation();

CREATE TABLE fee_payment_reversals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL,
  reason text NOT NULL,
  reversed_by uuid,
  reversed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_payment_reversal_payment FOREIGN KEY (school_id, payment_id) REFERENCES fee_payments(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_reversal_actor FOREIGN KEY (school_id, reversed_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (reversed_by),
  CONSTRAINT uq_fee_payment_reversal UNIQUE (school_id, payment_id)
);
CREATE TABLE fee_late_fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  fee_type_id uuid NOT NULL,
  rule_name varchar(120) NOT NULL,
  period_type varchar(20) NOT NULL CHECK (period_type IN ('Once','Per Day','Per Week','Per Month')),
  charge_type varchar(20) NOT NULL CHECK (charge_type IN ('Flat','Percentage')),
  flat_amount numeric(12,2),
  percentage numeric(7,4),
  valid_from date NOT NULL,
  valid_to date,
  max_charge numeric(12,2),
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT fk_late_fee_type FOREIGN KEY (school_id, fee_type_id) REFERENCES fee_types(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT ck_late_fee_amount CHECK ((charge_type='Flat' AND flat_amount IS NOT NULL AND flat_amount >= 0) OR (charge_type='Percentage' AND percentage IS NOT NULL AND percentage >= 0)),
  CONSTRAINT ck_late_fee_dates CHECK (valid_to IS NULL OR valid_to >= valid_from),
  CONSTRAINT uq_late_fee_rule_name UNIQUE (school_id, rule_name)
);
CREATE TABLE fee_receipt_assets (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL,
  media_asset_id uuid NOT NULL,
  PRIMARY KEY (payment_id, media_asset_id),
  CONSTRAINT fk_fee_receipt_asset_payment FOREIGN KEY (school_id, payment_id) REFERENCES fee_payments(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_receipt_asset_media FOREIGN KEY (school_id, media_asset_id) REFERENCES media_assets(school_id, id) ON DELETE RESTRICT
);

CREATE TABLE student_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  attendance_date date NOT NULL,
  status varchar(20) NOT NULL CHECK (status IN ('Present','Absent','Late','Excused','Half Day','Leave')),
  note varchar(500),
  marked_by uuid,
  marked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_student_attendance_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_student_attendance_marker FOREIGN KEY (school_id, marked_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (marked_by),
  CONSTRAINT uq_student_attendance_day UNIQUE (school_id, student_id, attendance_date)
);
CREATE TABLE staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_person_id uuid NOT NULL,
  attendance_date date NOT NULL,
  status varchar(20) NOT NULL CHECK (status IN ('Present','Absent','Late','Excused','Half Day','Leave','Work From Home')),
  clock_in timestamptz,
  clock_out timestamptz,
  note varchar(500),
  marked_by uuid,
  marked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_staff_attendance_person FOREIGN KEY (school_id, staff_person_id) REFERENCES people(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_attendance_marker FOREIGN KEY (school_id, marked_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (marked_by),
  CONSTRAINT uq_staff_attendance_day UNIQUE (school_id, staff_person_id, attendance_date),
  CONSTRAINT ck_staff_attendance_clock CHECK (clock_out IS NULL OR clock_in IS NULL OR clock_out >= clock_in)
);

CREATE TABLE day_care_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date,
  schedule_notes varchar(500),
  emergency_contact_person_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT fk_day_care_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_day_care_emergency_person FOREIGN KEY (school_id, emergency_contact_person_id) REFERENCES people(school_id, id) ON DELETE SET NULL (emergency_contact_person_id),
  CONSTRAINT ck_day_care_dates CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT uq_day_care_enrollment UNIQUE (school_id, student_id, start_date),
  CONSTRAINT uq_day_care_enrollments_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE day_care_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL,
  service_date date NOT NULL,
  check_in_at timestamptz,
  check_out_at timestamptz,
  pickup_person_id uuid,
  notes varchar(500),
  recorded_by uuid,
  CONSTRAINT fk_day_care_checkin_enrollment FOREIGN KEY (school_id, enrollment_id) REFERENCES day_care_enrollments(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_day_care_pickup_person FOREIGN KEY (school_id, pickup_person_id) REFERENCES people(school_id, id) ON DELETE SET NULL (pickup_person_id),
  CONSTRAINT fk_day_care_recorder FOREIGN KEY (school_id, recorded_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (recorded_by),
  CONSTRAINT ck_day_care_times CHECK (check_out_at IS NULL OR check_in_at IS NULL OR check_out_at >= check_in_at),
  CONSTRAINT uq_day_care_checkin_day UNIQUE (school_id, enrollment_id, service_date)
);

CREATE TABLE questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title varchar(180) NOT NULL,
  questionnaire_type varchar(20) NOT NULL CHECK (questionnaire_type IN ('Survey','Approval','Quiz','Whizzard')),
  academic_year_id uuid NOT NULL,
  description text,
  instructions text,
  valid_from timestamptz,
  valid_to timestamptz,
  status varchar(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Published','Closed','Archived')),
  total_marks numeric(10,2) NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_questionnaire_creator FOREIGN KEY (school_id, created_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (created_by),
  CONSTRAINT fk_questionnaire_year FOREIGN KEY (school_id, academic_year_id) REFERENCES academic_years(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT ck_questionnaire_dates CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to > valid_from),
  CONSTRAINT uq_questionnaire_title_year UNIQUE (school_id, title, academic_year_id),
  CONSTRAINT uq_questionnaires_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE questionnaire_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  questionnaire_id uuid NOT NULL,
  title varchar(180) NOT NULL,
  display_order integer NOT NULL,
  CONSTRAINT fk_questionnaire_section_parent FOREIGN KEY (school_id, questionnaire_id) REFERENCES questionnaires(school_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_questionnaire_section_order UNIQUE (school_id, questionnaire_id, display_order),
  CONSTRAINT uq_questionnaire_sections_tenant_id UNIQUE (school_id, id),
  CONSTRAINT uq_questionnaire_sections_questionnaire_ref UNIQUE (school_id, id, questionnaire_id)
);
CREATE TABLE questionnaire_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  section_id uuid NOT NULL,
  questionnaire_id uuid NOT NULL,
  question_text text NOT NULL,
  input_type varchar(24) NOT NULL REFERENCES input_type_catalog(input_type),
  is_required boolean NOT NULL DEFAULT false,
  is_sensitive boolean NOT NULL DEFAULT false,
  marks numeric(10,2) NOT NULL DEFAULT 0 CHECK (marks >= 0),
  display_order integer NOT NULL,
  help_text text,
  CONSTRAINT fk_questionnaire_question_section FOREIGN KEY (school_id, section_id, questionnaire_id) REFERENCES questionnaire_sections(school_id, id, questionnaire_id) ON DELETE CASCADE,
  CONSTRAINT fk_questionnaire_question_parent FOREIGN KEY (school_id, questionnaire_id) REFERENCES questionnaires(school_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_questionnaire_question_order UNIQUE (school_id, section_id, display_order),
  CONSTRAINT uq_questionnaire_questions_tenant_id UNIQUE (school_id, id),
  CONSTRAINT uq_questionnaire_questions_questionnaire_ref UNIQUE (school_id, id, questionnaire_id),
  CONSTRAINT ck_questionnaire_input_allowed CHECK (input_type IN ('text','textarea','email','tel','number','currency','date','time','datetime','month','year','url','select','multiselect','checkbox','checkbox_group','radio','boolean','file','image','signature','rating','color','range','computed'))
);
CREATE TABLE questionnaire_question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  option_value varchar(180) NOT NULL,
  option_label varchar(180) NOT NULL,
  display_order integer NOT NULL,
  CONSTRAINT fk_question_option_question FOREIGN KEY (school_id, question_id) REFERENCES questionnaire_questions(school_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_question_option_value UNIQUE (school_id, question_id, option_value),
  CONSTRAINT uq_question_option_order UNIQUE (school_id, question_id, display_order),
  CONSTRAINT uq_question_options_tenant_id UNIQUE (school_id, id),
  CONSTRAINT uq_question_options_question_ref UNIQUE (school_id, id, question_id)
);
CREATE TABLE questionnaire_class_assignments (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  questionnaire_id uuid NOT NULL,
  class_section_id uuid NOT NULL,
  PRIMARY KEY (questionnaire_id, class_section_id),
  CONSTRAINT fk_questionnaire_assignment_questionnaire FOREIGN KEY (school_id, questionnaire_id) REFERENCES questionnaires(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_questionnaire_assignment_class FOREIGN KEY (school_id, class_section_id) REFERENCES class_sections(school_id, id) ON DELETE CASCADE
);
CREATE TABLE questionnaire_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  questionnaire_id uuid NOT NULL,
  respondent_person_id uuid NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  status varchar(20) NOT NULL DEFAULT 'Submitted' CHECK (status IN ('In Progress','Submitted','Reviewed','Returned')),
  score numeric(10,2),
  reviewed_by uuid,
  reviewed_at timestamptz,
  CONSTRAINT fk_questionnaire_submission_questionnaire FOREIGN KEY (school_id, questionnaire_id) REFERENCES questionnaires(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_questionnaire_submission_person FOREIGN KEY (school_id, respondent_person_id) REFERENCES people(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_questionnaire_submission_reviewer FOREIGN KEY (school_id, reviewed_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (reviewed_by),
  CONSTRAINT uq_questionnaire_submission UNIQUE (school_id, questionnaire_id, respondent_person_id),
  CONSTRAINT uq_questionnaire_submissions_tenant_id UNIQUE (school_id, id),
  CONSTRAINT uq_questionnaire_submissions_questionnaire_ref UNIQUE (school_id, id, questionnaire_id)
);
CREATE TABLE questionnaire_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL,
  questionnaire_id uuid NOT NULL,
  question_id uuid NOT NULL,
  text_value text,
  number_value numeric(16,4),
  boolean_value boolean,
  date_value date,
  timestamp_value timestamptz,
  option_id uuid,
  media_asset_id uuid,
  encrypted_value bytea,
  CONSTRAINT fk_questionnaire_answer_submission FOREIGN KEY (school_id, submission_id, questionnaire_id) REFERENCES questionnaire_submissions(school_id, id, questionnaire_id) ON DELETE CASCADE,
  CONSTRAINT fk_questionnaire_answer_question FOREIGN KEY (school_id, question_id, questionnaire_id) REFERENCES questionnaire_questions(school_id, id, questionnaire_id) ON DELETE RESTRICT,
  CONSTRAINT fk_questionnaire_answer_option FOREIGN KEY (school_id, option_id, question_id) REFERENCES questionnaire_question_options(school_id, id, question_id) ON DELETE RESTRICT,
  CONSTRAINT fk_questionnaire_answer_asset FOREIGN KEY (school_id, media_asset_id) REFERENCES media_assets(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT ck_questionnaire_answer_single_type CHECK (num_nonnulls(text_value, number_value, boolean_value, date_value, timestamp_value, option_id, media_asset_id, encrypted_value) <= 1),
  CONSTRAINT ck_questionnaire_encrypted_value_exclusive CHECK (encrypted_value IS NULL OR (text_value IS NULL AND number_value IS NULL AND boolean_value IS NULL AND date_value IS NULL AND timestamp_value IS NULL AND option_id IS NULL AND media_asset_id IS NULL)),
  CONSTRAINT uq_questionnaire_answer UNIQUE (school_id, submission_id, question_id),
  CONSTRAINT uq_questionnaire_answers_tenant_id UNIQUE (school_id, id),
  CONSTRAINT uq_questionnaire_answers_question_ref UNIQUE (school_id, id, question_id)
);

CREATE TABLE questionnaire_answer_selected_options (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  answer_id uuid NOT NULL,
  question_id uuid NOT NULL,
  option_id uuid NOT NULL,
  PRIMARY KEY (school_id, answer_id, option_id),
  CONSTRAINT fk_questionnaire_selected_answer FOREIGN KEY (school_id, answer_id, question_id) REFERENCES questionnaire_answers(school_id, id, question_id) ON DELETE CASCADE,
  CONSTRAINT fk_questionnaire_selected_option FOREIGN KEY (school_id, option_id, question_id) REFERENCES questionnaire_question_options(school_id, id, question_id) ON DELETE RESTRICT
);

CREATE FUNCTION validate_questionnaire_answer_value() RETURNS trigger
LANGUAGE plpgsql AS $
DECLARE question_is_sensitive boolean; question_input_type varchar(24); value_count integer;
BEGIN
  SELECT is_sensitive,input_type INTO question_is_sensitive,question_input_type
    FROM questionnaire_questions WHERE school_id=NEW.school_id AND id=NEW.question_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown questionnaire question'; END IF;
  value_count := num_nonnulls(NEW.text_value,NEW.number_value,NEW.boolean_value,NEW.date_value,NEW.timestamp_value,NEW.option_id,NEW.media_asset_id,NEW.encrypted_value);
  IF question_is_sensitive AND (NEW.encrypted_value IS NULL OR value_count <> 1) THEN
    RAISE EXCEPTION 'Sensitive questionnaire answers must be encrypted before database storage';
  END IF;
  IF NOT question_is_sensitive AND NEW.encrypted_value IS NOT NULL THEN
    RAISE EXCEPTION 'Encrypted answer supplied for a question not marked sensitive';
  END IF;
  IF question_input_type IN ('multiselect','checkbox_group') AND NOT question_is_sensitive THEN
    IF value_count <> 0 THEN RAISE EXCEPTION 'Multi-select answers must use relational option rows'; END IF;
  ELSIF value_count <> 1 THEN
    RAISE EXCEPTION 'Exactly one typed value must be stored for this questionnaire answer';
  END IF;
  IF question_input_type = 'computed' THEN RAISE EXCEPTION 'Computed questions cannot be answered directly'; END IF;
  RETURN NEW;
END;
$;
CREATE TRIGGER trg_validate_questionnaire_answer_value
BEFORE INSERT OR UPDATE ON questionnaire_answers
FOR EACH ROW EXECUTE FUNCTION validate_questionnaire_answer_value();

CREATE FUNCTION validate_questionnaire_selected_option() RETURNS trigger
LANGUAGE plpgsql AS $
DECLARE question_input_type varchar(24); question_is_sensitive boolean;
BEGIN
  SELECT input_type,is_sensitive INTO question_input_type,question_is_sensitive FROM questionnaire_questions
    WHERE school_id=NEW.school_id AND id=NEW.question_id;
  IF question_is_sensitive THEN RAISE EXCEPTION 'Sensitive multi-select choices must be encrypted as a single answer'; END IF;
  IF question_input_type NOT IN ('multiselect','checkbox_group') THEN
    RAISE EXCEPTION 'Selected-option rows are only valid for multiselect/checkbox-group questions';
  END IF;
  RETURN NEW;
END;
$;
CREATE TRIGGER trg_validate_questionnaire_selected_option
BEFORE INSERT OR UPDATE ON questionnaire_answer_selected_options
FOR EACH ROW EXECUTE FUNCTION validate_questionnaire_selected_option();

CREATE TABLE assessment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name varchar(140) NOT NULL,
  term_name varchar(80),
  max_marks numeric(10,2) NOT NULL DEFAULT 100 CHECK (max_marks > 0),
  passing_marks numeric(10,2) NOT NULL DEFAULT 0 CHECK (passing_marks >= 0),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_assessment_template_creator FOREIGN KEY (school_id, created_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (created_by),
  CONSTRAINT uq_assessment_template_name UNIQUE (school_id, name),
  CONSTRAINT uq_assessment_templates_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title varchar(140) NOT NULL,
  academic_year_id uuid NOT NULL,
  class_section_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  term_name varchar(80),
  assessment_date date,
  template_id uuid,
  max_marks numeric(10,2) NOT NULL CHECK (max_marks > 0),
  passing_marks numeric(10,2) NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Published','Archived')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_assessment_year FOREIGN KEY (school_id, academic_year_id) REFERENCES academic_years(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_assessment_class FOREIGN KEY (school_id, class_section_id) REFERENCES class_sections(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_assessment_subject FOREIGN KEY (school_id, subject_id) REFERENCES subjects(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_assessment_template FOREIGN KEY (school_id, template_id) REFERENCES assessment_templates(school_id, id) ON DELETE SET NULL (template_id),
  CONSTRAINT fk_assessment_creator FOREIGN KEY (school_id, created_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (created_by),
  CONSTRAINT uq_assessment_key UNIQUE (school_id, title, academic_year_id, class_section_id, subject_id),
  CONSTRAINT uq_assessments_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE assessment_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  marks_obtained numeric(10,2),
  grade varchar(10),
  remarks varchar(500),
  marked_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_assessment_score_assessment FOREIGN KEY (school_id, assessment_id) REFERENCES assessments(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_score_student FOREIGN KEY (school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_score_marker FOREIGN KEY (school_id, marked_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (marked_by),
  CONSTRAINT uq_assessment_student_score UNIQUE (school_id, assessment_id, student_id)
);
CREATE TABLE report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name varchar(140) NOT NULL,
  report_type varchar(50) NOT NULL,
  layout_name varchar(80),
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_report_template_creator FOREIGN KEY (school_id, created_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (created_by),
  CONSTRAINT uq_report_template_name UNIQUE (school_id, name)
);

CREATE TABLE store_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  vendor_code varchar(60),
  name varchar(160) NOT NULL,
  contact_person varchar(140),
  email varchar(254),
  phone varchar(32),
  address_line_1 varchar(250),
  address_line_2 varchar(250),
  city varchar(100),
  state varchar(100),
  postal_code varchar(20),
  tax_registration_number varchar(60),
  payment_terms varchar(100),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_store_vendor_code UNIQUE (school_id, vendor_code),
  CONSTRAINT uq_store_vendor_name UNIQUE (school_id, name),
  CONSTRAINT uq_store_vendors_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE store_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  CONSTRAINT uq_store_category_name UNIQUE (school_id, name),
  CONSTRAINT uq_store_categories_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE store_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  category_id uuid,
  item_code varchar(80) NOT NULL,
  name varchar(180) NOT NULL,
  description text,
  unit_of_measure varchar(30) NOT NULL DEFAULT 'piece',
  current_stock numeric(14,3) NOT NULL DEFAULT 0,
  reorder_level numeric(14,3) NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  image_asset_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_store_item_category FOREIGN KEY (school_id, category_id) REFERENCES store_categories(school_id, id) ON DELETE SET NULL (category_id),
  CONSTRAINT fk_store_item_image FOREIGN KEY (school_id, image_asset_id) REFERENCES media_assets(school_id, id) ON DELETE SET NULL (image_asset_id),
  CONSTRAINT ck_store_stock CHECK (current_stock >= 0 AND reorder_level >= 0 AND unit_cost >= 0),
  CONSTRAINT uq_store_item_code UNIQUE (school_id, item_code),
  CONSTRAINT uq_store_items_tenant_id UNIQUE (school_id, id)
);
CREATE TABLE store_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  movement_type varchar(20) NOT NULL CHECK (movement_type IN ('Opening','Purchase','Issue','Return','Adjustment','Damaged')),
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit_cost numeric(12,2),
  reference_number varchar(100),
  vendor_id uuid,
  note varchar(500),
  recorded_by uuid,
  movement_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_stock_movement_item FOREIGN KEY (school_id, item_id) REFERENCES store_items(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_stock_movement_vendor FOREIGN KEY (school_id, vendor_id) REFERENCES store_vendors(school_id, id) ON DELETE SET NULL (vendor_id),
  CONSTRAINT fk_stock_movement_actor FOREIGN KEY (school_id, recorded_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (recorded_by)
);

CREATE TABLE user_module_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  module_key varchar(80) NOT NULL,
  preference_key varchar(100) NOT NULL,
  text_value text,
  number_value numeric(16,4),
  boolean_value boolean,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_user_preference_single_value CHECK (num_nonnulls(text_value, number_value, boolean_value) = 1),
  CONSTRAINT fk_module_preference_user_tenant FOREIGN KEY (school_id, user_id) REFERENCES user_accounts(school_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_user_module_preference UNIQUE (user_id, module_key, preference_key)
);
CREATE TABLE contact_column_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  column_key varchar(100) NOT NULL,
  display_order integer NOT NULL,
  width_pixels smallint,
  is_visible boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_contact_column_width CHECK (width_pixels IS NULL OR width_pixels BETWEEN 40 AND 1200),
  CONSTRAINT fk_contact_columns_user_tenant FOREIGN KEY (school_id, user_id) REFERENCES user_accounts(school_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_contact_column_preference UNIQUE (user_id, column_key),
  CONSTRAINT uq_contact_column_order UNIQUE (user_id, display_order)
);

CREATE TABLE school_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title varchar(180) NOT NULL,
  body text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Published','Archived')),
  created_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_school_announcement_creator FOREIGN KEY (school_id, created_by) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (created_by)
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  actor_user_id uuid,
  action varchar(100) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id varchar(120),
  summary text,
  ip_address inet,
  user_agent varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_audit_actor_tenant FOREIGN KEY (school_id, actor_user_id) REFERENCES user_accounts(school_id, id) ON DELETE SET NULL (actor_user_id)
);
CREATE INDEX ix_audit_logs_school_date ON audit_logs(school_id, created_at DESC);
CREATE TABLE audit_log_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id uuid NOT NULL REFERENCES audit_logs(id) ON DELETE CASCADE,
  field_name varchar(120) NOT NULL,
  previous_value text,
  next_value text,
  CONSTRAINT uq_audit_change_field UNIQUE (audit_log_id, field_name)
);

-- Defense-in-depth tenant isolation. The Express API must set these LOCAL variables
-- inside each request transaction, from the authenticated session only:
-- app.current_school_id, app.current_user_id, app.is_super_admin, and app.login_email
-- for the single login lookup. The runtime DB role must not own these tables or BYPASSRLS.
DO $tenant_rls$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT DISTINCT table_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name='school_id'
      AND table_name <> 'user_accounts'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.table_name);
    EXECUTE format(
      'CREATE POLICY tenant_scope ON public.%I USING (school_id = NULLIF(current_setting(''app.current_school_id'',true),'''')::uuid OR COALESCE(current_setting(''app.is_super_admin'',true),''false'') = ''true'') WITH CHECK (school_id = NULLIF(current_setting(''app.current_school_id'',true),'''')::uuid OR COALESCE(current_setting(''app.is_super_admin'',true),''false'') = ''true'')',
      t.table_name
    );
  END LOOP;
END;
$tenant_rls$;

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY schools_tenant_read ON schools FOR SELECT
  USING (id = NULLIF(current_setting('app.current_school_id',true),'')::uuid OR COALESCE(current_setting('app.is_super_admin',true),'false')='true');
CREATE POLICY schools_tenant_write ON schools FOR ALL
  USING (id = NULLIF(current_setting('app.current_school_id',true),'')::uuid OR COALESCE(current_setting('app.is_super_admin',true),'false')='true')
  WITH CHECK (id = NULLIF(current_setting('app.current_school_id',true),'')::uuid OR COALESCE(current_setting('app.is_super_admin',true),'false')='true');

ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_accounts_login_read ON user_accounts FOR SELECT
  USING (
    lower(email)=lower(COALESCE(current_setting('app.login_email',true),''))
    OR id = NULLIF(current_setting('app.current_user_id',true),'')::uuid
    OR school_id = NULLIF(current_setting('app.current_school_id',true),'')::uuid
    OR COALESCE(current_setting('app.is_super_admin',true),'false')='true'
  );
CREATE POLICY user_accounts_tenant_write ON user_accounts FOR ALL
  USING (school_id = NULLIF(current_setting('app.current_school_id',true),'')::uuid OR COALESCE(current_setting('app.is_super_admin',true),'false')='true')
  WITH CHECK (school_id = NULLIF(current_setting('app.current_school_id',true),'')::uuid OR COALESCE(current_setting('app.is_super_admin',true),'false')='true');

ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_sessions_user_scope ON auth_sessions FOR ALL
  USING (user_id = NULLIF(current_setting('app.current_user_id',true),'')::uuid OR COALESCE(current_setting('app.is_super_admin',true),'false')='true')
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id',true),'')::uuid OR COALESCE(current_setting('app.is_super_admin',true),'false')='true');

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY password_reset_user_scope ON password_reset_tokens FOR ALL
  USING (user_id = NULLIF(current_setting('app.current_user_id',true),'')::uuid OR COALESCE(current_setting('app.is_super_admin',true),'false')='true')
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id',true),'')::uuid OR COALESCE(current_setting('app.is_super_admin',true),'false')='true');
CREATE POLICY password_reset_token_lookup ON password_reset_tokens FOR SELECT
  USING (token_hash = decode(NULLIF(current_setting('app.password_reset_token_hash',true),''),'hex'));

ALTER TABLE audit_log_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_changes_tenant_scope ON audit_log_changes FOR ALL
  USING (EXISTS (SELECT 1 FROM audit_logs al WHERE al.id=audit_log_id))
  WITH CHECK (EXISTS (SELECT 1 FROM audit_logs al WHERE al.id=audit_log_id));


-- Relational Super Admin template catalog and per-administrator assignments.
-- Super Admin-managed fee receipt and performance templates.
-- All template definition and assignment data is relational; no JSON/JSONB payloads are used.

CREATE TABLE IF NOT EXISTS admin_template_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text NOT NULL CHECK (template_type IN ('fee_receipt','performance_report')),
  template_code text NOT NULL,
  template_name text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id uuid REFERENCES user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_admin_template_version UNIQUE (template_type, template_code, version),
  CONSTRAINT uq_admin_template_id_type UNIQUE (id, template_type)
);

CREATE INDEX IF NOT EXISTS ix_admin_template_catalog_type_active
  ON admin_template_catalog(template_type, is_active, template_name);

CREATE TABLE IF NOT EXISTS fee_receipt_template_settings (
  template_id uuid PRIMARY KEY REFERENCES admin_template_catalog(id) ON DELETE CASCADE,
  show_school_logo boolean NOT NULL DEFAULT true,
  show_school_name boolean NOT NULL DEFAULT true,
  show_school_address boolean NOT NULL DEFAULT true,
  show_school_phone boolean NOT NULL DEFAULT true,
  show_school_email boolean NOT NULL DEFAULT false,
  show_student_name boolean NOT NULL DEFAULT true,
  show_student_code boolean NOT NULL DEFAULT true,
  show_class_section boolean NOT NULL DEFAULT true,
  show_academic_year boolean NOT NULL DEFAULT true,
  show_parent_name boolean NOT NULL DEFAULT true,
  show_fee_breakdown boolean NOT NULL DEFAULT true,
  show_payment_method boolean NOT NULL DEFAULT true,
  show_receipt_number boolean NOT NULL DEFAULT true,
  show_payment_reference boolean NOT NULL DEFAULT true,
  show_paid_amount boolean NOT NULL DEFAULT true,
  show_balance boolean NOT NULL DEFAULT false,
  show_signature_line boolean NOT NULL DEFAULT true,
  page_orientation text NOT NULL DEFAULT 'portrait' CHECK (page_orientation IN ('portrait','landscape')),
  header_text varchar(160) NOT NULL DEFAULT 'FEE RECEIPT',
  footer_text varchar(500) NOT NULL DEFAULT 'Thank you for your payment.',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS performance_template_settings (
  template_id uuid PRIMARY KEY REFERENCES admin_template_catalog(id) ON DELETE CASCADE,
  academic_year varchar(20) NOT NULL DEFAULT '',
  report_title varchar(160) NOT NULL DEFAULT 'Student Performance Report',
  show_student_photo boolean NOT NULL DEFAULT false,
  show_marks boolean NOT NULL DEFAULT true,
  show_grade boolean NOT NULL DEFAULT true,
  show_remarks boolean NOT NULL DEFAULT true,
  footer_text varchar(500) NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS performance_template_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES performance_template_settings(template_id) ON DELETE CASCADE,
  term_name varchar(120) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT uq_performance_template_term UNIQUE (template_id, term_name),
  CONSTRAINT uq_performance_template_term_order UNIQUE (template_id, sort_order)
);

CREATE TABLE IF NOT EXISTS performance_template_subterms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES performance_template_settings(template_id) ON DELETE CASCADE,
  subterm_name varchar(120) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT uq_performance_template_subterm UNIQUE (template_id, subterm_name),
  CONSTRAINT uq_performance_template_subterm_order UNIQUE (template_id, sort_order)
);

CREATE TABLE IF NOT EXISTS school_admin_template_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_admin_user_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  template_type text NOT NULL CHECK (template_type IN ('fee_receipt','performance_report')),
  template_id uuid NOT NULL,
  applied_by_user_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  applied_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_school_admin_template_matching_type
    FOREIGN KEY (template_id, template_type)
    REFERENCES admin_template_catalog(id, template_type) ON DELETE RESTRICT,
  CONSTRAINT uq_school_admin_template_type UNIQUE (school_admin_user_id, template_type)
);

CREATE INDEX IF NOT EXISTS ix_school_admin_template_assignments_template
  ON school_admin_template_assignments(template_id);
CREATE INDEX IF NOT EXISTS ix_school_admin_template_assignments_applied_by
  ON school_admin_template_assignments(applied_by_user_id, applied_at DESC);

CREATE OR REPLACE FUNCTION enforce_school_admin_template_assignment_roles()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  target_role text;
  actor_role text;
BEGIN
  SELECT role INTO target_role FROM user_accounts WHERE id=NEW.school_admin_user_id;
  SELECT role INTO actor_role FROM user_accounts WHERE id=NEW.applied_by_user_id;

  IF target_role IS DISTINCT FROM 'school_admin' THEN
    RAISE EXCEPTION 'Template assignments must target school_admin accounts.'
      USING ERRCODE='23514';
  END IF;
  IF actor_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Only a super_admin account may apply a template.'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_enforce_school_admin_template_assignment_roles
  ON school_admin_template_assignments;
CREATE TRIGGER trg_enforce_school_admin_template_assignment_roles
  BEFORE INSERT OR UPDATE ON school_admin_template_assignments
  FOR EACH ROW EXECUTE FUNCTION enforce_school_admin_template_assignment_roles();


-- Built-in templates are safe defaults; the catalog can be extended with additional versions.
INSERT INTO admin_template_catalog(template_type,template_code,template_name,version,description)
VALUES
 ('fee_receipt','standard-receipt','Standard Fee Receipt',1,'A clear portrait receipt with school contact details, student identity, payment method and receipt number.'),
 ('fee_receipt','detailed-receipt','Detailed Fee Receipt',1,'A detailed receipt layout with student and payment details, outstanding balance and signature line.'),
 ('performance_report','standard-performance','Standard Performance Report',1,'A term-wise report template with marks and grades.'),
 ('performance_report','detailed-performance','Detailed Performance Report',1,'A fuller report template with terms and assessment subterms.')
ON CONFLICT (template_type,template_code,version) DO NOTHING;

INSERT INTO fee_receipt_template_settings(
  template_id,show_school_logo,show_school_name,show_school_address,show_school_phone,show_school_email,
  show_student_name,show_student_code,show_class_section,show_academic_year,show_parent_name,
  show_fee_breakdown,show_payment_method,show_receipt_number,show_payment_reference,show_paid_amount,
  show_balance,show_signature_line,page_orientation,header_text,footer_text
)
SELECT id,
  true,true,true,true,false,
  true,true,true,true,true,
  true,true,true,true,true,
  (template_code='detailed-receipt'),true,'portrait','FEE RECEIPT','Thank you for your payment.'
FROM admin_template_catalog
WHERE template_type='fee_receipt'
ON CONFLICT (template_id) DO NOTHING;

INSERT INTO performance_template_settings(template_id,academic_year,report_title,show_student_photo,show_marks,show_grade,show_remarks,footer_text)
SELECT id,'','Student Performance Report',false,true,true,(template_code='detailed-performance'),'Please discuss your child's progress with the school.'
FROM admin_template_catalog
WHERE template_type='performance_report'
ON CONFLICT (template_id) DO NOTHING;

INSERT INTO performance_template_terms(template_id,term_name,sort_order)
SELECT t.id,seed.term_name,seed.sort_order
FROM admin_template_catalog t
JOIN (VALUES
 ('standard-performance','Term 1',1),
 ('standard-performance','Term 2',2),
 ('standard-performance','Term 3',3),
 ('detailed-performance','Unit Test 1',1),
 ('detailed-performance','Term 1',2),
 ('detailed-performance','Half Yearly',3),
 ('detailed-performance','Term 2',4),
 ('detailed-performance','Annual',5)
) AS seed(template_code,term_name,sort_order)
 ON seed.template_code=t.template_code
WHERE t.template_type='performance_report'
ON CONFLICT (template_id,term_name) DO NOTHING;

INSERT INTO performance_template_subterms(template_id,subterm_name,sort_order)
SELECT t.id,seed.subterm_name,seed.sort_order
FROM admin_template_catalog t
JOIN (VALUES
 ('standard-performance','Unit Test',1),
 ('standard-performance','Written',2),
 ('detailed-performance','Written Exam',1),
 ('detailed-performance','Oral Assessment',2),
 ('detailed-performance','Practical',3),
 ('detailed-performance','Project / Activity',4)
) AS seed(template_code,subterm_name,sort_order)
 ON seed.template_code=t.template_code
WHERE t.template_type='performance_report'
ON CONFLICT (template_id,subterm_name) DO NOTHING;

COMMIT;
