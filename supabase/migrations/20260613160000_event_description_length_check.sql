-- S-04: enforce description length at DB layer (defense-in-depth; Zod also caps at 5000)
ALTER TABLE public.events
  ADD CONSTRAINT events_description_length_check
  CHECK (description IS NULL OR length(description) <= 5000);
