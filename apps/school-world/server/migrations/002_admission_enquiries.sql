CREATE TABLE IF NOT EXISTS admission_enquiries (
  id bigserial PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  form_number text NOT NULL,
  academic_year text NOT NULL,
  enquiry_date date,
  enquiry_status text NOT NULL DEFAULT 'Cold Enquiry',
  student_name text NOT NULL,
  primary_contact text NOT NULL,
  email text,
  class_applied text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, form_number)
);
CREATE INDEX IF NOT EXISTS admission_enquiries_school_date_idx
  ON admission_enquiries (school_id, enquiry_date DESC, created_at DESC);
