import type { SupabaseClient } from "@supabase/supabase-js";
import { mapChangeSuggestionRow, type ChangeSuggestionRow } from "@/lib/events/suggestion-mapper";
import { parseSuggestionPayload } from "@/lib/events/suggestion-schema";
import { getEventById, updateEvent } from "@/lib/services/events";
import type { ChangeSuggestion, ChangeSuggestionSource, ChangeSuggestionStatus, Event } from "@/types";

type ServiceResult<T> = { data: T } | { error: string };

export interface AdminChangeSuggestionListItem extends ChangeSuggestion {
  eventName: string;
}

export interface FanChangeSuggestionListItem extends ChangeSuggestion {
  eventName: string;
}

export interface ChangeSuggestionDetail extends ChangeSuggestion {
  eventName: string;
  event: Event | null;
}

type ChangeSuggestionWithEventRow = ChangeSuggestionRow & {
  events: { name: string } | { name: string }[] | null;
};

export type CreateFanChangeSuggestionInput =
  | {
      eventId: string;
      source: "duplicate_flow";
      body: string;
    }
  | {
      eventId: string;
      source: "event_page";
      payload: Record<string, unknown>;
      body?: string | null;
    };

const CHANGE_SUGGESTION_SELECT = "id, event_id, submitted_by, body, payload, status, source, created_at, updated_at";

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

function validateDuplicateFlowBody(body: string): { error: string } | null {
  if (body.length < 10) {
    return { error: "Sugestia musi mieć co najmniej 10 znaków" };
  }
  if (body.length > 2000) {
    return { error: "Sugestia może mieć maksymalnie 2000 znaków" };
  }
  return null;
}

function validateEventPageBody(body: string | null | undefined): { error: string } | null {
  if (body == null || body === "") {
    return null;
  }
  if (body.length > 2000) {
    return { error: "Komentarz może mieć maksymalnie 2000 znaków" };
  }
  return null;
}

export async function listChangeSuggestionsForAdmin(
  supabase: SupabaseClient,
): Promise<ServiceResult<AdminChangeSuggestionListItem[]>> {
  const response = await supabase
    .from("change_suggestions")
    .select(`${CHANGE_SUGGESTION_SELECT}, events(name)`)
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
    .select(`${CHANGE_SUGGESTION_SELECT}, events(name)`)
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false });

  if (response.error) {
    return { error: response.error.message };
  }

  const rows = (response.data as ChangeSuggestionWithEventRow[] | null) ?? [];
  return { data: rows.map(mapAdminListRow) };
}

export async function getChangeSuggestionById(
  supabase: SupabaseClient,
  id: string,
): Promise<ServiceResult<ChangeSuggestionDetail>> {
  const response = await supabase
    .from("change_suggestions")
    .select(`${CHANGE_SUGGESTION_SELECT}, events(name)`)
    .eq("id", id)
    .maybeSingle();

  if (response.error) {
    return { error: response.error.message };
  }

  if (!response.data) {
    return { error: "Nie znaleziono sugestii" };
  }

  const row = response.data as ChangeSuggestionWithEventRow;
  const event = await getEventById(supabase, row.event_id);

  return {
    data: {
      ...mapChangeSuggestionRow(row),
      eventName: extractEventName(row.events),
      event,
    },
  };
}

export async function createFanChangeSuggestion(
  supabase: SupabaseClient,
  userId: string,
  input: CreateFanChangeSuggestionInput,
): Promise<ServiceResult<ChangeSuggestion>> {
  if (input.source === "duplicate_flow") {
    const bodyError = validateDuplicateFlowBody(input.body);
    if (bodyError) {
      return bodyError;
    }
  } else {
    const bodyError = validateEventPageBody(input.body);
    if (bodyError) {
      return bodyError;
    }
  }

  const source = input.source;

  const eligibleResponse = await supabase.rpc("event_eligible_for_suggestion", {
    p_event_id: input.eventId,
    p_source: source,
  });

  if (eligibleResponse.error) {
    return { error: eligibleResponse.error.message };
  }

  if (eligibleResponse.data !== true) {
    return { error: "Nie znaleziono wydarzenia" };
  }

  let insertRow: {
    event_id: string;
    submitted_by: string;
    status: "pending";
    source: ChangeSuggestionSource;
    body: string | null;
    payload: Record<string, unknown> | null;
  };

  if (input.source === "duplicate_flow") {
    insertRow = {
      event_id: input.eventId,
      submitted_by: userId,
      body: input.body,
      payload: null,
      status: "pending",
      source: input.source,
    };
  } else {
    const parsedPayload = parseSuggestionPayload(input.payload);
    if (!parsedPayload.success) {
      return { error: parsedPayload.error };
    }

    const normalizedBody = input.body?.trim() ? input.body.trim() : null;

    insertRow = {
      event_id: input.eventId,
      submitted_by: userId,
      body: normalizedBody,
      payload: parsedPayload.data,
      status: "pending",
      source: input.source,
    };
  }

  const response = await supabase
    .from("change_suggestions")
    .insert(insertRow)
    .select(CHANGE_SUGGESTION_SELECT)
    .single();

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: mapChangeSuggestionRow(response.data) };
}

export async function applyChangeSuggestionToEvent(
  supabase: SupabaseClient,
  suggestionId: string,
): Promise<ServiceResult<{ event: Event; suggestion: ChangeSuggestion }>> {
  const existingResponse = await supabase
    .from("change_suggestions")
    .select(CHANGE_SUGGESTION_SELECT)
    .eq("id", suggestionId)
    .maybeSingle();

  if (existingResponse.error) {
    return { error: existingResponse.error.message };
  }

  const existingRow = existingResponse.data;
  if (!existingRow) {
    return { error: "Nie znaleziono sugestii" };
  }

  const existing = mapChangeSuggestionRow(existingRow);

  if (existing.status !== "pending") {
    return { error: "Można zastosować tylko oczekującą sugestię" };
  }

  if (existing.source !== "event_page") {
    return { error: "Tę sugestię można tylko zaakceptować bez zmiany wydarzenia" };
  }

  if (!existing.payload) {
    return { error: "Brak danych do zastosowania w sugestii" };
  }

  const parsedPayload = parseSuggestionPayload(existing.payload);
  if (!parsedPayload.success) {
    return { error: parsedPayload.error };
  }

  const claimResponse = await supabase
    .from("change_suggestions")
    .update({ status: "accepted" })
    .eq("id", suggestionId)
    .eq("status", "pending")
    .select(CHANGE_SUGGESTION_SELECT)
    .maybeSingle();

  if (claimResponse.error) {
    return { error: claimResponse.error.message };
  }

  if (!claimResponse.data) {
    return { error: "Można zastosować tylko oczekującą sugestię" };
  }

  const updateResult = await updateEvent(supabase, existing.eventId, parsedPayload.data);
  if ("error" in updateResult) {
    const rollbackResponse = await supabase
      .from("change_suggestions")
      .update({ status: "pending" })
      .eq("id", suggestionId)
      .eq("status", "accepted");

    if (rollbackResponse.error) {
      return {
        error: `${updateResult.error} (nie udało się przywrócić statusu sugestii – skontaktuj się z administratorem)`,
      };
    }

    return { error: updateResult.error };
  }

  return {
    data: {
      event: updateResult.data,
      suggestion: mapChangeSuggestionRow(claimResponse.data),
    },
  };
}

export async function updateChangeSuggestionStatus(
  supabase: SupabaseClient,
  id: string,
  status: Extract<ChangeSuggestionStatus, "accepted" | "rejected">,
): Promise<ServiceResult<ChangeSuggestion>> {
  const existingResponse = await supabase
    .from("change_suggestions")
    .select("id, status, source")
    .eq("id", id)
    .maybeSingle();

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

  if (status === "accepted" && existing.source === "event_page") {
    return { error: "Użyj Otwórz sugestię → Przyjmij, aby zastosować zmiany w wydarzeniu" };
  }

  const response = await supabase
    .from("change_suggestions")
    .update({ status })
    .eq("id", id)
    .select(CHANGE_SUGGESTION_SELECT)
    .single();

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: mapChangeSuggestionRow(response.data) };
}
