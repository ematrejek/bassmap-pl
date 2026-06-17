-- S-17: audit columns for description consent (fan create) and cover copyright declarations.
-- Invariant when cover_path is set: cover_source, cover_declaration_kind, cover_copyright_declared_at
-- must be NOT NULL – enforced in API on cover upload, not via DB CHECK (legacy rows may have cover without audit).

ALTER TABLE public.events
  ADD COLUMN description_rights_accepted_at timestamptz NULL,
  ADD COLUMN cover_source text NULL,
  ADD COLUMN cover_declaration_kind text NULL,
  ADD COLUMN cover_copyright_declared_at timestamptz NULL;

ALTER TABLE public.events
  ADD CONSTRAINT events_cover_source_check
    CHECK (cover_source IS NULL OR cover_source IN ('facebook', 'instagram', 'organizer_website', 'own'));

ALTER TABLE public.events
  ADD CONSTRAINT events_cover_declaration_kind_check
    CHECK (cover_declaration_kind IS NULL OR cover_declaration_kind IN ('creator_consent', 'own_copyright'));

COMMENT ON COLUMN public.events.description_rights_accepted_at IS
  'Timestamp when fan confirmed rights to descriptive content at submission create.';
COMMENT ON COLUMN public.events.cover_source IS
  'User-selected source of cover image: facebook, instagram, organizer_website, own.';
COMMENT ON COLUMN public.events.cover_declaration_kind IS
  'Kind of copyright declaration for cover: creator_consent or own_copyright.';
COMMENT ON COLUMN public.events.cover_copyright_declared_at IS
  'Timestamp when cover copyright declaration was submitted.';
