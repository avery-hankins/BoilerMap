import React, { useState, useEffect } from "react";
import {
  Building2,
  CheckCircle,
  XCircle,
  User,
  Mail,
  FileText,
  Calendar,
} from "lucide-react";

interface ClubRegistration {
  id: number;
  clubName: string;
  clubDescription: string | null;
  status: "PENDING" | "APPROVED" | "NOTAPPROVED";
  createdAt: string;
  userId: number;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
  };
}

export default function ClubApprovalManagement({
  setView,
}: {
  setView?: (view: string) => void;
}) {
  const [registrations, setRegistrations] = useState<ClubRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch registrations from API
  useEffect(() => {
    const fetchRegistrations = async () => {
      setIsLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication required");
        }

        const response = await fetch(
          "http://localhost:3000/api/club-registrations",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch registrations");
        }

        const data = await response.json();
        setRegistrations(data);
      } catch (err: unknown) {
        console.error("Error fetching club registrations:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load registrations",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegistrations();
  }, []);

  const handleApprove = async (id: number) => {
    const registration = registrations.find((r) => r.id === id);
    const confirmed = confirm(
      `Approve club registration for "${registration?.clubName}"?`,
    );

    if (confirmed) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:3000/api/club-registrations/${id}/approve`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to approve registration");
        }

        setRegistrations(
          registrations.map((r) =>
            r.id === id ? { ...r, status: "APPROVED" as const } : r,
          ),
        );
        alert(
          "Club registration approved! Notification email sent to requester.",
        );
      } catch (err: unknown) {
        console.error("Error approving registration:", err);
        alert(
          err instanceof Error
            ? err.message
            : "Error approving registration. Please try again.",
        );
      }
    }
  };

  const handleDeny = async (id: number) => {
    const registration = registrations.find((r) => r.id === id);
    const confirmed = confirm(
      `Deny club registration for "${registration?.clubName}"?`,
    );

    if (confirmed) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:3000/api/club-registrations/${id}/deny`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to deny registration");
        }

        setRegistrations(
          registrations.map((r) =>
            r.id === id ? { ...r, status: "NOTAPPROVED" as const } : r,
          ),
        );
        alert("Club registration denied. Notification sent to requester.");
      } catch (err: unknown) {
        console.error("Error denying registration:", err);
        alert(
          err instanceof Error
            ? err.message
            : "Error denying registration. Please try again.",
        );
      }
    }
  };

  const pendingCount = registrations.filter(
    (r) => r.status === "PENDING",
  ).length;

  const handleBackClick = () => {
    if (setView) {
      setView("dashboard");
    } else {
      window.location.href = "/admin";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-light mx-auto mb-4"></div>
          <p className="text-text-muted">
            Loading club registration requests...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark p-6 flex items-center justify-center">
        <div className="max-w-lg w-full bg-surface rounded-lg shadow-2xl border border-border-dark p-8 text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-secondary mb-4">Error</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={handleBackClick}
            className="px-6 py-3 bg-surface-light hover:bg-surface-lighter text-text-secondary rounded-lg transition"
          >
            ← Back to Dashboard
          </button>
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
                <Building2 className="w-8 h-8" />
                <div>
                  <h1 className="text-3xl font-bold">
                    Club Registration Requests
                  </h1>
                  <p className="text-text-secondary mt-1">
                    Review and approve new club registrations
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

        {/* Registrations List */}
        <div className="space-y-4">
          {registrations.filter((r) => r.status === "PENDING").length === 0 ? (
            <div className="bg-surface border border-border-dark rounded-lg p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-secondary mb-2">
                All Caught Up!
              </h3>
              <p className="text-text-muted">
                No pending club registration requests at this time.
              </p>
            </div>
          ) : (
            registrations
              .filter((r) => r.status === "PENDING")
              .map((registration) => (
                <div
                  key={registration.id}
                  className="bg-surface border border-border-dark rounded-lg shadow-xl overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-text-secondary">
                          {registration.clubName}
                        </h3>
                        <p className="text-text-muted text-sm mt-1">
                          Submitted{" "}
                          {new Date(registration.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                      <div className="px-3 py-1 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-full">
                        <span className="text-yellow-400 text-sm font-semibold">
                          Pending Review
                        </span>
                      </div>
                    </div>

                    {/* Club Description */}
                    {registration.clubDescription && (
                      <div className="mb-4 p-4 bg-surface-light rounded-lg border-l-4 border-accent">
                        <div className="flex items-start space-x-3">
                          <FileText className="w-5 h-5 text-accent-light flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-text-muted text-xs mb-1">
                              Club Description
                            </p>
                            <p className="text-text-tertiary">
                              {registration.clubDescription}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      {/* Submission Date */}
                      <div className="flex items-center space-x-3 p-3 bg-surface-light rounded-lg">
                        <Calendar className="w-5 h-5 text-accent-light" />
                        <div>
                          <p className="text-text-muted text-xs">Submitted</p>
                          <p className="text-text-secondary font-semibold">
                            {new Date(
                              registration.createdAt,
                            ).toLocaleDateString("en-US", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Requester */}
                      <div className="flex items-center space-x-3 p-3 bg-surface-light rounded-lg">
                        <User className="w-5 h-5 text-accent-light" />
                        <div>
                          <p className="text-text-muted text-xs">
                            Requested By
                          </p>
                          <p className="text-text-secondary font-semibold">
                            {registration.user.firstName}{" "}
                            {registration.user.lastName}
                          </p>
                        </div>
                      </div>

                      {/* Requester Email */}
                      <div className="flex items-center space-x-3 p-3 bg-surface-light rounded-lg">
                        <Mail className="w-5 h-5 text-accent-light" />
                        <div>
                          <p className="text-text-muted text-xs">
                            Requester Email
                          </p>
                          <p className="text-text-secondary font-semibold">
                            {registration.user.email}
                          </p>
                        </div>
                      </div>

                      {/* Requester Username */}
                      <div className="flex items-center space-x-3 p-3 bg-surface-light rounded-lg">
                        <User className="w-5 h-5 text-accent-light" />
                        <div>
                          <p className="text-text-muted text-xs">Username</p>
                          <p className="text-text-secondary font-semibold">
                            @{registration.user.username}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border-dark">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleDeny(registration.id)}
                          className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition flex items-center space-x-2"
                        >
                          <XCircle className="w-5 h-5" />
                          <span>Deny</span>
                        </button>
                        <button
                          onClick={() => handleApprove(registration.id)}
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
        {registrations.filter((r) => r.status !== "PENDING").length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-text-secondary mb-4">
              Recently Processed
            </h2>
            <div className="space-y-3">
              {registrations
                .filter((r) => r.status !== "PENDING")
                .map((registration) => (
                  <div
                    key={registration.id}
                    className="bg-surface border border-border-dark rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      {registration.status === "APPROVED" ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400" />
                      )}
                      <div>
                        <p className="text-text-secondary font-semibold">
                          {registration.clubName}
                        </p>
                        <p className="text-text-muted text-sm">
                          {registration.user.firstName}{" "}
                          {registration.user.lastName} •{" "}
                          {new Date(
                            registration.createdAt,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        registration.status === "APPROVED"
                          ? "bg-green-900 bg-opacity-30 border border-green-600 text-green-400"
                          : "bg-red-900 bg-opacity-30 border border-red-600 text-red-400"
                      }`}
                    >
                      {registration.status === "APPROVED"
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
