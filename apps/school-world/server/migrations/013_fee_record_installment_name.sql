-- Keep each fee installment in a dedicated relational column.
-- Existing JSONB metadata is consulted only once here to migrate legacy installment labels.
ALTER TABLE fee_records
  ADD COLUMN IF NOT EXISTS installment_name varchar(100) NOT NULL DEFAULT 'Single Installment';

UPDATE fee_records
SET installment_name = left(
  COALESCE(
    NULLIF(btrim(metadata->>'installmentName'),''),
    NULLIF(btrim(metadata #>> '{templateFeeItems,0,originalInstallment}'),''),
    'Single Installment'
  ),
  100
)
WHERE installment_name = 'Single Installment'
  AND (
    NULLIF(btrim(metadata->>'installmentName'),'') IS NOT NULL
    OR NULLIF(btrim(metadata #>> '{templateFeeItems,0,originalInstallment}'),'') IS NOT NULL
  );

ALTER TABLE fee_records
  DROP CONSTRAINT IF EXISTS chk_fee_records_installment_name;
ALTER TABLE fee_records
  ADD CONSTRAINT chk_fee_records_installment_name
  CHECK (length(btrim(installment_name)) > 0);

CREATE INDEX IF NOT EXISTS ix_fee_records_school_installment
  ON fee_records (school_id, installment_name, academic_year);
