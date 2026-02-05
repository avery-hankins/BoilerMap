import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Calendar,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  Upload,
  X,
  Tag,
  Mail,
} from "lucide-react";

export default function CreateEventPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [authorizedClubs, setAuthorizedClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showImageToast, setShowImageToast] = useState(false);
  const [emailOption, setEmailOption] = useState("default");
  const [customEmailSubject, setCustomEmailSubject] = useState("");
  const [customEmailBody, setCustomEmailBody] = useState("");

  const [eventDetails, setEventDetails] = useState({
    description: "",
    isRecurring: false,
    image: null,
    imagePreview: null,
    startTime: "",
    endTime: "",
  });

  // Get auth token from localStorage
  const getToken = () => localStorage.getItem("token");

  // Fetch user info and authorized clubs
  useEffect(() => {
    fetchUserAndClubs();
    fetchTags();
  }, []);

  // Fetch bookings when a club is selected
  useEffect(() => {
    if (selectedClub) {
      fetchClubBookings(selectedClub.id);
    }
  }, [selectedClub]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (showImageToast) {
      const timer = setTimeout(() => {
        setShowImageToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showImageToast]);

  const fetchTags = async () => {
    try {
      console.log("Fetching tags...");
      const response = await fetch("http://localhost:3000/api/events/gettags");
      console.log("Tags response status:", response.status);

      if (!response.ok) throw new Error("Failed to fetch tags");

      const tags = await response.json();
      console.log("Tags fetched:", tags);
      console.log("Number of tags:", tags.length);

      setAvailableTags(tags);
    } catch (err) {
      console.error("Error fetching tags:", err);
    }
  };

  const fetchUserAndClubs = async () => {
    try {
      const token = getToken();
      if (!token) {
        setError("Please log in to create events");
        setLoading(false);
        return;
      }

      // Get user data
      const userRes = await fetch("http://localhost:3000/api/users/userdata", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) throw new Error("Failed to fetch user data");
      const userData = await userRes.json();
      setUser(userData);

      console.log("User data:", userData);

      // Get all clubs
      const clubsRes = await fetch("http://localhost:3000/api/clubs");
      if (!clubsRes.ok) throw new Error("Failed to fetch clubs");
      const allClubs = await clubsRes.json();

      console.log("All clubs:", allClubs);

      // Check authorization for each club
      const authorized = [];
      for (const club of allClubs) {
        try {
          console.log(`Checking auth for club ${club.id} (${club.name})...`);

          const authRes = await fetch(
            `http://localhost:3000/api/clubs/getauthbyclub/${club.id}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );

          console.log(
            `Auth response status for club ${club.id}:`,
            authRes.status,
          );

          if (authRes.ok) {
            const authData = await authRes.json();
            console.log(`Auth data for club ${club.id}:`, authData);

            if (authData.role === "admin" || authData.role === "officer") {
              console.log(`✅ User is ${authData.role} of club ${club.id}`);
              authorized.push({ ...club, role: authData.role });
            } else {
              console.log(
                `❌ User role is '${authData.role}' for club ${club.id} (not admin/officer)`,
              );
            }
          } else {
            console.log(`❌ Auth check failed for club ${club.id}`);
          }
        } catch (err) {
          console.error(`Error checking auth for club ${club.id}:`, err);
        }
      }

      console.log("Authorized clubs:", authorized);
      setAuthorizedClubs(authorized);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchClubBookings = async (clubId) => {
    try {
      const token = getToken();

      // Fetch all bookings
      const bookingsRes = await fetch(
        "http://localhost:3000/api/room-booking-requests",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!bookingsRes.ok) throw new Error("Failed to fetch bookings");
      const allBookings = await bookingsRes.json();

      console.log("All bookings:", allBookings);
      console.log("Looking for clubId:", clubId);

      // Fetch all events to check which bookings already have events
      const eventsRes = await fetch(
        "http://localhost:3000/api/events/eventlist",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!eventsRes.ok) throw new Error("Failed to fetch events");
      const allEvents = await eventsRes.json();

      console.log("All events:", allEvents);

      // Create a set of bookingIds that already have events
      const usedBookingIds = new Set(allEvents.map((event) => event.bookingId));

      console.log("Used booking IDs:", Array.from(usedBookingIds));

      // Filter for this club's approved bookings that don't have events yet
      const clubBookings = allBookings.filter((booking) => {
        const matchesClub = booking.clubId === clubId;
        const isApproved =
          booking.approvalStatus === "PRIMARY_APPROVED" ||
          booking.approvalStatus === "FALLBACK_APPROVED";
        const notUsed = !usedBookingIds.has(booking.id);

        console.log(`Booking ${booking.id}:`, {
          clubId: booking.clubId,
          matchesClub,
          approvalStatus: booking.approvalStatus,
          isApproved,
          notUsed,
        });

        return matchesClub && isApproved && notUsed;
      });

      console.log("Filtered club bookings:", clubBookings);
      setBookings(clubBookings);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load bookings");
    }
  };

  const handleClubSelect = (club) => {
    setSelectedClub(club);
    setSelectedBooking(null);
    setShowEventForm(false);
    setSelectedTags([]);
    setEmailOption("default");
    setCustomEmailSubject("");
    setCustomEmailBody("");
    setEventDetails({
      description: "",
      isRecurring: false,
      image: null,
      imagePreview: null,
      startTime: "",
      endTime: "",
    });
  };

  const handleBookingSelect = (booking) => {
    setSelectedBooking(booking);
    setShowEventForm(true);
    setSelectedTags([]);
    setEmailOption("default");
    setCustomEmailSubject("");
    setCustomEmailBody("");
    // Pre-fill description and times if booking has them
    // Helper function to convert UTC date to local datetime-local format
    const toLocalDatetimeString = (dateString) => {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setEventDetails({
      description: booking.description || "",
      isRecurring: false,
      image: null,
      imagePreview: null,
      startTime: booking.startTime
        ? toLocalDatetimeString(booking.startTime)
        : "",
      endTime: booking.endTime ? toLocalDatetimeString(booking.endTime) : "",
    });
  };

  const handleTagToggle = (tagId) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type - only allow jpg and png
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        setError("Please select a JPG or PNG image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);

      setEventDetails({
        ...eventDetails,
        image: file,
        imagePreview: previewUrl,
      });
      setError("");

      // Show success toast
      setShowImageToast(true);
    }
  };

  const handleRemoveImage = () => {
    if (eventDetails.imagePreview) {
      URL.revokeObjectURL(eventDetails.imagePreview);
    }
    setEventDetails({
      ...eventDetails,
      image: null,
      imagePreview: null,
    });
  };

  const handleSubmit = async () => {
    setError("");

    try {
      const token = getToken();

      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append("clubId", selectedClub.id);
      formData.append("roomId", selectedBooking.roomId);
      formData.append("bookingId", selectedBooking.id);
      formData.append(
        "startTime",
        new Date(eventDetails.startTime).toISOString(),
      );
      formData.append("endTime", new Date(eventDetails.endTime).toISOString());
      formData.append("description", eventDetails.description);
      formData.append("isRecurring", eventDetails.isRecurring);

      // Add selected tags as JSON string
      formData.append("tagIds", JSON.stringify(selectedTags));

      if (eventDetails.image) {
        formData.append("image", eventDetails.image);
      }

      const response = await fetch(
        "http://localhost:3000/api/events/makeevent",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type header - browser will set it with boundary
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create event");
      }

      const result = await response.json();
      console.log("=== EVENT CREATION RESPONSE ===");
      console.log("Full result object:", result);
      console.log("result.id:", result.id);
      console.log("Type of result:", typeof result);
      console.log("Keys in result:", Object.keys(result));
      console.log("===============================");

      // Try to find the event ID from various possible response formats
      const eventId = result.id || result.event?.id || result.data?.id;

      console.log("Extracted eventId:", eventId);

      if (!eventId) {
        console.error("Could not find event ID in response:", result);
        setError("Event created but could not send email - event ID not found");
        setSuccess(true);
        return;
      }
      // Send email if option is not 'none'
      if (emailOption !== "none") {
        try {
          console.log("Attempting to send email...");
          console.log("Email option:", emailOption);

          const emailPayload = {
            eventId: result.event.id,
            clubId: selectedClub.id,
            clubName: selectedClub.name,
            startTime: new Date(eventDetails.startTime).toISOString(),
            endTime: new Date(eventDetails.endTime).toISOString(),
            roomLocation: `${selectedBooking.room?.buildingCode} ${selectedBooking.room?.roomNum}`,
            description: eventDetails.description,
          };

          if (emailOption === "custom") {
            emailPayload.customSubject = customEmailSubject;
            emailPayload.customBody = customEmailBody;
          }

          console.log("Email payload:", emailPayload);

          const emailResponse = await fetch(
            "http://localhost:3000/api/email-event-creation", // Remove /emails
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(emailPayload),
            },
          );

          console.log("Email response status:", emailResponse.status);

          // Check if response is JSON before parsing
          const contentType = emailResponse.headers.get("content-type");
          console.log("Response content-type:", contentType);

          if (contentType && contentType.includes("application/json")) {
            const emailResult = await emailResponse.json();
            console.log("Email response:", emailResult);

            if (!emailResponse.ok) {
              console.error("Failed to send email notification:", emailResult);
              setError(
                `Event created successfully, but email failed to send: ${emailResult.error || "Unknown error"}`,
              );
            } else {
              console.log(
                `✅ Email sent successfully to ${emailResult.emailsSent} recipients`,
              );
            }
          } else {
            // Response is not JSON, get the text to see what it is
            const responseText = await emailResponse.text();
            console.error("Response is not JSON. Response text:", responseText);
            setError(
              `Event created successfully, but email endpoint returned unexpected response (status ${emailResponse.status})`,
            );
          }

          console.log("Email response status:", emailResponse.status);

          const emailResult = await emailResponse.json();
          console.log("Email response:", emailResult);

          if (!emailResponse.ok) {
            console.error("Failed to send email notification:", emailResult);
            // Show warning but don't fail the entire operation
            setError(
              `Event created successfully, but email failed to send: ${emailResult.error || "Unknown error"}`,
            );
          } else {
            console.log(
              `✅ Email sent successfully to ${emailResult.emailsSent} recipients`,
            );
          }
        } catch (emailErr) {
          console.error("Error sending email:", emailErr);
          // Show warning but don't fail the entire operation
          setError(
            `Event created successfully, but email failed to send: ${emailErr.message}`,
          );
        }
      } else {
        console.log("Email option is 'none', skipping email send");
      }

      setSuccess(true);

      // Clean up preview URL
      if (eventDetails.imagePreview) {
        URL.revokeObjectURL(eventDetails.imagePreview);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-main flex items-center justify-center">
        <div className="text-lg text-text-tertiary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-main py-8 px-4">
      {/* Toast Notification */}
      {showImageToast && (
        <div className="fixed top-4 right-4 z-50 transition-all duration-300 ease-in-out">
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
            <CheckCircle size={20} className="flex-shrink-0" />
            <span className="font-medium">Image attached successfully!</span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="bg-surface rounded-lg shadow-md p-6 mb-6 border border-border-dark">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Create Event
          </h1>
          <p className="text-text-tertiary">
            Welcome, {user?.username}! Select a club and booking to create an
            event.
          </p>
        </div>

        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-600 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle
              className="text-red-400 flex-shrink-0 mt-0.5"
              size={20}
            />
            <div className="text-red-300">{error}</div>
          </div>
        )}

        {authorizedClubs.length === 0 ? (
          <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-6 text-center">
            <AlertCircle className="mx-auto text-yellow-400 mb-3" size={48} />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No Authorization Found
            </h3>
            <p className="text-text-tertiary">
              You must be a club admin or officer to create events.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-surface rounded-lg shadow-md p-6 mb-6 border border-border-dark">
              <h2 className="text-xl font-bold text-text-primary mb-4">
                Step 1: Select Your Club
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {authorizedClubs.map((club) => (
                  <button
                    key={club.id}
                    onClick={() => handleClubSelect(club)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedClub?.id === club.id
                        ? "border-primary-500 bg-primary-900 bg-opacity-30"
                        : "border-border-light hover:border-primary-300 hover:bg-surface-light"
                    }`}
                  >
                    <div className="font-semibold text-text-primary">
                      {club.name}
                    </div>
                    <div className="text-sm text-text-tertiary mt-1">
                      Role: <span className="capitalize">{club.role}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedClub && (
              <div className="bg-surface rounded-lg shadow-md p-6 mb-6 border border-border-dark">
                <h2 className="text-xl font-bold text-text-primary mb-4">
                  Step 2: Select Approved Booking
                </h2>

                {bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle
                      className="mx-auto text-text-muted mb-3"
                      size={48}
                    />
                    <p className="text-text-tertiary font-medium mb-2">
                      No Available Bookings
                    </p>
                    <p className="text-sm text-text-disabled">
                      All approved bookings for this club already have events
                      created, or there are no approved bookings yet.
                    </p>
                    <p className="text-sm text-text-disabled mt-2">
                      You need to create and get approval for a room booking
                      first before you can create an event.
                    </p>
                    <button
                      onClick={() => (window.location.href = "/")}
                      className="mt-4 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors inline-flex items-center gap-2"
                    >
                      <Calendar size={20} />
                      <span>Create Room Booking</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <button
                        key={booking.id}
                        onClick={() => handleBookingSelect(booking)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          selectedBooking?.id === booking.id
                            ? "border-primary-500 bg-primary-900 bg-opacity-30"
                            : "border-border-light hover:border-primary-300 hover:bg-surface-light"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold text-text-primary">
                            Booking #{booking.id}
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-green-900 bg-opacity-30 border border-green-600 text-green-400 rounded">
                            {booking.approvalStatus.replace("_", " ")}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-text-tertiary">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} />
                            {booking.room?.buildingCode} {booking.room?.roomNum}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users size={16} />
                            {booking.expectedAttendance || "N/A"} attendees
                          </div>
                          <div className="flex items-center gap-2 col-span-2">
                            <Clock size={16} />
                            {formatDate(booking.startTime)}
                          </div>
                        </div>

                        {booking.description && (
                          <div className="mt-2 text-sm text-text-tertiary italic">
                            {booking.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showEventForm && (
              <div className="bg-surface rounded-lg shadow-md p-6 mb-6 border border-border-dark">
                <h2 className="text-xl font-bold text-text-primary mb-4">
                  Step 3: Event Details
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Event Description
                    </label>
                    <textarea
                      value={eventDetails.description}
                      onChange={(e) =>
                        setEventDetails({
                          ...eventDetails,
                          description: e.target.value,
                        })
                      }
                      rows={4}
                      className="w-full px-4 py-2 bg-background-main border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-text-primary placeholder-text-muted"
                      placeholder="Describe your event..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                        <Clock size={16} />
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        value={eventDetails.startTime}
                        onChange={(e) =>
                          setEventDetails({
                            ...eventDetails,
                            startTime: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-background-main border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                        <Clock size={16} />
                        End Time
                      </label>
                      <input
                        type="datetime-local"
                        value={eventDetails.endTime}
                        onChange={(e) =>
                          setEventDetails({
                            ...eventDetails,
                            endTime: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-background-main border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-text-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Event Image (Optional)
                    </label>

                    {!eventDetails.imagePreview ? (
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                        <input
                          type="file"
                          onChange={handleImageChange}
                          className="hidden"
                          id="image-upload"
                          accept="image/jpeg,image/jpg,image/png"
                        />
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <Upload className="text-text-muted mb-2" size={32} />
                          <span className="text-sm text-text-tertiary mb-1">
                            Click to upload an image
                          </span>
                          <span className="text-xs text-text-disabled">
                            PNG or JPG up to 5MB
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden border border-border">
                        <img
                          src={eventDetails.imagePreview}
                          alt="Event preview"
                          className="w-full h-64 object-cover"
                        />
                        <button
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                      <Tag size={16} />
                      Event Tags (Optional)
                    </label>

                    {availableTags.length === 0 ? (
                      <div className="text-sm text-text-disabled italic">
                        No tags available. Loading...
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {availableTags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleTagToggle(tag.id)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                selectedTags.includes(tag.id)
                                  ? "bg-primary-600 text-white shadow-md border border-primary-500"
                                  : "bg-surface-light text-text-secondary hover:bg-surface-lighter border border-border"
                              }`}
                            >
                              {tag.name}
                            </button>
                          ))}
                        </div>
                        {selectedTags.length > 0 && (
                          <p className="text-xs text-text-disabled mt-2">
                            {selectedTags.length} tag
                            {selectedTags.length !== 1 ? "s" : ""} selected
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                      <Mail size={16} />
                      Email Notification
                    </label>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-light transition-colors">
                          <input
                            type="radio"
                            name="emailOption"
                            value="default"
                            checked={emailOption === "default"}
                            onChange={(e) => setEmailOption(e.target.value)}
                            className="w-4 h-4 text-primary-600 border-border focus:ring-primary-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-text-primary">
                              Send Default Email
                            </div>
                            <div className="text-xs text-text-disabled">
                              Automatic notification with event details
                            </div>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-light transition-colors">
                          <input
                            type="radio"
                            name="emailOption"
                            value="custom"
                            checked={emailOption === "custom"}
                            onChange={(e) => setEmailOption(e.target.value)}
                            className="w-4 h-4 text-primary-600 border-border focus:ring-primary-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-text-primary">
                              Send Custom Email
                            </div>
                            <div className="text-xs text-text-disabled">
                              Write your own message to members
                            </div>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-light transition-colors">
                          <input
                            type="radio"
                            name="emailOption"
                            value="none"
                            checked={emailOption === "none"}
                            onChange={(e) => setEmailOption(e.target.value)}
                            className="w-4 h-4 text-primary-600 border-border focus:ring-primary-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-text-primary">
                              No Email
                            </div>
                            <div className="text-xs text-text-disabled">
                              Don't send any notification
                            </div>
                          </div>
                        </label>
                      </div>

                      {emailOption === "custom" && (
                        <div className="mt-4 p-4 bg-surface-light rounded-lg border border-border space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-text-secondary mb-2">
                              Email Subject
                            </label>
                            <input
                              type="text"
                              value={customEmailSubject}
                              onChange={(e) =>
                                setCustomEmailSubject(e.target.value)
                              }
                              placeholder="Enter email subject..."
                              className="w-full px-3 py-2 bg-background-main border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-text-primary placeholder-text-muted text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-text-secondary mb-2">
                              Email Body
                            </label>
                            <textarea
                              value={customEmailBody}
                              onChange={(e) =>
                                setCustomEmailBody(e.target.value)
                              }
                              rows={5}
                              placeholder="Enter your custom message..."
                              className="w-full px-3 py-2 bg-background-main border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-text-primary placeholder-text-muted text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={eventDetails.isRecurring}
                      onChange={(e) =>
                        setEventDetails({
                          ...eventDetails,
                          isRecurring: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-500"
                    />
                    <label
                      htmlFor="recurring"
                      className="text-sm font-medium text-text-secondary"
                    >
                      This is a recurring event
                    </label>
                  </div>

                  <div className="pt-4 border-t border-border-light">
                    <h3 className="font-semibold text-text-primary mb-3">
                      Event Summary
                    </h3>
                    <div className="bg-surface-light rounded-lg p-4 space-y-2 text-sm border border-border">
                      <div>
                        <strong>Club:</strong> {selectedClub.name}
                      </div>
                      <div>
                        <strong>Room:</strong>{" "}
                        {selectedBooking.room?.buildingCode}{" "}
                        {selectedBooking.room?.roomNum}
                      </div>
                      <div>
                        <strong>Start Time:</strong>{" "}
                        {eventDetails.startTime
                          ? formatDate(
                              new Date(eventDetails.startTime).toISOString(),
                            )
                          : "Not set"}
                      </div>
                      <div>
                        <strong>End Time:</strong>{" "}
                        {eventDetails.endTime
                          ? formatDate(
                              new Date(eventDetails.endTime).toISOString(),
                            )
                          : "Not set"}
                      </div>
                      <div>
                        <strong>Expected Attendees:</strong>{" "}
                        {selectedBooking.expectedAttendance || "N/A"}
                      </div>
                      <div>
                        <strong>Image:</strong>{" "}
                        {eventDetails.image ? "Yes" : "No"}
                      </div>
                      <div>
                        <strong>Tags:</strong>{" "}
                        {selectedTags.length > 0 ? selectedTags.length : "None"}
                      </div>
                      <div>
                        <strong>Email:</strong>{" "}
                        {emailOption === "default"
                          ? "Default notification"
                          : emailOption === "custom"
                            ? "Custom message"
                            : "None"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={
                      !eventDetails.description ||
                      !eventDetails.startTime ||
                      !eventDetails.endTime ||
                      (emailOption === "custom" &&
                        (!customEmailSubject || !customEmailBody))
                    }
                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-surface-lighter disabled:cursor-not-allowed"
                  >
                    Create Event
                  </button>
                </div>
              </div>
            )}
            {success && (
              <div className="bg-green-900 bg-opacity-30 border border-green-600 rounded-lg p-6 text-center">
                <CheckCircle
                  className="mx-auto text-green-400 mb-3"
                  size={48}
                />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Event Created Successfully!
                </h3>
                <p className="text-text-tertiary mb-4">
                  Your event has been created and is now visible to members.
                </p>
                <button
                  onClick={() => {
                    window.location.href = "/";
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
