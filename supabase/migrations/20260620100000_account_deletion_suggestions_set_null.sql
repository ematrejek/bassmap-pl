-- S-16: Keep change_suggestions rows when fan account is deleted (privacy §4).

ALTER TABLE public.change_suggestions
  DROP CONSTRAINT IF EXISTS change_suggestions_submitted_by_fkey;

ALTER TABLE public.change_suggestions
  ALTER COLUMN submitted_by DROP NOT NULL;

ALTER TABLE public.change_suggestions
  ADD CONSTRAINT change_suggestions_submitted_by_fkey
  FOREIGN KEY (submitted_by)
  REFERENCES auth.users (id)
  ON DELETE SET NULL;
