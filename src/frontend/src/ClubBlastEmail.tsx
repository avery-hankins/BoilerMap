import { API_URL } from "./config";
import React, { useState, useEffect } from "react";
import { Mail, Users, Send, AlertCircle } from "lucide-react";

interface Club {
  id: number;
  name: string;
  memberCount?: number;
}

export default function ClubBlastEmailUI({
  setView,
}: {
  setView?: (view: string) => void;
}) {
  const [emailData, setEmailData] = useState({
    clubId: "",
    subject: "",
    body: "",
  });

  const [isSending, setIsSending] = useState(false);
  const [clubData, setClubData] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCurrentUserId = (): number | null => {
    try {
      const userString = localStorage.getItem("user");
      if (!userString) {
        return null;
      }

      const user = JSON.parse(userString);
      return user.id;
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
      return null;
    }
  };

  // Fetch clubs where user is an admin
  useEffect(() => {
    async function loadClubs() {
      try {
        setLoading(true);
        setError(null);

        const userId = getCurrentUserId();
        console.log("User ID from storage:", userId);

        if (!userId) {
          setError("No user ID found in storage");
          setLoading(false);
          return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
          setError("No authentication token found");
          setLoading(false);
          return;
        }

        // Fetch user's club admin roles
        const url = `${API_URL}/api/users/${userId}/roles`;
        console.log("Fetching clubs from:", url);

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Clubs data received:", data);

        // Filter for clubs where user is admin
        const adminClubs = data.roles
          .filter((role: any) => role.role === "admin")
          .map((role: any) => ({
            id: role.clubId,
            name: role.clubName,
          }));

        console.log("Admin clubs:", adminClubs);
        setClubData(adminClubs);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching clubs:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load clubs",
        );
        setLoading(false);
      }
    }

    loadClubs();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setEmailData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSend = () => {
    // Validation
    if (!emailData.subject.trim()) {
      alert("Please enter an email subject");
      return;
    }
    if (!emailData.body.trim()) {
      alert("Please enter an email body");
      return;
    }
    if (!emailData.clubId || emailData.clubId === "") {
      alert("Please select a club");
      return;
    }

    const selectedClub = clubData.find(
      (c) => c.id === parseInt(emailData.clubId),
    );
    const recipientText = `all members of ${selectedClub?.name || "selected club"}`;

    // Confirm before sending
    const confirmed = window.confirm(
      `Are you sure you want to send this email to ${recipientText}?\n\nOfficers will be CC'd and members will be BCC'd.`,
    );

    if (!confirmed) return;

    setIsSending(true);
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/api/email-blast-club`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clubId: emailData.clubId,
        subject: emailData.subject,
        body: emailData.body,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || "Network response was not ok");
          });
        }
        return response.json();
      })
      .then((response) => {
        alert(
          `Email successfully sent!\n\n` +
            `Officers (CC): ${response.officersCC || 0}\n` +
            `Members (BCC): ${response.membersBCC || 0}\n` +
            `Total: ${response.emailsSent || 0}`,
        );
        setEmailData({
          clubId: "",
          subject: "",
          body: "",
        });
        setIsSending(false);
      })
      .catch((error) => {
        alert(`Failed to send email: ${error.message}`);
        setIsSending(false);
      });
  };

  const handleBackClick = () => {
    if (setView) {
      setView("dashboard");
    } else {
      window.location.href = "/";
    }
  };

  const selectedClub = clubData.find(
    (c) => c.id === parseInt(emailData.clubId),
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark p-6">
      <div className="max-w-4xl mx-auto bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark">
        <button
          onClick={handleBackClick}
          className="mb-4 px-4 py-2 bg-surface-light hover:bg-surface-lighter text-text-secondary rounded-lg transition"
        >
          ← Back Home
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Club Blast Email</h1>
              <p className="text-primary-50 mt-1">
                Send emails to all members of your club
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Club Selection */}
          <div>
            <label
              htmlFor="clubId"
              className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
            >
              <Users className="w-5 h-5 text-primary-400" />
              <span>
                Select Club <span className="text-primary-500">*</span>
              </span>
            </label>

            {loading && (
              <div className="p-3 bg-surface-light border border-surface-lighter rounded-lg text-text-tertiary text-sm">
                Loading clubs...
              </div>
            )}

            {error && (
              <div className="mb-3 p-3 bg-red-900 bg-opacity-30 border border-red-600 rounded-lg">
                <p className="text-red-300 text-sm">Error: {error}</p>
              </div>
            )}

            {!loading && (
              <select
                id="clubId"
                name="clubId"
                value={emailData.clubId}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-light border border-surface-lighter rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              >
                <option value="">Select a club...</option>
                {clubData.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            )}

            {!loading && clubData.length === 0 && !error && (
              <div className="mt-3 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  No clubs found. You must be a club admin to send blast emails.
                </p>
              </div>
            )}
          </div>

          {/* Club Info Display */}
          {selectedClub && (
            <div className="p-4 bg-surface-light border border-surface-lighter rounded-lg">
              <div className="flex items-start space-x-3">
                <Users className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-text-secondary mb-1">
                    {selectedClub.name}
                  </h3>
                  <p className="text-text-muted text-sm">
                    This email will be sent to all club members
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recipient Info */}
          {emailData.clubId && (
            <div className="p-3 bg-surface-light border border-surface-lighter rounded-lg space-y-2">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <span className="text-text-tertiary text-sm font-semibold">
                  Email Distribution:
                </span>
              </div>
              <ul className="ml-7 text-text-tertiary text-sm space-y-1">
                <li>
                  • <span className="font-semibold">Officers</span> will be{" "}
                  <span className="text-primary-400">CC'd</span>
                </li>
                <li>
                  • <span className="font-semibold">Regular members</span> will
                  be <span className="text-primary-400">BCC'd</span>
                </li>
                <li>
                  • Members who have unsubscribed will{" "}
                  <span className="text-primary-400">not</span> receive this
                  email
                </li>
              </ul>
            </div>
          )}

          {/* Email Subject */}
          <div>
            <label
              htmlFor="subject"
              className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
            >
              <Mail className="w-5 h-5 text-primary-400" />
              <span>
                Email Subject <span className="text-primary-500">*</span>
              </span>
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={emailData.subject}
              onChange={handleChange}
              placeholder="Enter email subject..."
              className="w-full px-4 py-3 bg-surface-light border border-surface-lighter rounded-lg text-text-secondary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>

          {/* Email Body */}
          <div>
            <label
              htmlFor="body"
              className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
            >
              <Mail className="w-5 h-5 text-primary-400" />
              <span>
                Email Body <span className="text-primary-500">*</span>
              </span>
            </label>
            <textarea
              id="body"
              name="body"
              value={emailData.body}
              onChange={handleChange}
              rows={12}
              placeholder="Enter email message..."
              className="w-full px-4 py-3 bg-surface-light border border-surface-lighter rounded-lg text-text-secondary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition resize-none font-mono text-sm"
            />
            <p className="text-text-muted text-xs mt-1">
              {emailData.body.length} characters
            </p>
          </div>

          {/* Warning */}
          {emailData.clubId && (
            <div className="p-4 bg-primary-900 bg-opacity-30 border-l-4 border-primary-500 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-primary-200 mb-1">
                    Blast Email Notice
                  </h3>
                  <p className="text-primary-300 text-sm">
                    This email will be sent to all club members who have not
                    unsubscribed. Members will receive an unsubscribe link in
                    the email. Please review your message carefully before
                    sending.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isSending || !emailData.clubId}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-800 hover:from-primary-500 hover:to-primary-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
          >
            <Send className="w-5 h-5" />
            <span>
              {isSending ? "Sending Email..." : "Send Email to Club Members"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
