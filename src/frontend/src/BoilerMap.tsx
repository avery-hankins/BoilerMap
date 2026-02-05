import React, { useState, useRef, useEffect } from "react";
import { MapPin, Layers, Home, Users, Search, Calendar } from "lucide-react";
import EventMap from "./EventMap";
import { useNavigate, Routes, Route, BrowserRouter } from "react-router-dom";
import ClassroomBooking from "./RoomInfo";
import Map from "./Map";
import markerData from "../purdue_buildings_with_coords.json";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "./ThemeContext";

interface User {
  firstName: string;
  lastName: string;
}

interface Club {
  id: string;
  name: string;
  description?: string;
}

interface Marker {
  code: string;
  position: [number, number];
  name: string;
}

interface Room {
  RoomId?: string;
  Id?: string;
  Number: string;
  raw: any;
}

interface Building {
  id: string;
  name: string;
  code: string;
  rooms: Room[];
}

interface RawRoomData {
  RoomId?: string;
  Id?: string;
  Number: string;
}

interface RawBuildingData {
  Id: string;
  Name: string;
  ShortCode: string;
  Rooms: RawRoomData[];
}

interface Event {
  id: number;
  title: string;
  startTime: string;
  description?: string;
  club: { id: number; name: string };
}

export default function BoilermapUI() {
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("event-map");
  const [user, setUser] = useState<User | null>(null);
  const [zoom, setZoom] = useState(1);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [markers, setMarkers] = useState<Marker[]>([
    {
      code: "HAGL",
      position: [40.42714869054348, -86.91884878901142],
      name: "Hagle Hall",
    },
    {
      code: "LWSN",
      position: [40.427774713797724, -86.91693153220558],
      name: "Lawson Computer Science Building",
    },
    {
      code: "KRAN",
      position: [40.42362544969261, -86.91082697269846],
      name: "Krannert Hall",
    },
  ]);
  const [buildingData, setBuildingData] = useState<Building[] | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const navigate = useNavigate();

  // Fetch profile photo
  useEffect(() => {
    const fetchProfilePhoto = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setImageLoading(false);
          return;
        }

        const response = await fetch(
          "http://localhost:3000/api/users/profile-photo",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        } else {
          setImageError(true);
        }
      } catch (err) {
        console.error("Error loading profile photo:", err);
        setImageError(true);
      } finally {
        setImageLoading(false);
      }
    };

    fetchProfilePhoto();

    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, []);

  // Fetch user data
  useEffect(() => {
    fetch("http://localhost:3000/api/users")
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched user data:", data);
        if (Array.isArray(data) && data.length > 0) {
          setUser(data[0]);
        }
      })
      .catch((err) => console.error("Failed to fetch user:", err));
  }, []);

  const [componentConfig, setComponentConfig] = useState<{
    center: [number, number];
    zoom: number;
  }>({
    center: [40.4257, -86.9167],
    zoom: 16,
  });

  const handleLocationClick = (latlng: { lat: number; lng: number }) => {
    console.log("Click on map detected at ", latlng.lat, latlng.lng);
  };

  const getUserLocation = () => {
    navigator.geolocation.getCurrentPosition((position) => {
      const userLoc = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setLocation(userLoc);

      setComponentConfig({
        center: [userLoc.lat, userLoc.lng],
        zoom: 15,
      });
    });
  };

  // Set building list
  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch(
          "https://api.purdue.io/odata/Buildings?$select=Id,Name,ShortCode,Rooms",
          { headers: { Accept: "application/json" } },
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const rows = data.value ?? [];

        const mapped = rows.map((r: RawBuildingData) => ({
          id: r.Id,
          name: r.Name,
          code: r.ShortCode,
          rooms: Array.isArray(r.Rooms)
            ? r.Rooms.map((room: RawRoomData) => ({
                id: room.RoomId ?? room.Id,
                number: room.Number,
                raw: room,
              }))
            : [],
        }));

        setBuildingData(mapped);
      } catch (err) {
        console.error("load error", err);
      }
    }

    load();
  }, []);

  // debugging: prints out building data when updated
  useEffect(() => {
    console.log("buildingData has changed:", buildingData);
  }, [buildingData]);

  // updates markers
  useEffect(() => {
    console.log("markerData has changed:", markerData);

    const mapped = markerData
      .map((r) => {
        const lat = r.chosen?.lat ?? r.lat ?? null;
        const lon = r.chosen?.lon ?? r.lon ?? null;
        const latN = lat != null ? Number(lat) : null;
        const lonN = lon != null ? Number(lon) : null;

        return {
          code: r.code,
          name: r.name,
          position:
            latN != null &&
            lonN != null &&
            Number.isFinite(latN) &&
            Number.isFinite(lonN)
              ? [latN, lonN]
              : null, // Keep null for filtering
        };
      })
      .filter((m): m is Marker => m.position !== null); // Type assertion for filter

    setMarkers(mapped);
    console.log("updated markers: ", mapped);
  }, [markerData]);

  return (
    <div className="min-h-screen bg-background-dark text-text-secondary">
      {/* Header */}
      <header className="bg-background-main border-b border-border-dark px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              id="boilermap-logo"
              src={resolvedTheme === "light" ? "/logo_light.ico" : "/logo.ico"}
              alt="BoilerMap Logo"
              className="w-12 h-12 rounded-xl"
            />
            <div>
              <h1 className="text-xl font-semibold">Boilermap</h1>
              <p className="text-sm text-text-muted">
                The quickest way to find events
              </p>
            </div>
          </div>

          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab("event-map")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "event-map"
                  ? "bg-background-light text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Event Map
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "map"
                  ? "bg-background-light text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Book Room
            </button>
            <button
              onClick={() => setActiveTab("club")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "club"
                  ? "bg-background-light text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Club Management
            </button>
            <button
              onClick={() => setActiveTab("recommendations")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "recommendations"
                  ? "bg-background-light text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Recommendations
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Profile Avatar */}
            <div
              className="relative w-10 h-10 rounded-full cursor-pointer group"
              onClick={() => navigate("/userInfo")}
            >
              {imageLoading ? (
                <div className="w-full h-full bg-background-lighter rounded-full animate-pulse" />
              ) : imageUrl && !imageError ? (
                <img
                  src={imageUrl}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover transition-opacity group-hover:opacity-80"
                />
              ) : (
                <div className="w-full h-full bg-background-light rounded-full flex items-center justify-center font-semibold text-text-primary">
                  {user?.firstName?.[0]?.toUpperCase() ?? "J"}
                  {user?.lastName?.[0]?.toUpperCase() ?? "D"}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === "map" && (
          <div className="bg-background-main rounded-2xl p-6 border border-border-dark">
            {/* Map Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-accent-dark">
                Room Booking Map
              </h2>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 bg-background-light hover:bg-background-lighter rounded-lg transition-colors flex items-center gap-2"
                  onClick={getUserLocation}
                >
                  <Home className="w-4 h-4" />
                  My location
                </button>
              </div>
            </div>

            {/* Map Container */}
            <div className="w-full h-[600px] md:h-[80vh] rounded-lg shadow">
              <Map
                className="flex w-full h-full"
                isActive={activeTab === "map"}
                markers={markers}
                position={componentConfig.center}
                zoom={componentConfig.zoom}
                userLocation={location}
                onLocationClick={handleLocationClick}
              />
            </div>
          </div>
        )}
        {activeTab === "event-map" && (
          <div className="bg-surface-dark rounded-2xl p-6 border border-border-dark">
            {/* Map Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-accent-dark">
                Events Map
              </h2>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 bg-surface hover:bg-surface-light rounded-lg transition-colors flex items-center gap-2"
                  onClick={getUserLocation}
                >
                  <Home className="w-4 h-4" />
                  My location
                </button>
              </div>
            </div>

            {/* Map Container - Updated height and removed extra padding */}
            <div className="w-full h-[600px] md:h-[80vh] rounded-lg overflow-hidden">
              <EventMap
                className="flex w-full h-full"
                isActive={activeTab === "event-map"}
                markers={markers}
                position={componentConfig.center}
                zoom={componentConfig.zoom}
                userLocation={location}
                onLocationClick={handleLocationClick}
              />
            </div>
          </div>
        )}
        {activeTab === "club" && <ClubManagement />}
        {activeTab === "account" && <AccountManagement />}
        {activeTab === "recommendations" && <Recommendations />}
      </main>
    </div>
  );
}

function Recommendations() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("token"); // your JWT
        const res = await fetch("http://localhost:3000/api/recommendations/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch events");
        const data = await res.json();
        setEvents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading)
    return (
      <div className="text-center py-12 text-text-muted">
        Loading recommendations...
      </div>
    );

  return (
    <div className="bg-background-main rounded-2xl p-6 border border-border-dark">
      <h2 className="text-3xl font-bold mb-6 text-accent-dark">
        Recommended Events
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.isArray(events) &&
          events.map((ev) => (
            <div
              key={ev.id}
              className="bg-surface border border-border-dark rounded-lg p-4 hover:bg-surface-light transition-colors cursor-pointer"
              onClick={() => (window.location.href = `/event/${ev.id}`)}
            >
              <div className="font-bold text-text-primary text-lg mb-2">
                {ev.title}
              </div>

              <div className="space-y-2 text-sm">
                {ev.description && (
                  <h3 className="text-text-primary font-bold text-lg line-clamp-2 -mt-1">
                    {ev.description}
                  </h3>
                )}

                <div className="flex items-center gap-2 text-text-tertiary">
                  <Users className="w-4 h-4 text-accent-light" />
                  <span>{ev.club.name}</span>
                </div>

                <div className="flex items-center gap-2 text-text-tertiary">
                  <Calendar className="w-4 h-4 text-accent-light" />
                  <span>
                    {new Date(ev.startTime).toLocaleDateString()} at{" "}
                    {new Date(ev.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function Book() {
  return (
    <>
      <div className="bg-background-main rounded-2xl p-6 border border-border-dark">
        <h2 className="text-xl font-medium text-accent-dark">Book</h2>
      </div>
      <ClassroomBooking />
    </>
  );
}

function ClubManagement() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch clubs when component mounts
  useEffect(() => {
    const fetchClubs = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("http://localhost:3000/api/clubs");

        if (!response.ok) {
          throw new Error("Failed to fetch clubs");
        }

        const data = await response.json();
        console.log("Clubs data:", data);
        setClubs(data);
        setError(null);
      } catch (error: unknown) {
        console.error("Error fetching clubs:", error);
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClubs();
  }, []);

  // Filter clubs based on search
  const filteredClubs = clubs.filter(
    (club) =>
      club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (club.description &&
        club.description.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleClubClick = (clubId: string) => {
    navigate(`/clubs/${clubId}`);
  };

  if (isLoading) {
    return (
      <div className="bg-background-main rounded-2xl p-6 border border-border-dark">
        <h2 className="text-xl font-medium text-accent-dark mb-6">
          Club Management
        </h2>
        <div className="text-center py-12">
          <div className="text-text-muted">Loading clubs...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background-main rounded-2xl p-6 border border-border-dark">
        <h2 className="text-xl font-medium text-accent-dark mb-6">
          Club Management
        </h2>
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">Error: {error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent-dark hover:bg-accent text-text-primary rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-main rounded-2xl p-6 border border-border-dark">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-accent-dark">
          Club Management
        </h2>
        <button
          onClick={() => navigate("/clubs")}
          className="px-4 py-2 bg-accent-dark hover:bg-accent text-text-primary rounded-lg transition-colors"
        >
          View All Clubs
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-muted"
            size={20}
          />
          <input
            type="text"
            placeholder="Search clubs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-background-light border border-border rounded-lg text-text-primary placeholder-text-muted focus:ring-2 focus:ring-border-focus focus:border-transparent"
          />
        </div>
      </div>

      {/* Clubs Grid */}
      {filteredClubs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-muted">No clubs found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClubs.map((club) => (
            <div
              key={club.id}
              onClick={() => handleClubClick(club.id)}
              className="bg-background-light rounded-lg overflow-hidden border border-border cursor-pointer transition-all hover:border-border-focus hover:shadow-lg"
            >
              {/* Club Header */}
              <div className="bg-gradient-to-r from-accent-dark to-primary-400 h-20 flex items-center justify-center">
                <div className="w-14 h-14 bg-white rounded-lg shadow-lg flex items-center justify-center text-2xl font-bold text-accent-dark">
                  {club.name.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Club Content */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-text-primary mb-2 hover:text-accent-light transition">
                  {club.name}
                </h3>

                <p className="text-text-muted text-sm mb-3 line-clamp-2">
                  {club.description || "No description available."}
                </p>

                <div className="flex items-center gap-2 text-xs text-text-disabled">
                  <Users size={14} />
                  <span>View Details →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventSearchTab() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/events");
  }, [navigate]);

  return (
    <div className="bg-background-main rounded-2xl p-6 border border-border-dark">
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary mb-4"></div>
        <p className="text-text-primary">Redirecting to Event Search...</p>
      </div>
    </div>
  );
}

function AccountManagement() {
  return (
    <div className="bg-background-main rounded-2xl p-6 border border-border-dark">
      <h2 className="text-xl font-medium text-accent-dark">
        Account Management
      </h2>
      <p className="text-text-muted">Account management content goes here.</p>
    </div>
  );
}
