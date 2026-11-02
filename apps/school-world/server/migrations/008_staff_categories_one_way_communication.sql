-- Staff categories and parent-message restrictions use normalized relational rows.
-- Legacy staff category labels are migrated out of people.metadata into relational records.
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

-- Move any legacy staff category labels into real category records.
WITH legacy_categories AS (
  SELECT p.school_id,
         lower(left(btrim(p.metadata #>> '{staffDetails,staffCategory}'), 100)) AS normalized_name,
         min(left(btrim(p.metadata #>> '{staffDetails,staffCategory}'), 100)) AS category_name
  FROM people p
  WHERE p.person_type IN ('staff', 'teacher')
    AND nullif(btrim(p.metadata #>> '{staffDetails,staffCategory}'), '') IS NOT NULL
  GROUP BY p.school_id, lower(left(btrim(p.metadata #>> '{staffDetails,staffCategory}'), 100))
)
INSERT INTO staff_categories (school_id, name)
SELECT l.school_id, l.category_name
FROM legacy_categories l
WHERE NOT EXISTS (
  SELECT 1 FROM staff_categories c
  WHERE c.school_id = l.school_id AND lower(c.name) = l.normalized_name
)
ON CONFLICT DO NOTHING;

-- Link legacy staff records to the newly normalized categories.
INSERT INTO staff_category_assignments (school_id, person_id, staff_category_id)
SELECT p.school_id, p.id, c.id
FROM people p
JOIN staff_categories c
  ON c.school_id = p.school_id
 AND lower(c.name) = lower(left(btrim(p.metadata #>> '{staffDetails,staffCategory}'), 100))
WHERE p.person_type IN ('staff', 'teacher')
  AND nullif(btrim(p.metadata #>> '{staffDetails,staffCategory}'), '') IS NOT NULL
ON CONFLICT (school_id, person_id) DO NOTHING;

-- Remove the legacy copy so staff category data is no longer stored in JSONB.
UPDATE people p
SET metadata = jsonb_set(
      p.metadata,
      '{staffDetails}',
      (p.metadata->'staffDetails') - 'staffCategory',
      false
    ),
    updated_at = now()
WHERE p.person_type IN ('staff', 'teacher')
  AND jsonb_typeof(p.metadata->'staffDetails') = 'object'
  AND (p.metadata->'staffDetails') ? 'staffCategory';

-- Discard the previous placeholder role list. It is not valid relational category data.
DELETE FROM module_records
WHERE module_key = 'one-way-communication'
  AND record_key = 'state';
