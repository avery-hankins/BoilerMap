import { API_URL } from "./config";
import React, { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Building2,
} from "lucide-react";

interface Booking {
  id: string;
  club: { name: string };
  approvalStatus: string;
  description: string;
  startTime: string;
  room: { buildingCode: string; roomNum: string };
  expectedAttendance: number;
  // Add other properties if they are used and known
}

export default function BookingManagement({
  setView,
}: {
  setView?: (view: string) => void;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch bookings from API
  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${API_URL}/api/room-booking-requests`,
        );
        const data = await response.json();
        console.log(data);
        setBookings(data);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const handleApprove = async (id: string) => {
    const booking = bookings.find((b) => b.id === id);

    const confirmed = window.confirm(
      `Approve booking for "${booking?.club.name}"?`,
    );

    if (confirmed) {
      try {
        await fetch(
          `${API_URL}/api/room-booking-requests/${id}/approve`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
          },
        );

        setBookings(
          bookings.map((b) =>
            b.id === id ? { ...b, approvalStatus: "APPROVED" } : b,
          ),
        );
        alert("Booking approved! Confirmation email sent to club.");
      } catch (error) {
        console.error("Error approving booking:", error);
        alert("Error approving booking. Please try again.");
      }
    }
  };

  const handleDeny = async (id: string) => {
    const booking = bookings.find((b) => b.id === id);
    const reason = prompt(
      `Deny booking for "${booking?.club.name}"?\n\nPlease provide a reason (will be sent to club):`,
    );

    if (reason) {
      try {
        await fetch(
          `${API_URL}/api/room-booking-requests/${id}/deny`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
          },
        );

        setBookings(
          bookings.map((b) =>
            b.id === id ? { ...b, approvalStatus: "DENIED" } : b,
          ),
        );
        alert("Booking denied. Notification sent to club.");
      } catch (error) {
        console.error("Error denying booking:", error);
        alert("Error denying booking. Please try again.");
      }
    }
  };

  const pendingCount = bookings.filter(
    (b) => b.approvalStatus === "PENDING",
  ).length;

  const handleBackClick = () => {
    if (setView) {
      setView("dashboard");
    } else {
      // If no setView prop, navigate to admin portal
      window.location.href = "/admin";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-light mx-auto mb-4"></div>
          <p className="text-text-muted">Loading booking requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={handleBackClick}
          className="mb-4 px-4 py-2 bg-surface-light hover:bg-surface-lighter text-text-secondary rounded-lg transition"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark mb-6">
          <div className="bg-gradient-to-r from-accent-dark to-accent text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="w-8 h-8" />
                <div>
                  <h1 className="text-3xl font-bold">Room Booking Requests</h1>
                  <p className="text-text-secondary mt-1">
                    Review and manage booking requests
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-text-secondary text-sm">Pending Requests</p>
                <p className="text-3xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {bookings.filter((b) => b.approvalStatus === "PENDING").length ===
          0 ? (
            <div className="bg-surface border border-border-dark rounded-lg p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-secondary mb-2">
                All Caught Up!
              </h3>
              <p className="text-text-muted">
                No pending booking requests at this time.
              </p>
            </div>
          ) : (
            bookings
              .filter((b) => b.approvalStatus === "PENDING")
              .map((booking) => (
                <div
                  key={booking.id}
                  className="bg-surface border border-border-dark rounded-lg shadow-xl overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-text-secondary">
                          {booking.description}
                        </h3>
                        <p className="text-accent-light font-semibold mt-1">
                          {booking.club.name}
                        </p>
                        <p className="text-accent-light font-semibold mt-1">
                          {booking.room.buildingCode} {booking.room.roomNum}
                        </p>
                      </div>
                      <div className="px-3 py-1 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-full">
                        <span className="text-yellow-400 text-sm font-semibold">
                          Pending Review
                        </span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-3 p-3 bg-surface-light rounded-lg">
                        <Calendar className="w-5 h-5 text-accent-light" />
                        <div>
                          <p className="text-text-muted text-xs">Date</p>
                          <p className="text-text-secondary font-semibold">
                            {new Date(booking.startTime).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-surface-light rounded-lg">
                        <Clock className="w-5 h-5 text-accent-light" />
                        <div>
                          <p className="text-text-muted text-xs">Time</p>
                          <p className="text-text-secondary font-semibold">
                            {booking.startTime}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-surface-light rounded-lg">
                        <Users className="w-5 h-5 text-accent-light" />
                        <div>
                          <p className="text-text-muted text-xs">
                            Expected Attendees
                          </p>
                          <p className="text-text-secondary font-semibold">
                            {booking.expectedAttendance} people
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-surface-light rounded-lg">
                        <Building2 className="w-5 h-5 text-accent-light" />
                        <div>
                          <p className="text-text-muted text-xs">Room</p>
                          <p className="text-text-secondary font-semibold">
                            {booking.room.buildingCode} {booking.room.roomNum}
                          </p>
                        </div>
                      </div>
                    </div>

                    {booking.description && (
                      <div className="mb-4 p-3 bg-surface-light rounded-lg border-l-4 border-accent">
                        <p className="text-text-muted text-xs mb-1">
                          Additional Information
                        </p>
                        <p className="text-text-tertiary">
                          {booking.description}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-border-dark">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleDeny(booking.id)}
                          className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition flex items-center space-x-2"
                        >
                          <XCircle className="w-5 h-5" />
                          <span>Deny</span>
                        </button>
                        <button
                          onClick={() => handleApprove(booking.id)}
                          className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition flex items-center space-x-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Recently Processed Section */}
        {bookings.filter((b) => b.approvalStatus !== "PENDING").length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-text-secondary mb-4">
              Recently Processed
            </h2>
            <div className="space-y-3">
              {bookings
                .filter((b) => b.approvalStatus !== "PENDING")
                .map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-surface border border-border-dark rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      {booking.approvalStatus === "APPROVED" ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400" />
                      )}
                      <div>
                        <p className="text-text-secondary font-semibold">
                          {booking.description}
                        </p>
                        <p className="text-text-muted text-sm">
                          {booking.club.name} •{" "}
                          {new Date(booking.startTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        booking.approvalStatus === "APPROVED"
                          ? "bg-green-900 bg-opacity-30 border border-green-600 text-green-400"
                          : "bg-red-900 bg-opacity-30 border border-red-600 text-red-400"
                      }`}
                    >
                      {booking.approvalStatus === "APPROVED"
                        ? "Approved"
                        : "Denied"}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
