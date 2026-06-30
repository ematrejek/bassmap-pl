import { Equalizer } from "@/components/shell/Equalizer";
import { formatEventDate, formatEventPrice, formatEventVenueLine } from "@/lib/events/format";
import { resolveMapCoordinates } from "@/lib/geocoding/city-centers";
import { BASSMAP_MAP_STYLE, MAP_INITIAL_VIEW } from "@/lib/map/constants";
import { filterActiveSubgenres } from "@/lib/subgenres";
import { shellPanelFlat } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { Event } from "@/types";
import { SUBGENRE_LABELS } from "@/types";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMemo, useState, useSyncExternalStore } from "react";
import MapGL, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";

function usePrefersFinePointer(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(pointer: fine)");
      mq.addEventListener("change", onStoreChange);
      return () => {
        mq.removeEventListener("change", onStoreChange);
      };
    },
    () => window.matchMedia("(pointer: fine)").matches,
    () => false,
  );
}

function EventMapTooltip({ event }: { event: Event }) {
  const activeSubgenres = filterActiveSubgenres(event.subgenres);
  const subgenreLabels = activeSubgenres.slice(0, 2).map((subgenre) => SUBGENRE_LABELS[subgenre]);
  const extraSubgenres = activeSubgenres.length > 2 ? ` +${String(activeSubgenres.length - 2)}` : "";

  return (
    <div className="discovery-map-tooltip__inner space-y-1">
      <p className="font-heading text-foreground text-sm leading-tight font-bold uppercase">{event.name}</p>
      <p className="text-muted-foreground text-xs">{formatEventDate(event.startsAt)}</p>
      <p className="text-foreground text-xs">{formatEventVenueLine(event)}</p>
      <p className="text-accent text-xs font-semibold">{formatEventPrice(event)}</p>
      {subgenreLabels.length > 0 ? (
        <p className="text-muted-foreground text-[0.65rem] tracking-wide uppercase">
          {subgenreLabels.join(" · ")}
          {extraSubgenres}
        </p>
      ) : null}
    </div>
  );
}

interface Props {
  events: Event[];
  highlightedEventId: string | null;
  onEventNavigate: (id: string) => void;
  onHighlightEvent?: (id: string | null) => void;
  className?: string;
}

export default function EventsMap({ events, highlightedEventId, onEventNavigate, onHighlightEvent, className }: Props) {
  const prefersFinePointer = usePrefersFinePointer();
  const [coarseTapPinId, setCoarseTapPinId] = useState<string | null>(null);
  const [mapLoadError, setMapLoadError] = useState(false);
  const eventCoordinates = useMemo(() => {
    const map = new Map<string, { latitude: number; longitude: number }>();
    for (const event of events) {
      map.set(event.id, resolveMapCoordinates(event));
    }
    return map;
  }, [events]);

  const handlePinClick = (eventId: string) => {
    if (prefersFinePointer) {
      onEventNavigate(eventId);
      return;
    }
    if (coarseTapPinId === eventId) {
      onEventNavigate(eventId);
      setCoarseTapPinId(null);
      return;
    }
    setCoarseTapPinId(eventId);
    onHighlightEvent?.(eventId);
  };

  if (mapLoadError) {
    return (
      <div
        data-discovery-map
        className={cn(
          "flex min-h-[320px] flex-col items-center justify-center gap-2 px-4 text-center",
          shellPanelFlat,
          className,
        )}
      >
        <p className="text-muted-foreground text-sm">Mapa chwilowo niedostępna.</p>
        <button
          type="button"
          className="text-accent text-xs underline underline-offset-2"
          onClick={() => {
            window.location.reload();
          }}
        >
          Odśwież stronę
        </button>
      </div>
    );
  }

  return (
    <div
      data-discovery-map
      className={cn("relative isolate z-0 h-full min-h-[320px] overflow-hidden", shellPanelFlat, className)}
    >
      <div className="grid-backdrop pointer-events-none absolute inset-0 z-[401] opacity-35" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 z-[402] bg-[radial-gradient(circle_at_50%_50%,transparent_30%,oklch(0.13_0.015_280/0.75)_100%)]"
        aria-hidden="true"
      />
      <span className="border-border bg-background/70 text-accent pointer-events-none absolute top-4 left-4 z-[403] flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[0.65rem] tracking-widest uppercase backdrop-blur-md">
        <Equalizer bars={3} className="h-2.5" />
        Polska · mapa
      </span>

      <div className="absolute inset-0 z-0">
        <MapGL
          initialViewState={MAP_INITIAL_VIEW}
          mapStyle={BASSMAP_MAP_STYLE}
          style={{ width: "100%", height: "100%" }}
          scrollZoom={prefersFinePointer}
          dragRotate={false}
          pitchWithRotate={false}
          touchPitch={false}
          attributionControl={{ compact: true }}
          onError={() => {
            setMapLoadError(true);
          }}
        >
          <NavigationControl position="top-right" showCompass={false} visualizePitch={false} />
          {events.map((event) => {
            const coords = eventCoordinates.get(event.id);
            if (!coords) {
              return null;
            }
            const isHighlighted = highlightedEventId === event.id || coarseTapPinId === event.id;
            return (
              <Marker key={event.id} longitude={coords.longitude} latitude={coords.latitude} anchor="center">
                <button
                  type="button"
                  className={cn("discovery-map-pin", isHighlighted && "discovery-map-pin--active")}
                  aria-label={event.name}
                  onClick={() => {
                    handlePinClick(event.id);
                  }}
                  onMouseEnter={() => {
                    onHighlightEvent?.(event.id);
                  }}
                  onMouseLeave={() => {
                    onHighlightEvent?.(null);
                  }}
                  onFocus={() => {
                    onHighlightEvent?.(event.id);
                  }}
                  onBlur={() => {
                    onHighlightEvent?.(null);
                  }}
                />
                {isHighlighted ? (
                  <Popup
                    longitude={coords.longitude}
                    latitude={coords.latitude}
                    closeButton={false}
                    closeOnClick={false}
                    anchor="bottom"
                    offset={10}
                    className="discovery-map-popup"
                  >
                    <EventMapTooltip event={event} />
                  </Popup>
                ) : null}
              </Marker>
            );
          })}
        </MapGL>
      </div>
    </div>
  );
}
