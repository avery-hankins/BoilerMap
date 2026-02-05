import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { MapPin, Users, Layout, ChevronRight, Search } from "lucide-react";

interface RoomData {
  Id: string;
  Number: string;
  Capacity: number;
  Area?: number;
}

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: {
    eventId: number;
    roomId: string;
    roomNumber: string;
    clubName: string;
  };
}

interface MinimalToolbarProps {
  label: string;
}

const localizer = momentLocalizer(moment);

function MinimalToolbar(props: MinimalToolbarProps) {
  const { label } = props;
  return (
    <div className="rbc-toolbar flex items-center justify-center mb-2">
      <div className="rbc-toolbar-label text-lg font-semibold">{label}</div>
    </div>
  );
}

export default function RoomListing() {
  const urlParams = new URLSearchParams(window.location.search);
  const building_code = urlParams.get("id");

  const [isLoading, setIsLoading] = useState(true);
  const [buildingName, setBuildingName] = useState("");
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("number");

  useEffect(() => {
    const fetchBuildingData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");

        console.log("Building code:", building_code);

        // Fetch building info from Purdue API
        const buildingResponse = await fetch(
          `https://api.purdue.io/odata/buildings?$filter=ShortCode eq '${building_code}'`,
        );
        const buildingData = await buildingResponse.json();

        if (buildingData.value && buildingData.value.length > 0) {
          setBuildingName(
            buildingData.value[0].ShortCode || buildingData.value[0].Name,
          );
        }

        const building_id = buildingData.value[0]?.Id;

        // Fetch rooms from Purdue API
        const roomsResponse = await fetch(
          `https://api.purdue.io/odata/rooms?$filter=BuildingId eq ${building_id}&$select=Id,Number`,
        );
        const roomsData = await roomsResponse.json();
        const DEFAULT_CAPACITY = 53;

        const roomsList = (roomsData.value || []).map((r: any) => ({
          ...r,
          Capacity: DEFAULT_CAPACITY,
        }));

        setRooms(roomsList);

        // Fetch events from YOUR database for this building
        if (building_code) {
          try {
            const eventsResponse = await fetch(
              `http://localhost:3000/api/events/eventlist`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (eventsResponse.ok) {
              const allEvents = await eventsResponse.json();

              // Filter events for this building
              const buildingEvents = allEvents.filter(
                (event: any) => event.room?.buildingCode === building_code,
              );

              console.log(
                `Found ${buildingEvents.length} events for building ${building_code}`,
              );

              // Convert database events to calendar events
              const calendarEvents =
                convertDatabaseEventsToCalendar(buildingEvents);
              setEvents(calendarEvents);
            }
          } catch (eventsError) {
            console.error("Error fetching events from database:", eventsError);
            setEvents([]);
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching building data:", error);
        setIsLoading(false);
      }
    };

    fetchBuildingData();
  }, [building_code]);

  useEffect(() => {
    console.log(events);
  }, [events]);

  const convertDatabaseEventsToCalendar = (
    dbEvents: any[],
  ): CalendarEvent[] => {
    const calendarEvents: CalendarEvent[] = [];

    dbEvents.forEach((event: any) => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);

      // Get event title from description or booking description
      const eventTitle =
        event.description || event.booking?.description || "Event";
      const clubName = event.club?.name || "Club";
      const roomNumber = event.room?.roomNum || "Unknown";

      const title = `${eventTitle} - ${clubName} (Room ${roomNumber})`;

      calendarEvents.push({
        title,
        start,
        end,
        resource: {
          eventId: event.id,
          roomId: event.roomId,
          roomNumber: roomNumber,
          clubName: clubName,
        },
      });
    });

    // Sort events chronologically
    calendarEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

    return calendarEvents;
  };

  const filteredRooms = rooms
    .filter((room: RoomData) => {
      // Search filter
      const matchesSearch = room.Number.toLowerCase().includes(
        searchTerm.toLowerCase(),
      );

      // Capacity filter
      let matchesCapacity: boolean = true;
      if (capacityFilter === "small") {
        matchesCapacity = !!room.Capacity && room.Capacity <= 30;
      } else if (capacityFilter === "medium") {
        matchesCapacity =
          !!room.Capacity && room.Capacity > 30 && room.Capacity <= 60;
      } else if (capacityFilter === "large") {
        matchesCapacity = !!room.Capacity && room.Capacity > 60;
      }

      return matchesSearch && matchesCapacity;
    })
    .sort((a: RoomData, b: RoomData) => {
      if (sortBy === "number") {
        return a.Number.localeCompare(b.Number, undefined, { numeric: true });
      } else if (sortBy === "capacity") {
        return (b.Capacity || 0) - (a.Capacity || 0);
      } else if (sortBy === "area") {
        return (b.Area || 0) - (a.Area || 0);
      }
      return 0;
    });

  const handleViewRoomDetails = () => {
    if (selectedRoom) {
      window.location.href = `/room?id=${selectedRoom.Id}`;
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    // Navigate to event details page
    window.location.href = `/event/${event.resource.eventId}`;
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: "#d97706",
        borderRadius: "4px",
        opacity: 0.9,
        color: "#ffffff",
        border: "1px solid #b45309",
        display: "block",
        cursor: "pointer",
      },
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark">
          <div className="bg-gradient-to-r from-accent-dark to-accent text-white p-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">
                  {buildingName || "Loading..."}
                </h1>
                <p className="text-text-secondary mt-1">
                  Building Rooms & Event Schedule
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Event Count Badge */}
        {!isLoading && events.length > 0 && (
          <div className="bg-surface rounded-lg border border-border-dark p-4">
            <div className="flex items-center gap-2 text-accent-light">
              {/* <Calendar className="w-5 h-5" /> */}
              <span className="font-semibold">
                {events.length} event{events.length !== 1 ? "s" : ""} scheduled
                in this building
              </span>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Rooms List - Left Sidebar */}
          <div className="lg:col-span-1 bg-surface rounded-lg shadow-2xl border border-border-dark p-6">
            <h2 className="text-2xl font-bold text-white mb-4">
              Available Rooms
            </h2>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5" />
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-light text-white rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Filters */}
            <div className="space-y-3 mb-4">
              {/* Capacity Filter */}
              <div>
                <label className="block text-sm font-medium text-text-tertiary mb-2">
                  Capacity
                </label>
                <select
                  value={capacityFilter}
                  onChange={(e) => setCapacityFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-light text-white rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="all">All Sizes</option>
                  <option value="small">Small (≤30)</option>
                  <option value="medium">Medium (31-60)</option>
                  <option value="large">Large (60+)</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-text-tertiary mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-light text-white rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="number">Room Number</option>
                  <option value="capacity">Capacity (High to Low)</option>
                  <option value="area">Area (Large to Small)</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-text-muted mb-3">
              Showing {filteredRooms.length} of {rooms.length} rooms
            </div>

            {/* Rooms List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="text-text-muted text-center py-8">
                  Loading rooms...
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-text-muted text-center py-8">
                  No rooms found
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const roomEventCount = events.filter(
                    (e) => e.resource.roomNumber === room.Number,
                  ).length;

                  return (
                    <button
                      key={room.Id}
                      onClick={() => setSelectedRoom(room)}
                      className={`w-full text-left p-4 rounded-lg transition-all ${
                        selectedRoom?.Id === room.Id
                          ? "bg-accent-dark text-white shadow-lg"
                          : "bg-surface-light text-text-secondary hover:bg-surface-lighter"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-lg">
                            Room {room.Number}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm opacity-90">
                            {room.Capacity && (
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {room.Capacity}
                              </span>
                            )}
                            {roomEventCount > 0 && (
                              <span className="flex items-center gap-1">
                                {/* <Calendar className="w-4 h-4" /> */}
                                {roomEventCount} event
                                {roomEventCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* View Details Button */}
            {selectedRoom && (
              <button
                onClick={handleViewRoomDetails}
                className="w-full mt-4 bg-gradient-to-r from-accent-dark to-accent hover:from-accent hover:to-accent-light text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-105"
              >
                View Room Details
              </button>
            )}
          </div>

          {/* Calendar - Right Content */}
          <div className="lg:col-span-2 bg-surface rounded-lg shadow-2xl border border-border-dark p-6">
            <h2 className="text-2xl font-bold text-white mb-4">
              Event Schedule
            </h2>

            {isLoading ? (
              <div className="text-text-muted text-center py-16">
                Loading calendar...
              </div>
            ) : events.length === 0 ? (
              <div className="text-text-muted text-center py-16">
                No events scheduled for this building
              </div>
            ) : (
              <div
                className="bg-white rounded-lg p-4"
                style={{ height: "700px" }}
              >
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  defaultView="week"
                  views={["week", "day", "month"]}
                  step={30}
                  showMultiDayTimes
                  defaultDate={new Date()}
                  eventPropGetter={eventStyleGetter}
                  onSelectEvent={handleEventClick}
                  style={{ height: "100%" }}
                  min={new Date(0, 0, 0, 7, 0, 0)}
                  max={new Date(0, 0, 0, 22, 0, 0)}
                  components={{ toolbar: MinimalToolbar }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
