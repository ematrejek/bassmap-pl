import { useState } from "react";
import { Calendar, Link2, Ticket } from "lucide-react";
import { ServerError } from "@/components/auth/ServerError";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readApiError } from "@/lib/api/json";
import { formatEventAddress, formatEventDate, formatEventPrice, formatEventVenueLine } from "@/lib/events/format";
import { MY_EVENTS_PATH, SIGN_IN_PATH } from "@/lib/routes";
import { shellBtnPrimary } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { Event, EventCurrency, EventPriceMode } from "@/types";

const fieldClass =
  "border-border bg-card/60 text-foreground placeholder:text-muted-foreground focus-visible:border-primary/70 focus-visible:ring-ring/30";

const selectOptionStyle = { backgroundColor: "#ffffff", color: "#0f172a" };

function inferLocationMode(event: Event): "address" | "coordinates" {
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

function CurrentValueHint({ children }: { children: string | null | undefined }) {
  if (!children) {
    return null;
  }

  return <p className="text-muted-foreground text-xs">Obecnie: {children}</p>;
}

interface Props {
  event: Event;
  isLoggedIn: boolean;
  isAdmin: boolean;
  redirectPath: string;
}

export default function EventSuggestChangesForm({ event, isLoggedIn, isAdmin, redirectPath }: Props) {
  const initialLocationMode = inferLocationMode(event);

  const [startsAt, setStartsAt] = useState("");
  const [city, setCity] = useState("");
  const [venueName, setVenueName] = useState("");
  const [coordinatesMode, setCoordinatesMode] = useState(false);
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [lineup, setLineup] = useState("");
  const [description, setDescription] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [suggestPrice, setSuggestPrice] = useState(false);
  const [isFree, setIsFree] = useState(event.isFree);
  const [priceMode, setPriceMode] = useState<EventPriceMode | null>(event.priceMode);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [currency, setCurrency] = useState<EventCurrency | null>(event.currency);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const signInHref = `${SIGN_IN_PATH}?redirect=${encodeURIComponent(redirectPath)}`;

  if (isAdmin) {
    return null;
  }

  function buildPayload(): Record<string, unknown> | null {
    const payload: Record<string, unknown> = {};

    if (startsAt.trim()) {
      payload.startsAt = startsAt;
    }
    if (city.trim()) {
      payload.city = city.trim();
    }
    if (venueName.trim()) {
      payload.venueName = venueName.trim();
    }

    const hasAddressInput = addressStreet.trim() || addressNumber.trim();
    const hasCoordinatesInput = latitude.trim() || longitude.trim();

    if (coordinatesMode && hasCoordinatesInput) {
      payload.locationMode = "coordinates";
      if (latitude.trim()) {
        payload.latitude = Number(latitude);
      }
      if (longitude.trim()) {
        payload.longitude = Number(longitude);
      }
    } else if (!coordinatesMode && hasAddressInput) {
      payload.locationMode = "address";
      if (addressStreet.trim()) {
        payload.addressStreet = addressStreet.trim();
      }
      if (addressNumber.trim()) {
        payload.addressNumber = addressNumber.trim();
      }
    }

    if (description.trim()) {
      payload.description = description.trim();
    }

    if (lineup.trim()) {
      payload.lineup = textToLineup(lineup);
    }

    if (ticketUrl.trim()) {
      payload.ticketUrl = ticketUrl.trim();
    }

    if (suggestPrice) {
      payload.isFree = isFree;
      if (!isFree) {
        payload.priceMode = priceMode;
        payload.priceMin = priceMin === "" ? null : Number(priceMin);
        payload.priceMax = priceMode === "range" && priceMax !== "" ? Number(priceMax) : null;
        payload.currency = currency;
      }
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }

  async function handleSubmit(submitEvent: SubmitEvent) {
    submitEvent.preventDefault();
    setError(null);

    const payload = buildPayload();
    if (!payload) {
      setError("Wybierz co najmniej jedno pole do zmiany");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/fan/change-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventId: event.id,
          source: "event_page",
          payload,
          body: comment.trim() || undefined,
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się wysłać sugestii");
        setSubmitting(false);
        return;
      }

      window.location.href = `${MY_EVENTS_PATH}?suggestionSubmitted=1`;
    } catch {
      setError("Nie udało się wysłać sugestii. Spróbuj ponownie.");
      setSubmitting(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="border-border bg-card/40 space-y-3 rounded-xl border p-4">
        <p className="text-muted-foreground text-sm">
          Zaloguj się, aby zasugerować zmiany w tym wydarzeniu (data, lokalizacja, opis, cena itd.).
        </p>
        <Button asChild className={shellBtnPrimary}>
          <a href={signInHref}>Zaloguj się, aby zasugerować zmiany</a>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-card/40 space-y-6 rounded-xl border p-4 sm:p-6"
      noValidate
    >
      <p className="text-muted-foreground text-sm">
        Wypełnij tylko pola, które chcesz poprawić. Admin zobaczy propozycję i zdecyduje, czy ją wdrożyć.
      </p>

      <ServerError message={error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="suggest-startsAt" className="text-foreground/90">
            Data i godzina rozpoczęcia
          </Label>
          <CurrentValueHint>{formatEventDate(event.startsAt)}</CurrentValueHint>
          <div className="relative">
            <Calendar className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
            <Input
              id="suggest-startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => {
                setStartsAt(e.target.value);
              }}
              className={cn(fieldClass, "pl-10")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="suggest-city" className="text-foreground/90">
            Miasto
          </Label>
          <CurrentValueHint>{event.city}</CurrentValueHint>
          <Input
            id="suggest-city"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
            }}
            placeholder="Warszawa"
            className={fieldClass}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="suggest-venueName" className="text-foreground/90">
            Miejsce / opis lokalizacji
          </Label>
          <CurrentValueHint>{formatEventVenueLine(event)}</CurrentValueHint>
          <Input
            id="suggest-venueName"
            value={venueName}
            onChange={(e) => {
              setVenueName(e.target.value);
            }}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="border-border rounded-xl border p-4">
        <CurrentValueHint>
          {initialLocationMode === "coordinates"
            ? event.latitude !== null && event.longitude !== null
              ? `${String(event.latitude)}, ${String(event.longitude)}`
              : null
            : formatEventAddress(event)}
        </CurrentValueHint>

        <label htmlFor="suggest-coordinatesMode" className="mt-2 flex cursor-pointer items-start gap-3">
          <Checkbox
            id="suggest-coordinatesMode"
            checked={coordinatesMode}
            onCheckedChange={(checked) => {
              setCoordinatesMode(checked === true);
            }}
            className="mt-0.5"
          />
          <span className="text-sm">Sugeruję współrzędne zamiast adresu</span>
        </label>

        {!coordinatesMode ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="suggest-addressStreet" className="text-foreground/90">
                Ulica
              </Label>
              <Input
                id="suggest-addressStreet"
                value={addressStreet}
                onChange={(e) => {
                  setAddressStreet(e.target.value);
                }}
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suggest-addressNumber" className="text-foreground/90">
                Numer
              </Label>
              <Input
                id="suggest-addressNumber"
                value={addressNumber}
                onChange={(e) => {
                  setAddressNumber(e.target.value);
                }}
                className={fieldClass}
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="suggest-latitude" className="text-foreground/90">
                Szerokość geograficzna
              </Label>
              <Input
                id="suggest-latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => {
                  setLatitude(e.target.value);
                }}
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suggest-longitude" className="text-foreground/90">
                Długość geograficzna
              </Label>
              <Input
                id="suggest-longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => {
                  setLongitude(e.target.value);
                }}
                className={fieldClass}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="suggest-description" className="text-foreground/90">
          Opis wydarzenia
        </Label>
        <CurrentValueHint>{event.description?.trim() ?? "Brak opisu"}</CurrentValueHint>
        <Textarea
          id="suggest-description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
          rows={4}
          maxLength={5000}
          className={fieldClass}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="suggest-lineup" className="text-foreground/90">
          Line-up (jeden artysta na linię)
        </Label>
        <CurrentValueHint>
          {event.lineup && event.lineup.length > 0 ? lineupToText(event.lineup) : "Brak potwierdzonego lineupu"}
        </CurrentValueHint>
        <Textarea
          id="suggest-lineup"
          value={lineup}
          onChange={(e) => {
            setLineup(e.target.value);
          }}
          rows={3}
          className={fieldClass}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="suggest-ticketUrl" className="text-foreground/90">
          Link do biletów
        </Label>
        <CurrentValueHint>{event.ticketUrl ?? "Brak linku"}</CurrentValueHint>
        <div className="relative">
          <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
          <Input
            id="suggest-ticketUrl"
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

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <label htmlFor="suggest-price" className="flex cursor-pointer items-start gap-3">
          <Checkbox
            id="suggest-price"
            checked={suggestPrice}
            onCheckedChange={(checked) => {
              const enabled = checked === true;
              setSuggestPrice(enabled);
              if (enabled) {
                setIsFree(event.isFree);
                setPriceMode(event.priceMode);
                setPriceMin(event.priceMin !== null ? String(event.priceMin) : "");
                setPriceMax(event.priceMax !== null ? String(event.priceMax) : "");
                setCurrency(event.currency);
              }
            }}
            className="mt-0.5"
          />
          <div>
            <span className="text-sm font-medium">Zasugeruj zmianę ceny</span>
            <CurrentValueHint>{formatEventPrice(event)}</CurrentValueHint>
          </div>
        </label>

        {suggestPrice ? (
          <div className="space-y-3 pt-2">
            <label htmlFor="suggest-isFree" className="flex cursor-pointer items-center gap-2">
              <Checkbox
                id="suggest-isFree"
                checked={isFree}
                onCheckedChange={(checked) => {
                  setIsFree(checked === true);
                }}
              />
              <span className="text-sm">Wstęp wolny</span>
            </label>

            {!isFree ? (
              <div className="space-y-3">
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
                      <label
                        key={mode}
                        htmlFor={`suggest-priceMode-${mode}`}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <input
                          id={`suggest-priceMode-${mode}`}
                          type="radio"
                          name="suggest-priceMode"
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

                {priceMode !== null ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="suggest-priceMin" className="text-foreground/90">
                        {priceMode === "range" ? "Kwota minimalna" : "Kwota"}
                      </Label>
                      <div className="relative">
                        <Ticket className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
                        <Input
                          id="suggest-priceMin"
                          type="number"
                          min="0"
                          step="0.01"
                          value={priceMin}
                          onChange={(e) => {
                            setPriceMin(e.target.value);
                          }}
                          className={cn(fieldClass, "pl-10")}
                        />
                      </div>
                    </div>
                    {priceMode === "range" ? (
                      <div className="space-y-2">
                        <Label htmlFor="suggest-priceMax" className="text-foreground/90">
                          Kwota maksymalna
                        </Label>
                        <Input
                          id="suggest-priceMax"
                          type="number"
                          min="0"
                          step="0.01"
                          value={priceMax}
                          onChange={(e) => {
                            setPriceMax(e.target.value);
                          }}
                          className={fieldClass}
                        />
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <Label htmlFor="suggest-currency" className="text-foreground/90">
                        Waluta
                      </Label>
                      <select
                        id="suggest-currency"
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
                          PLN
                        </option>
                        <option value="EUR" style={selectOptionStyle}>
                          EUR
                        </option>
                        <option value="CZK" style={selectOptionStyle}>
                          CZK
                        </option>
                      </select>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="suggest-comment" className="text-foreground/90">
          Komentarz dla admina (opcjonalnie)
        </Label>
        <Textarea
          id="suggest-comment"
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
          }}
          rows={3}
          maxLength={2000}
          placeholder="Np. dlaczego proponujesz tę zmianę…"
          className={fieldClass}
        />
      </div>

      <Button type="submit" className={shellBtnPrimary} disabled={submitting}>
        {submitting ? "Wysyłanie…" : "Wyślij sugestię"}
      </Button>
    </form>
  );
}
