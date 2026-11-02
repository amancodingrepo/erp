-- Generate numeric, unique receipt numbers from PostgreSQL.
CREATE SEQUENCE IF NOT EXISTS fee_receipt_number_seq
  AS bigint
  MINVALUE 1
  START WITH 1000000000
  INCREMENT BY 1
  NO CYCLE;

-- Keep legacy receipt identifiers consistent across all fee rows in one transaction.
CREATE TEMP TABLE fee_receipt_legacy_mapping (
  legacy_number text PRIMARY KEY,
  numeric_number text NOT NULL
) ON COMMIT DROP;

INSERT INTO fee_receipt_legacy_mapping (legacy_number, numeric_number)
SELECT legacy_number, nextval('fee_receipt_number_seq')::text
FROM (
  SELECT DISTINCT history.entry ->> 'receiptNumber' AS legacy_number
  FROM fee_records AS f
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(f.metadata -> 'paymentHistory') = 'array'
        THEN f.metadata -> 'paymentHistory'
      ELSE jsonb_build_array()
    END
  ) AS history(entry)
  WHERE NULLIF(history.entry ->> 'receiptNumber', '') IS NOT NULL
    AND history.entry ->> 'receiptNumber' !~ '^[0-9][0-9]*$'
) AS legacy;

-- Replace nonnumeric/missing receipt numbers in existing payment history.
UPDATE fee_records AS f
SET metadata = jsonb_set(
  COALESCE(f.metadata, jsonb_build_object()),
  ARRAY['paymentHistory']::text[],
  (
    SELECT jsonb_agg(
      CASE
        WHEN COALESCE(history.entry ->> 'receiptNumber', '') ~ '^[0-9][0-9]*$'
          THEN history.entry
        WHEN NULLIF(history.entry ->> 'receiptNumber', '') IS NULL
          THEN jsonb_set(
            history.entry,
            ARRAY['receiptNumber']::text[],
            to_jsonb(nextval('fee_receipt_number_seq')::text),
            true
          )
        ELSE jsonb_set(
          history.entry,
          ARRAY['receiptNumber']::text[],
          to_jsonb(mapping.numeric_number),
          true
        )
      END
      ORDER BY history.ordinality
    )
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(f.metadata -> 'paymentHistory') = 'array'
          THEN f.metadata -> 'paymentHistory'
        ELSE jsonb_build_array()
      END
    ) WITH ORDINALITY AS history(entry, ordinality)
    LEFT JOIN fee_receipt_legacy_mapping AS mapping
      ON mapping.legacy_number = history.entry ->> 'receiptNumber'
  ),
  true
)
WHERE jsonb_typeof(f.metadata -> 'paymentHistory') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(f.metadata -> 'paymentHistory') = 'array'
          THEN f.metadata -> 'paymentHistory'
        ELSE jsonb_build_array()
      END
    ) AS history(entry)
    WHERE COALESCE(history.entry ->> 'receiptNumber', '') !~ '^[0-9][0-9]*$'
  );

-- Older paid rows without a payment history receive a persistent numeric receipt number.
UPDATE fee_records AS f
SET metadata = jsonb_set(
  COALESCE(f.metadata, jsonb_build_object()),
  ARRAY['paymentHistory']::text[],
  jsonb_build_array(jsonb_build_object(
    'receiptNumber', nextval('fee_receipt_number_seq')::text,
    'paymentMethod', COALESCE(f.metadata ->> 'paymentMethod', ''),
    'paymentDate', COALESCE(to_char(f.paid_at, 'YYYY-MM-DD'), to_char(CURRENT_DATE, 'YYYY-MM-DD')),
    'cashDepositNumber', COALESCE(f.reference, ''),
    'notes', COALESCE(f.metadata ->> 'notes', ''),
    'amountPaid', f.amount_paid,
    'lateFeeCharges', CASE
      WHEN COALESCE(f.metadata ->> 'lateFeeCharges', '') ~ '^[0-9][0-9]*(\.[0-9][0-9]*)?$'
        THEN (f.metadata ->> 'lateFeeCharges')::numeric
      ELSE 0
    END,
    'recordedAt', COALESCE(f.paid_at::timestamptz, now()),
    'recordedBy', NULL
  )),
  true
)
WHERE f.amount_paid > 0
  AND (
    jsonb_typeof(f.metadata -> 'paymentHistory') IS DISTINCT FROM 'array'
    OR jsonb_array_length(
      CASE
        WHEN jsonb_typeof(f.metadata -> 'paymentHistory') = 'array'
          THEN f.metadata -> 'paymentHistory'
        ELSE jsonb_build_array()
      END
    ) = 0
  );

-- Continue after any prior numeric receipts already present in the database.
SELECT setval(
  'fee_receipt_number_seq',
  GREATEST(
    999999999::bigint,
    COALESCE(
      MAX(
        CASE
          WHEN history.entry ->> 'receiptNumber' ~ '^[0-9][0-9]*$'
            AND length(history.entry ->> 'receiptNumber') <= 18
            THEN (history.entry ->> 'receiptNumber')::bigint
        END
      ),
      999999999::bigint
    )
  ),
  true
)
FROM fee_records AS f
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(f.metadata -> 'paymentHistory') = 'array'
      THEN f.metadata -> 'paymentHistory'
    ELSE jsonb_build_array()
  END
) AS history(entry);

-- Supports exact receipt-number lookup through JSONB containment.
CREATE INDEX IF NOT EXISTS ix_fee_records_metadata_receipt_search
  ON fee_records USING GIN (metadata jsonb_path_ops);
