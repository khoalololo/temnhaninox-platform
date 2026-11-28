-- Separate the note customers may read from the internal worker note.
ALTER TABLE order_schema.orders ADD COLUMN IF NOT EXISTS customer_progress_note VARCHAR(500);
