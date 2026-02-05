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
import BuildingPopupContent from "./BuildingPopupContent";
import * as L from "leaflet";

interface MarkerType {
  code: string; // Changed from string to number
  name: string;
  position: [number, number];
}

interface MapProps {
  position?: [number, number];
  zoom?: number;
  className?: string;
  isActive?: boolean;
  markers: MarkerType[]; // Use the updated MarkerType
  userLocation?: { lat: number; lng: number } | null;
  onLocationClick?: ((latlng: { lat: number; lng: number }) => void) | null; // Allow null or undefined
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
      // Only invoke onLocationClick if it's not null
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
      if (onLocationClick) {
        onLocationClick(e.latlng);
      }
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
export default function Map({
  position = [40.4237, -86.9212],
  zoom = 13,
  className = "flex w-full h-full",
  isActive = true,
  markers = [],
  userLocation = null,
  onLocationClick = null,
}: MapProps) {
  {
    /* List of all buildilngs, possibly replace with API */
  }

  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef(null);
  const radlvl = 10;

  const onMapReady = (mapInstance: L.Map) => {
    mapRef.current = mapInstance;
  };

  return (
    <div ref={containerRef} className={className}>
      <MapContainer
        center={position}
        zoom={zoom}
        ref={mapRef}
        style={{ height: "80vh", width: "96vw" }}
        whenReady={onMapReady as any}
      >
        <MapController center={userLocation} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onLocationClick={onLocationClick} markers={markers} />
        {markers.map((m) => (
          <CircleMarker center={m.position} radius={radlvl}>
            <Popup>
              <BuildingPopupContent
                name={m.name}
                buildingCode={String(m.code)}
              />
            </Popup>
          </CircleMarker>
        ))}

        {/* Additional map layers or components can be added here */}
      </MapContainer>
    </div>
  );
}
