import React, { useState, useEffect } from "react";
import { MailX, Mail, CheckCircle, XCircle } from "lucide-react";

export default function EmailUnsubscribe() {
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string>("");
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "idle"
  >("idle");
  const [message, setMessage] = useState<string>("");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(true);

  useEffect(() => {
    // Get clubId from URL params
    const params = new URLSearchParams(window.location.search);
    const id = params.get("clubId");
    setClubId(id);

    if (id) {
      // Fetch club information
      fetchClubInfo(id);
      // Check subscription status
      checkSubscriptionStatus(id);
    }
  }, []);

  const fetchClubInfo = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/clubs/${id}`);
      if (response.ok) {
        const data = await response.json();
        setClubName(data.name);
      }
    } catch (error) {
      console.error("Error fetching club info:", error);
    }
  };

  const checkSubscriptionStatus = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      return; // User not logged in, can't check status
    }

    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const response = await fetch(`http://localhost:3000/api/clubs/${id}`);
      if (response.ok) {
        const data = await response.json();
        const membership = data.memberships?.find(
          (m: any) => m.userId === userId,
        );
        if (membership) {
          setIsSubscribed(!membership.emailUnsubscribed);
        }
      }
    } catch (error) {
      console.error("Error checking subscription status:", error);
    }
  };

  const getCurrentUserId = (): number | null => {
    try {
      const userString = localStorage.getItem("user");
      if (!userString) return null;
      const user = JSON.parse(userString);
      return user.id;
    } catch (error) {
      return null;
    }
  };

  const handleUnsubscribe = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setStatus("error");
      setMessage("You must be logged in to unsubscribe from emails.");
      return;
    }

    if (!clubId) {
      setStatus("error");
      setMessage("Invalid club ID.");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch(
        "http://localhost:3000/api/email-unsubscribe",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ clubId: parseInt(clubId) }),
        },
      );

      if (response.ok) {
        setStatus("success");
        setMessage(
          `You have successfully unsubscribed from emails from ${clubName || "this club"}.`,
        );
        setIsSubscribed(false);
      } else {
        const data = await response.json();
        setStatus("error");
        setMessage(data.error || "Failed to unsubscribe.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred while unsubscribing.");
      console.error("Error unsubscribing:", error);
    }
  };

  const handleResubscribe = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setStatus("error");
      setMessage("You must be logged in to resubscribe to emails.");
      return;
    }

    if (!clubId) {
      setStatus("error");
      setMessage("Invalid club ID.");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch(
        "http://localhost:3000/api/email-resubscribe",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ clubId: parseInt(clubId) }),
        },
      );

      if (response.ok) {
        setStatus("success");
        setMessage(
          `You have successfully resubscribed to emails from ${clubName || "this club"}.`,
        );
        setIsSubscribed(true);
      } else {
        const data = await response.json();
        setStatus("error");
        setMessage(data.error || "Failed to resubscribe.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred while resubscribing.");
      console.error("Error resubscribing:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark p-6 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6">
          <div className="flex items-center space-x-3">
            {isSubscribed ? (
              <MailX className="w-8 h-8" />
            ) : (
              <Mail className="w-8 h-8" />
            )}
            <div>
              <h1 className="text-3xl font-bold">Email Preferences</h1>
              <p className="text-primary-50 mt-1">
                {clubName || "Manage your email subscription"}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!clubId && (
            <div className="p-4 bg-red-900 bg-opacity-30 border border-red-600 rounded-lg">
              <div className="flex items-start space-x-3">
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-200 mb-1">
                    Invalid Link
                  </h3>
                  <p className="text-red-300 text-sm">
                    This unsubscribe link is invalid or expired.
                  </p>
                </div>
              </div>
            </div>
          )}

          {clubId && status === "idle" && (
            <>
              <div className="p-4 bg-surface-light border border-surface-lighter rounded-lg">
                <h2 className="text-text-secondary font-semibold mb-2">
                  {clubName || "Club"} Email Notifications
                </h2>
                <p className="text-text-tertiary text-sm">
                  {isSubscribed
                    ? "You are currently subscribed to email notifications from this club."
                    : "You have unsubscribed from email notifications from this club."}
                </p>
                <p className="text-text-tertiary text-sm mt-2">
                  {isSubscribed
                    ? "Click the button below to stop receiving blast emails from this club. You will remain a member of the club."
                    : "Click the button below to start receiving blast emails from this club again."}
                </p>
              </div>

              {isSubscribed ? (
                <button
                  onClick={handleUnsubscribe}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-800 hover:from-primary-500 hover:to-primary-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <MailX className="w-5 h-5" />
                  <span>Unsubscribe from Emails</span>
                </button>
              ) : (
                <button
                  onClick={handleResubscribe}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-800 hover:from-primary-500 hover:to-primary-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <Mail className="w-5 h-5" />
                  <span>Resubscribe to Emails</span>
                </button>
              )}
            </>
          )}

          {status === "loading" && (
            <div className="p-4 bg-surface-light border border-surface-lighter rounded-lg text-center">
              <p className="text-text-tertiary">Processing your request...</p>
            </div>
          )}

          {status === "success" && (
            <div className="p-4 bg-green-900 bg-opacity-30 border border-green-600 rounded-lg">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-200 mb-1">Success</h3>
                  <p className="text-green-300 text-sm">{message}</p>
                </div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="p-4 bg-red-900 bg-opacity-30 border border-red-600 rounded-lg">
              <div className="flex items-start space-x-3">
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-200 mb-1">Error</h3>
                  <p className="text-red-300 text-sm">{message}</p>
                </div>
              </div>
            </div>
          )}

          {status !== "idle" && (
            <button
              onClick={() => (window.location.href = "/")}
              className="w-full bg-surface-light hover:bg-surface-lighter text-text-secondary font-semibold py-3 px-6 rounded-lg transition"
            >
              Return to Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
