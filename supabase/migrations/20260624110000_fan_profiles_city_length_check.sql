-- S-20 follow-up: align fan_profiles.city length with API validation (max 100 chars).

ALTER TABLE public.fan_profiles
  ADD CONSTRAINT fan_profiles_city_length_check CHECK (city IS NULL OR char_length(city) <= 100);
