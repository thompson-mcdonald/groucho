-- Only add tables to the publication if it isn't already a FOR ALL TABLES publication.
-- Running ADD TABLE on a FOR ALL TABLES publication throws an error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime' AND puballtables = true
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations, messages;
  END IF;
END $$;
