import { useEffect, useRef, useState } from "react";
import { Calendar, CircleAlert, ImageIcon, Link2, Music, Ticket } from "lucide-react";
import { readApiError, readCreatedEventId } from "@/lib/api/json";
import { ServerError } from "@/components/auth/ServerError";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toDatetimeLocalValue } from "@/lib/events/format";
import { parseEventCreate, parseEventUpdate } from "@/lib/events/schema";
import { TERMS_PATH } from "@/lib/legal/paths";
import { MY_EVENTS_PATH } from "@/lib/routes";
import { getCoverAspectClassName, validateCoverFile } from "@/lib/storage/event-covers";
import { FAN_CONTENT_RIGHTS_FIELD } from "@/lib/legal/fan-submit-consent";
import { shellBtnOutline, shellBtnPrimary } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import {
  SUBGENRES,
  SUBGENRE_LABELS,
  type CoverAspect,
  type Event,
  type EventCurrency,
  type EventPriceMode,
  type Subgenre,
} from "@/types";

const fieldClass =
  "border-border bg-card/60 text-foreground placeholder:text-muted-foreground focus-visible:border-primary/70 focus-visible:ring-ring/30";

/** Native `<option>` list uses OS light popup – dark text required for readability. */
const selectOptionStyle = { backgroundColor: "#ffffff", color: "#0f172a" };

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

  const data: unknown = await response.json();

  if (!response.ok) {
    return { ok: false, error: readApiError(data) ?? "Nie udało się zapisać okładki" };
  }

  return { ok: true };
}

async function uploadCoverFile(
  eventId: string,
  file: File,
  coverAspect: CoverAspect,
  uploadUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("coverAspect", coverAspect);

  const response = await fetch(uploadUrl, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    return { ok: false, error: readApiError(data) ?? "Nie udało się wgrać okładki" };
  }

  return { ok: true };
}

function coverUploadUrlFor(eventId: string, variant: "admin" | "fan"): string {
  return variant === "fan" ? `/api/fan/events/${eventId}/cover` : `/api/admin/events/${eventId}/cover`;
}

interface Props {
  mode: "create" | "edit";
  variant?: "admin" | "fan";
  submitUrl?: string;
  successRedirect?: string;
  showCoverUpload?: boolean;
  initialEvent?: Event;
  serverError?: string | null;
  initialCoverUrl?: string | null;
}

export default function EventForm({
  mode,
  variant = "admin",
  submitUrl,
  successRedirect,
  showCoverUpload: showCoverUploadProp,
  initialEvent,
  serverError: initialServerError,
  initialCoverUrl = null,
}: Props) {
  const showCoverUpload = showCoverUploadProp ?? variant !== "fan";
  const createSubmitUrl = submitUrl ?? "/api/admin/events";
  const createSuccessRedirect = successRedirect ?? "/admin";
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
  const [description, setDescription] = useState(initialEvent?.description ?? "");
  const [ticketUrl, setTicketUrl] = useState(initialEvent?.ticketUrl ?? "");
  const [isFree, setIsFree] = useState(initialEvent?.isFree ?? false);
  const [priceMode, setPriceMode] = useState<EventPriceMode | null>(initialEvent?.priceMode ?? null);
  const [priceMin, setPriceMin] = useState(
    initialEvent?.priceMin !== null && initialEvent?.priceMin !== undefined ? String(initialEvent.priceMin) : "",
  );
  const [priceMax, setPriceMax] = useState(
    initialEvent?.priceMax !== null && initialEvent?.priceMax !== undefined ? String(initialEvent.priceMax) : "",
  );
  const [currency, setCurrency] = useState<EventCurrency | null>(initialEvent?.currency ?? null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverAspect, setCoverAspect] = useState<CoverAspect>(initialEvent?.coverAspect ?? "portrait");
  const [removeCover, setRemoveCover] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(initialServerError ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [acceptContentRights, setAcceptContentRights] = useState(false);
  const [contentRightsError, setContentRightsError] = useState<string | null>(null);
  const localPreviewUrlRef = useRef<string | null>(null);

  const requiresContentRights = variant === "fan" && mode === "create";

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
      description: description.trim() || null,
      ticketUrl: ticketUrl.trim() || null,
      isFree,
      priceMode: isFree ? null : priceMode,
      priceMin: isFree || priceMin === "" ? null : Number(priceMin),
      priceMax: isFree || priceMode !== "range" || priceMax === "" ? null : Number(priceMax),
      currency: isFree || priceMode == null || priceMin === "" ? null : currency,
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
    setContentRightsError(null);

    if (requiresContentRights && !acceptContentRights) {
      setContentRightsError("Musisz potwierdzić prawa do zamieszczanych materiałów graficznych i opisowych");
      return;
    }

    const body = buildBody();
    const parsed = mode === "create" ? parseEventCreate(body) : parseEventUpdate({ ...body, locationMode });

    if (!parsed.success) {
      setServerError(parsed.error);
      return;
    }

    if (coverFile && showCoverUpload) {
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
        const createResponse = await fetch(createSubmitUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(
            requiresContentRights ? { ...body, [FAN_CONTENT_RIGHTS_FIELD]: true } : body,
          ),
        });

        const createData: unknown = await createResponse.json();

        if (!createResponse.ok) {
          setServerError(readApiError(createData) ?? "Nie udało się zapisać wydarzenia");
          return;
        }

        eventId = readCreatedEventId(createData);
        if (!eventId) {
          setServerError("Nie udało się odczytać identyfikatora wydarzenia");
          return;
        }

        if (showCoverUpload && coverFile) {
          const uploadResult = await uploadCoverFile(
            eventId,
            coverFile,
            coverAspect,
            coverUploadUrlFor(eventId, variant),
          );
          if (!uploadResult.ok) {
            window.location.href =
              variant === "fan"
                ? `${MY_EVENTS_PATH}?coverError=upload#dodaje`
                : `/admin/events/${eventId}/edit?coverError=upload`;
            return;
          }
        }

        window.location.href = createSuccessRedirect;
        return;
      }

      if (!eventId) {
        setServerError("Nie udało się odczytać identyfikatora wydarzenia");
        return;
      }

      if (coverFile) {
        const uploadResult = await uploadCoverFile(
          eventId,
          coverFile,
          coverAspect,
          coverUploadUrlFor(eventId, variant),
        );
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

      const data: unknown = await response.json();

      if (!response.ok) {
        setServerError(readApiError(data) ?? "Nie udało się zapisać wydarzenia");
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
          <Label htmlFor="name" className="text-foreground/90">
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
          <Label htmlFor="startsAt" className="text-foreground/90">
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
          <Label htmlFor="city" className="text-foreground/90">
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
          <Label htmlFor="venueName" className="text-foreground/90">
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
          <p className="text-muted-foreground text-xs">
            Nie musi to być nazwa klubu – wystarczy krótki opis, gdzie jest impreza (ważne dla fanów na liście i mapie).
          </p>
        </div>
      </div>

      <div className="border-border bg-card/40 rounded-xl border p-4">
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
            <span className="text-sm font-medium text-white">Brak adresu – podaję współrzędne</span>
            <p className="mt-1 text-xs text-blue-100/50">
              Dla imprez „tajnych” bez ulicy. W trybie adresowym współrzędne uzupełni system.
            </p>
          </div>
        </label>

        {!coordinatesMode ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="addressStreet" className="text-foreground/90">
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
              <Label htmlFor="addressNumber" className="text-foreground/90">
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
              <Label htmlFor="latitude" className="text-foreground/90">
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
              <Label htmlFor="longitude" className="text-foreground/90">
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
          <Label className="text-foreground/90">Podgatunki (min. 1)</Label>
        </div>
        <div className="border-border bg-card/40 max-h-48 overflow-y-auto rounded-xl border p-3 sm:grid sm:grid-cols-2 sm:gap-2">
          {SUBGENRES.map((subgenre) => (
            <label
              key={subgenre}
              htmlFor={`subgenre-${subgenre}`}
              className="hover:bg-secondary flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5"
            >
              <Checkbox
                id={`subgenre-${subgenre}`}
                checked={subgenres.includes(subgenre)}
                onCheckedChange={(checked) => {
                  toggleSubgenre(subgenre, checked === true);
                }}
                className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              />
              <span className="text-foreground text-sm">{SUBGENRE_LABELS[subgenre]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lineup" className="text-foreground/90">
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

      <div className="space-y-2">
        <Label htmlFor="description" className="text-foreground/90">
          Opis wydarzenia
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
          placeholder="Np. dress code, info o imprezie, ważne szczegóły dla fanów…"
          rows={5}
          maxLength={5000}
          className={fieldClass}
        />
        <p className="text-muted-foreground text-xs">Opcjonalnie. Widoczne na stronie szczegółów wydarzenia.</p>
      </div>
      {showCoverUpload ? (
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-blue-100/80">
            <ImageIcon className="size-4" />
            <Label htmlFor="coverFile" className="text-foreground/90">
              Okładka wydarzenia
            </Label>
          </div>
          <Input
            id="coverFile"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={cn(
              fieldClass,
              "file:bg-primary file:text-primary-foreground cursor-pointer file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1 file:text-sm",
            )}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              handleCoverFileChange(file);
            }}
          />
          <p className="text-muted-foreground text-xs">Opcjonalnie. JPEG, PNG lub WebP, max 5 MB.</p>

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
                    className="accent-primary"
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
                    className="accent-primary"
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
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ticketUrl" className="text-foreground/90">
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
          <Label className="text-foreground/90">Cena</Label>
          {!isFree ? (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <fieldset className="space-y-2">
                <legend className="text-sm text-blue-100/80">Tryb ceny</legend>
                <div className="flex flex-wrap gap-4">
                  {(
                    [
                      ["exact", "Dokładna"],
                      ["from", "Od"],
                      ["range", "Przedział"],
                    ] as const
                  ).map(([mode, label]) => (
                    <label key={mode} htmlFor={`priceMode-${mode}`} className="flex cursor-pointer items-center gap-2">
                      <input
                        id={`priceMode-${mode}`}
                        type="radio"
                        name="priceMode"
                        value={mode}
                        checked={priceMode === mode}
                        onChange={() => {
                          setPriceMode(mode);
                          if (mode !== "range") {
                            setPriceMax("");
                          }
                        }}
                        className="accent-primary"
                      />
                      <span className="text-foreground text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {priceMode !== null && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="priceMin" className="text-foreground/90">
                      {priceMode === "range" ? "Kwota minimalna" : "Kwota"}
                    </Label>
                    <div className="relative">
                      <Ticket className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
                      <Input
                        id="priceMin"
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceMin}
                        onChange={(e) => {
                          setPriceMin(e.target.value);
                        }}
                        placeholder="50"
                        className={cn(fieldClass, "pl-10")}
                      />
                    </div>
                  </div>

                  {priceMode === "range" && (
                    <div className="space-y-2">
                      <Label htmlFor="priceMax" className="text-foreground/90">
                        Kwota maksymalna
                      </Label>
                      <Input
                        id="priceMax"
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceMax}
                        onChange={(e) => {
                          setPriceMax(e.target.value);
                        }}
                        placeholder="60"
                        className={fieldClass}
                      />
                    </div>
                  )}

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="currency" className="text-foreground/90">
                      Waluta
                    </Label>
                    <select
                      id="currency"
                      value={currency ?? ""}
                      onChange={(e) => {
                        const next = e.target.value;
                        setCurrency(next === "" ? null : (next as EventCurrency));
                      }}
                      className={cn(fieldClass, "h-10 w-full rounded-md px-3 [color-scheme:dark]")}
                    >
                      <option value="" style={selectOptionStyle}>
                        Wybierz walutę
                      </option>
                      <option value="PLN" style={selectOptionStyle}>
                        PLN (zł)
                      </option>
                      <option value="EUR" style={selectOptionStyle}>
                        EUR (€)
                      </option>
                      <option value="CZK" style={selectOptionStyle}>
                        CZK (Kč)
                      </option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              Pola ceny są ukryte – wydarzenie oznaczone jako wstęp wolny.
            </p>
          )}
        </div>
      </div>

      <label htmlFor="isFree" className="flex w-fit cursor-pointer items-center gap-2">
        <Checkbox
          id="isFree"
          checked={isFree}
          onCheckedChange={(checked) => {
            const next = checked === true;
            setIsFree(next);
            if (next) {
              setPriceMode(null);
              setPriceMin("");
              setPriceMax("");
            }
          }}
          className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        />
        <span className="text-sm font-medium text-white">Wstęp wolny</span>
      </label>

      <ServerError message={serverError} />

      {requiresContentRights ? (
        <div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="acceptContentRights"
              checked={acceptContentRights}
              onCheckedChange={(checked) => {
                setAcceptContentRights(checked === true);
                if (checked === true) {
                  setContentRightsError(null);
                }
              }}
              aria-invalid={Boolean(contentRightsError)}
              className={cn(
                "border-border bg-card/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary mt-0.5",
                contentRightsError && "border-red-400/60",
              )}
            />
            <label htmlFor="acceptContentRights" className="text-muted-foreground text-xs leading-relaxed">
              <span className="text-red-400" aria-hidden="true">
                *{" "}
              </span>
              Oświadczam, że posiadam prawa do zamieszczonych materiałów graficznych i opisowych (w tym okładki i opisu
              wydarzenia) lub działam za zgodą ich właściciela. Znam{" "}
              <a
                href={`${TERMS_PATH}#event-submissions`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-accent hover:underline"
              >
                zasady zgłaszania wydarzeń
              </a>{" "}
              w Regulaminie.
            </label>
          </div>
          {contentRightsError ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-red-300">
              <CircleAlert className="size-3" />
              {contentRightsError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className={shellBtnOutline}
          onClick={() => {
            window.location.href = variant === "fan" ? MY_EVENTS_PATH : "/admin";
          }}
        >
          Anuluj
        </Button>
        <Button type="submit" disabled={submitting} className={shellBtnPrimary}>
          {submitting
            ? "Zapisywanie…"
            : mode === "create"
              ? variant === "fan"
                ? "Wyślij do moderacji"
                : "Dodaj wydarzenie"
              : "Zapisz zmiany"}
        </Button>
      </div>
    </form>
  );
}
