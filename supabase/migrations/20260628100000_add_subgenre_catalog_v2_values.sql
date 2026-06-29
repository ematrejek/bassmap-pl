-- Subgenre catalog v2 (S-29): additive enum values only – no data migration
ALTER TYPE public.subgenre ADD VALUE IF NOT EXISTS 'garage';
ALTER TYPE public.subgenre ADD VALUE IF NOT EXISTS 'bassline';
ALTER TYPE public.subgenre ADD VALUE IF NOT EXISTS 'dubstep';
ALTER TYPE public.subgenre ADD VALUE IF NOT EXISTS 'bass_house';
ALTER TYPE public.subgenre ADD VALUE IF NOT EXISTS 'bounce';
