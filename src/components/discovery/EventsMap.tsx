import { Equalizer } from "@/components/shell/Equalizer";
import { formatEventDate, formatEventPrice, formatEventVenueLine } from "@/lib/events/format";
import { resolveMapCoordinates } from "@/lib/geocoding/city-centers";
import { filterActiveSubgenres } from "@/lib/subgenres";
import { shellPanelFlat } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { Event } from "@/types";
import { SUBGENRE_LABELS } from "@/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";

const MAP_TILES_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const NEON_PRIMARY = "oklch(0.62 0.25 300)";
const NEON_ACCENT = "oklch(0.85 0.2 175)";

function createNeonMarkerIcon(color: string, active: boolean): L.DivIcon {
  const size = active ? 14 : 10;
  return L.divIcon({
    className: "discovery-map-marker",
    html: `<span style="
      display:block;
      width:${String(size)}px;
      height:${String(size)}px;
      border-radius:9999px;
      background:${color};
      box-shadow:0 0 12px ${color}, 0 0 4px ${color};
      border:2px solid oklch(0.13 0.015 280);
      transform:translate(-50%,-50%);
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
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
  const eventCoordinates = useMemo(() => {
    const map = new Map<string, { latitude: number; longitude: number }>();
    for (const event of events) {
      map.set(event.id, resolveMapCoordinates(event));
    }
    return map;
  }, [events]);

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

      <MapContainer center={[52.0, 19.0]} zoom={6} className="relative z-0 h-full min-h-[320px] w-full" scrollWheelZoom>
        <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILES_URL} />
        {events.map((event) => {
          const coords = eventCoordinates.get(event.id);
          if (!coords) {
            return null;
          }
          const isHighlighted = highlightedEventId === event.id;
          return (
            <Marker
              key={event.id}
              position={[coords.latitude, coords.longitude]}
              icon={createNeonMarkerIcon(isHighlighted ? NEON_ACCENT : NEON_PRIMARY, isHighlighted)}
              eventHandlers={{
                click: () => {
                  onEventNavigate(event.id);
                },
                mouseover: () => {
                  onHighlightEvent?.(event.id);
                },
                mouseout: () => {
                  onHighlightEvent?.(null);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1} interactive className="discovery-map-tooltip">
                <EventMapTooltip event={event} />
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
