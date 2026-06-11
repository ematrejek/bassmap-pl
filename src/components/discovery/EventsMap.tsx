import { resolveMapCoordinates } from "@/lib/geocoding/city-centers";
import { cn } from "@/lib/utils";
import type { Event } from "@/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

const DEFAULT_ICON = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const SELECTED_ICON = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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
      className={cn(
        "relative isolate z-0 h-full min-h-[320px] overflow-hidden rounded-2xl border border-white/10",
        className,
      )}
    >
      <MapContainer center={[52.0, 19.0]} zoom={6} className="h-full min-h-[320px] w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController selectedEventId={selectedEventId} eventCoordinates={eventCoordinates} />
        {events.map((event) => {
          const coords = eventCoordinates.get(event.id);
          if (!coords) {
            return null;
          }
          return (
            <Marker
              key={event.id}
              position={[coords.latitude, coords.longitude]}
              icon={selectedEventId === event.id ? SELECTED_ICON : DEFAULT_ICON}
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
