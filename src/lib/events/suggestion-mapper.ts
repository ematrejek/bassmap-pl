import type {
  ChangeSuggestion,
  ChangeSuggestionPayload,
  ChangeSuggestionSource,
  ChangeSuggestionStatus,
} from "@/types";

export interface ChangeSuggestionRow {
  id: string;
  event_id: string;
  submitted_by: string | null;
  body: string | null;
  payload: ChangeSuggestionPayload | null;
  status: ChangeSuggestionStatus;
  source: ChangeSuggestionSource;
  created_at: string;
  updated_at: string;
}

export function mapChangeSuggestionRow(row: ChangeSuggestionRow): ChangeSuggestion {
  return {
    id: row.id,
    eventId: row.event_id,
    submittedBy: row.submitted_by,
    body: row.body,
    payload: row.payload,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
