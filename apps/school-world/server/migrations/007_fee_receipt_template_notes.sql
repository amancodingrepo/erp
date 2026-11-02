-- School-specific fee receipt notes, stored as normalized relational rows.
-- Notes are scoped to a school and receipt-template version so policy text is isolated by school.
CREATE TABLE IF NOT EXISTS fee_receipt_template_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES admin_template_catalog(id) ON DELETE CASCADE,
  note_text varchar(500) NOT NULL CHECK (length(btrim(note_text)) > 0),
  sort_order integer NOT NULL CHECK (sort_order > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_fee_receipt_template_note_order
    UNIQUE (school_id, template_id, sort_order)
);

CREATE INDEX IF NOT EXISTS ix_fee_receipt_template_notes_lookup
  ON fee_receipt_template_notes(school_id, template_id, sort_order);
