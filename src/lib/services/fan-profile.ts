import type { SupabaseClient } from "@supabase/supabase-js";
import { FAN_LOGIN_REGEX } from "@/lib/fan/profile-schema";
import type { FanProfile, FanProfileRow, FanProfileUpdate, PublicFanProfile, Subgenre } from "@/types";

type ServiceResult<T> = { data: T } | { error: string };

const FAN_PROFILE_SELECT =
  "user_id, login, bio, city, favorite_subgenres, instagram_url, soundcloud_url, facebook_url, spotify_url, twitch_url, favourite_track_platform, favourite_track_url, favourite_track_title, created_at, updated_at";

const LOGIN_TAKEN_ERROR = "Ten login jest już zajęty";

export { LOGIN_TAKEN_ERROR as FAN_PROFILE_LOGIN_TAKEN_ERROR };

function mapFanProfileRow(row: FanProfileRow): FanProfile {
  return {
    userId: row.user_id,
    login: row.login,
    bio: row.bio,
    city: row.city,
    favoriteSubgenres: row.favorite_subgenres,
    instagramUrl: row.instagram_url,
    soundcloudUrl: row.soundcloud_url,
    facebookUrl: row.facebook_url,
    spotifyUrl: row.spotify_url,
    twitchUrl: row.twitch_url,
    favouriteTrackPlatform: row.favourite_track_platform,
    favouriteTrackUrl: row.favourite_track_url,
    favouriteTrackTitle: row.favourite_track_title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUpdateToRow(patch: FanProfileUpdate): Partial<FanProfileRow> {
  const row: Partial<FanProfileRow> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.login !== undefined) {
    row.login = patch.login;
  }
  if (patch.bio !== undefined) {
    row.bio = patch.bio;
  }
  if (patch.city !== undefined) {
    row.city = patch.city;
  }
  if (patch.favoriteSubgenres !== undefined) {
    row.favorite_subgenres = patch.favoriteSubgenres;
  }
  if (patch.instagramUrl !== undefined) {
    row.instagram_url = patch.instagramUrl;
  }
  if (patch.soundcloudUrl !== undefined) {
    row.soundcloud_url = patch.soundcloudUrl;
  }
  if (patch.facebookUrl !== undefined) {
    row.facebook_url = patch.facebookUrl;
  }
  if (patch.spotifyUrl !== undefined) {
    row.spotify_url = patch.spotifyUrl;
  }
  if (patch.twitchUrl !== undefined) {
    row.twitch_url = patch.twitchUrl;
  }
  if (patch.favouriteTrackPlatform !== undefined) {
    row.favourite_track_platform = patch.favouriteTrackPlatform;
  }
  if (patch.favouriteTrackUrl !== undefined) {
    row.favourite_track_url = patch.favouriteTrackUrl;
  }
  if (patch.favouriteTrackTitle !== undefined) {
    row.favourite_track_title = patch.favouriteTrackTitle;
  }

  return row;
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === "23505";
}

/** Normalizes an email local-part (or raw string) into a valid fan login, or null. */
export function normalizeSuggestedLogin(raw: string): string | null {
  const normalized = raw
    .toLowerCase()
    .replace(/\./g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!FAN_LOGIN_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

export function toPublicFanProfile(profile: FanProfile): PublicFanProfile {
  const { userId: _userId, ...publicProfile } = profile;
  return publicProfile;
}

async function isLoginAvailable(
  supabase: SupabaseClient,
  login: string,
  excludeUserId?: string,
): Promise<ServiceResult<boolean>> {
  let query = supabase.from("fan_profiles").select("user_id").eq("login", login.toLowerCase());

  if (excludeUserId) {
    query = query.neq("user_id", excludeUserId);
  }

  const response = await query.maybeSingle();

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: response.data === null };
}

export async function getFanProfileByUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<ServiceResult<FanProfile | null>> {
  const response = await supabase.from("fan_profiles").select(FAN_PROFILE_SELECT).eq("user_id", userId).maybeSingle();

  if (response.error) {
    return { error: response.error.message };
  }

  if (!response.data) {
    return { data: null };
  }

  return { data: mapFanProfileRow(response.data) };
}

export async function getFanProfileByLogin(
  supabase: SupabaseClient,
  login: string,
): Promise<ServiceResult<FanProfile | null>> {
  const normalizedLogin = login.toLowerCase();

  const response = await supabase
    .from("fan_profiles")
    .select(FAN_PROFILE_SELECT)
    .eq("login", normalizedLogin)
    .maybeSingle();

  if (response.error) {
    return { error: response.error.message };
  }

  if (!response.data) {
    return { data: null };
  }

  return { data: mapFanProfileRow(response.data) };
}

export async function ensureFanProfile(
  supabase: SupabaseClient,
  userId: string,
  suggestedLogin?: string | null,
): Promise<ServiceResult<FanProfile | null>> {
  const existing = await getFanProfileByUserId(supabase, userId);
  if ("error" in existing) {
    return existing;
  }
  if (existing.data) {
    return existing;
  }

  const candidate = suggestedLogin ? normalizeSuggestedLogin(suggestedLogin) : null;
  if (!candidate) {
    return { data: null };
  }

  const availability = await isLoginAvailable(supabase, candidate);
  if ("error" in availability) {
    return { error: availability.error };
  }
  if (!availability.data) {
    return { data: null };
  }

  const response = await supabase
    .from("fan_profiles")
    .insert({
      user_id: userId,
      login: candidate,
      favorite_subgenres: [] as Subgenre[],
    })
    .select(FAN_PROFILE_SELECT)
    .single();

  if (response.error) {
    if (isUniqueViolation(response.error)) {
      return { data: null };
    }
    return { error: response.error.message };
  }

  return { data: mapFanProfileRow(response.data) };
}

export async function updateFanProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: FanProfileUpdate,
): Promise<ServiceResult<FanProfile>> {
  const existing = await getFanProfileByUserId(supabase, userId);
  if ("error" in existing) {
    return existing;
  }

  if (!existing.data) {
    return insertFanProfile(supabase, userId, patch);
  }

  if (patch.login !== undefined) {
    const availability = await isLoginAvailable(supabase, patch.login, userId);
    if ("error" in availability) {
      return { error: availability.error };
    }
    if (!availability.data) {
      return { error: LOGIN_TAKEN_ERROR };
    }
  }

  const response = await supabase
    .from("fan_profiles")
    .update(mapUpdateToRow(patch))
    .eq("user_id", userId)
    .select(FAN_PROFILE_SELECT)
    .single();

  if (response.error) {
    if (isUniqueViolation(response.error)) {
      return { error: LOGIN_TAKEN_ERROR };
    }
    if (response.error.code === "42501") {
      return { error: "Brak uprawnień do edycji profilu" };
    }
    return { error: response.error.message };
  }

  return { data: mapFanProfileRow(response.data) };
}

async function insertFanProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: FanProfileUpdate,
): Promise<ServiceResult<FanProfile>> {
  if (!patch.login) {
    return { error: "Ustaw login, aby utworzyć profil" };
  }

  const availability = await isLoginAvailable(supabase, patch.login);
  if ("error" in availability) {
    return { error: availability.error };
  }
  if (!availability.data) {
    return { error: LOGIN_TAKEN_ERROR };
  }

  const response = await supabase
    .from("fan_profiles")
    .insert({
      user_id: userId,
      login: patch.login,
      bio: patch.bio ?? null,
      city: patch.city ?? null,
      favorite_subgenres: patch.favoriteSubgenres ?? [],
      instagram_url: patch.instagramUrl ?? null,
      soundcloud_url: patch.soundcloudUrl ?? null,
      facebook_url: patch.facebookUrl ?? null,
      spotify_url: patch.spotifyUrl ?? null,
      twitch_url: patch.twitchUrl ?? null,
      favourite_track_platform: patch.favouriteTrackPlatform ?? null,
      favourite_track_url: patch.favouriteTrackUrl ?? null,
      favourite_track_title: patch.favouriteTrackTitle ?? null,
    })
    .select(FAN_PROFILE_SELECT)
    .single();

  if (response.error) {
    if (isUniqueViolation(response.error)) {
      return { error: LOGIN_TAKEN_ERROR };
    }
    if (response.error.code === "42501") {
      return { error: "Brak uprawnień do edycji profilu" };
    }
    return { error: response.error.message };
  }

  return { data: mapFanProfileRow(response.data) };
}
