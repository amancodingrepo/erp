-- Run this only after database/aws_school_world_relational_schema.sql succeeds
-- on an isolated test database. It performs read-only catalog checks.

DO $validation$
DECLARE missing_types text[];
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND data_type IN ('json','jsonb')
  ) THEN
    RAISE EXCEPTION 'Schema check failed: JSON/JSONB columns are present';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND EXISTS (
        SELECT 1 FROM information_schema.columns ic
        WHERE ic.table_schema='public' AND ic.table_name=c.relname AND ic.column_name='school_id'
      )
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Schema check failed: at least one school-scoped table has row-level security disabled';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN
      ('schools','user_accounts','auth_sessions','password_reset_tokens','audit_log_changes')
      AND table_type='BASE TABLE'
      AND table_name NOT IN (
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relrowsecurity
      )
  ) THEN
    RAISE EXCEPTION 'Schema check failed: a special security table has row-level security disabled';
  END IF;

  SELECT array_agg(required.input_type)
    INTO missing_types
  FROM (VALUES
    ('text'),('textarea'),('email'),('tel'),('password'),('number'),
    ('currency'),('date'),('time'),('datetime'),('month'),('year'),('url'),
    ('select'),('multiselect'),('checkbox'),('checkbox_group'),('radio'),
    ('boolean'),('file'),('image'),('signature'),('rating'),('color'),
    ('range'),('computed'),('search'),('hidden')
  ) AS required(input_type)
  WHERE NOT EXISTS (
    SELECT 1 FROM input_type_catalog i WHERE i.input_type=required.input_type
  );

  IF missing_types IS NOT NULL THEN
    RAISE EXCEPTION 'Schema check failed: input types missing from input_type_catalog: %', missing_types;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_validate_admission_field_value' AND NOT tgisinternal)
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_validate_questionnaire_answer_value' AND NOT tgisinternal)
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_validate_fee_payment_allocation' AND NOT tgisinternal)
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_enforce_school_admin_template_assignment_roles' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Schema check failed: one or more typed-value / fee-allocation / Super Admin assignment validation triggers are missing';
  END IF;
END;
$validation$;

SELECT
  (SELECT count(*) FROM information_schema.tables
   WHERE table_schema='public' AND table_type='BASE TABLE') AS public_table_count,
  (SELECT count(*) FROM information_schema.columns
   WHERE table_schema='public' AND data_type IN ('json','jsonb')) AS json_or_jsonb_column_count,
  (SELECT count(*) FROM pg_class c
   JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity) AS rls_enabled_table_count,
  (SELECT count(*) FROM input_type_catalog) AS supported_input_type_count;
