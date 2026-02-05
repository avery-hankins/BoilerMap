import React, { useState, useEffect, FormEvent } from "react";
import {
  Search,
  Calendar,
  Clock,
  Building,
  Users,
  X,
  UserCheck,
  TrendingUp,
  ArrowLeft,
  Heart,
  Tag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Event } from "./event";

type DateFilter = "all" | "today" | "week" | "month";
type SortOption = "date" | "popular";

interface Building {
  code: string;
  name: string;
}

interface TagOption {
  id: number;
  name: string;
}

interface EventWithPopularity extends Event {
  numRSVPs?: number;
  _count?: {
    rsvps: number;
    likes: number;
  };
  tags?: Array<{
    tag: {
      id: number;
      name: string;
    };
  }>;
}

const EventSearch: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [tagFilter, setTagFilter] = useState<string>("");
  const [events, setEvents] = useState<EventWithPopularity[]>([]);
  const [likes, setLikes] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [roomFilter, setRoomFilter] = useState("all");
  const [minAttendeesFilter, setMinAttendeesFilter] = useState("all");
  const [maxAttendeesFilter, setMaxAttendeesFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Load all events, buildings, and tags on component mount
  useEffect(() => {
    fetchBuildings();
    fetchTags();
    fetchEvents();
  }, []);

  // Fetch buildings from API
  const fetchBuildings = async (): Promise<void> => {
    try {
      const response = await fetch("http://localhost:3000/api/buildings");
      if (!response.ok) {
        throw new Error("Failed to fetch buildings");
      }
      const data: Building[] = await response.json();
      setBuildings(data);
    } catch (err) {
      console.error("Error fetching buildings:", err);
    }
  };

  // Fetch tags from API
  const fetchTags = async (): Promise<void> => {
    try {
      const response = await fetch("http://localhost:3000/api/tags");
      if (!response.ok) {
        throw new Error("Failed to fetch tags");
      }
      const data: TagOption[] = await response.json();
      setTags(data);
    } catch (err) {
      console.error("Error fetching tags:", err);
    }
  };

  // Fetch events whenever filters change
  useEffect(() => {
    if (hasSearched) {
      fetchEvents();
    }
  }, [
    dateFilter,
    sortBy,
    locationFilter,
    roomFilter,
    minAttendeesFilter,
    maxAttendeesFilter,
    categoryFilter,
    tagFilter,
  ]);

  useEffect(() => {
    const fetchLikesForEvents = async () => {
      if (events.length === 0) return;

      try {
        const token = localStorage.getItem("token");
        const results = await Promise.all(
          events.map(async (event) => {
            const res = await fetch(
              `http://localhost:3000/api/events/${event.id}/likes`,
              {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              },
            );
            if (!res.ok) throw new Error("Failed to fetch likes");
            const data = await res.json();
            return { eventId: event.id, count: data.count };
          }),
        );

        const likeMap: Record<number, number> = {};
        results.forEach((r) => {
          likeMap[r.eventId] = r.count;
        });
        setLikes(likeMap);
      } catch (err) {
        console.error("Error fetching like counts:", err);
      }
    };

    fetchLikesForEvents();
  }, [events]);

  const fetchEvents = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setHasSearched(true);

      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append("query", searchQuery.trim());
      }
      if (dateFilter !== "all") {
        params.append("dateFilter", dateFilter);
      }
      if (locationFilter) {
        params.append("location", locationFilter);
      }
      if (minAttendeesFilter !== "all") {
        params.append("minAttendeesFilter", minAttendeesFilter.toString());
      }
      if (maxAttendeesFilter !== "all") {
        params.append("maxAttendeesFilter", maxAttendeesFilter.toString());
      }
      if (tagFilter) {
        params.append("tagFilter", tagFilter);
      }
      params.append("sortBy", sortBy);

      const url = `http://localhost:3000/api/events/search?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data: EventWithPopularity[] = await response.json();
      setEvents(data);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await fetchEvents();
  };

  const handleClearFilters = (): void => {
    setSearchQuery("");
    setDateFilter("all");
    setSortBy("date");
    setLocationFilter("");
    setTagFilter("");
    setMinAttendeesFilter("all");
    setMaxAttendeesFilter("all");

    // Fetch all events
    setIsLoading(true);
    fetch("http://localhost:3000/api/events/search?sortBy=date")
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  const formatEventName = (event: EventWithPopularity): string => {
    return event.description || event.booking?.description || "Unnamed Event";
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getDateFilterLabel = (filter: DateFilter): string => {
    switch (filter) {
      case "today":
        return "Today";
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "all":
        return "All Upcoming";
      default:
        return "All Upcoming";
    }
  };

  const getPopularityCount = (event: EventWithPopularity): number => {
    return event.numRSVPs || event._count?.rsvps || 0;
  };

  const getSelectedBuildingName = (): string => {
    const building = buildings.find((b) => b.code === locationFilter);
    return building ? building.name : "";
  };

  const getSelectedTagName = (): string => {
    const tag = tags.find((t) => t.id.toString() === tagFilter);
    return tag ? tag.name : "";
  };

  const getAttendeeRangeLabel = (): string => {
    if (minAttendeesFilter === "all" && maxAttendeesFilter === "all") {
      return "";
    }
    if (minAttendeesFilter !== "all" && maxAttendeesFilter !== "all") {
      return ` with ${minAttendeesFilter}-${maxAttendeesFilter} attendees`;
    }
    if (minAttendeesFilter !== "all") {
      return ` with ${minAttendeesFilter}+ attendees`;
    }
    if (maxAttendeesFilter !== "all") {
      return ` with up to ${maxAttendeesFilter} attendees`;
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="mb-4 px-4 py-2 bg-surface hover:bg-background-lighter text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            Search Events
          </h1>
          <p className="text-text-muted">Find upcoming events on campus</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-muted"
              size={24}
            />
            <input
              type="text"
              placeholder="Search by event name, club name, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-32 py-4 bg-surface border border-border rounded-lg text-text-primary text-lg placeholder-text-muted focus:ring-2 focus:ring-border-focus focus:border-transparent"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
              {(searchQuery ||
                dateFilter !== "all" ||
                sortBy !== "date" ||
                locationFilter ||
                tagFilter ||
                minAttendeesFilter !== "all" ||
                maxAttendeesFilter !== "all") && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-background-lighter hover:bg-surface-light text-text-primary rounded-lg transition flex items-center gap-2"
                >
                  <X size={16} />
                  Clear
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2 bg-accent-dark hover:bg-accent text-text-primary rounded-lg font-semibold transition"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        {/* Filter and Sort Controls */}
        <div className="mb-8 space-y-4">
          {/* Date Filter Buttons */}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-text-muted text-sm font-medium">
                Filter by date:
              </span>
              <button
                onClick={() => setDateFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  dateFilter === "all"
                    ? "bg-accent-dark text-text-primary"
                    : "bg-surface text-text-secondary hover:bg-background-lighter"
                }`}
              >
                All Upcoming
              </button>
              <button
                onClick={() => setDateFilter("today")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  dateFilter === "today"
                    ? "bg-accent-dark text-text-primary"
                    : "bg-surface text-text-secondary hover:bg-background-lighter"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateFilter("week")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  dateFilter === "week"
                    ? "bg-accent-dark text-text-primary"
                    : "bg-surface text-text-secondary hover:bg-background-lighter"
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setDateFilter("month")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  dateFilter === "month"
                    ? "bg-accent-dark text-text-primary"
                    : "bg-surface text-text-secondary hover:bg-background-lighter"
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-text-muted text-sm font-medium">
                Sort by:
              </span>
              <button
                onClick={() => setSortBy("date")}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  sortBy === "date"
                    ? "bg-accent-dark text-text-primary"
                    : "bg-surface text-text-secondary hover:bg-background-lighter"
                }`}
              >
                <Calendar size={16} />
                Date
              </button>
              <button
                onClick={() => setSortBy("popular")}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  sortBy === "popular"
                    ? "bg-accent-dark text-text-primary"
                    : "bg-surface text-text-secondary hover:bg-background-lighter"
                }`}
              >
                <TrendingUp size={16} />
                Popular
              </button>
            </div>
          </div>

          {/* Location, Tag, and Attendee Filters */}
          <div className="grid md:grid-cols-4 gap-4">
            {/* Location Filter */}
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                <Building className="inline w-4 h-4 mr-1" />
                Location
              </label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-4 py-2 bg-surface text-text-secondary border border-border rounded-lg font-medium hover:bg-background-lighter focus:ring-2 focus:ring-border-focus focus:border-transparent transition"
              >
                <option value="">All Locations</option>
                {buildings.map((building) => (
                  <option key={building.code} value={building.code}>
                    {building.code} - {building.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tag Filter */}
            <div>
              <label className="block text-text-muted text-sm font-medium mb-2">
                <Tag className="inline w-4 h-4 mr-1" />
                Category
              </label>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full px-4 py-2 bg-surface text-text-tertiary border border-border-dark rounded-lg font-medium hover:bg-surface-light focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
              >
                <option value="">All Categories</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id.toString()}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Attendees Filter */}
            <div>
              <label className="block text-text-muted text-sm font-medium mb-2">
                <Users className="inline w-4 h-4 mr-1" />
                Min Attendees
              </label>
              <select
                value={minAttendeesFilter}
                onChange={(e) => setMinAttendeesFilter(e.target.value)}
                className="w-full px-4 py-2 bg-surface text-text-tertiary border border-border-dark rounded-lg font-medium hover:bg-surface-light focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
              >
                <option value="all">No minimum</option>
                <option value="10">10+</option>
                <option value="25">25+</option>
                <option value="50">50+</option>
                <option value="100">100+</option>
                <option value="200">200+</option>
              </select>
            </div>

            {/* Max Attendees Filter */}
            <div>
              <label className="block text-text-muted text-sm font-medium mb-2">
                <Users className="inline w-4 h-4 mr-1" />
                Max Attendees
              </label>
              <select
                value={maxAttendeesFilter}
                onChange={(e) => setMaxAttendeesFilter(e.target.value)}
                className="w-full px-4 py-2 bg-surface text-text-tertiary border border-border-dark rounded-lg font-medium hover:bg-surface-light focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
              >
                <option value="all">No maximum</option>
                <option value="25">Up to 25</option>
                <option value="50">Up to 50</option>
                <option value="100">Up to 100</option>
                <option value="200">Up to 200</option>
                <option value="500">Up to 500</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mb-4"></div>
            <p className="text-text-muted">Searching events...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-6 text-center">
            <p className="text-red-400 text-lg">Error: {error}</p>
            <button
              onClick={fetchEvents}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg"
            >
              Try Again
            </button>
          </div>
        )}

        {/* No Results State */}
        {!isLoading && !error && hasSearched && events.length === 0 && (
          <div className="bg-surface border border-border rounded-lg p-12 text-center">
            <Calendar className="w-16 h-16 text-surface-lighter mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              No events found
            </h3>
            <p className="text-text-muted mb-4">
              No events match your current filters
              {searchQuery && ` for "${searchQuery}"`}
              {dateFilter !== "all" &&
                ` in ${getDateFilterLabel(dateFilter).toLowerCase()}`}
              {locationFilter && ` at ${getSelectedBuildingName()}`}
              {tagFilter && ` in category "${getSelectedTagName()}"`}
              {getAttendeeRangeLabel()}
            </p>
            <button
              onClick={handleClearFilters}
              className="px-6 py-2 bg-accent-dark hover:bg-accent text-text-primary rounded-lg font-semibold"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && events.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-text-muted">
                <span>
                  Found {events.length} event{events.length !== 1 ? "s" : ""}
                  {searchQuery && ` for "${searchQuery}"`}
                  {dateFilter !== "all" &&
                    ` in ${getDateFilterLabel(dateFilter).toLowerCase()}`}
                  {locationFilter && ` at ${getSelectedBuildingName()}`}
                  {tagFilter && ` in category "${getSelectedTagName()}"`}
                  {getAttendeeRangeLabel()}
                  {sortBy === "popular" && " sorted by popularity"}
                </span>
              </div>
              {(searchQuery ||
                dateFilter !== "all" ||
                sortBy !== "date" ||
                locationFilter ||
                tagFilter ||
                minAttendeesFilter !== "all" ||
                maxAttendeesFilter !== "all") && (
                <button
                  onClick={handleClearFilters}
                  className="text-accent hover:text-accent-light text-sm flex items-center gap-1"
                >
                  <X size={16} />
                  Clear all filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-surface rounded-lg border border-border overflow-hidden hover:border-border-focus transition cursor-pointer"
                  onClick={() => navigate(`/event/${event.id}`)}
                >
                  {/* Event Header */}
                  <div className="bg-gradient-to-r from-accent-dark to-primary-400 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-text-primary">
                          {formatEventName(event)}
                        </h3>
                        {event.club && (
                          <p className="text-accent-light text-sm mt-1">
                            Hosted by {event.club.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                        <UserCheck size={16} className="text-text-primary" />
                        <span className="text-text-primary font-semibold text-sm">
                          {getPopularityCount(event)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Calendar size={18} className="text-accent-light" />
                      <span className="text-sm">
                        {formatDate(event.startTime)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-text-secondary">
                      <Clock size={18} className="text-accent-light" />
                      <span className="text-sm">
                        {formatTime(event.startTime)} -{" "}
                        {formatTime(event.endTime)}
                      </span>
                    </div>

                    {event.room && (
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Building size={18} className="text-accent-light" />
                        <span className="text-sm">
                          {event.room.buildingCode} {event.room.roomNum}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-text-secondary">
                      <Users size={18} className="text-accent-light" />
                      <span className="text-sm">
                        {getPopularityCount(event)}{" "}
                        {getPopularityCount(event) === 1 ? "RSVP" : "RSVPs"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-text-tertiary">
                      <Heart className="w-5 h-5 text-accent-dark" />
                      <span className="text-sm">
                        {likes[event.id] ?? 0}{" "}
                        {likes[event.id] === 1 ? "Like" : "Likes"}
                      </span>
                    </div>

                    {/* Event Tags */}
                    {event.tags && event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {event.tags.map((eventTag) => (
                          <span
                            key={eventTag.tag.id}
                            className="px-2 py-1 bg-accent-dark/20 text-accent-light text-xs rounded-full border border-accent-dark/30"
                          >
                            {eventTag.tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EventSearch;
