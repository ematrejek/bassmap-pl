import type { SupabaseClient } from "@supabase/supabase-js";
import { mapChangeSuggestionRow, type ChangeSuggestionRow } from "@/lib/events/suggestion-mapper";
import type { ChangeSuggestion, ChangeSuggestionStatus } from "@/types";

type ServiceResult<T> = { data: T } | { error: string };

export interface AdminChangeSuggestionListItem extends ChangeSuggestion {
  eventName: string;
}

export interface FanChangeSuggestionListItem extends ChangeSuggestion {
  eventName: string;
}

type ChangeSuggestionWithEventRow = ChangeSuggestionRow & {
  events: { name: string } | { name: string }[] | null;
};

function extractEventName(events: ChangeSuggestionWithEventRow["events"]): string {
  if (!events) {
    return "";
  }
  if (Array.isArray(events)) {
    return events[0]?.name ?? "";
  }
  return events.name;
}

function mapAdminListRow(row: ChangeSuggestionWithEventRow): AdminChangeSuggestionListItem {
  return {
    ...mapChangeSuggestionRow(row),
    eventName: extractEventName(row.events),
  };
}

export async function listChangeSuggestionsForAdmin(
  supabase: SupabaseClient,
): Promise<ServiceResult<AdminChangeSuggestionListItem[]>> {
  const response = await supabase
    .from("change_suggestions")
    .select("id, event_id, submitted_by, body, status, source, created_at, updated_at, events(name)")
    .order("created_at", { ascending: false });

  if (response.error) {
    return { error: response.error.message };
  }

  const rows = (response.data as ChangeSuggestionWithEventRow[] | null) ?? [];
  return { data: rows.map(mapAdminListRow) };
}

export async function listChangeSuggestionsForFan(
  supabase: SupabaseClient,
  userId: string,
): Promise<ServiceResult<FanChangeSuggestionListItem[]>> {
  const response = await supabase
    .from("change_suggestions")
    .select("id, event_id, submitted_by, body, status, source, created_at, updated_at, events(name)")
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false });

  if (response.error) {
    return { error: response.error.message };
  }

  const rows = (response.data as ChangeSuggestionWithEventRow[] | null) ?? [];
  return { data: rows.map(mapAdminListRow) };
}

export async function createFanChangeSuggestion(
  supabase: SupabaseClient,
  userId: string,
  input: { eventId: string; body: string },
): Promise<ServiceResult<ChangeSuggestion>> {
  const eventResponse = await supabase.from("events").select("id, status").eq("id", input.eventId).maybeSingle();

  if (eventResponse.error) {
    return { error: eventResponse.error.message };
  }

  const eventRow = eventResponse.data;
  if (!eventRow || typeof eventRow !== "object" || !("status" in eventRow) || typeof eventRow.status !== "string") {
    return { error: "Nie znaleziono wydarzenia" };
  }

  if (eventRow.status !== "published" && eventRow.status !== "pending") {
    return { error: "Sugestie można wysyłać tylko do opublikowanych lub oczekujących wydarzeń" };
  }

  const response = await supabase
    .from("change_suggestions")
    .insert({
      event_id: input.eventId,
      submitted_by: userId,
      body: input.body,
      status: "pending",
      source: "duplicate_flow",
    })
    .select("id, event_id, submitted_by, body, status, source, created_at, updated_at")
    .single();

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: mapChangeSuggestionRow(response.data) };
}

export async function updateChangeSuggestionStatus(
  supabase: SupabaseClient,
  id: string,
  status: Extract<ChangeSuggestionStatus, "accepted" | "rejected">,
): Promise<ServiceResult<ChangeSuggestion>> {
  const existingResponse = await supabase.from("change_suggestions").select("id, status").eq("id", id).maybeSingle();

  if (existingResponse.error) {
    return { error: existingResponse.error.message };
  }

  const existing = existingResponse.data;
  if (!existing) {
    return { error: "Nie znaleziono sugestii" };
  }

  if (existing.status !== "pending") {
    return { error: "Można zmienić status tylko oczekującej sugestii" };
  }

  const response = await supabase
    .from("change_suggestions")
    .update({ status })
    .eq("id", id)
    .select("id, event_id, submitted_by, body, status, source, created_at, updated_at")
    .single();

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: mapChangeSuggestionRow(response.data) };
}
