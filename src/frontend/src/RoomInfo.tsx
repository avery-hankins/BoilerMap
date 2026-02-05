import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  Monitor,
  Layout,
  MapPin,
  AlertCircle,
} from "lucide-react";

interface MeetingData {
  time: Date;
  endTime: Date;
  title: string;
}

export default function ClassroomBooking() {
  const urlParams = new URLSearchParams(window.location.search);

  const [isBooking, setIsBooking] = useState(false);
  const [formattedMeetings, setFormattedMeetings] = useState<MeetingData[][]>([
    [],
    [],
    [],
    [],
    [],
    [],
    [],
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [roomName, setRoomName] = useState("");

  const room_id = urlParams.get("id");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");

        // Fetch room info from Purdue API
        const room_page =
          "https://api.purdue.io/odata/rooms?$filter=id eq " +
          room_id +
          "&$expand=Building";

        const room_response = await fetch(room_page);
        const room_data = await room_response.json();

        if (room_data.value && room_data.value.length > 0) {
          const roomInfo = room_data.value[0];
          setRoomName(roomInfo.Building.ShortCode + " " + roomInfo.Number);

          // Fetch events from YOUR database for this specific room
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

              // Filter events for this specific room
              const buildingCode = roomInfo.Building.ShortCode;
              const roomNumber = roomInfo.Number;

              const roomEvents = allEvents.filter(
                (event: any) =>
                  event.room?.buildingCode === buildingCode &&
                  event.room?.roomNum === roomNumber,
              );

              console.log(
                `Found ${roomEvents.length} events for room ${roomName}`,
              );

              // Convert database events to weekly calendar format
              const weeklyMeetings = convertDatabaseEventsToWeekly(roomEvents);
              setFormattedMeetings(weeklyMeetings);
            }
          } catch (eventsError) {
            console.error("Error fetching events from database:", eventsError);
            setFormattedMeetings([[], [], [], [], [], [], []]);
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [room_id]);

  const convertDatabaseEventsToWeekly = (dbEvents: any[]): MeetingData[][] => {
    const weeklyMeetings: MeetingData[][] = [[], [], [], [], [], [], []]; // 0 = Sunday, 1 = Monday, etc.

    dbEvents.forEach((event: any) => {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);

      // Get the day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = startTime.getDay();

      // Get event title from description or booking description
      const eventTitle =
        event.description || event.booking?.description || "Event";
      const clubName = event.club?.name || "Club Event";

      const meetingData: MeetingData = {
        time: startTime,
        endTime: endTime,
        title: `${clubName}: ${eventTitle}`,
      };

      weeklyMeetings[dayOfWeek]?.push(meetingData);
    });

    // Sort meetings within each day by start time
    weeklyMeetings.forEach((dayMeetings) => {
      dayMeetings.sort((a, b) => a.time.getTime() - b.time.getTime());
    });

    return weeklyMeetings;
  };

  const handleBookRoom = () => {
    window.location.href = "/book?id=" + room_id;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark p-6">
      <div className="max-w-4xl mx-auto bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent-dark to-accent text-white p-6">
          <h1 className="text-3xl font-bold">{roomName}</h1>
        </div>

        {/* Classroom Image */}
        <div className="relative h-64 bg-background-dark">
          <img
            src="https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop"
            alt="Classroom interior"
            className="w-full h-full object-cover opacity-80"
          />
        </div>

        {/* Information Grid */}
        <div className="p-6 space-y-4">
          {/* Weekly Calendar */}
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="text-text-tertiary">Loading calendar...</div>
            </div>
          ) : (
            <WeeklyCalendar meetings={formattedMeetings} />
          )}

          {/* Capacity and Area */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3 p-4 bg-surface-light rounded-lg border border-border-light">
              <Users className="w-6 h-6 text-accent-light mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-text-secondary">Capacity</h3>
                <p className="text-text-tertiary">
                  53 (29 for final examinations)
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-4 bg-surface-light rounded-lg border border-border-light">
              <Layout className="w-6 h-6 text-accent-light mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-text-secondary">Area</h3>
                <p className="text-text-tertiary">1,213 ft²</p>
              </div>
            </div>
          </div>

          {/* Room Type */}
          <div className="p-4 bg-surface-light rounded-lg border border-border-light">
            <h3 className="font-semibold text-text-secondary mb-2">
              Room Type
            </h3>
            <p className="text-text-tertiary">Classrooms</p>
          </div>

          {/* Audio/Visual */}
          <div className="p-4 bg-surface-light rounded-lg border border-border-light">
            <div className="flex items-start space-x-3">
              <Monitor className="w-6 h-6 text-accent-light mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-text-secondary mb-2">
                  Audio / Visual
                </h3>
                <p className="text-text-tertiary">
                  2 Computer Projectors, Computer, Computer Projection, Document
                  Camera
                </p>
              </div>
            </div>
          </div>

          {/* Boards */}
          <div className="p-4 bg-surface-light rounded-lg border border-border-light">
            <h3 className="font-semibold text-text-secondary mb-2">Boards</h3>
            <p className="text-text-tertiary">Whiteboard ≥ 20Ft</p>
          </div>

          {/* Seating */}
          <div className="p-4 bg-surface-light rounded-lg border border-border-light">
            <h3 className="font-semibold text-text-secondary mb-2">Seating</h3>
            <p className="text-text-tertiary">
              Fixed HDCP Table in Room, Fixed Seating, Horseshoe Fixed Table
              Arrangement, Tables and Chairs, Tiered Seating
            </p>
          </div>

          {/* Location */}
          <div className="p-4 bg-surface-light rounded-lg border border-border-light">
            <div className="flex items-start space-x-3">
              <MapPin className="w-6 h-6 text-accent-light mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-text-secondary mb-2">
                  Location
                </h3>
                <p className="text-text-tertiary">Classroom</p>
                <p className="text-text-muted text-sm mt-1">
                  Village Area: South of State Street, East of Marsteller Street
                </p>
              </div>
            </div>
          </div>

          {/* Events */}
          <div className="p-4 bg-surface-light rounded-lg border border-border-light">
            <div className="flex items-start space-x-3">
              <Calendar className="w-6 h-6 text-accent-light mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-text-secondary mb-2">
                  Events
                </h3>
                <p className="text-text-tertiary">
                  Authenticated Users Can Request Events
                </p>
                <p className="text-text-muted text-sm mt-1">
                  Managers Can Approve
                </p>
              </div>
            </div>
          </div>

          {/* Department */}
          <div className="p-4 bg-surface-light rounded-lg border border-border-light">
            <h3 className="font-semibold text-text-secondary mb-2">
              Department
            </h3>
            <p className="text-text-tertiary">
              1979 - General Academic Classrooms
            </p>
          </div>

          {/* Book Room Button */}
          <button
            onClick={handleBookRoom}
            className="w-full bg-gradient-to-r from-accent-dark to-accent hover:from-accent hover:to-accent-light text-white font-semibold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isBooking ? "Submitting Request..." : "Book Room"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function WeeklyCalendar({ meetings }: { meetings: MeetingData[][] }) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  console.log("WeeklyCalendar meetings:", meetings);

  // Get current week dates
  const getCurrentWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday
    const dates = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - currentDay + i);
      dates.push(date);
    }

    return dates;
  };

  const weekDates = getCurrentWeekDates();
  const today = new Date().toDateString();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark to-surface p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-8 h-8 text-indigo-400" />
          <h1 className="text-3xl font-bold text-white">
            This Week&apos;s Events
          </h1>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {days.map((day, idx) => {
            const date = weekDates[idx]!;
            const isToday = date.toDateString() === today;
            const dayMeetings = meetings[idx] || [];

            // Sort by time
            dayMeetings.sort(
              (a: MeetingData, b: MeetingData) =>
                a.time.getTime() - b.time.getTime(),
            );

            return (
              <div
                key={idx}
                className={`bg-surface rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105 ${
                  isToday ? "ring-2 ring-indigo-400" : ""
                }`}
              >
                <div
                  className={`p-3 ${isToday ? "bg-indigo-600" : "bg-surface-light"}`}
                >
                  <div
                    className={`text-sm font-semibold ${isToday ? "text-white" : "text-text-tertiary"}`}
                  >
                    {day}
                  </div>
                  <div
                    className={`text-lg font-bold ${isToday ? "text-white" : "text-text-secondary"}`}
                  >
                    {formatDate(date!)}
                  </div>
                </div>

                <div className="p-3 space-y-2 min-h-[200px]">
                  {dayMeetings.length === 0 ? (
                    <p className="text-text-disabled text-sm italic">
                      No events
                    </p>
                  ) : (
                    dayMeetings.map((meeting: MeetingData, mIdx: number) => (
                      <div
                        key={mIdx}
                        className="bg-indigo-900 border-l-4 border-indigo-400 p-2 rounded hover:bg-indigo-800 transition-colors cursor-pointer"
                      >
                        <div className="text-xs font-semibold text-indigo-300">
                          {meeting.time.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}{" "}
                          -{" "}
                          {meeting.endTime.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                        <div className="text-sm text-text-secondary font-medium">
                          {meeting.title}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
