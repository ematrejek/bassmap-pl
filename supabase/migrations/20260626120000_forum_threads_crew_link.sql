-- S-24 Phase 1: optional crew link on forum recruitment threads.

ALTER TABLE public.forum_threads
  ADD COLUMN crew_id uuid REFERENCES public.crews (id) ON DELETE SET NULL;

CREATE INDEX forum_threads_crew_id_idx ON public.forum_threads (crew_id);
