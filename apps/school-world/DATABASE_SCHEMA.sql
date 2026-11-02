CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  slug text UNIQUE,
  phone text,
  email text,
  address text,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  label text NOT NULL,
  start_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, label)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_year_current ON academic_years(school_id) WHERE is_current = true;

CREATE TABLE IF NOT EXISTS school_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE SET NULL,
  class_name text NOT NULL,
  grade_order integer NOT NULL DEFAULT 0,
  section text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  available_from date,
  available_to date,
  virtual_classroom boolean NOT NULL DEFAULT false,
  hidden_grade boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_school_classes_school_id_id UNIQUE (school_id,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_classes_school_name_section_ci
  ON school_classes (school_id, lower(class_name), lower(section));
CREATE INDEX IF NOT EXISTS ix_school_classes_school_active_order
  ON school_classes (school_id, is_active, grade_order, lower(class_name), lower(section));


-- people are directory/notice-recipient identities; login accounts are optional.
CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  person_type text NOT NULL DEFAULT 'other' CHECK (person_type IN ('student','parent','teacher','staff','day_care','guardian','other')),
  external_id text,
  first_name text NOT NULL DEFAULT '',
  middle_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  full_name text NOT NULL DEFAULT '',
  email text,
  contact_number text,
  alternate_contact_number text,
  class_name text,
  section text,
  roll_number text,
  enrollment_number text,
  parent_guardian_name text,
  gender text,
  date_of_birth date,
  address text,
  city text,
  state text,
  status text NOT NULL DEFAULT 'Active',
  route_name text,
  day_care boolean NOT NULL DEFAULT false,
  last_seen timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_people_external_id ON people(school_id, person_type, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_people_school_type_class ON people(school_id, person_type, class_name);
CREATE INDEX IF NOT EXISTS ix_people_school_route ON people(school_id, route_name);

CREATE TABLE IF NOT EXISTS user_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin','school_admin','principal','teacher','staff','parent','student','transport_admin')),
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_email_global ON user_accounts(lower(email));
CREATE INDEX IF NOT EXISTS ix_user_school_role ON user_accounts(school_id, role);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  student_code text NOT NULL,
  name text NOT NULL,
  class_name text NOT NULL DEFAULT '',
  section text NOT NULL DEFAULT '',
  academic_year text NOT NULL DEFAULT '',
  original_class text NOT NULL DEFAULT '',
  dob date,
  gender text NOT NULL DEFAULT '',
  father_name text NOT NULL DEFAULT '',
  parent_name text NOT NULL DEFAULT '',
  mother_name text NOT NULL DEFAULT '',
  primary_parent_name text NOT NULL DEFAULT '',
  primary_parent text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  alternate_phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  pin_code text NOT NULL DEFAULT '',
  blood_group text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  nationality text NOT NULL DEFAULT '',
  house text NOT NULL DEFAULT '',
  last_seen text NOT NULL DEFAULT '',
  enrolled text NOT NULL DEFAULT '',
  enrollment_date date,
  enrollment_number text NOT NULL DEFAULT '',
  roll_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  fee_defaulter boolean NOT NULL DEFAULT false,
  child_id_active boolean NOT NULL DEFAULT true,
  parent_id_active boolean NOT NULL DEFAULT true,
  rfid_mapped boolean NOT NULL DEFAULT false,
  rfid_number text NOT NULL DEFAULT '',
  siblings jsonb NOT NULL DEFAULT '[]'::jsonb,
  photo_data_url text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, student_code)
);
CREATE INDEX IF NOT EXISTS ix_students_school_year_class ON students(school_id, academic_year, class_name);
CREATE INDEX IF NOT EXISTS ix_students_school_status ON students(school_id, status);
CREATE INDEX IF NOT EXISTS ix_students_school_name ON students(school_id, lower(name));

CREATE TABLE IF NOT EXISTS student_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES user_accounts(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

CREATE TABLE IF NOT EXISTS student_parents (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'Guardian',
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY(student_id, parent_person_id)
);

CREATE TABLE IF NOT EXISTS school_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  stops text NOT NULL DEFAULT '',
  vehicle_number text NOT NULL DEFAULT '',
  driver_name text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);

CREATE TABLE IF NOT EXISTS notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE SET NULL,
  academic_year text NOT NULL,
  board text NOT NULL CHECK (board IN ('school','class','route')),
  audience_key text NOT NULL,
  notice_type text NOT NULL CHECK (notice_type IN ('News','Alert','Homework - Worksheet','Homework - Assignment')),
  message text NOT NULL DEFAULT '',
  author_user_id uuid REFERENCES user_accounts(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT '',
  allow_reply boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_notices_school_year_date ON notices(school_id, academic_year, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_notices_school_audience ON notices(school_id, board, audience_key);

CREATE TABLE IF NOT EXISTS notice_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  notice_id uuid NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  content_type text NOT NULL DEFAULT 'application/octet-stream',
  file_size integer NOT NULL DEFAULT 0,
  file_data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notice_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  notice_id uuid NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  viewer_person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notice_id, viewer_person_id)
);
CREATE INDEX IF NOT EXISTS ix_notice_views_school_notice ON notice_views(school_id, notice_id);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title text NOT NULL, detail text NOT NULL DEFAULT '', event_date date, created_by uuid REFERENCES user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES user_accounts(id) ON DELETE SET NULL, recipient_id uuid REFERENCES user_accounts(id) ON DELETE SET NULL,
  subject text NOT NULL DEFAULT '', body text NOT NULL, sent_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz
);
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, attendance_date date NOT NULL, status text NOT NULL CHECK (status IN ('Present','Absent','Late','Excused')),
  marked_by uuid REFERENCES user_accounts(id) ON DELETE SET NULL, note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(student_id, attendance_date)
);
CREATE TABLE IF NOT EXISTS fee_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, academic_year text NOT NULL,
  fee_name text NOT NULL, installment_name varchar(100) NOT NULL DEFAULT 'Single Installment', amount numeric(12,2) NOT NULL DEFAULT 0, amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  due_date date, paid_at timestamptz, status text NOT NULL DEFAULT 'Pending', reference text NOT NULL DEFAULT '', metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  question text NOT NULL, answer_type text NOT NULL DEFAULT 'Text answer', options jsonb NOT NULL DEFAULT '[]'::jsonb, active boolean NOT NULL DEFAULT true, created_by uuid REFERENCES user_accounts(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  questionnaire_id uuid NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE, respondent_person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  answer jsonb NOT NULL, submitted_at timestamptz NOT NULL DEFAULT now(), UNIQUE(questionnaire_id, respondent_person_id)
);
CREATE TABLE IF NOT EXISTS store_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  item_code text NOT NULL, name text NOT NULL, current_stock integer NOT NULL DEFAULT 0, minimum_stock integer NOT NULL DEFAULT 0, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(school_id,item_code)
);
CREATE TABLE IF NOT EXISTS store_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL, contact_person text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS module_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  module_key text NOT NULL, record_key text NOT NULL DEFAULT 'state', payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES user_accounts(id) ON DELETE SET NULL, updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, module_key, record_key)
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES user_accounts(id) ON DELETE SET NULL, action text NOT NULL, entity_type text NOT NULL,
  entity_id text, details jsonb NOT NULL DEFAULT '{}'::jsonb, ip_address inet, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_audit_school_date ON audit_logs(school_id, created_at DESC);

-- Relational staff categories and one-way parent communication restrictions.
CREATE TABLE IF NOT EXISTS staff_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL CHECK (length(btrim(name)) > 0),
  description varchar(500) NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_staff_categories_school_id_id UNIQUE (school_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_categories_school_name_ci
  ON staff_categories (school_id, lower(name));
CREATE INDEX IF NOT EXISTS ix_staff_categories_active
  ON staff_categories (school_id, is_active, lower(name));

CREATE TABLE IF NOT EXISTS staff_category_assignments (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  staff_category_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_staff_category_assignments PRIMARY KEY (school_id, person_id),
  CONSTRAINT fk_staff_category_assignment_category
    FOREIGN KEY (school_id, staff_category_id)
    REFERENCES staff_categories(school_id, id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS ix_staff_category_assignments_category
  ON staff_category_assignments (school_id, staff_category_id, person_id);

CREATE TABLE IF NOT EXISTS one_way_communication_category_restrictions (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_category_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_one_way_communication_category_restrictions
    PRIMARY KEY (school_id, staff_category_id),
  CONSTRAINT fk_one_way_communication_restriction_category
    FOREIGN KEY (school_id, staff_category_id)
    REFERENCES staff_categories(school_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_one_way_communication_restrictions_category
  ON one_way_communication_category_restrictions (school_id, staff_category_id);


-- Manage External Links normalized relational schema.

CREATE TABLE IF NOT EXISTS school_subject_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL CHECK (length(btrim(name)) > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_school_subject_categories_school_id_id UNIQUE (school_id,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_subject_categories_school_name_ci
  ON school_subject_categories (school_id,lower(name));

CREATE TABLE IF NOT EXISTS school_subject_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name varchar(150) NOT NULL CHECK (length(btrim(name)) > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_school_subject_types_school_id_id UNIQUE (school_id,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_subject_types_school_name_ci
  ON school_subject_types (school_id,lower(name));

CREATE TABLE IF NOT EXISTS school_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  legacy_key text,
  name varchar(150) NOT NULL CHECK (length(btrim(name)) > 0),
  code varchar(50) NOT NULL DEFAULT '',
  category_id uuid REFERENCES school_subject_categories(id) ON DELETE SET NULL,
  description varchar(1000) NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_school_subjects_school_id_id UNIQUE (school_id,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_subjects_school_name_ci
  ON school_subjects (school_id,lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_subjects_school_legacy_key
  ON school_subjects (school_id,legacy_key) WHERE legacy_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_subjects_school_code_ci
  ON school_subjects (school_id,lower(code)) WHERE btrim(code)<>'';
CREATE INDEX IF NOT EXISTS ix_school_subjects_active
  ON school_subjects (school_id,is_active,lower(name));

CREATE TABLE IF NOT EXISTS school_subject_type_assignments (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  school_subject_id uuid NOT NULL,
  subject_type_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_school_subject_type_assignments PRIMARY KEY (school_id,school_subject_id,subject_type_id),
  CONSTRAINT fk_school_subject_type_assignment_subject
    FOREIGN KEY (school_id,school_subject_id) REFERENCES school_subjects(school_id,id) ON DELETE CASCADE,
  CONSTRAINT fk_school_subject_type_assignment_type
    FOREIGN KEY (school_id,subject_type_id) REFERENCES school_subject_types(school_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_school_subject_type_assignments_type
  ON school_subject_type_assignments (school_id,subject_type_id,school_subject_id);

CREATE TABLE IF NOT EXISTS school_subject_applicable_classes (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  school_subject_id uuid NOT NULL,
  class_name varchar(180) NOT NULL CHECK (length(btrim(class_name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_school_subject_applicable_classes PRIMARY KEY (school_id,school_subject_id,class_name),
  CONSTRAINT fk_school_subject_applicable_class_subject
    FOREIGN KEY (school_id,school_subject_id) REFERENCES school_subjects(school_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_school_subject_applicable_classes_subject
  ON school_subject_applicable_classes (school_id,school_subject_id,lower(class_name));

CREATE TABLE IF NOT EXISTS school_class_subject_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  school_class_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  teacher_person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  extra_curricular boolean NOT NULL DEFAULT false,
  is_optional boolean NOT NULL DEFAULT false,
  package_subject boolean NOT NULL DEFAULT false,
  is_language boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_school_class_subject_mappings_school_id_id UNIQUE (school_id, id),
  CONSTRAINT uq_school_class_subject_mappings_subject UNIQUE (school_id, school_class_id, subject_id),
  CONSTRAINT fk_school_class_subject_mapping_class
    FOREIGN KEY (school_id, school_class_id) REFERENCES school_classes(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_school_class_subject_mapping_subject
    FOREIGN KEY (school_id, subject_id) REFERENCES school_subjects(school_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_school_class_subject_mappings_class
  ON school_class_subject_mappings (school_id, school_class_id, subject_id);

CREATE TABLE IF NOT EXISTS external_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  url text NOT NULL CHECK (length(btrim(url)) > 0),
  description varchar(1000) NOT NULL DEFAULT '',
  only_daycare_student boolean NOT NULL DEFAULT false,
  only_daycare_timing boolean NOT NULL DEFAULT false,
  available_to_all_grades boolean NOT NULL DEFAULT true,
  available_from time without time zone NOT NULL DEFAULT '05:00',
  available_to time without time zone NOT NULL DEFAULT '23:00',
  is_cctv_camera_link boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_external_links_school_id_id UNIQUE (school_id, id)
);
CREATE INDEX IF NOT EXISTS ix_external_links_school_updated
  ON external_links (school_id, updated_at DESC, id);

CREATE TABLE IF NOT EXISTS external_link_classes (
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  external_link_id uuid NOT NULL,
  school_class_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_external_link_classes PRIMARY KEY (school_id, external_link_id, school_class_id),
  CONSTRAINT fk_external_link_classes_link
    FOREIGN KEY (school_id, external_link_id)
    REFERENCES external_links (school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_external_link_classes_school_class
    FOREIGN KEY (school_id, school_class_id)
    REFERENCES school_classes (school_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_external_link_classes_school_class
  ON external_link_classes (school_id, school_class_id, external_link_id);

