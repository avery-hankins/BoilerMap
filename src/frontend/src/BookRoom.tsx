import { API_URL } from "./config";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  Clock,
  Building2,
  FileText,
  Send,
} from "lucide-react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
}

interface Club {
  id: string;
  name: string;
  description?: string;
}

export default function RoomBookingForm() {
  const navigate = useNavigate();
  const userString = localStorage.getItem("user");
  const user: User | null = userString ? JSON.parse(userString) : null;
  const [clubData, setClubData] = useState<Club[]>([]);
  const [roomName, setRoomName] = useState("");
  const urlParams = new URLSearchParams(window.location.search);
  const room_id = urlParams.get("id");

  const [formData, setFormData] = useState({
    clubName: "",
    clubId: "",
    eventName: "",
    attendees: "",
    date: "",
    time: "",
    additionalInfo: "",
    authId: "",
    roomId: room_id,
    userId: user?.id || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // TODO pull from real clubs (database)
  const clubs = [
    "Select a club...",
    "Computer Science Club",
    "Engineering Society",
    "Math Club",
    "Physics Society",
    "Robotics Team",
    "Chess Club",
    "Debate Society",
    "Student Government",
    "Environmental Club",
    "Business Club",
    "Arts & Culture Society",
    "International Students Association",
    "Volunteer Organization",
  ];

  // fetch from /api/clubs
  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`${API_URL}/api/clubs`);
        const data = await response.json();
        setClubData(data);
      } catch (error) {
        console.error("Error fetching clubs:", error);
      }
    }

    load();
  }, []);

  // fetch room name from Purdue API
  useEffect(() => {
    async function fetchRoomName() {
      if (!room_id) return;
      try {
        const room_page =
          "https://api.purdue.io/odata/rooms?$filter=id eq " +
          room_id +
          "&$expand=Building";
        const response = await fetch(room_page);
        const data = await response.json();
        if (data.value && data.value.length > 0) {
          const roomInfo = data.value[0];
          setRoomName(roomInfo.Building.ShortCode + " " + roomInfo.Number);
        }
      } catch (error) {
        console.error("Error fetching room info:", error);
      }
    }

    fetchRoomName();
  }, [room_id]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.clubName) {
      alert("Please select a club name");
      return;
    }
    if (
      !formData.eventName ||
      !formData.attendees ||
      !formData.date ||
      !formData.time
    ) {
      alert("Please fill in all required fields");
      return;
    }

    const selectedClub = clubData.find(
      (club: Club) => club.name === formData.clubName,
    );
    if (selectedClub) {
      formData.clubId = selectedClub.id;
    } else {
      alert("Selected club not found.");
      return;
    }

    // Ensure user is not null before accessing user.id
    if (!user) {
      alert("User not logged in.");
      return;
    }
    formData.userId = user.id;

    // submit API request
    fetch(`${API_URL}/api/room-booking-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        if (!response.ok) {
          console.log(
            "Error submitting booking request:",
            response.status,
            response.statusText,
          );
          alert(
            "Error submitting booking request: " +
              response.status +
              " " +
              response.statusText,
          );
          throw new Error("Network response was not ok");
        }
        alert("Booking request submitted! You will be notified when approved.");
        return response.json();
      })
      .then((data) => {
        console.log("Booking request submitted successfully:", data);
        navigate("/");
      })
      .catch((error) => {
        console.error("Error submitting booking request:", error);
        setIsSubmitting(false);
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark p-6">
      <div className="max-w-2xl mx-auto bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent-dark to-accent text-white p-6">
          <h1 className="text-3xl font-bold">Room Booking Request</h1>
          <p className="text-text-secondary mt-2">{roomName || "Loading..."}</p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Club Name */}
          <div>
            <label
              htmlFor="clubName"
              className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
            >
              <Building2 className="w-5 h-5 text-accent-light" />
              <span>
                Club Name <span className="text-red-400">*</span>
              </span>
            </label>
            <select
              id="clubName"
              name="clubName"
              value={formData.clubName}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-surface-light border border-border-light rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
            >
              <option value="" disabled>
                Select a club...
              </option>
              {clubData.map((club) => (
                <option key={club.id} value={club.name}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>

          {/* Event Name */}
          <div>
            <label
              htmlFor="eventName"
              className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
            >
              <FileText className="w-5 h-5 text-accent-light" />
              <span>
                Event Name <span className="text-red-400">*</span>
              </span>
            </label>
            <input
              type="text"
              id="eventName"
              name="eventName"
              value={formData.eventName}
              onChange={handleChange}
              placeholder="e.g., Weekly Study Session"
              className="w-full px-4 py-3 bg-surface-light border border-border-light rounded-lg text-text-secondary placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
            />
          </div>

          {/* Expected Attendees */}
          <div>
            <label
              htmlFor="attendees"
              className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
            >
              <Users className="w-5 h-5 text-accent-light" />
              <span>
                Expected Attendees <span className="text-red-400">*</span>
              </span>
            </label>
            <input
              type="number"
              id="attendees"
              name="attendees"
              value={formData.attendees}
              onChange={handleChange}
              min="1"
              max="53"
              placeholder="Maximum capacity: 53"
              className="w-full px-4 py-3 bg-surface-light border border-border-light rounded-lg text-text-secondary placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
            />
            <p className="text-text-muted text-sm mt-1">
              Room capacity: 53 (29 for final examinations)
            </p>
          </div>

          {/* Date and Time */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="date"
                className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
              >
                <Calendar className="w-5 h-5 text-accent-light" />
                <span>
                  Date <span className="text-red-400">*</span>
                </span>
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-light border border-border-light rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
              />
            </div>

            <div>
              <label
                htmlFor="time"
                className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
              >
                <Clock className="w-5 h-5 text-accent-light" />
                <span>
                  Time <span className="text-red-400">*</span>
                </span>
              </label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-light border border-border-light rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Additional Info (Optional) */}
          <div>
            <label
              htmlFor="additionalInfo"
              className="flex items-center space-x-2 text-text-secondary font-semibold mb-2"
            >
              <FileText className="w-5 h-5 text-accent-light" />
              <span>
                Additional Information{" "}
                <span className="text-text-muted text-sm font-normal">
                  (Optional)
                </span>
              </span>
            </label>
            <textarea
              id="additionalInfo"
              name="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleChange}
              rows={4}
              placeholder="Any special requirements or additional details..."
              className="w-full px-4 py-3 bg-surface-light border border-border-light rounded-lg text-text-secondary placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition resize-none"
            />
          </div>

          {/* Important Notice */}
          <div className="p-4 bg-blue-900 border-l-4 border-blue-500 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong className="text-blue-200">Note:</strong> Your booking
              request will be reviewed. You will receive an email once approved
              or denied.
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-accent-dark to-accent hover:from-accent hover:to-accent-light text-white font-semibold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
          >
            <Send className="w-5 h-5" />
            <span>
              {isSubmitting
                ? "Submitting Request..."
                : "Submit Booking Request"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
