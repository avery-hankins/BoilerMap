import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, TrendingUp, ArrowUpDown } from "lucide-react";

interface ClubsListClub {
  id: string;
  name: string;
  description?: string;
  followerCount?: number;
  _count?: {
    memberships: number;
    events: number;
    follows: number;
  };
}

type SortOption = "alphabetical" | "trending";

export default function ClubsList() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<ClubsListClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("alphabetical");
  const [error, setError] = useState<string | null>(null);

  // Fetch clubs when component mounts or sort changes
  useEffect(() => {
    fetchClubs();
  }, [sortBy]);

  const fetchClubs = async () => {
    try {
      setIsLoading(true);
      const url =
        sortBy === "trending"
          ? "http://localhost:3000/api/clubs?sortBy=trending"
          : "http://localhost:3000/api/clubs";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch clubs");
      }

      const data: ClubsListClub[] = await response.json();
      console.log("Clubs data:", data);
      setClubs(data);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching clubs:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

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

  const getFollowerCount = (club: ClubsListClub): number => {
    return club.followerCount ?? club._count?.follows ?? 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark flex items-center justify-center">
        <div className="text-text-primary text-xl">Loading clubs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Error: {error}</div>
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
    <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            Student Clubs
          </h1>
          <p className="text-text-muted">
            Discover and join clubs that match your interests
          </p>
        </div>

        {/* Search Bar and Sort Controls */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
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
              className="w-full pl-12 pr-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:ring-2 focus:ring-border-focus focus:border-transparent"
            />
          </div>

          {/* Sort Buttons */}
          <div className="flex items-center gap-3">
            <span className="text-text-muted text-sm font-medium">
              Sort by:
            </span>
            <button
              onClick={() => setSortBy("alphabetical")}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                sortBy === "alphabetical"
                  ? "bg-accent-dark text-white"
                  : "bg-surface border border-border text-text-muted hover:bg-surface-dark"
              }`}
            >
              <ArrowUpDown size={16} />
              Alphabetical
            </button>
            <button
              onClick={() => setSortBy("trending")}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                sortBy === "trending"
                  ? "bg-accent-dark text-white"
                  : "bg-surface border border-border text-text-muted hover:bg-surface-dark"
              }`}
            >
              <TrendingUp size={16} />
              Trending
            </button>
          </div>
        </div>

        {/* Results Summary */}
        {filteredClubs.length > 0 && (
          <div className="mb-4 text-text-muted">
            Showing {filteredClubs.length} club
            {filteredClubs.length !== 1 ? "s" : ""}
            {searchTerm && ` matching "${searchTerm}"`}
            {sortBy === "trending" && " sorted by followers"}
          </div>
        )}

        {/* Clubs Grid */}
        {filteredClubs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-muted text-lg">
              {searchTerm
                ? `No clubs found matching "${searchTerm}".`
                : "No clubs found."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club) => (
              <div
                key={club.id}
                onClick={() => handleClubClick(club.id)}
                className="bg-surface rounded-lg shadow-lg overflow-hidden border border-border cursor-pointer transition-transform hover:scale-105"
              >
                {/* Club Header */}
                <div className="bg-gradient-to-r from-accent-dark to-primary-400 h-24 flex items-center justify-center relative">
                  <div className="w-16 h-16 bg-white rounded-lg shadow-lg flex items-center justify-center text-3xl font-bold text-accent-dark">
                    {club.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Follower Badge */}
                  {sortBy === "trending" && (
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                      <Users size={14} className="text-accent-dark" />
                      <span className="text-accent-dark font-semibold text-sm">
                        {getFollowerCount(club)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Club Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-text-primary mb-2 hover:text-accent-light transition">
                    {club.name}
                  </h3>

                  <p className="text-text-muted text-sm mb-4 line-clamp-3">
                    {club.description || "No description available."}
                  </p>

                  <div className="flex items-center justify-between text-sm text-text-disabled">
                    <span className="flex items-center gap-1">
                      <Users size={16} />
                      {getFollowerCount(club)}{" "}
                      {getFollowerCount(club) === 1 ? "Follower" : "Followers"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
