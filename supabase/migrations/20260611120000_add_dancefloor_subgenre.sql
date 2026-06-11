-- Add dancefloor to closed subgenre catalog (S-01)

ALTER TYPE public.subgenre ADD VALUE IF NOT EXISTS 'dancefloor';
