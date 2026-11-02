-- Normalize Manage Classes into relational class and subject-mapping rows.
-- The legacy JSONB payload is read only by this one-time migration to preserve existing records.
ALTER TABLE school_classes
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS available_from date,
  ADD COLUMN IF NOT EXISTS available_to date,
  ADD COLUMN IF NOT EXISTS virtual_classroom boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_grade boolean NOT NULL DEFAULT false;
ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Sections are distinct class records: e.g. Class 2 / B and Class 2 / C.
ALTER TABLE school_classes DROP CONSTRAINT IF EXISTS school_classes_school_id_class_name_key;
UPDATE school_classes SET section='' WHERE section IS NULL;
ALTER TABLE school_classes ALTER COLUMN section SET DEFAULT '';
ALTER TABLE school_classes ALTER COLUMN section SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_classes_school_name_section_ci
  ON school_classes (school_id, lower(class_name), lower(section));
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_classes_school_id_id ON school_classes (school_id,id);
CREATE INDEX IF NOT EXISTS ix_school_classes_school_active_order
  ON school_classes (school_id, is_active, grade_order, lower(class_name), lower(section));

CREATE TABLE IF NOT EXISTS school_class_subject_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  school_class_id uuid NOT NULL,
  subject_key text NOT NULL,
  subject_name varchar(150) NOT NULL,
  teacher_person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  extra_curricular boolean NOT NULL DEFAULT false,
  is_optional boolean NOT NULL DEFAULT false,
  package_subject boolean NOT NULL DEFAULT false,
  is_language boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_school_class_subject_mappings_school_id_id UNIQUE (school_id, id),
  CONSTRAINT uq_school_class_subject_mappings_key UNIQUE (school_id, school_class_id, subject_key),
  CONSTRAINT fk_school_class_subject_mapping_class
    FOREIGN KEY (school_id, school_class_id)
    REFERENCES school_classes(school_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_school_class_subject_mappings_class
  ON school_class_subject_mappings (school_id, school_class_id, subject_name);

-- Backfill configured classes and sections from legacy saved records into school_classes.
WITH class_rows AS (
  SELECT m.school_id,
         min(left(btrim(item->>'name'),180)) AS class_name,
         min(left(btrim(COALESCE(item->>'section','')),60)) AS section,
         min(left(btrim(COALESCE(item->>'displayName','')),120)) AS display_name,
         min(CASE WHEN COALESCE(item->>'displayOrder','') ~ '^[0-9]+$'
             THEN (item->>'displayOrder')::integer ELSE 0 END) AS grade_order,
         min(CASE WHEN COALESCE(item->>'availableFrom','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
             THEN (item->>'availableFrom')::date END) AS available_from,
         min(CASE WHEN COALESCE(item->>'availableTo','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
             THEN (item->>'availableTo')::date END) AS available_to,
         bool_or(lower(COALESCE(item->>'status','active')) <> 'inactive') AS is_active,
         bool_or(lower(COALESCE(item->>'virtualClassroom','false')) = 'true') AS virtual_classroom,
         bool_or(lower(COALESCE(item->>'hiddenGrade','false')) = 'true') AS hidden_grade
  FROM module_records m
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(m.payload->'classes')='array' THEN m.payload->'classes' ELSE '[]'::jsonb END
  ) AS class_values(item)
  WHERE m.module_key='classes' AND m.record_key='state'
    AND nullif(btrim(item->>'name'),'') IS NOT NULL
  GROUP BY m.school_id, lower(left(btrim(item->>'name'),180)), lower(left(btrim(COALESCE(item->>'section','')),60))
)
INSERT INTO school_classes
  (school_id,class_name,section,grade_order,is_active,display_name,available_from,available_to,virtual_classroom,hidden_grade)
SELECT school_id,class_name,section,grade_order,is_active,display_name,available_from,available_to,virtual_classroom,hidden_grade
FROM class_rows
ON CONFLICT (school_id,lower(class_name),lower(section))
DO UPDATE SET
  grade_order=EXCLUDED.grade_order,
  is_active=EXCLUDED.is_active,
  display_name=EXCLUDED.display_name,
  available_from=EXCLUDED.available_from,
  available_to=EXCLUDED.available_to,
  virtual_classroom=EXCLUDED.virtual_classroom,
  hidden_grade=EXCLUDED.hidden_grade,
  updated_at=now();

-- Preserve enabled subject/teacher mappings as relational rows.
WITH legacy_mappings AS (
  SELECT m.school_id,
         left(btrim(item->>'name'),180) AS class_name,
         left(btrim(COALESCE(item->>'section','')),60) AS section,
         COALESCE(NULLIF(btrim(mapping->>'subjectId'),''),NULLIF(btrim(mapping->>'subjectName'),'')) AS subject_key,
         left(btrim(COALESCE(mapping->>'subjectName','')),150) AS subject_name,
         CASE WHEN COALESCE(mapping->>'teacherId','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              THEN (mapping->>'teacherId')::uuid END AS teacher_person_id,
         lower(COALESCE(mapping->>'extraCurricular','false'))='true' AS extra_curricular,
         lower(COALESCE(mapping->>'optional','false'))='true' AS is_optional,
         lower(COALESCE(mapping->>'packageSubject','false'))='true' AS package_subject,
         lower(COALESCE(mapping->>'language','false'))='true' AS is_language,
         row_number() OVER (
           PARTITION BY m.school_id,lower(left(btrim(item->>'name'),180)),lower(left(btrim(COALESCE(item->>'section','')),60)),
             COALESCE(NULLIF(btrim(mapping->>'subjectId'),''),NULLIF(btrim(mapping->>'subjectName'),''))
           ORDER BY m.updated_at DESC NULLS LAST
         ) AS duplicate_rank
  FROM module_records m
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(m.payload->'classes')='array' THEN m.payload->'classes' ELSE '[]'::jsonb END
  ) AS class_rows(item)
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(class_rows.item->'subjectMappings')='array' THEN class_rows.item->'subjectMappings' ELSE '[]'::jsonb END
  ) AS subject_rows(mapping)
  WHERE m.module_key='classes' AND m.record_key='state'
    AND nullif(btrim(item->>'name'),'') IS NOT NULL
    AND COALESCE(lower(mapping->>'enabled'),'true') <> 'false'
    AND COALESCE(NULLIF(btrim(mapping->>'subjectId'),''),NULLIF(btrim(mapping->>'subjectName'),'')) IS NOT NULL
    AND nullif(btrim(mapping->>'subjectName'),'') IS NOT NULL
)
INSERT INTO school_class_subject_mappings
  (school_id,school_class_id,subject_key,subject_name,teacher_person_id,extra_curricular,is_optional,package_subject,is_language)
SELECT lm.school_id,sc.id,lm.subject_key,lm.subject_name,
       CASE WHEN EXISTS (SELECT 1 FROM people p WHERE p.school_id=lm.school_id AND p.id=lm.teacher_person_id AND p.person_type='teacher')
         THEN lm.teacher_person_id ELSE NULL END,
       lm.extra_curricular,lm.is_optional,lm.package_subject,lm.is_language
FROM legacy_mappings lm
JOIN school_classes sc ON sc.school_id=lm.school_id
  AND lower(sc.class_name)=lower(lm.class_name) AND lower(sc.section)=lower(lm.section)
WHERE lm.duplicate_rank=1
ON CONFLICT (school_id,school_class_id,subject_key)
DO UPDATE SET subject_name=EXCLUDED.subject_name,
  teacher_person_id=EXCLUDED.teacher_person_id,
  extra_curricular=EXCLUDED.extra_curricular,
  is_optional=EXCLUDED.is_optional,
  package_subject=EXCLUDED.package_subject,
  is_language=EXCLUDED.is_language,
  updated_at=now();

-- Move external-link grade assignments to the same school_classes source of truth.
ALTER TABLE external_link_classes ADD COLUMN IF NOT EXISTS school_class_id uuid;
UPDATE external_link_classes elc
SET school_class_id=sc.id
FROM external_link_grade_options go
JOIN school_classes sc ON sc.school_id=go.school_id
  AND lower(sc.class_name)=lower(go.class_name)
  AND lower(sc.section)=lower(COALESCE(go.section,''))
WHERE elc.school_id=go.school_id
  AND elc.grade_option_id=go.id
  AND elc.external_link_id IS NOT NULL;
DELETE FROM external_link_classes WHERE school_class_id IS NULL;
ALTER TABLE external_link_classes DROP CONSTRAINT IF EXISTS pk_external_link_classes;
ALTER TABLE external_link_classes DROP CONSTRAINT IF EXISTS fk_external_link_classes_grade;
DROP INDEX IF EXISTS ix_external_link_classes_grade;
ALTER TABLE external_link_classes DROP COLUMN IF EXISTS grade_option_id;
ALTER TABLE external_link_classes ALTER COLUMN school_class_id SET NOT NULL;
ALTER TABLE external_link_classes
  ADD CONSTRAINT pk_external_link_classes PRIMARY KEY (school_id,external_link_id,school_class_id);
ALTER TABLE external_link_classes
  ADD CONSTRAINT fk_external_link_classes_school_class
  FOREIGN KEY (school_id,school_class_id)
  REFERENCES school_classes(school_id,id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS ix_external_link_classes_school_class
  ON external_link_classes (school_id,school_class_id,external_link_id);

DROP TABLE IF EXISTS external_link_grade_options;
