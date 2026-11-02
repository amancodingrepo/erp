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
