import { API_URL } from "./config";
import React, { useRef, useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { Users, MapPin, Calendar, Tag, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EventPopupContent from "./EventPopupContent";

interface EventType {
  id: number;
  name: string;
  buildingCode: string;
  buildingName: string;
  room: string;
  attendees: number;
  tags: string[];
  date: string;
  time: string;
}

interface MarkerType {
  code: string;
  name: string;
  position: [number, number];
}

interface MapProps {
  position?: [number, number];
  zoom?: number;
  className?: string;
  isActive?: boolean;
  markers: MarkerType[];
  userLocation?: { lat: number; lng: number } | null;
  onLocationClick?: ((latlng: { lat: number; lng: number }) => void) | null;
}

interface LocationMarkerProps {
  onLocationClick: ((latlng: { lat: number; lng: number }) => void) | null;
  markers: MarkerType[];
}

function LocationMarker({ onLocationClick, markers }: LocationMarkerProps) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [nearest, setNearest] = useState<MarkerType[]>([]);

  useMapEvents({
    click(e: L.LeafletMouseEvent) {
      setPosition(e.latlng);
      if (onLocationClick) {
        onLocationClick(e.latlng);
      }
      const distances = markers.map((marker: MarkerType) => ({
        ...marker,
        distance: Math.sqrt(
          Math.pow(marker.position[0] - e.latlng.lat, 2) +
            Math.pow(marker.position[1] - e.latlng.lng, 2),
        ),
      }));
      setNearest(
        distances
          .sort(
            (a: { distance: number }, b: { distance: number }) =>
              a.distance - b.distance,
          )
          .slice(0, 3),
      );
    },
  });

  return position === null ? null : (
    <Marker
      position={position}
      eventHandlers={{
        mouseover: (event: L.LeafletMouseEvent) => event.target.openPopup(),
        mouseout: (event: L.LeafletMouseEvent) => event.target.closePopup(),
      }}
    >
      <Popup>
        <div>
          <strong>Nearest locations:</strong>
          <ul>
            {nearest.map((loc) => (
              <li key={loc.code}>{loc.name}</li>
            ))}
          </ul>
        </div>
      </Popup>
    </Marker>
  );
}

function MapController({
  center,
}: {
  center: [number, number] | { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      console.log("Updating map to:", center);
      map.setView(center, 30);
    }
  }, [center, map]);

  return null;
}

export default function EventMap({
  position = [40.4237, -86.9212],
  zoom = 13,
  className = "flex w-full h-full",
  isActive = true,
  markers = [],
  userLocation = null,
  onLocationClick = null,
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef(null);
  const radlvl = 10;

  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuildingCode, setSelectedBuildingCode] = useState<
    string | null
  >(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_URL}/api/events/eventlist`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }

        const data = await response.json();

        const transformedEvents: EventType[] = data.map((event: any) => {
          // Extract tag names from the tags relationship
          const tags =
            event.tags && Array.isArray(event.tags)
              ? event.tags
                  .map((t: any) => t.tag?.name)
                  .filter((name: string) => name)
              : [];

          return {
            id: event.id,
            name:
              event.description ||
              event.booking?.description ||
              "Untitled Event",
            buildingCode: event.room?.buildingCode || "Unknown",
            buildingName: event.room?.buildingCode || "Unknown Building",
            room: event.room?.roomNum || "N/A",
            attendees:
              event.booking?.expectedAttendance || event._count?.rsvps || 0,
            tags: tags.length > 0 ? tags : ["General"],
            date: new Date(event.startTime).toLocaleDateString(),
            time: new Date(event.startTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        });

        setEvents(transformedEvents);
      } catch (err) {
        console.error("Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const onMapReady = (mapInstance: L.Map) => {
    mapRef.current = mapInstance;
  };

  // Get events for a specific building
  const getEventsForBuilding = (buildingCode: string) => {
    return events.filter((event) => event.buildingCode === buildingCode);
  };

  // Get the selected building's name
  const getSelectedBuildingName = () => {
    const building = markers.find((m) => m.code === selectedBuildingCode);
    return building ? building.name : null;
  };

  // Filter events based on selected building
  const displayedEvents = selectedBuildingCode
    ? getEventsForBuilding(selectedBuildingCode)
    : events;

  const handleEventRedirect = (eventId: number) => {
    window.location.href = `/event/${eventId}`;
  };

  const handleBuildingSelect = (buildingCode: string) => {
    setSelectedBuildingCode(buildingCode);
  };

  const handleClearSelection = () => {
    setSelectedBuildingCode(null);
  };

  return (
    <div className="flex h-full bg-transparent rounded-lg overflow-hidden">
      {/* Events List - Left Sidebar */}
      <div className="w-full md:w-1/3 lg:w-96 xl:w-1/4 min-w-[320px] bg-surface-dark border-r border-border-dark flex flex-col overflow-hidden rounded-l-lg">
        {/* Header with buttons */}
        <div className="p-4 border-b border-border-dark space-y-2">
          <button
            onClick={() => navigate("/events")}
            className="w-full px-4 py-2 bg-accent-dark hover:bg-accent text-white rounded-lg font-semibold transition"
          >
            Search All Events
          </button>

          {/* Selected Building Info */}
          {selectedBuildingCode && (
            <div className="flex items-center justify-between bg-surface px-3 py-2 rounded-lg border border-border-dark">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent-light" />
                <span className="text-white text-sm font-medium">
                  {getSelectedBuildingName()}
                </span>
              </div>
              <button
                onClick={handleClearSelection}
                className="text-text-muted hover:text-white transition"
                title="Show all events"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Events Count */}
        <div className="px-4 py-2 text-sm text-text-muted border-b border-border-dark">
          {selectedBuildingCode
            ? `Showing ${displayedEvents.length} event${displayedEvents.length !== 1 ? "s" : ""} in ${getSelectedBuildingName()}`
            : `Showing ${displayedEvents.length} event${displayedEvents.length !== 1 ? "s" : ""}`}
        </div>

        {/* Events List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-text-muted text-center py-8">
              Loading events...
            </div>
          ) : displayedEvents.length === 0 ? (
            <div className="text-text-muted text-center py-8">
              {selectedBuildingCode
                ? `No events found in ${getSelectedBuildingName()}`
                : "No events found"}
            </div>
          ) : (
            displayedEvents.map((event) => (
              <div
                key={event.id}
                className="bg-surface border border-border-dark rounded-lg p-4 hover:bg-surface-light transition-colors cursor-pointer"
                onClick={() => handleEventRedirect(event.id)}
              >
                <div className="font-semibold text-text-primary text-lg mb-2">
                  {event.name}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-text-tertiary">
                    <MapPin className="w-4 h-4 text-accent-light" />
                    <span>
                      {event.buildingName} - {event.room}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-text-tertiary">
                    <Users className="w-4 h-4 text-accent-light" />
                    <span>{event.attendees} attendees</span>
                  </div>

                  {event.tags.length > 0 && (
                    <div className="flex items-start gap-2 text-text-tertiary">
                      <Tag className="w-4 h-4 text-accent-light mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {event.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-accent-dark text-white px-2 py-0.5 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-text-tertiary">
                    <Calendar className="w-4 h-4 text-accent-light" />
                    <span>
                      {event.date} at {event.time}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Map - Right Side */}
      <div
        ref={containerRef}
        className="pl-2 flex-1 rounded-lg overflow-hidden"
      >
        <MapContainer
          center={position}
          zoom={zoom}
          ref={mapRef}
          style={{ height: "100%", width: "100%" }}
          whenReady={onMapReady as any}
        >
          <MapController center={userLocation} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <LocationMarker onLocationClick={onLocationClick} markers={markers} />

          {markers.map((m) => {
            const buildingEvents = getEventsForBuilding(m.code);
            const isSelected = selectedBuildingCode === m.code;

            return (
              <CircleMarker
                key={m.code}
                center={m.position}
                radius={isSelected ? radlvl + 3 : radlvl}
                pathOptions={{
                  color: isSelected
                    ? "#fbbf24"
                    : buildingEvents.length > 0
                      ? "#d97706"
                      : "#a1a1aa",
                  fillColor: isSelected
                    ? "#fbbf24"
                    : buildingEvents.length > 0
                      ? "#f59e0b"
                      : "#71717a",
                  fillOpacity: isSelected ? 0.8 : 0.6,
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{
                  click: () => handleBuildingSelect(m.code),
                }}
              >
                <Popup maxWidth={300}>
                  <EventPopupContent buildingCode={String(m.code)} />
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
