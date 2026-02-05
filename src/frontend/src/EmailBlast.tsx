import React, { useState, useEffect } from "react";
import { Mail, Users, User, Globe, Send, AlertCircle } from "lucide-react";

interface Club {
  id: string;
  name: string;
  // Add other properties if they are used and known
}

export default function AdminEmailUI({
  setView,
}: {
  setView?: (view: string) => void;
}) {
  const [emailData, setEmailData] = useState({
    recipientType: "individual",
    specificEmail: "",
    clubName: "",
    subject: "",
    body: "",
  });

  const [isSending, setIsSending] = useState(false);
  const [clubData, setClubData] = useState<Club[]>([]);

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

  // fetch from /api/clubs
  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("http://localhost:3000/api/clubs");
        const data = await response.json();
        setClubData(data);
      } catch (error) {
        console.error("Error fetching clubs:", error);
      }
    }

    load();
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

  const getRecipientCount = () => {
    if (emailData.recipientType === "individual") return "1 recipient";
    if (emailData.recipientType === "club") return "~15-50 recipients";
    if (emailData.recipientType === "everyone") return "~500+ recipients";
    return "";
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
    if (
      emailData.recipientType === "individual" &&
      !emailData.specificEmail.trim()
    ) {
      alert("Please enter a recipient email address");
      return;
    }
    if (
      emailData.recipientType === "club" &&
      (!emailData.clubName || emailData.clubName === "Select a club...")
    ) {
      alert("Please select a club");
      return;
    }

    // Confirm before sending
    const recipientText =
      emailData.recipientType === "individual"
        ? emailData.specificEmail
        : emailData.recipientType === "club"
          ? `all members of ${emailData.clubName}`
          : "everyone in the database";

    const confirmed = window.confirm(
      `Are you sure you want to send this email to ${recipientText}?`,
    );

    if (!confirmed) return;

    setIsSending(true);

    if (emailData.recipientType === "club") {
      const selectedClub = clubData.find(
        (club) => club.name === emailData.clubName,
      );
      if (!selectedClub) {
        alert("Selected club not found.");
        setIsSending(false);
        return;
      }
      fetch("http://localhost:3000/api/email-club", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clubID: selectedClub.id,
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
            recipientType: "individual",
            specificEmail: "",
            clubName: "",
            subject: "",
            body: "",
          });
          setIsSending(false);
        })
        .catch((error) => {
          alert(`Failed to send email: ${error.message}`);
          setIsSending(false);
        });
      return;
    } else if (emailData.recipientType === "everyone") {
      fetch("http://localhost:3000/api/email-everyone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
            recipientType: "individual",
            specificEmail: "",
            clubName: "",
            subject: "",
            body: "",
          });
          setIsSending(false);
        });
    } else if (emailData.recipientType === "individual") {
      const APIData = {
        email: emailData.specificEmail, // TODO work for more than one person
        subject: emailData.subject,
        body: emailData.body,
        userEmail: getCurrentUserEmailFromStorage(),
      };

      // use localhost:3000/api/email endpoint {email: string, subject: string, body: string}
      fetch("http://localhost:3000/api/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(APIData),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then(() => {
          alert(`Email successfully sent to ${recipientText}!`);
          setEmailData({
            recipientType: "individual",
            specificEmail: "",
            clubName: "",
            subject: "",
            body: "",
          });
          setIsSending(false);
        });
    }
  };

  const handleBackClick = () => {
    if (setView) {
      setView("dashboard");
    } else {
      // If no setView prop, navigate to admin portal
      window.location.href = "/admin";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark p-6">
      <div className="max-w-4xl mx-auto bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark">
        <button
          onClick={handleBackClick}
          className="mb-4 px-4 py-2 bg-surface-light hover:bg-surface-lighter text-text-secondary rounded-lg transition"
        >
          ← Back to Dashboard
        </button>
        {/* Header */}
        <div className="bg-gradient-to-r from-accent-dark to-accent text-white p-6">
          <div className="flex items-center space-x-3">
            <Mail className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Admin Email Interface</h1>
              <p className="text-text-secondary mt-1">
                Send emails to individuals, clubs, or everyone
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Recipient Type Selection */}
          <div>
            <label className="flex items-center space-x-2 text-text-secondary font-semibold mb-3">
              <Users className="w-5 h-5 text-accent-light" />
              <span>
                Recipient Type <span className="text-red-400">*</span>
              </span>
            </label>
            <div className="grid md:grid-cols-3 gap-3">
              {/* Individual */}
              <button
                type="button"
                onClick={() =>
                  setEmailData((prev) => ({
                    ...prev,
                    recipientType: "individual",
                  }))
                }
                className={`p-4 rounded-lg border-2 transition-all ${
                  emailData.recipientType === "individual"
                    ? "border-accent bg-accent-darker bg-opacity-30"
                    : "border-border-light bg-surface-light hover:border-border"
                }`}
              >
                <User
                  className={`w-6 h-6 mx-auto mb-2 ${
                    emailData.recipientType === "individual"
                      ? "text-accent-light"
                      : "text-text-muted"
                  }`}
                />
                <div className="text-text-secondary font-medium">
                  Individual
                </div>
                <div className="text-text-muted text-xs mt-1">
                  Single person
                </div>
              </button>

              {/* Club */}
              <button
                type="button"
                onClick={() =>
                  setEmailData((prev) => ({ ...prev, recipientType: "club" }))
                }
                className={`p-4 rounded-lg border-2 transition-all ${
                  emailData.recipientType === "club"
                    ? "border-accent bg-accent-darker bg-opacity-30"
                    : "border-border-light bg-surface-light hover:border-border"
                }`}
              >
                <Users
                  className={`w-6 h-6 mx-auto mb-2 ${
                    emailData.recipientType === "club"
                      ? "text-accent-light"
                      : "text-text-muted"
                  }`}
                />
                <div className="text-text-secondary font-medium">Club</div>
                <div className="text-text-muted text-xs mt-1">
                  All club members
                </div>
              </button>

              {/* Everyone */}
              <button
                type="button"
                onClick={() =>
                  setEmailData((prev) => ({
                    ...prev,
                    recipientType: "everyone",
                  }))
                }
                className={`p-4 rounded-lg border-2 transition-all ${
                  emailData.recipientType === "everyone"
                    ? "border-accent bg-accent-darker bg-opacity-30"
                    : "border-border-light bg-surface-light hover:border-border"
                }`}
              >
                <Globe
                  className={`w-6 h-6 mx-auto mb-2 ${
                    emailData.recipientType === "everyone"
                      ? "text-accent-light"
                      : "text-text-muted"
                  }`}
                />
                <div className="text-text-secondary font-medium">Everyone</div>
                <div className="text-text-muted text-xs mt-1">All users</div>
              </button>
            </div>
          </div>

          {/* Conditional Recipient Fields */}
          {emailData.recipientType === "individual" && (
            <div>
              <label
                htmlFor="specificEmail"
                className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
              >
                <Mail className="w-5 h-5 text-accent-light" />
                <span>
                  Recipient Email <span className="text-red-400">*</span>
                </span>
              </label>
              <input
                type="email"
                id="specificEmail"
                name="specificEmail"
                value={emailData.specificEmail}
                onChange={handleChange}
                placeholder="user@example.com"
                className="w-full px-4 py-3 bg-surface-light border border-border-light rounded-lg text-text-secondary placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
              />
            </div>
          )}

          {emailData.recipientType === "club" && (
            <div>
              <label
                htmlFor="clubName"
                className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
              >
                <Users className="w-5 h-5 text-accent-light" />
                <span>
                  Select Club <span className="text-red-400">*</span>
                </span>
              </label>
              <select
                id="clubName"
                name="clubName"
                value={emailData.clubName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-light border border-border-light rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
              >
                <option value="">Select a club...</option>
                {clubData.map((club) => (
                  <option key={club.id} value={club.name}>
                    {club.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recipient Count Info */}
          <div className="p-3 bg-surface-light border border-border-light rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-accent-light flex-shrink-0" />
            <span className="text-text-tertiary text-sm">
              Estimated recipients:{" "}
              <span className="font-semibold text-accent-light">
                {getRecipientCount()}
              </span>
            </span>
          </div>

          {/* Email Subject */}
          <div>
            <label
              htmlFor="subject"
              className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
            >
              <Mail className="w-5 h-5 text-accent-light" />
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
              className="w-full px-4 py-3 bg-surface-light border border-border-light rounded-lg text-text-secondary placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
            />
          </div>

          {/* Email Body */}
          <div>
            <label
              htmlFor="body"
              className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
            >
              <Mail className="w-5 h-5 text-accent-light" />
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
              className="w-full px-4 py-3 bg-surface-light border border-border-light rounded-lg text-text-secondary placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition resize-none font-mono text-sm"
            />
            <p className="text-text-muted text-xs mt-1">
              {emailData.body.length} characters
            </p>
          </div>

          {/* Warning for mass emails */}
          {emailData.recipientType !== "individual" && (
            <div className="p-4 bg-red-900 bg-opacity-30 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-200 mb-1">
                    Mass Email Warning
                  </h3>
                  <p className="text-red-300 text-sm">
                    You are about to send an email to multiple recipients.
                    Please review your message carefully before sending.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isSending}
            className="w-full bg-gradient-to-r from-accent-dark to-accent hover:from-accent hover:to-accent-light text-white font-semibold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
          >
            <Send className="w-5 h-5" />
            <span>{isSending ? "Sending Email..." : "Send Email"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
