import React, { useState, useEffect } from "react";
import { Mail, Calendar, Send, AlertCircle } from "lucide-react";

interface Event {
  id: string;
  name: string;
  clubName: string;
  date: string;
}

export default function EventEmailUI({
  setView,
}: {
  setView?: (view: string) => void;
}) {
  const [emailData, setEmailData] = useState({
    eventId: "",
    subject: "",
    body: "",
  });

  const [isSending, setIsSending] = useState(false);
  const [eventData, setEventData] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCurrentUserEmailFromStorage = (): string | null => {
    try {
      const userString = localStorage.getItem("user");
      if (!userString) {
        return null;
      }

      const user = JSON.parse(userString);
      return user.email;
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
      return null;
    }
  };

  // fetch events where user is a club leader
  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true);
        setError(null);

        const userEmail = getCurrentUserEmailFromStorage();
        console.log("User email from storage:", userEmail);

        if (!userEmail) {
          setError("No user email found in storage");
          setLoading(false);
          return;
        }

        const url = `http://localhost:3000/api/events-for-user?email=${encodeURIComponent(userEmail)}`;
        console.log("Fetching events from:", url);

        const response = await fetch(url);
        console.log("Response status:", response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Events data received:", data);
        console.log("Number of events:", data.length);

        setEventData(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching events:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load events",
        );
        setLoading(false);
      }
    }

    loadEvents();
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
    if (!emailData.eventId || emailData.eventId === "") {
      alert("Please select an event");
      return;
    }

    const selectedEvent = eventData.find((e) => e.id === emailData.eventId);
    const recipientText = `all attendees of ${selectedEvent?.name || "selected event"}`;

    // Confirm before sending
    const confirmed = window.confirm(
      `Are you sure you want to send this email to ${recipientText}?`,
    );

    if (!confirmed) return;

    setIsSending(true);
    const token = localStorage.getItem("token");
    fetch("http://localhost:3000/api/email-event", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId: emailData.eventId,
        subject: emailData.subject,
        body: emailData.body,
        userEmail: getCurrentUserEmailFromStorage(),
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((response) => {
        alert(`Email successfully sent to ${recipientText}!`);
        setEmailData({
          eventId: "",
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
      window.location.href = "/admin";
    }
  };

  const selectedEvent = eventData.find((e) => e.id === emailData.eventId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark p-6">
      <div className="max-w-4xl mx-auto bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark">
        <button
          onClick={handleBackClick}
          className="mb-4 px-4 py-2 bg-surface-light hover:bg-surface-lighter text-text-secondary rounded-lg transition"
        >
          ← Back to Dashboard
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Event Email Interface</h1>
              <p className="text-orange-50 mt-1">
                Send emails to attendees of your events
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Event Selection */}
          <div>
            <label
              htmlFor="eventId"
              className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
            >
              <Calendar className="w-5 h-5 text-orange-400" />
              <span>
                Select Event <span className="text-red-400">*</span>
              </span>
            </label>

            {loading && (
              <div className="p-3 bg-surface-light border border-surface-lighter rounded-lg text-text-tertiary text-sm">
                Loading events...
              </div>
            )}

            {error && (
              <div className="mb-3 p-3 bg-red-900 bg-opacity-30 border border-red-600 rounded-lg">
                <p className="text-red-300 text-sm">Error: {error}</p>
              </div>
            )}

            {!loading && (
              <select
                id="eventId"
                name="eventId"
                value={emailData.eventId}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-light border border-surface-lighter rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              >
                <option value="">Select an event...</option>
                {eventData.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} - {event.clubName} (
                    {new Date(event.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            )}

            {!loading && eventData.length === 0 && !error && (
              <div className="mt-3 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  No events found. You must be a club leader with upcoming
                  events to send emails to attendees.
                </p>
                <p className="text-yellow-400 text-xs mt-2">
                  Check the browser console (F12) for more details.
                </p>
              </div>
            )}
          </div>

          {/* Event Info Display */}
          {selectedEvent && (
            <div className="p-4 bg-surface-light border border-surface-lighter rounded-lg">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-text-secondary mb-1">
                    {selectedEvent.name}
                  </h3>
                  <p className="text-text-muted text-sm">
                    Club: {selectedEvent.clubName}
                  </p>
                  <p className="text-text-muted text-sm">
                    Date:{" "}
                    {new Date(selectedEvent.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recipient Count Info */}
          {emailData.eventId && (
            <div className="p-3 bg-surface-light border border-surface-lighter rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <span className="text-text-tertiary text-sm">
                This email will be sent to{" "}
                <span className="font-semibold text-orange-400">
                  all registered attendees
                </span>{" "}
                of this event
              </span>
            </div>
          )}

          {/* Email Subject */}
          <div>
            <label
              htmlFor="subject"
              className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
            >
              <Mail className="w-5 h-5 text-orange-400" />
              <span>
                Email Subject <span className="text-red-400">*</span>
              </span>
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={emailData.subject}
              onChange={handleChange}
              placeholder="Enter email subject..."
              className="w-full px-4 py-3 bg-surface-light border border-surface-lighter rounded-lg text-text-secondary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
          </div>

          {/* Email Body */}
          <div>
            <label
              htmlFor="body"
              className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
            >
              <Mail className="w-5 h-5 text-orange-400" />
              <span>
                Email Body <span className="text-red-400">*</span>
              </span>
            </label>
            <textarea
              id="body"
              name="body"
              value={emailData.body}
              onChange={handleChange}
              rows={12}
              placeholder="Enter email message..."
              className="w-full px-4 py-3 bg-surface-light border border-surface-lighter rounded-lg text-text-secondary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition resize-none font-mono text-sm"
            />
            <p className="text-text-muted text-xs mt-1">
              {emailData.body.length} characters
            </p>
          </div>

          {/* Warning for event emails */}
          {emailData.eventId && (
            <div className="p-4 bg-orange-900 bg-opacity-30 border-l-4 border-orange-500 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-orange-200 mb-1">
                    Event Email Notice
                  </h3>
                  <p className="text-orange-300 text-sm">
                    This email will be sent to all attendees who have registered
                    for this event. Please review your message carefully before
                    sending.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isSending || !emailData.eventId}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
          >
            <Send className="w-5 h-5" />
            <span>
              {isSending ? "Sending Email..." : "Send Email to Attendees"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
