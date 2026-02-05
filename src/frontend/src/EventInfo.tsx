import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Tag,
  Building,
  Mail,
  Phone,
  Globe,
  Heart,
  Check,
} from "lucide-react";

interface Attendee {
  id: number;
  name: string;
  avatar?: string;
  role?: string;
}

interface ClubInfo {
  id: number;
  name: string;
  description: string;
  logo?: string;
  email: string;
  website?: string;
  memberCount: number;
}

interface EventDetails {
  id: number;
  name: string;
  description: string;
  date: string;
  time: string;
  building: string;
  rooms: string[];
  categories: string[];
  imageUrl: string;
  attendeeCount: number;
  maxAttendees?: number;
}

// Placeholder data
const PLACEHOLDER_EVENT: EventDetails = {
  id: 1,
  name: "Tech Conference 2025: AI & Innovation",
  description:
    "Join us for an exciting day of exploring the latest in artificial intelligence and innovation. This conference brings together industry leaders, researchers, and enthusiasts to discuss cutting-edge developments in AI technology. We'll have keynote speakers, panel discussions, hands-on workshops, and networking opportunities. Whether you're a beginner or an expert, there's something for everyone. Don't miss this chance to learn, connect, and be inspired by the future of technology!",
  date: "November 15, 2025",
  time: "9:00 AM - 5:00 PM",
  building: "Engineering Hall",
  rooms: ["Room 101", "Room 205", "Auditorium A"],
  categories: ["Technology", "AI", "Innovation", "Networking"],
  imageUrl:
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop",
  attendeeCount: 127,
  maxAttendees: 200,
};

const PLACEHOLDER_CLUB: ClubInfo = {
  id: 1,
  name: "Computer Science Club",
  description:
    "A community of students passionate about technology, programming, and innovation. We host workshops, hackathons, and networking events throughout the year.",
  logo: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=100&h=100&fit=crop",
  email: "csclub@university.edu",
  website: "https://csclub.university.edu",
  memberCount: 350,
};

const PLACEHOLDER_ATTENDEES: Attendee[] = [
  { id: 1, name: "Alice Johnson", role: "Organizer" },
  { id: 2, name: "Bob Smith", role: "Speaker" },
  { id: 3, name: "Carol Williams", role: "Attendee" },
  { id: 4, name: "David Brown", role: "Attendee" },
  { id: 5, name: "Emily Davis", role: "Volunteer" },
  { id: 6, name: "Frank Miller", role: "Attendee" },
  { id: 7, name: "Grace Wilson", role: "Attendee" },
  { id: 8, name: "Henry Moore", role: "Attendee" },
  { id: 9, name: "Isabel Taylor", role: "Speaker" },
  { id: 10, name: "Jack Anderson", role: "Attendee" },
];

export default function EventDetailsPage() {
  const [event] = useState<EventDetails>(PLACEHOLDER_EVENT);
  const [club] = useState<ClubInfo>(PLACEHOLDER_CLUB);
  const [attendees] = useState<Attendee[]>(PLACEHOLDER_ATTENDEES);
  const [isRSVPed, setIsRSVPed] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRSVP = async () => {
    setLoading(true);
    try {
      // Get token from localStorage
      const token = localStorage.getItem("token");

      console.log("Token from localStorage:", token ? "exists" : "missing");
      console.log("Token length:", token?.length);
      console.log("First 20 chars:", token?.substring(0, 20));

      if (!token) {
        alert("Please log in to RSVP");
        setLoading(false);
        return;
      }

      const response = await fetch("http://localhost:3000/api/rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event: event,
          club: club,
        }),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error("Failed to RSVP");
      }

      const data = await response.json();
      setIsRSVPed(!isRSVPed);
    } catch (error) {
      console.error("Error submitting RSVP:", error);
      alert("Failed to submit RSVP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInterest = () => {
    setLoading(true);
    setTimeout(() => {
      setIsInterested(!isInterested);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark">
          <div className="bg-gradient-to-r from-accent-dark to-accent text-white p-6">
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-text-secondary">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>{event.attendeeCount} attending</span>
              </div>
              {event.maxAttendees && (
                <span className="text-sm">/ {event.maxAttendees} max</span>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Image */}
            <div className="bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark">
              <img
                src={event.imageUrl}
                alt={event.name}
                className="w-full h-64 object-cover"
              />
            </div>

            {/* Event Info */}
            <div className="bg-surface rounded-lg shadow-2xl border border-border-dark p-6 space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">
                Event Details
              </h2>

              {/* Date & Time */}
              <div className="flex items-start gap-3 p-4 bg-surface-light rounded-lg border border-border-light">
                <Calendar className="w-6 h-6 text-accent-light mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-text-secondary mb-1">
                    Date & Time
                  </h3>
                  <p className="text-text-tertiary">{event.date}</p>
                  <p className="text-text-tertiary flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4" />
                    {event.time}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3 p-4 bg-surface-light rounded-lg border border-border-light">
                <MapPin className="w-6 h-6 text-accent-light mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-text-secondary mb-1">
                    Location
                  </h3>
                  <p className="text-text-tertiary mb-2">{event.building}</p>
                  {event.rooms.length > 0 && (
                    <div>
                      <p className="text-sm text-text-muted mb-1">
                        Rooms Booked:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {event.rooms.map((room, idx) => (
                          <span
                            key={idx}
                            className="bg-surface-light text-text-secondary px-3 py-1 rounded text-sm"
                          >
                            {room}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Categories */}
              <div className="flex items-start gap-3 p-4 bg-surface-light rounded-lg border border-border-light">
                <Tag className="w-6 h-6 text-accent-light mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-text-secondary mb-2">
                    Categories
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {event.categories.map((category, idx) => (
                      <span
                        key={idx}
                        className="bg-accent-dark text-white px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="p-4 bg-surface-light rounded-lg border border-border-light">
                <h3 className="font-semibold text-text-secondary mb-2">
                  Description
                </h3>
                <p className="text-text-tertiary leading-relaxed">
                  {event.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleRSVP}
                  disabled={loading}
                  className={`flex-1 ${
                    isRSVPed
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gradient-to-r from-accent-dark to-accent hover:from-accent hover:to-accent-light"
                  } text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
                >
                  {isRSVPed ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Calendar className="w-5 h-5" />
                  )}
                  {isRSVPed ? "RSVP Confirmed" : "RSVP to Event"}
                </button>
                <button
                  onClick={handleInterest}
                  disabled={loading}
                  className={`flex-1 ${
                    isInterested
                      ? "bg-pink-600 hover:bg-pink-700"
                      : "bg-surface-light hover:bg-surface-lighter"
                  } text-white font-semibold py-3 px-6 rounded-lg border border-border-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  <Heart
                    className={`w-5 h-5 ${isInterested ? "fill-current" : ""}`}
                  />
                  {isInterested ? "Interest Registered" : "Register Interest"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Hosting Club */}
            <div className="bg-surface rounded-lg shadow-2xl border border-border-dark p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Building className="w-6 h-6 text-accent-light" />
                Hosted By
              </h2>

              <div className="space-y-4">
                {club.logo && (
                  <div className="flex justify-center">
                    <img
                      src={club.logo}
                      alt={club.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-accent-dark"
                    />
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white">
                    {club.name}
                  </h3>
                  <p className="text-sm text-text-muted mt-1">
                    {club.memberCount} members
                  </p>
                </div>

                <p className="text-text-tertiary text-sm">{club.description}</p>

                <div className="space-y-2 pt-2 border-t border-border-dark">
                  <a
                    href={`mailto:${club.email}`}
                    className="flex items-center gap-2 text-accent-light hover:text-accent-lighter transition-colors text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    {club.email}
                  </a>
                  {club.website && (
                    <a
                      href={club.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-accent-light hover:text-accent-lighter transition-colors text-sm"
                    >
                      <Globe className="w-4 h-4" />
                      Visit Website
                    </a>
                  )}
                </div>

                <button className="w-full bg-surface-light hover:bg-surface-lighter text-white font-semibold py-2 px-4 rounded-lg border border-border-light transition-colors text-sm">
                  View Club Profile
                </button>
              </div>
            </div>

            {/* Attendees List */}
            <div className="bg-surface rounded-lg shadow-2xl border border-border-dark p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-accent-light" />
                Attendees ({attendees.length})
              </h2>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {attendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className="flex items-center gap-3 p-3 bg-surface-light rounded-lg border border-border-light hover:bg-surface-lighter transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-dark to-accent flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {attendee.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">
                        {attendee.name}
                      </div>
                      {attendee.role && (
                        <div className="text-xs text-accent-light">
                          {attendee.role}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
