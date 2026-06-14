import { Equalizer } from "@/components/shell/Equalizer";
import { resolveMapCoordinates } from "@/lib/geocoding/city-centers";
import { shellPanelFlat } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { Event } from "@/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

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

interface MapControllerProps {
  selectedEventId: string | null;
  eventCoordinates: Map<string, { latitude: number; longitude: number }>;
}

function MapController({ selectedEventId, eventCoordinates }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }
    const coords = eventCoordinates.get(selectedEventId);
    if (coords) {
      map.panTo([coords.latitude, coords.longitude], { animate: true });
    }
  }, [selectedEventId, eventCoordinates, map]);

  return null;
}

interface Props {
  events: Event[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  className?: string;
}

export default function EventsMap({ events, selectedEventId, onSelectEvent, className }: Props) {
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
        <MapController selectedEventId={selectedEventId} eventCoordinates={eventCoordinates} />
        {events.map((event) => {
          const coords = eventCoordinates.get(event.id);
          if (!coords) {
            return null;
          }
          const isSelected = selectedEventId === event.id;
          return (
            <Marker
              key={event.id}
              position={[coords.latitude, coords.longitude]}
              icon={createNeonMarkerIcon(isSelected ? NEON_ACCENT : NEON_PRIMARY, isSelected)}
              eventHandlers={{
                click: () => {
                  onSelectEvent(event.id);
                },
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
