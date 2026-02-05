import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Heart,
  Users,
  Eye,
  Mail,
  MailX,
  Calendar,
  ArrowLeft,
  Award,
  BarChart3,
} from "lucide-react";

interface EventRSVP {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  rsvpDate: string;
}

interface EventStatistic {
  id: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  likes: number;
  rsvpsWithEmail: number;
  rsvpsWithoutEmail: number;
  totalRsvps: number;
  views: number; // Placeholder
  interestScore: number;
  attendees: EventRSVP[];
}

export default function EventStatistics() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventStatistic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"interest" | "date">("interest");
  const [clubName, setClubName] = useState<string>("");

  useEffect(() => {
    fetchEventStatistics();
    fetchClubName();
  }, [clubId]);

  const fetchClubName = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/clubs/${clubId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        setClubName(data.name || "Club");
      }
    } catch (error) {
      console.error("Error fetching club name:", error);
    }
  };

  const fetchEventStatistics = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      // Fetch all events for the club
      const eventsResponse = await fetch(
        `http://localhost:3000/api/clubs/${clubId}/events`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!eventsResponse.ok) {
        throw new Error("Failed to fetch events");
      }

      const eventsData = await eventsResponse.json();

      // Fetch statistics for each event
      const eventStats = await Promise.all(
        eventsData.map(async (event: any) => {
          try {
            // Fetch likes
            const likesResponse = await fetch(
              `http://localhost:3000/api/events/${event.id}/likes`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            const likesData = likesResponse.ok
              ? await likesResponse.json()
              : { count: 0 };

            // Fetch RSVPs
            const rsvpsResponse = await fetch(
              `http://localhost:3000/api/events/${event.id}/rsvps`,
            );
            const rsvpsData = rsvpsResponse.ok
              ? await rsvpsResponse.json()
              : { count: 0, attendees: [] };

            console.log("rsvpsData:", rsvpsData);

            // Fetch email preferences for each
            const totalRsvps = rsvpsData.count || 0;
            const rsvpsWithEmail = rsvpsData.attendees.filter(
              (a: { rsvpStatus: string }) => a.rsvpStatus === "email_yes",
            ).length;
            const rsvpsWithoutEmail = totalRsvps - rsvpsWithEmail;

            // Calculate interest score
            // Formula: (likes * 1) + (rsvps * 3) to weight RSVPs more heavily
            const interestScore = likesData.count + totalRsvps * 3;

            // Fetch views
            const viewsResponse = await fetch(
              `http://localhost:3000/api/events/${event.id}/views`,
              {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              },
            );

            const viewsData = viewsResponse.ok
              ? await viewsResponse.json()
              : { views: 0 };

            const views = viewsData.views;
            //const views = 0;

            return {
              id: event.id,
              name: event.description || "Unnamed Event",
              description: event.booking?.description || "",
              startTime: event.startTime,
              endTime: event.endTime,
              likes: likesData.count || 0,
              rsvpsWithEmail,
              rsvpsWithoutEmail,
              totalRsvps,
              views,
              interestScore,
              attendees: rsvpsData.attendees || [],
            };
          } catch (err) {
            console.error(`Error fetching stats for event ${event.id}:`, err);
            return null;
          }
        }),
      );

      // Filter out null values and sort
      const validStats = eventStats.filter(
        (stat): stat is EventStatistic => stat !== null,
      );
      setEvents(validStats);
      setError(null);
    } catch (error) {
      console.error("Error fetching event statistics:", error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const getSortedEvents = () => {
    if (sortBy === "interest") {
      return [...events].sort((a, b) => b.interestScore - a.interestScore);
    } else {
      return [...events].sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getInterestRank = (event: EventStatistic) => {
    const sorted = getSortedEvents();
    return sorted.findIndex((e) => e.id === event.id) + 1;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-gray-300 text-xl">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Error: {error}</div>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const sortedEvents = getSortedEvents();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
          >
            <ArrowLeft className="w-6 h-6 text-gray-400" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-white">Event Statistics</h1>
            <p className="text-gray-400 mt-1">{clubName}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-amber-400" />
              <span className="text-gray-400 text-sm font-medium">
                Total Events
              </span>
            </div>
            <div className="text-3xl font-bold text-white">{events.length}</div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Heart className="w-6 h-6 text-red-400" />
              <span className="text-gray-400 text-sm font-medium">
                Total Likes
              </span>
            </div>
            <div className="text-3xl font-bold text-white">
              {events.reduce((sum, e) => sum + e.likes, 0)}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-blue-400" />
              <span className="text-gray-400 text-sm font-medium">
                Total RSVPs
              </span>
            </div>
            <div className="text-3xl font-bold text-white">
              {events.reduce((sum, e) => sum + e.totalRsvps, 0)}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <span className="text-gray-400 text-sm font-medium">
                Avg Interest
              </span>
            </div>
            <div className="text-3xl font-bold text-white">
              {events.length > 0
                ? Math.round(
                    events.reduce((sum, e) => sum + e.interestScore, 0) /
                      events.length,
                  )
                : 0}
            </div>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-3 bg-gray-800 rounded-lg border border-gray-700 p-4">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          <span className="text-gray-300 font-medium">Sort by:</span>
          <button
            onClick={() => setSortBy("interest")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              sortBy === "interest"
                ? "bg-amber-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Interest Score
          </button>
          <button
            onClick={() => setSortBy("date")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              sortBy === "date"
                ? "bg-amber-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Date
          </button>
        </div>

        {/* Events List */}
        {sortedEvents.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Events Found
            </h3>
            <p className="text-gray-400">
              This club doesn't have any events yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedEvents.map((event, index) => (
              <div
                key={event.id}
                className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-amber-500 transition"
              >
                {/* Event Header */}
                <div className="bg-gradient-to-r from-amber-600 to-yellow-600 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {sortBy === "interest" && (
                          <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                            <Award className="w-4 h-4 text-white" />
                            <span className="text-white font-bold text-sm">
                              #{index + 1}
                            </span>
                          </div>
                        )}
                        <h3 className="text-xl font-bold text-white">
                          {event.name}
                        </h3>
                      </div>
                      <p className="text-amber-100 text-sm mt-1">
                        {formatDate(event.startTime)} at{" "}
                        {formatTime(event.startTime)}
                      </p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                      <div className="text-xs text-amber-100 uppercase font-semibold">
                        Interest Score
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {event.interestScore}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Statistics */}
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {/* Likes */}
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-5 h-5 text-red-400" />
                        <span className="text-gray-300 text-sm font-medium">
                          Likes
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {event.likes}
                      </div>
                    </div>

                    {/* RSVPs with Email */}
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-5 h-5 text-green-400" />
                        <span className="text-gray-300 text-sm font-medium">
                          Email On
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {event.rsvpsWithEmail}
                      </div>
                    </div>

                    {/* RSVPs without Email */}
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <MailX className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-300 text-sm font-medium">
                          Email Off
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {event.rsvpsWithoutEmail}
                      </div>
                    </div>

                    {/* Total RSVPs */}
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        <span className="text-gray-300 text-sm font-medium">
                          Total RSVPs
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {event.totalRsvps}
                      </div>
                    </div>

                    {/* Views */}
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-5 h-5 text-purple-400" />
                        <span className="text-gray-300 text-sm font-medium">
                          Views
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {event.views}
                      </div>
                    </div>
                  </div>

                  {/* Attendees Preview */}
                  {event.attendees.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-amber-400" />
                        <span className="text-gray-300 text-sm font-semibold">
                          Attendees ({event.attendees.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {event.attendees.slice(0, 10).map((attendee) => (
                          <div
                            key={attendee.id}
                            className="bg-gray-700 px-3 py-1 rounded-full text-sm text-gray-300"
                            title={attendee.email}
                          >
                            {attendee.firstName} {attendee.lastName}
                          </div>
                        ))}
                        {event.attendees.length > 10 && (
                          <div className="bg-gray-700 px-3 py-1 rounded-full text-sm text-gray-400">
                            +{event.attendees.length - 10} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
