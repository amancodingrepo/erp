-- One-time normalization of existing Manage Classes records into relational grade options.
-- Runtime external-link grade reads use external_link_grade_options only.
-- This migrates legacy saved class names once; no ongoing JSON/JSONB reads are required.
UPDATE external_link_grade_options SET is_active=false,updated_at=now();

WITH legacy_classes AS (
  SELECT m.school_id,
         min(left(btrim(class_item->>'name'),180)) AS class_name,
         min(left(btrim(COALESCE(class_item->>'section','')),60)) AS section,
         min(
           CASE WHEN COALESCE(class_item->>'displayOrder','') ~ '^[0-9]+$'
             THEN (class_item->>'displayOrder')::integer
             ELSE 0
           END
         ) AS grade_order,
         bool_or(lower(COALESCE(class_item->>'status','active')) <> 'inactive') AS is_active,
         lower(left(btrim(class_item->>'name'),180)) AS name_key,
         lower(left(btrim(COALESCE(class_item->>'section','')),60)) AS section_key
  FROM module_records m
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(m.payload->'classes')='array' THEN m.payload->'classes'
      ELSE '[]'::jsonb
    END
  ) AS legacy_rows(class_item)
  WHERE m.module_key='classes'
    AND m.record_key='state'
    AND nullif(btrim(class_item->>'name'),'') IS NOT NULL
  GROUP BY m.school_id,
           lower(left(btrim(class_item->>'name'),180)),
           lower(left(btrim(COALESCE(class_item->>'section','')),60))
)
INSERT INTO external_link_grade_options
  (school_id,class_name,section,grade_order,is_active)
SELECT school_id,class_name,section,grade_order,is_active
FROM legacy_classes
ON CONFLICT (school_id,lower(class_name),lower(section))
DO UPDATE SET
  grade_order=EXCLUDED.grade_order,
  is_active=EXCLUDED.is_active,
  updated_at=now();
