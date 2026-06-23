import { ServerError } from "@/components/auth/ServerError";
import EventFilters from "@/components/discovery/EventFilters";
import EventList from "@/components/discovery/EventList";
import type { FanEventFilters } from "@/lib/events/fan-schema";
import { shellHeading, shellPanelFlat, shellTabActive, shellTabInactive, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { EventWithCoverUrl } from "@/types";
import { lazy, Suspense, useState, useSyncExternalStore } from "react";

/** Leaflet wymaga `window` – ładujemy mapę dopiero po montażu w przeglądarce. */
const EventsMap = lazy(async () => {
  try {
    return await import("@/components/discovery/EventsMap");
  } catch {
    return { default: MapLoadError };
  }
});

function MapLoadError({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[320px] flex-col items-center justify-center gap-2 px-4 text-center",
        shellPanelFlat,
        className,
      )}
    >
      <p className={cn("text-sm", shellTextMuted)}>Mapa chwilowo niedostępna.</p>
      <button
        type="button"
        className={cn("text-accent text-xs underline underline-offset-2")}
        onClick={() => {
          window.location.reload();
        }}
      >
        Odśwież stronę
      </button>
    </div>
  );
}

function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

function MapPlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-[320px] items-center justify-center", shellPanelFlat, className)}>
      <p className={cn("text-sm", shellTextMuted)}>Ładowanie mapy…</p>
    </div>
  );
}

interface Props {
  events: EventWithCoverUrl[];
  cities: string[];
  currentFilters: FanEventFilters;
  listError?: string | null;
  isLoggedIn?: boolean;
}

type MobileTab = "list" | "map";

export default function DiscoveryShell({ events, cities, currentFilters, listError, isLoggedIn = false }: Props) {
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("list");
  const isClient = useIsClient();

  const hasActiveFilters =
    currentFilters.city !== null ||
    currentFilters.subgenres.length > 0 ||
    currentFilters.dateFrom !== null ||
    currentFilters.freeOnly;

  const handleEventNavigate = (id: string) => {
    window.location.assign(`/events/${id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={shellHeading}>
          MAP THE <span className="text-primary text-glow-violet">BASS</span>!
        </h1>
        <p className={cn("mt-1 text-sm", shellTextMuted)}>
          Filtruj po dacie, mieście, podgatunku i cenie – znajdź imprezę na liście lub mapie.
        </p>
      </div>

      <ServerError message={listError} />

      <div className="flex gap-2 md:hidden">
        <button
          type="button"
          onClick={() => {
            setMobileTab("list");
          }}
          className={cn(
            "flex-1 rounded-lg border px-4 py-2 text-sm font-medium tracking-wider uppercase transition-colors",
            mobileTab === "list" ? shellTabActive : shellTabInactive,
          )}
        >
          Lista
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileTab("map");
          }}
          className={cn(
            "flex-1 rounded-lg border px-4 py-2 text-sm font-medium tracking-wider uppercase transition-colors",
            mobileTab === "map" ? shellTabActive : shellTabInactive,
          )}
        >
          Mapa
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
        <div className={cn(mobileTab !== "list" && "hidden md:block")}>
          <EventFilters cities={cities} currentFilters={currentFilters} />
        </div>

        <div className={cn("min-h-[320px]", mobileTab !== "map" && "hidden md:block")}>
          {isClient ? (
            <Suspense fallback={<MapPlaceholder className="h-full min-h-[320px]" />}>
              <EventsMap
                events={events}
                highlightedEventId={hoveredEventId}
                onEventNavigate={handleEventNavigate}
                onHighlightEvent={setHoveredEventId}
                className="h-full min-h-[320px] md:min-h-[min(60vh,520px)]"
              />
            </Suspense>
          ) : (
            <MapPlaceholder className="h-full min-h-[320px] md:min-h-[min(60vh,520px)]" />
          )}
        </div>
      </div>

      <div className={cn(mobileTab !== "list" && "hidden md:block")}>
        <EventList
          events={events}
          hasActiveFilters={hasActiveFilters}
          isLoggedIn={isLoggedIn}
          hoveredEventId={hoveredEventId}
          onHoverEvent={setHoveredEventId}
        />
      </div>
    </div>
  );
}
