-- Persist each student's optional subject choices for a configured class and academic year.
-- Student choices are relational records, not Performance Report JSON payload fields.
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_school_id_id ON students (school_id,id);
CREATE TABLE IF NOT EXISTS school_student_optional_subject_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  school_class_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  academic_year varchar(32) NOT NULL CHECK (length(btrim(academic_year)) BETWEEN 1 AND 32),
  selected_by uuid REFERENCES user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_school_student_optional_subject_selection UNIQUE (school_id,student_id,school_class_id,subject_id,academic_year),
  CONSTRAINT fk_student_optional_selection_student FOREIGN KEY (school_id,student_id)
    REFERENCES students(school_id,id) ON DELETE CASCADE,
  CONSTRAINT fk_student_optional_selection_class FOREIGN KEY (school_id,school_class_id)
    REFERENCES school_classes(school_id,id) ON DELETE CASCADE,
  CONSTRAINT fk_student_optional_selection_subject FOREIGN KEY (school_id,subject_id)
    REFERENCES school_subjects(school_id,id) ON DELETE CASCADE,
  CONSTRAINT fk_student_optional_selection_class_mapping FOREIGN KEY (school_id,school_class_id,subject_id)
    REFERENCES school_class_subject_mappings(school_id,school_class_id,subject_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_student_optional_subject_selections_class_year ON school_student_optional_subject_selections (school_id,school_class_id,academic_year);
CREATE INDEX IF NOT EXISTS ix_student_optional_subject_selections_student_year ON school_student_optional_subject_selections (school_id,student_id,academic_year);
