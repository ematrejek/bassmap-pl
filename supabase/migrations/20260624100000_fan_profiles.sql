-- S-20: Fan profile (public login, bio, city, subgenres, social links).

CREATE TABLE public.fan_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  login text NOT NULL UNIQUE,
  bio text,
  city text,
  favorite_subgenres public.subgenre[] NOT NULL DEFAULT '{}',
  instagram_url text,
  soundcloud_url text,
  facebook_url text,
  spotify_url text,
  twitch_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fan_profiles_bio_length_check CHECK (bio IS NULL OR char_length(bio) <= 200),
  CONSTRAINT fan_profiles_favorite_subgenres_max_five CHECK (cardinality(favorite_subgenres) <= 5),
  CONSTRAINT fan_profiles_login_format_check CHECK (login ~ '^[a-z0-9_]{3,30}$')
);

CREATE UNIQUE INDEX fan_profiles_login_lower_idx ON public.fan_profiles (lower(login));

CREATE TRIGGER fan_profiles_set_updated_at
  BEFORE UPDATE ON public.fan_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.fan_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY fan_profiles_select_public
  ON public.fan_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY fan_profiles_insert_own
  ON public.fan_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY fan_profiles_update_own
  ON public.fan_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY fan_profiles_delete_own
  ON public.fan_profiles
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
