-- S-04: optional event description for admin entry and fan event detail page

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS description text;
