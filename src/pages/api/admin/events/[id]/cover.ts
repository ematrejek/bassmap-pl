import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAdmin } from "@/lib/auth/guards";
import { getEventById, updateEvent } from "@/lib/services/events";
import {
  buildCoverStoragePath,
  EVENT_COVERS_BUCKET,
  mapStorageUploadError,
  validateCoverFile,
} from "@/lib/storage/event-covers";
import { createClient } from "@/lib/supabase";
import { createServiceRoleClient } from "@/lib/supabase-service";
import type { CoverAspect } from "@/types";

export const prerender = false;

const idSchema = z.string().uuid("Nieprawidłowy identyfikator wydarzenia");
const coverAspectSchema = z.enum(["portrait", "landscape"]);

function parseEventId(params: { id?: string }): { id: string } | { error: string } {
  const result = idSchema.safeParse(params.id);
  if (!result.success) {
    return { error: "Nieprawidłowy identyfikator wydarzenia" };
  }
  return { id: result.data };
}

export const POST: APIRoute = async (context) => {
  const adminError = requireAdmin(context.locals);
  if (adminError) {
    return adminError;
  }

  const idResult = parseEventId(context.params);
  if ("error" in idResult) {
    return jsonResponse({ error: idResult.error }, 400);
  }

  const storageClient = createServiceRoleClient();
  if (!storageClient) {
    return jsonResponse(
      {
        error:
          "Brak klucza serwisowego Supabase (SUPABASE_SERVICE_ROLE_KEY). Dodaj go do .dev.vars lokalnie lub sekretów Cloudflare na produkcji.",
      },
      500,
    );
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const existing = await getEventById(supabase, idResult.id);
  if (!existing) {
    return jsonResponse({ error: "Nie znaleziono wydarzenia" }, 404);
  }

  let formData: FormData;
  try {
    formData = await context.request.formData();
  } catch {
    return jsonResponse({ error: "Nieprawidłowe dane formularza" }, 400);
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return jsonResponse({ error: "Nie wybrano pliku okładki" }, 400);
  }

  const fileValidation = validateCoverFile(fileEntry);
  if (!fileValidation.ok) {
    return jsonResponse({ error: fileValidation.error }, 400);
  }

  const aspectResult = coverAspectSchema.safeParse(formData.get("coverAspect") ?? "portrait");
  if (!aspectResult.success) {
    return jsonResponse({ error: "Nieprawidłowy format okładki" }, 400);
  }

  const coverAspect: CoverAspect = aspectResult.data;
  const storagePath = buildCoverStoragePath(idResult.id, fileValidation.mimeType);
  const bytes = new Uint8Array(await fileEntry.arrayBuffer());

  const uploadResult = await storageClient.storage.from(EVENT_COVERS_BUCKET).upload(storagePath, bytes, {
    upsert: true,
    contentType: fileValidation.mimeType,
  });

  if (uploadResult.error) {
    return jsonResponse({ error: mapStorageUploadError(uploadResult.error.message) }, 400);
  }

  const updateResult = await updateEvent(supabase, idResult.id, {
    coverPath: storagePath,
    coverAspect,
  });

  if ("error" in updateResult) {
    return jsonResponse({ error: updateResult.error }, 400);
  }

  return jsonResponse({ event: updateResult.data }, 200);
};
