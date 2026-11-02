-- Upgrade safely whether migration 003 created attachments per message row
-- or created the final shared-attachment-by-batch structure.
ALTER TABLE message_attachments
  ADD COLUMN IF NOT EXISTS batch_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema=current_schema()
      AND table_name='message_attachments'
      AND column_name='message_id'
  ) THEN
    UPDATE message_attachments a
      SET batch_id=m.batch_id
      FROM messages m
      WHERE a.message_id=m.id AND a.batch_id IS NULL;
    ALTER TABLE message_attachments ALTER COLUMN message_id DROP NOT NULL;
  END IF;
END $$;

UPDATE message_attachments
  SET batch_id=gen_random_uuid()
  WHERE batch_id IS NULL;

ALTER TABLE message_attachments
  ALTER COLUMN batch_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_message_attachments_batch
  ON message_attachments(school_id,batch_id);
