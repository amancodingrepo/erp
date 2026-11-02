ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS batch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent';

CREATE INDEX IF NOT EXISTS ix_messages_recipient_status_sent
  ON messages(school_id, recipient_id, status, sent_at DESC);
CREATE INDEX IF NOT EXISTS ix_messages_sender_status_sent
  ON messages(school_id, sender_id, status, sent_at DESC);
CREATE INDEX IF NOT EXISTS ix_messages_batch
  ON messages(school_id, batch_id);

CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL DEFAULT 'application/octet-stream',
  file_size integer NOT NULL DEFAULT 0,
  file_data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_message_attachments_batch
  ON message_attachments(school_id, batch_id);
