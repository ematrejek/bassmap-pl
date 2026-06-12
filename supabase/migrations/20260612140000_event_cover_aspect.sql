-- S-03: cover aspect (portrait poster vs landscape FB cover)

ALTER TABLE public.events
  ADD COLUMN cover_aspect text;

ALTER TABLE public.events
  ADD CONSTRAINT events_cover_aspect_values CHECK (
    cover_aspect IS NULL OR cover_aspect IN ('portrait', 'landscape')
  );

ALTER TABLE public.events
  ADD CONSTRAINT events_cover_aspect_pairing CHECK (
    (cover_path IS NULL AND cover_aspect IS NULL)
    OR (cover_path IS NOT NULL AND cover_aspect IS NOT NULL)
  );
