import { useEffect, useRef, useState } from "react";
import { Calendar, ImageIcon, Link2, Music, Ticket } from "lucide-react";
import { ServerError } from "@/components/auth/ServerError";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toDatetimeLocalValue } from "@/lib/events/format";
import { parseEventCreate, parseEventUpdate } from "@/lib/events/schema";
import { getCoverAspectClassName, validateCoverFile } from "@/lib/storage/event-covers";
import { cn } from "@/lib/utils";
import { SUBGENRES, SUBGENRE_LABELS, type CoverAspect, type Event, type Subgenre } from "@/types";

const fieldClass =
  "border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/30 dark:bg-white/10";

function inferLocationMode(event?: Event): "address" | "coordinates" {
  if (!event) {
    return "address";
  }
  if (event.addressStreet === null && event.addressNumber === null) {
    return "coordinates";
  }
  return "address";
}

function lineupToText(lineup: string[] | null | undefined): string {
  return lineup?.join("\n") ?? "";
}

function textToLineup(value: string): string[] | null {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : null;
}

async function patchCoverMeta(
  eventId: string,
  payload: { coverPath: string | null; coverAspect: CoverAspect | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/admin/events/${eventId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Nie udało się zapisać okładki" };
  }

  return { ok: true };
}

async function uploadCoverFile(
  eventId: string,
  file: File,
  coverAspect: CoverAspect,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("coverAspect", coverAspect);

  const response = await fetch(`/api/admin/events/${eventId}/cover`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Nie udało się wgrać okładki" };
  }

  return { ok: true };
}

interface Props {
  mode: "create" | "edit";
  initialEvent?: Event;
  serverError?: string | null;
  initialCoverUrl?: string | null;
}

export default function EventForm({
  mode,
  initialEvent,
  serverError: initialServerError,
  initialCoverUrl = null,
}: Props) {
  const initialMode = inferLocationMode(initialEvent);

  const [name, setName] = useState(initialEvent?.name ?? "");
  const [startsAt, setStartsAt] = useState(initialEvent ? toDatetimeLocalValue(initialEvent.startsAt) : "");
  const [city, setCity] = useState(initialEvent?.city ?? "");
  const [venueName, setVenueName] = useState(initialEvent?.venueName ?? "");
  const [coordinatesMode, setCoordinatesMode] = useState(initialMode === "coordinates");
  const [addressStreet, setAddressStreet] = useState(initialEvent?.addressStreet ?? "");
  const [addressNumber, setAddressNumber] = useState(initialEvent?.addressNumber ?? "");
  const [latitude, setLatitude] = useState(
    initialEvent?.latitude !== null && initialEvent?.latitude !== undefined ? String(initialEvent.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    initialEvent?.longitude !== null && initialEvent?.longitude !== undefined ? String(initialEvent.longitude) : "",
  );
  const [subgenres, setSubgenres] = useState<Subgenre[]>(initialEvent?.subgenres ?? []);
  const [lineup, setLineup] = useState(lineupToText(initialEvent?.lineup));
  const [ticketUrl, setTicketUrl] = useState(initialEvent?.ticketUrl ?? "");
  const [isFree, setIsFree] = useState(initialEvent?.isFree ?? false);
  const [price, setPrice] = useState(initialEvent?.price ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverAspect, setCoverAspect] = useState<CoverAspect>(initialEvent?.coverAspect ?? "portrait");
  const [removeCover, setRemoveCover] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(initialServerError ?? null);
  const [submitting, setSubmitting] = useState(false);
  const localPreviewUrlRef = useRef<string | null>(null);

  const locationMode = coordinatesMode ? "coordinates" : "address";
  const coverPreviewUrl = removeCover ? null : (localPreviewUrl ?? initialCoverUrl);

  useEffect(() => {
    localPreviewUrlRef.current = localPreviewUrl;
    return () => {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
      }
    };
  }, [localPreviewUrl]);

  function toggleSubgenre(value: Subgenre, checked: boolean) {
    setSubgenres((current) => {
      if (checked) {
        return current.includes(value) ? current : [...current, value];
      }
      return current.filter((item) => item !== value);
    });
  }

  function revokeLocalPreview() {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
  }

  function handleCoverFileChange(file: File | null) {
    revokeLocalPreview();
    setCoverFile(file);
    setRemoveCover(false);
    setServerError(null);
    if (file) {
      setLocalPreviewUrl(URL.createObjectURL(file));
    }
  }

  function handleRemoveCover() {
    revokeLocalPreview();
    setCoverFile(null);
    setRemoveCover(true);
    setServerError(null);
  }

  function buildBody(): Record<string, unknown> {
    const base = {
      name: name.trim(),
      startsAt,
      city: city.trim(),
      venueName: venueName.trim(),
      subgenres,
      lineup: textToLineup(lineup),
      ticketUrl: ticketUrl.trim() || null,
      isFree,
      price: isFree ? null : price.trim() || null,
      locationMode,
    };

    if (locationMode === "coordinates") {
      return {
        ...base,
        latitude: latitude === "" ? undefined : Number(latitude),
        longitude: longitude === "" ? undefined : Number(longitude),
      };
    }

    return {
      ...base,
      addressStreet: addressStreet.trim(),
      addressNumber: addressNumber.trim(),
    };
  }

  const showRemoveCoverButton =
    mode === "edit" && !removeCover && (coverFile !== null || (initialEvent?.coverPath ?? null) !== null);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    const body = buildBody();
    const parsed = mode === "create" ? parseEventCreate(body) : parseEventUpdate({ ...body, locationMode });

    if (!parsed.success) {
      setServerError(parsed.error);
      return;
    }

    if (coverFile) {
      const fileValidation = validateCoverFile(coverFile);
      if (!fileValidation.ok) {
        setServerError(fileValidation.error);
        return;
      }
    }

    setSubmitting(true);

    try {
      let eventId = mode === "edit" ? initialEvent?.id : undefined;

      if (mode === "create") {
        const createResponse = await fetch("/api/admin/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });

        const createData = (await createResponse.json()) as { error?: string; event?: Event };

        if (!createResponse.ok) {
          setServerError(createData.error ?? "Nie udało się zapisać wydarzenia");
          return;
        }

        eventId = createData.event?.id;
        if (!eventId) {
          setServerError("Nie udało się odczytać identyfikatora wydarzenia");
          return;
        }

        if (coverFile) {
          const uploadResult = await uploadCoverFile(eventId, coverFile, coverAspect);
          if (!uploadResult.ok) {
            window.location.href = `/admin/events/${eventId}/edit?coverError=upload`;
            return;
          }
        }

        window.location.href = "/admin";
        return;
      }

      if (!eventId) {
        setServerError("Nie udało się odczytać identyfikatora wydarzenia");
        return;
      }

      if (coverFile) {
        const uploadResult = await uploadCoverFile(eventId, coverFile, coverAspect);
        if (!uploadResult.ok) {
          setServerError(uploadResult.error);
          return;
        }
      } else if (removeCover) {
        const removeResult = await patchCoverMeta(eventId, { coverPath: null, coverAspect: null });
        if (!removeResult.ok) {
          setServerError(removeResult.error);
          return;
        }
      } else if (initialEvent?.coverPath && coverAspect !== (initialEvent.coverAspect ?? "portrait")) {
        const aspectResult = await patchCoverMeta(eventId, {
          coverPath: initialEvent.coverPath,
          coverAspect,
        });
        if (!aspectResult.ok) {
          setServerError(aspectResult.error);
          return;
        }
      }

      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setServerError(data.error ?? "Nie udało się zapisać wydarzenia");
        return;
      }

      window.location.href = "/admin";
    } catch {
      setServerError("Nie udało się zapisać wydarzenia. Spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name" className="text-blue-100/80">
            Nazwa wydarzenia
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            placeholder="np. Neuro Night"
            className={fieldClass}
            required
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="startsAt" className="text-blue-100/80">
            Data i godzina rozpoczęcia
          </Label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
            <Input
              id="startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => {
                setStartsAt(e.target.value);
              }}
              className={cn(fieldClass, "pl-10")}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city" className="text-blue-100/80">
            Miasto
          </Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
            }}
            placeholder="Warszawa"
            className={fieldClass}
            required
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="venueName" className="text-blue-100/80">
            Miejsce / opis lokalizacji
          </Label>
          <Input
            id="venueName"
            value={venueName}
            onChange={(e) => {
              setVenueName(e.target.value);
            }}
            placeholder="np. Proxima, pod mostem Łazienkowskim, nad Wisłą"
            className={fieldClass}
            required
          />
          <p className="text-xs text-blue-100/50">
            Nie musi to być nazwa klubu — wystarczy krótki opis, gdzie jest impreza (ważne dla fanów na liście i mapie).
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <label htmlFor="coordinatesMode" className="flex cursor-pointer items-start gap-3">
          <Checkbox
            id="coordinatesMode"
            checked={coordinatesMode}
            onCheckedChange={(checked) => {
              setCoordinatesMode(checked === true);
            }}
            className="mt-0.5 border-white/30 data-[state=checked]:bg-purple-600"
          />
          <div>
            <span className="text-sm font-medium text-white">Brak adresu — podaję współrzędne</span>
            <p className="mt-1 text-xs text-blue-100/50">
              Dla imprez „tajnych” bez ulicy. W trybie adresowym współrzędne uzupełni system.
            </p>
          </div>
        </label>

        {!coordinatesMode ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="addressStreet" className="text-blue-100/80">
                Ulica
              </Label>
              <Input
                id="addressStreet"
                value={addressStreet}
                onChange={(e) => {
                  setAddressStreet(e.target.value);
                }}
                placeholder="Złota"
                className={fieldClass}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressNumber" className="text-blue-100/80">
                Numer
              </Label>
              <Input
                id="addressNumber"
                value={addressNumber}
                onChange={(e) => {
                  setAddressNumber(e.target.value);
                }}
                placeholder="9"
                className={fieldClass}
                required
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="latitude" className="text-blue-100/80">
                Szerokość geograficzna
              </Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => {
                  setLatitude(e.target.value);
                }}
                placeholder="52.2297"
                className={fieldClass}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude" className="text-blue-100/80">
                Długość geograficzna
              </Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => {
                  setLongitude(e.target.value);
                }}
                placeholder="21.0122"
                className={fieldClass}
                required
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-blue-100/80">
          <Music className="size-4" />
          <Label className="text-blue-100/80">Podgatunki (min. 1)</Label>
        </div>
        <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-3 sm:grid-cols-2">
          {SUBGENRES.map((subgenre) => (
            <label
              key={subgenre}
              htmlFor={`subgenre-${subgenre}`}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-white/5"
            >
              <Checkbox
                id={`subgenre-${subgenre}`}
                checked={subgenres.includes(subgenre)}
                onCheckedChange={(checked) => {
                  toggleSubgenre(subgenre, checked === true);
                }}
                className="border-white/30 data-[state=checked]:bg-purple-600"
              />
              <span className="text-sm text-white/90">{SUBGENRE_LABELS[subgenre]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lineup" className="text-blue-100/80">
          Line-up (jeden artysta na linię)
        </Label>
        <Textarea
          id="lineup"
          value={lineup}
          onChange={(e) => {
            setLineup(e.target.value);
          }}
          placeholder={"Noisia\nPhace"}
          rows={4}
          className={fieldClass}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-blue-100/80">
          <ImageIcon className="size-4" />
          <Label htmlFor="coverFile" className="text-blue-100/80">
            Okładka wydarzenia
          </Label>
        </div>
        <Input
          id="coverFile"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={cn(
            fieldClass,
            "cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-purple-600/80 file:px-3 file:py-1 file:text-sm file:text-white",
          )}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            handleCoverFileChange(file);
          }}
        />
        <p className="text-xs text-blue-100/50">Opcjonalnie. JPEG, PNG lub WebP, max 5 MB.</p>

        {(coverFile !== null || (initialEvent?.coverPath && !removeCover)) && (
          <fieldset className="space-y-2">
            <legend className="text-sm text-blue-100/80">Format okładki</legend>
            <div className="flex flex-wrap gap-4">
              <label htmlFor="coverAspectPortrait" className="flex cursor-pointer items-center gap-2">
                <input
                  id="coverAspectPortrait"
                  type="radio"
                  name="coverAspect"
                  value="portrait"
                  checked={coverAspect === "portrait"}
                  onChange={() => {
                    setCoverAspect("portrait");
                  }}
                  className="accent-purple-500"
                />
                <span className="text-sm text-white/90">Pionowy (plakat)</span>
              </label>
              <label htmlFor="coverAspectLandscape" className="flex cursor-pointer items-center gap-2">
                <input
                  id="coverAspectLandscape"
                  type="radio"
                  name="coverAspect"
                  value="landscape"
                  checked={coverAspect === "landscape"}
                  onChange={() => {
                    setCoverAspect("landscape");
                  }}
                  className="accent-purple-500"
                />
                <span className="text-sm text-white/90">Poziomy (tło z FB)</span>
              </label>
            </div>
          </fieldset>
        )}

        {coverPreviewUrl && (
          <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
            <img
              src={coverPreviewUrl}
              alt="Podgląd okładki"
              className={cn("w-full object-cover", getCoverAspectClassName(coverAspect))}
            />
          </div>
        )}

        {showRemoveCoverButton && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/20 bg-transparent text-red-200 hover:bg-red-500/10 hover:text-red-100"
            onClick={handleRemoveCover}
          >
            Usuń okładkę
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ticketUrl" className="text-blue-100/80">
            Link do biletów
          </Label>
          <div className="relative">
            <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
            <Input
              id="ticketUrl"
              type="url"
              value={ticketUrl}
              onChange={(e) => {
                setTicketUrl(e.target.value);
              }}
              placeholder="https://..."
              className={cn(fieldClass, "pl-10")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price" className="text-blue-100/80">
            Cena
          </Label>
          <div className="relative">
            <Ticket className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
            <Input
              id="price"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
              }}
              placeholder="od 50 zł"
              disabled={isFree}
              className={cn(fieldClass, "pl-10")}
            />
          </div>
        </div>
      </div>

      <label htmlFor="isFree" className="flex w-fit cursor-pointer items-center gap-2">
        <Checkbox
          id="isFree"
          checked={isFree}
          onCheckedChange={(checked) => {
            setIsFree(checked === true);
          }}
          className="border-white/30 data-[state=checked]:bg-purple-600"
        />
        <span className="text-sm font-medium text-white">Wstęp wolny</span>
      </label>

      <ServerError message={serverError} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="border-white/20 bg-transparent text-white hover:bg-white/10"
          onClick={() => {
            window.location.href = "/admin";
          }}
        >
          Anuluj
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="border-white/20 bg-purple-600/80 text-white hover:bg-purple-500/90"
        >
          {submitting ? "Zapisywanie…" : mode === "create" ? "Dodaj wydarzenie" : "Zapisz zmiany"}
        </Button>
      </div>
    </form>
  );
}
