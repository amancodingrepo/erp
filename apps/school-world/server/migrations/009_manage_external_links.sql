-- Manage External Links uses normalized relational storage only.
-- Grade options are derived from relational student/class columns.
CREATE TABLE IF NOT EXISTS external_link_grade_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_name varchar(180) NOT NULL CHECK (length(btrim(class_name)) > 0),
  section varchar(60) NOT NULL DEFAULT '',
  grade_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_external_link_grade_options_school_id_id UNIQUE (school_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_external_link_grade_options_school_name_section_ci
  ON external_link_grade_options (school_id, lower(class_name), lower(section));
CREATE INDEX IF NOT EXISTS ix_external_link_grade_options_active
  ON external_link_grade_options (school_id, is_active, grade_order, lower(class_name), lower(section));

-- Backfill grade options from real relational columns only.
INSERT INTO external_link_grade_options (school_id, class_name, section, grade_order)
SELECT s.school_id, min(left(btrim(s.class_name),180)), min(left(btrim(s.section),60)), 0
FROM students s
WHERE nullif(btrim(s.class_name),'') IS NOT NULL
GROUP BY s.school_id, lower(left(btrim(s.class_name),180)), lower(left(btrim(s.section),60))
ON CONFLICT (school_id, lower(class_name), lower(section))
DO UPDATE SET is_active=true, updated_at=now();

INSERT INTO external_link_grade_options (school_id, class_name, section, grade_order)
SELECT p.school_id, min(left(btrim(p.class_name),180)), min(left(btrim(COALESCE(p.section,'')),60)), 0
FROM people p
WHERE p.person_type='student'
  AND nullif(btrim(p.class_name),'') IS NOT NULL
GROUP BY p.school_id, lower(left(btrim(p.class_name),180)), lower(left(btrim(COALESCE(p.section,'')),60))
ON CONFLICT (school_id, lower(class_name), lower(section))
DO UPDATE SET is_active=true, updated_at=now();

INSERT INTO external_link_grade_options (school_id, class_name, section, grade_order)
SELECT c.school_id, min(left(btrim(c.class_name),180)), '', min(c.grade_order)
FROM school_classes c
WHERE c.is_active=true
  AND nullif(btrim(c.class_name),'') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM students s
    WHERE s.school_id=c.school_id AND lower(btrim(s.class_name))=lower(btrim(c.class_name))
  )
  AND NOT EXISTS (
    SELECT 1 FROM people p
    WHERE p.school_id=c.school_id AND p.person_type='student'
      AND lower(btrim(p.class_name))=lower(btrim(c.class_name))
  )
GROUP BY c.school_id, lower(left(btrim(c.class_name),180))
ON CONFLICT (school_id, lower(class_name), lower(section))
DO UPDATE SET is_active=true, grade_order=EXCLUDED.grade_order, updated_at=now();

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
  grade_option_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_external_link_classes PRIMARY KEY (school_id, external_link_id, grade_option_id),
  CONSTRAINT fk_external_link_classes_link
    FOREIGN KEY (school_id, external_link_id)
    REFERENCES external_links (school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_external_link_classes_grade
    FOREIGN KEY (school_id, grade_option_id)
    REFERENCES external_link_grade_options (school_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_external_link_classes_grade
  ON external_link_classes (school_id, grade_option_id, external_link_id);
