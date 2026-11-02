-- Normalize subject catalog data used by Manage Subjects and Manage Classes.
-- Legacy JSONB is read only here, once, to migrate existing saved rows into relational tables.
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

-- One-time category backfill from saved category records and used subject category names.
INSERT INTO school_subject_categories(school_id,name)
SELECT m.school_id,min(left(btrim(category_item->>'name'),100))
FROM module_records m
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(m.payload->'categories')='array' THEN m.payload->'categories' ELSE '[]'::jsonb END
) AS category_rows(category_item)
WHERE m.module_key='subject-categories' AND m.record_key='state'
  AND nullif(btrim(category_item->>'name'),'') IS NOT NULL
  AND lower(btrim(category_item->>'name')) NOT IN ('listening skills','reading skills','speaking skills','writing skills')
GROUP BY m.school_id,lower(left(btrim(category_item->>'name'),100))
ON CONFLICT (school_id,lower(name)) DO UPDATE SET is_active=true,updated_at=now();

INSERT INTO school_subject_categories(school_id,name)
SELECT m.school_id,min(left(btrim(subject_item->>'category'),100))
FROM module_records m
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(m.payload->'subjects')='array' THEN m.payload->'subjects' ELSE '[]'::jsonb END
) AS subject_rows(subject_item)
WHERE m.module_key='subjects' AND m.record_key='state'
  AND nullif(btrim(subject_item->>'category'),'') IS NOT NULL
GROUP BY m.school_id,lower(left(btrim(subject_item->>'category'),100))
ON CONFLICT (school_id,lower(name)) DO UPDATE SET is_active=true,updated_at=now();

-- One-time subject type backfill from saved type lists and used subject type names.
INSERT INTO school_subject_types(school_id,name)
SELECT m.school_id,min(left(btrim(type_item->>'name'),150))
FROM module_records m
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(m.payload->'subjectTypes')='array' THEN m.payload->'subjectTypes' ELSE '[]'::jsonb END
) AS type_rows(type_item)
WHERE m.module_key='subject-types' AND m.record_key='state'
  AND nullif(btrim(type_item->>'name'),'') IS NOT NULL
  AND lower(btrim(type_item->>'name')) NOT IN ('activities/projects','activity','activity/project/group discussion','art & craft','asl','behaviour','care of belongings','cleanliness','concept & tables','concept__activity__tables','confidence','conversation','conversation__recitation','courteousness','courteousness/goodmanners','craft','creativity','dictation','discipline','drawing','enthusiasm','environmental sensitivity__activity/project__group discussion','fluency','games & sports','general activities','gracefulness/expressions','group discussion','hand-writing','handwriting__spelling','initiative','initiative/leadership','interest','listening skills','meditation','melody','mental ability','mental ability__written work','moral values','music','neatness','neatness & discipline','notebook maintenance','physical education','practical','project','pronunciation','pronunciation__fluency','punctuality','reading','reading skills','recitation','regularity','regularity & punctuality','respect for other''s property','rhythm','self control','sharing & caring')
GROUP BY m.school_id,lower(left(btrim(type_item->>'name'),150))
ON CONFLICT (school_id,lower(name)) DO UPDATE SET is_active=true,updated_at=now();

INSERT INTO school_subject_types(school_id,name)
SELECT m.school_id,min(left(btrim(type_name),150))
FROM module_records m
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(m.payload->'subjects')='array' THEN m.payload->'subjects' ELSE '[]'::jsonb END
) AS subject_rows(subject_item)
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(subject_item->'subjectTypes')='array' THEN subject_item->'subjectTypes' ELSE '[]'::jsonb END
) AS type_rows(type_name)
WHERE m.module_key='subjects' AND m.record_key='state'
  AND nullif(btrim(type_name),'') IS NOT NULL
GROUP BY m.school_id,lower(left(btrim(type_name),150))
ON CONFLICT (school_id,lower(name)) DO UPDATE SET is_active=true,updated_at=now();

-- One-time subject catalog backfill.
WITH legacy_subjects AS (
  SELECT m.school_id,
         NULLIF(btrim(subject_item->>'id'),'') AS legacy_key,
         min(left(btrim(subject_item->>'name'),150)) AS name,
         min(left(btrim(COALESCE(subject_item->>'code','')),50)) AS code,
         min(left(btrim(COALESCE(subject_item->>'category','')),100)) AS category_name,
         min(left(btrim(COALESCE(subject_item->>'description','')),1000)) AS description,
         bool_or(lower(COALESCE(subject_item->>'status','active'))<>'inactive') AS is_active,
         row_number() OVER (
           PARTITION BY m.school_id,lower(left(btrim(subject_item->>'name'),150))
           ORDER BY m.updated_at DESC NULLS LAST
         ) AS duplicate_rank
  FROM module_records m
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(m.payload->'subjects')='array' THEN m.payload->'subjects' ELSE '[]'::jsonb END
  ) AS subject_rows(subject_item)
  WHERE m.module_key='subjects' AND m.record_key='state'
    AND nullif(btrim(subject_item->>'name'),'') IS NOT NULL
  GROUP BY m.school_id,lower(left(btrim(subject_item->>'name'),150)),
           NULLIF(btrim(subject_item->>'id'),''),m.updated_at
)
INSERT INTO school_subjects(school_id,legacy_key,name,code,category_id,description,is_active)
SELECT ls.school_id,ls.legacy_key,ls.name,ls.code,c.id,ls.description,ls.is_active
FROM legacy_subjects ls
LEFT JOIN school_subject_categories c ON c.school_id=ls.school_id
  AND lower(c.name)=lower(ls.category_name)
WHERE ls.duplicate_rank=1
ON CONFLICT (school_id,lower(name))
DO UPDATE SET
  legacy_key=COALESCE(school_subjects.legacy_key,EXCLUDED.legacy_key),
  code=EXCLUDED.code,
  category_id=EXCLUDED.category_id,
  description=EXCLUDED.description,
  is_active=EXCLUDED.is_active,
  updated_at=now();

-- Preserve subject-type and applicable-class choices as relational association rows.
INSERT INTO school_subject_type_assignments(school_id,school_subject_id,subject_type_id)
SELECT DISTINCT m.school_id,s.id,t.id
FROM module_records m
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(m.payload->'subjects')='array' THEN m.payload->'subjects' ELSE '[]'::jsonb END
) AS subject_rows(subject_item)
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(subject_item->'subjectTypes')='array' THEN subject_item->'subjectTypes' ELSE '[]'::jsonb END
) AS type_rows(type_name)
JOIN school_subjects s ON s.school_id=m.school_id
  AND (s.legacy_key=NULLIF(btrim(subject_item->>'id'),'') OR lower(s.name)=lower(btrim(subject_item->>'name')))
JOIN school_subject_types t ON t.school_id=m.school_id AND lower(t.name)=lower(btrim(type_name))
WHERE m.module_key='subjects' AND m.record_key='state'
  AND nullif(btrim(type_name),'') IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO school_subject_applicable_classes(school_id,school_subject_id,class_name)
SELECT DISTINCT m.school_id,s.id,left(btrim(class_name),180)
FROM module_records m
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(m.payload->'subjects')='array' THEN m.payload->'subjects' ELSE '[]'::jsonb END
) AS subject_rows(subject_item)
CROSS JOIN LATERAL (
  SELECT class_value AS class_name
  FROM jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(subject_item->'classes')='array' THEN subject_item->'classes' ELSE '[]'::jsonb END
  ) AS array_classes(class_value)
  UNION
  SELECT split_class AS class_name
  FROM regexp_split_to_table(COALESCE(subject_item->>'classesText',''),',') AS split_classes(split_class)
) class_values
JOIN school_subjects s ON s.school_id=m.school_id
  AND (s.legacy_key=NULLIF(btrim(subject_item->>'id'),'') OR lower(s.name)=lower(btrim(subject_item->>'name')))
WHERE m.module_key='subjects' AND m.record_key='state'
  AND nullif(btrim(class_name),'') IS NOT NULL
ON CONFLICT DO NOTHING;

-- Preserve any saved class-subject mapping whose subject was missing from the old subject catalog.
INSERT INTO school_subjects(school_id,legacy_key,name,code,category_id,description,is_active)
SELECT mapping.school_id,
       CASE
         WHEN nullif(btrim(mapping.subject_key),'') IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM school_subjects existing
                          WHERE existing.school_id=mapping.school_id
                            AND existing.legacy_key=mapping.subject_key)
         THEN mapping.subject_key
         ELSE NULL
       END,
       min(left(btrim(mapping.subject_name),150)),
       '',
       NULL,
       '',
       true
FROM school_class_subject_mappings mapping
WHERE nullif(btrim(mapping.subject_name),'') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM school_subjects existing
    WHERE existing.school_id=mapping.school_id
      AND (existing.legacy_key=mapping.subject_key
        OR lower(existing.name)=lower(btrim(mapping.subject_name)))
  )
GROUP BY mapping.school_id,mapping.subject_key,lower(left(btrim(mapping.subject_name),150))
ON CONFLICT (school_id,lower(name)) DO NOTHING;

-- Relink class-subject assignments to subject UUIDs, then remove legacy text identifiers.
ALTER TABLE school_class_subject_mappings ADD COLUMN IF NOT EXISTS subject_id uuid;
UPDATE school_class_subject_mappings mapping
SET subject_id=COALESCE(
  (SELECT subject.id FROM school_subjects subject
   WHERE subject.school_id=mapping.school_id AND subject.legacy_key=mapping.subject_key
   LIMIT 1),
  (SELECT subject.id FROM school_subjects subject
   WHERE subject.school_id=mapping.school_id AND lower(subject.name)=lower(mapping.subject_name)
   LIMIT 1),
  (SELECT subject.id FROM school_subjects subject
   WHERE subject.school_id=mapping.school_id AND subject.code<>'' AND lower(subject.code)=lower(mapping.subject_key)
   LIMIT 1)
)
WHERE EXISTS (
  SELECT 1 FROM school_subjects subject
  WHERE subject.school_id=mapping.school_id
    AND (subject.legacy_key=mapping.subject_key
      OR lower(subject.name)=lower(mapping.subject_name)
      OR (subject.code<>'' AND lower(subject.code)=lower(mapping.subject_key)))
);
DELETE FROM school_class_subject_mappings WHERE subject_id IS NULL;
-- If older subject names/IDs collapsed to one relational subject, keep the most recently updated mapping.
DELETE FROM school_class_subject_mappings older
USING school_class_subject_mappings newer
WHERE older.school_id=newer.school_id
  AND older.school_class_id=newer.school_class_id
  AND older.subject_id=newer.subject_id
  AND (
    older.updated_at < newer.updated_at
    OR (older.updated_at = newer.updated_at AND older.id > newer.id)
  );
ALTER TABLE school_class_subject_mappings DROP CONSTRAINT IF EXISTS uq_school_class_subject_mappings_key;
DROP INDEX IF EXISTS ix_school_class_subject_mappings_class;
ALTER TABLE school_class_subject_mappings DROP COLUMN IF EXISTS subject_key;
ALTER TABLE school_class_subject_mappings DROP COLUMN IF EXISTS subject_name;
ALTER TABLE school_class_subject_mappings ALTER COLUMN subject_id SET NOT NULL;
ALTER TABLE school_class_subject_mappings
  ADD CONSTRAINT fk_school_class_subject_mapping_subject
  FOREIGN KEY (school_id,subject_id) REFERENCES school_subjects(school_id,id) ON DELETE CASCADE;
ALTER TABLE school_class_subject_mappings
  ADD CONSTRAINT uq_school_class_subject_mappings_subject
  UNIQUE (school_id,school_class_id,subject_id);
CREATE INDEX IF NOT EXISTS ix_school_class_subject_mappings_class
  ON school_class_subject_mappings (school_id,school_class_id,subject_id);
