-- S-21: length limits for My vibes favourite track fields

ALTER TABLE public.fan_profiles
  ADD CONSTRAINT fan_profiles_favourite_track_url_length_check
    CHECK (favourite_track_url IS NULL OR char_length(favourite_track_url) <= 500);

ALTER TABLE public.fan_profiles
  ADD CONSTRAINT fan_profiles_favourite_track_title_length_check
    CHECK (favourite_track_title IS NULL OR char_length(favourite_track_title) <= 200);
