-- S-21: My vibes – optional favourite track embed (Spotify or SoundCloud)

ALTER TABLE public.fan_profiles
  ADD COLUMN favourite_track_platform text,
  ADD COLUMN favourite_track_url text,
  ADD COLUMN favourite_track_title text;

ALTER TABLE public.fan_profiles
  ADD CONSTRAINT fan_profiles_favourite_track_platform_check
    CHECK (
      favourite_track_platform IS NULL
      OR favourite_track_platform IN ('spotify', 'soundcloud')
    );

ALTER TABLE public.fan_profiles
  ADD CONSTRAINT fan_profiles_favourite_track_consistency_check
    CHECK (
      (
        favourite_track_platform IS NULL
        AND favourite_track_url IS NULL
        AND favourite_track_title IS NULL
      )
      OR (
        favourite_track_platform IS NOT NULL
        AND favourite_track_url IS NOT NULL
      )
    );
