import { API_URL } from "./config";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Heart,
  CheckCircle,
  Share2,
  ArrowLeft,
  Users,
  X,
  Mail,
  Bell,
  Info,
  Edit2,
  Save,
  AlertCircle,
  Image as ImageIcon,
  Tag,
} from "lucide-react";

interface Event {
  id: number;
  clubId: number;
  roomId: number;
  bookingId: number;
  startTime: string;
  endTime: string;
  description: string | null;
  numRSVPs: number;
  isRecurring: boolean;
  club: {
    id: number;
    name: string;
    description: string | null;
  };
  room: {
    id: number;
    buildingCode: string;
    roomNum: string;
    roomCapacity: number;
  };
  booking?: {
    description: string | null;
  };
  _count?: {
    rsvps: number;
  };
}

interface Attendee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string | null;
  bio: string | null;
  rsvpDate: string;
  rsvpStatus: string;
}

interface EventTag {
  id: number;
  name: string;
}

export default function EventDetailsPage(): React.JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isRSVPd, setIsRSVPd] = useState<boolean>(false);
  const [likes, setLikes] = useState<number>(24);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState<boolean>(false);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [eventImageUrl, setEventImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [hasOccurred, setHasOccurred] = useState<boolean>(false);
  const [canEditEvent, setCanEditEvent] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    title: "", // This is from event.booking.description
    description: "", // This is from event.description
  });
  const [availableTags, setAvailableTags] = useState<EventTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!eventId) {
        navigate("/404");
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        console.log("eventlist token: ", token);

        // Fetch all event details
        const eventResponse = await fetch(
          `${API_URL}/api/events/eventlist`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );

        if (!eventResponse.ok) {
          if (eventResponse.status === 404) {
            navigate("/404");
            return;
          } else {
            setError("Failed to load events");
            setLoading(false);
            return;
          }
        }
        const allEvents = await eventResponse.json();
        // Fetch specific event
        const eventData = allEvents.find(
          (e: Event) => e.id === parseInt(eventId),
        );

        if (!eventData) {
          setError("Event not found");
          setLoading(false);
          return;
        }

        setEvent(eventData);
        setEditForm({
          title: eventData.booking?.description || "",
          description: eventData.description || "",
        });

        // Calculate if event has occurred
        const now = new Date();
        const eventEndTime = new Date(eventData.endTime);
        setHasOccurred(now > eventEndTime);

        // Check edit permissions if user is logged in
        if (token) {
          try {
            setEditLoading(true);
            const editPermissionResponse = await fetch(
              `${API_URL}/api/events/${eventId}/can-edit`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            if (editPermissionResponse.ok) {
              const permissionData = await editPermissionResponse.json();
              console.log("Edit permission data:", permissionData);
              setCanEditEvent(permissionData.canEdit || false);
            }
          } catch (err) {
            console.error("Error fetching edit permissions:", err);
            setCanEditEvent(false);
          } finally {
            setEditLoading(false);
          }
        }

        // Fetch event tags
        try {
          const tagsResponse = await fetch(
            `${API_URL}/api/events/gettags`,
          );
          if (tagsResponse.ok) {
            const tagsData = await tagsResponse.json();
            setAvailableTags(tagsData);
          }
        } catch (err) {
          console.error("Error fetching tags:", err);
        }

        // Fetch event's current tags
        try {
          const eventTagsResponse = await fetch(
            `${API_URL}/api/events/${eventId}/tags`,
          );
          if (eventTagsResponse.ok) {
            const eventTagsData = await eventTagsResponse.json();
            setSelectedTags(eventTagsData.map((tag: any) => tag.tagId));
          }
        } catch (err) {
          console.error("Error fetching event tags:", err);
        }

        // Fetch event image
        try {
          const imageResponse = await fetch(
            `${API_URL}/api/events/get-image-by-event/${eventId}`,
          );

          if (imageResponse.ok) {
            const blob = await imageResponse.blob();
            const imageUrl = URL.createObjectURL(blob);
            setEventImageUrl(imageUrl);
            setImagePreview(imageUrl);
          }
        } catch (err) {
          console.log("No image available for this event");
        }

        // Fetch RSVP status if logged in
        if (token) {
          try {
            const rsvpStatusResponse = await fetch(
              `${API_URL}/api/events/${eventId}/rsvp-status`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            if (rsvpStatusResponse.ok) {
              const rsvpData = await rsvpStatusResponse.json();
              setIsRSVPd(rsvpData.rsvpd);
            }
          } catch (err) {
            console.error("Error fetching RSVP status:", err);
          }
        }

        // Fetch attendees list
        try {
          const attendeesResponse = await fetch(
            `${API_URL}/api/events/${eventId}/rsvps`,
          );

          if (attendeesResponse.ok) {
            const attendeesData = await attendeesResponse.json();
            setAttendees(attendeesData.attendees);
          }
        } catch (err) {
          console.error("Error fetching attendees:", err);
        }

        // Fetch like count & user like status
        try {
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const likesResponse = await fetch(
            `${API_URL}/api/events/${eventId}/likes`,
            { headers },
          );

          if (likesResponse.ok) {
            const data = await likesResponse.json();
            setLikes(data.count);
            setIsLiked(data.likedByUser);
          }
        } catch (error) {
          console.error("Error fetching likes:", error);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching event:", err);
        setError("Failed to load event");
        setLoading(false);
      }
    };

    fetchAllData();

    // Cleanup: revoke the object URL when component unmounts
    return () => {
      if (eventImageUrl) {
        URL.revokeObjectURL(eventImageUrl);
      }
      if (imagePreview && imagePreview !== eventImageUrl) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [eventId, navigate]);

  const handleEditEvent = () => {
    if (!canEditEvent) {
      alert("You don't have permission to edit this event");
      return;
    }
    setIsEditMode(true);
  };
  useEffect(() => {
    if (!eventId) return;

    const incrementView = async () => {
      try {
        await fetch(`${API_URL}/api/events/${eventId}/views`, {
          method: "POST",
        });
        console.log("View count updated");
      } catch (err) {
        console.error("Failed to increment view count:", err);
      }
    };

    incrementView();
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark flex items-center justify-center">
        <div className="text-text-secondary text-xl">
          Loading event details...
        </div>
      </div>
    );
  }

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setNewImage(null);
    setImagePreview(eventImageUrl);
    // Reset form to original values
    if (event) {
      setEditForm({
        title: event.booking?.description || "",
        description: event.description || "",
      });
    }
  };

  const handleSaveEvent = async () => {
    if (!event || !canEditEvent) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to edit events.");
        return;
      }

      const formData = new FormData();
      formData.append("title", editForm.title); // Add title field
      formData.append("description", editForm.description);
      formData.append("tagIds", JSON.stringify(selectedTags));

      if (newImage) {
        formData.append("image", newImage);
      }

      const response = await fetch(
        `${API_URL}/api/events/${eventId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update event");
      }

      const updatedData = await response.json();

      // Update the event state with new data
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              description: editForm.description,
              booking: prev.booking
                ? {
                    ...prev.booking,
                    description: editForm.title,
                  }
                : { description: editForm.title },
            }
          : null,
      );

      setIsEditMode(false);
      setNewImage(null);

      // Update image preview if new image was uploaded
      if (updatedData.imagePath) {
        if (imagePreview && imagePreview !== eventImageUrl) {
          URL.revokeObjectURL(imagePreview);
        }
        // Fetch the new image
        const imageResponse = await fetch(
          `${API_URL}/api/events/get-image-by-event/${eventId}?t=${Date.now()}`,
        );
        if (imageResponse.ok) {
          const blob = await imageResponse.blob();
          const newImageUrl = URL.createObjectURL(blob);
          setEventImageUrl(newImageUrl);
          setImagePreview(newImageUrl);
        }
      }

      alert("Event updated successfully!");
    } catch (err: any) {
      console.error("Error updating event:", err);
      alert("Failed to update event: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!canEditEvent) {
      alert("You don't have permission to delete this event");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this event? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to delete events.");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/events/${eventId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        alert("Event deleted successfully!");
        navigate("/events"); // Redirect to events list page
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete event");
      }
    } catch (err: any) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event: " + err.message);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const handleLike = async (): Promise<void> => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please log in to like events.");
      return;
    }

    try {
      const method = isLiked ? "DELETE" : "POST";

      const response = await fetch(
        `${API_URL}/api/events/${eventId}/like`,
        {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update like status");
      }

      // Update local UI optimistically
      setIsLiked(!isLiked);
      setLikes((prev) => (isLiked ? prev - 1 : prev + 1));
    } catch (error) {
      console.error("Error updating like:", error);
      alert("Could not update like. Please try again.");
    }
  };

  const handleRSVPClick = async () => {
    if (hasOccurred) {
      alert("This event has already occurred. RSVP is closed.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please log in to RSVP to events.");
      return;
    }

    // If already RSVPd, confirm cancellation
    if (isRSVPd) {
      if (confirm("Cancel your RSVP?")) {
        await handleCancelRSVP(token);
      }
    } else {
      // Otherwise show modal for RSVP confirmation
      setShowEmailModal(true);
    }
  };

  // New helper for deleting RSVP
  const handleCancelRSVP = async (token: string) => {
    setRsvpLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/events/${eventId}/rsvp`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to cancel RSVP");
      }

      const data = await response.json();

      // Check if RSVP was toggled off (cancelled)
      if (!data.rsvpd) {
        setIsRSVPd(false);
        setEvent({
          ...event!,
          numRSVPs: Math.max(0, (event!.numRSVPs || 0) - 1),
        });

        // Refresh attendees list
        try {
          const attendeesResponse = await fetch(
            `${API_URL}/api/events/${eventId}/rsvps`,
          );

          if (attendeesResponse.ok) {
            const attendeesData = await attendeesResponse.json();
            setAttendees(attendeesData.attendees);
          }
        } catch (err) {
          console.error("Error refreshing attendees:", err);
        }

        alert("Your RSVP has been cancelled.");
      } else {
        // This shouldn't happen in cancel flow, but handle it anyway
        alert("Unexpected response from server.");
      }
    } catch (err) {
      console.error("Error cancelling RSVP:", err);
      alert("Failed to cancel RSVP. Please try again.");
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleRSVPSubmit = async (emailNotifications: boolean) => {
    setShowEmailModal(false);
    setRsvpLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/events/${eventId}/rsvp`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emailPreference: emailNotifications ? "email_yes" : "email_no",
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update RSVP");
      }

      const data = await response.json();
      setIsRSVPd(data.rsvpd);

      // Refresh attendees list
      const attendeesResponse = await fetch(
        `${API_URL}/api/events/${eventId}/rsvps`,
      );

      if (attendeesResponse.ok) {
        const attendeesData = await attendeesResponse.json();
        setAttendees(attendeesData.attendees);
      }

      // Refresh event data to update count
      const eventResponse = await fetch(
        `${API_URL}/api/events/eventlist`,
      );
      if (eventResponse.ok) {
        const allEvents = await eventResponse.json();
        const updatedEvent = allEvents.find(
          (e: Event) => e.id === parseInt(eventId!),
        );
        if (updatedEvent) {
          setEvent(updatedEvent);
        }
      }

      const successMessage = emailNotifications
        ? "RSVP confirmed! You'll receive email updates about this event."
        : "RSVP confirmed! You won't receive email updates (you can check back anytime).";

      alert(successMessage);
    } catch (err) {
      console.error("Error updating RSVP:", err);
      alert("Failed to update RSVP. Please try again.");
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Event link copied to clipboard!");
  };

  const handleGoBack = (): void => {
    window.history.back();
  };

  const handleImageError = (userId: number): void => {
    setFailedImages((prev) => new Set(prev).add(userId));
  };

  const handleEventImageError = (): void => {
    setImageError(true);
  };

  const isRsvpDisabled = rsvpLoading || hasOccurred;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark flex items-center justify-center">
        <div className="text-text-secondary text-xl">
          Loading event details...
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <div className="text-red-400 text-xl mb-4">
            {error || "Event not found"}
          </div>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-surface hover:bg-background-lighter text-text-secondary rounded-lg transition border border-border"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button and Edit Controls */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center space-x-2 px-4 py-2 bg-surface hover:bg-background-lighter text-text-secondary rounded-lg transition border border-border"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Events</span>
          </button>

          {/* Edit/Delete buttons for authorized users */}
          {canEditEvent && !editLoading && !isEditMode && !hasOccurred && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleEditEvent}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-medium"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Event</span>
              </button>

              <button
                onClick={handleDeleteEvent}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition font-medium"
              >
                <X className="w-4 h-4" />
                <span>Delete Event</span>
              </button>
            </div>
          )}

          {/* Save/Cancel buttons in edit mode */}
          {isEditMode && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveEvent}
                disabled={isSaving}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </button>

              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition font-medium disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Event Card */}
        <div className="bg-surface rounded-lg shadow-2xl overflow-hidden border border-border">
          {/* Event Image */}
          {imagePreview && !imageError && (
            <div className="relative w-full h-64 md:h-80 overflow-hidden">
              <img
                src={imagePreview}
                alt="Event banner"
                className="w-full h-full object-cover"
                onError={handleEventImageError}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>

              {/* Image upload in edit mode */}
              {isEditMode && (
                <div className="absolute bottom-4 right-4">
                  <label className="flex items-center space-x-2 px-4 py-2 bg-black/70 hover:bg-black/80 text-white rounded-lg transition cursor-pointer">
                    <ImageIcon className="w-4 h-4" />
                    <span>Change Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Event Header with gradient - Edit title in edit mode */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-400 text-text-primary p-6">
            {isEditMode ? (
              <div className="mb-2">
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="w-full text-3xl font-bold bg-white/20 px-3 py-2 rounded border-2 border-white/30 text-text-primary placeholder-white/70"
                  placeholder="Event Title"
                />
              </div>
            ) : (
              <h1 className="text-3xl font-bold mb-2">
                {event?.booking?.description || event?.description || "Event"}
              </h1>
            )}
            <div className="flex items-center space-x-2">
              <p className="text-accent-light">Hosted by</p>
              <button
                onClick={() => navigate(`/clubs/${event?.club.id}`)}
                className="text-accent-light font-semibold hover:text-white underline decoration-2 underline-offset-2 transition-colors"
              >
                {event?.club.name}
              </button>
            </div>
          </div>

          {/* Event Details */}
          <div className="p-6">
            {/* Event Occurred Notice */}
            {hasOccurred && (
              <div className="bg-blue-900 bg-opacity-30 border-l-4 border-blue-500 p-4 mb-6 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-200 mb-1">
                      Event Finished
                    </h3>
                    <p className="text-blue-300 text-sm">
                      This event has already occurred. You can view the details,
                      but RSVP is no longer available.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center space-x-3 p-4 bg-background-lighter rounded-lg border border-border-light">
                <Calendar className="w-6 h-6 text-primary-500 flex-shrink-0" />
                <div>
                  <p className="text-text-muted text-xs">Date</p>
                  <p className="text-text-secondary font-semibold">
                    {new Date(event?.startTime).toDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-background-lighter rounded-lg border border-border-light">
                <Clock className="w-6 h-6 text-primary-500 flex-shrink-0" />
                <div>
                  <p className="text-text-muted text-xs">Time</p>
                  <p className="text-text-secondary font-semibold">
                    {new Date(event?.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -
                    {new Date(event?.endTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-background-lighter rounded-lg border border-border-light">
                <MapPin className="w-6 h-6 text-primary-500 flex-shrink-0" />
                <div>
                  <p className="text-text-muted text-xs">Location</p>
                  <p className="text-text-secondary font-semibold">
                    {event?.room.buildingCode} {event?.room.roomNum}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-text-secondary mb-3">
                About This Event
              </h2>
              {isEditMode ? (
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="w-full p-4 bg-background-lighter border border-border-light rounded-lg text-text-secondary focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={4}
                  placeholder="Enter event description..."
                />
              ) : (
                <p className="text-text-tertiary leading-relaxed">
                  {event?.description || "No description available"}
                </p>
              )}
            </div>

            {/* Tags Section */}
            {isEditMode && availableTags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-text-secondary mb-3 flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  Event Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                        selectedTags.includes(tag.id)
                          ? "bg-primary-600 text-white"
                          : "bg-background-lighter text-text-tertiary hover:bg-surface-light"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Club Information Card */}
            <div
              onClick={() => navigate(`/clubs/${event?.club.id}`)}
              className="mb-6 p-4 bg-gradient-to-r from-primary-600/20 to-primary-400/20 border-2 border-primary-500/30 rounded-lg cursor-pointer hover:border-primary-500/60 hover:bg-primary-600/30 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-text-muted text-xs mb-1">Organized by</p>
                  <h3 className="text-text-secondary font-bold text-lg group-hover:text-primary-300 transition-colors">
                    {event?.club.name}
                  </h3>
                  {event?.club.description && (
                    <p className="text-text-tertiary text-sm mt-1 line-clamp-2">
                      {event.club.description}
                    </p>
                  )}
                </div>
                <ArrowLeft className="w-5 h-5 text-primary-400 transform rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* RSVP Counter */}
            <div className="flex items-center space-x-2 mb-6 text-text-muted">
              <Users className="w-4 h-4" />
              <span className="text-sm">
                {event?._count?.rsvps || event?.numRSVPs || 0}{" "}
                {(event?._count?.rsvps || event?.numRSVPs || 0) === 1
                  ? "person"
                  : "people"}{" "}
                attended
              </span>
            </div>

            {/* Action Buttons - Hide in edit mode */}
            {!isEditMode && (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  {/* RSVP Button */}
                  <button
                    onClick={handleRSVPClick}
                    disabled={isRsvpDisabled}
                    className={`col-span-2 flex items-center justify-center space-x-2 px-6 py-4 rounded-lg font-semibold transition shadow-lg transform hover:scale-105 disabled:opacity-50 ${
                      isRSVPd
                        ? "bg-green-600 hover:bg-green-500 text-white"
                        : "bg-gradient-to-r from-primary-600 to-primary-400 hover:from-primary-500 hover:to-primary-300 text-text-primary"
                    } ${isRsvpDisabled ? "hover:scale-100" : ""}`}
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>
                      {rsvpLoading
                        ? "Processing..."
                        : hasOccurred
                          ? "RSVP Closed"
                          : isRSVPd
                            ? "RSVP Confirmed! (Click to Cancel)"
                            : "RSVP to Event"}
                    </span>
                  </button>

                  {/* Like Button */}
                  <button
                    onClick={handleLike}
                    disabled={!localStorage.getItem("token")}
                    className={`flex items-center justify-center space-x-2 px-6 py-4 rounded-lg font-semibold transition border-2 ${
                      !localStorage.getItem("token")
                        ? "bg-surface-light border-surface-lighter text-text-disabled cursor-not-allowed"
                        : isLiked
                          ? "bg-red-600 border-red-600 text-white hover:bg-red-500 hover:border-red-500"
                          : "bg-background-lighter border-border-light text-text-secondary hover:bg-surface-light hover:border-border-focus"
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`}
                    />
                    <span>{isLiked ? "Liked" : "Like"}</span>
                    <span className="ml-2 text-sm text-text-tertiary">
                      ({likes})
                    </span>
                  </button>
                </div>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="w-full mt-4 flex items-center justify-center space-x-2 px-6 py-3 bg-background-lighter hover:bg-surface-light text-text-secondary rounded-lg transition border border-border-light hover:border-border-focus"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Share Event</span>
                </button>
              </>
            )}
          </div>

          {/* RSVP Confirmation Banner */}
          {isRSVPd && !hasOccurred && !isEditMode && (
            <div className="bg-green-900 bg-opacity-30 border-t-4 border-green-500 p-4 m-6 rounded-lg">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-200 mb-1">
                    You're Going!
                  </h3>
                  <p className="text-green-300 text-sm">
                    We've sent a confirmation email with event details and
                    calendar invite. See you there!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Who's Going Section - Hide in edit mode */}
        {!isEditMode && attendees.length > 0 && (
          <div className="mt-6 bg-surface border border-border rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-5 h-5 text-primary-500" />
              <h3 className="text-lg font-bold text-text-secondary">
                Who's Going ({attendees.length})
              </h3>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-3">
              {attendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-start space-x-3 p-3 bg-background-lighter rounded-lg border border-border-light hover:border-border-focus transition"
                >
                  {attendee.profilePicture && !failedImages.has(attendee.id) ? (
                    <img
                      src={`${API_URL}${attendee.profilePicture}`}
                      alt={`${attendee.firstName} ${attendee.lastName}`}
                      className="flex-shrink-0 w-12 h-12 rounded-full object-cover border-2 border-orange-400"
                      onError={() => handleImageError(attendee.id)}
                    />
                  ) : (
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-400 rounded-full flex items-center justify-center text-text-primary font-semibold">
                      {attendee.firstName.charAt(0)}
                      {attendee.lastName.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-text-secondary font-semibold">
                      {attendee.firstName} {attendee.lastName}
                    </p>
                    <p className="text-text-muted text-sm">{attendee.email}</p>
                    {attendee.bio && (
                      <p className="text-text-muted text-sm mt-1 line-clamp-2">
                        {attendee.bio}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Info - Hide in edit mode */}
        {!isEditMode && (
          <div className="mt-6 bg-surface border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-text-secondary mb-3">
              Important Information
            </h3>
            <ul className="space-y-2 text-text-tertiary text-sm">
              <li className="flex items-start space-x-2">
                <span className="text-primary-500 mt-1">•</span>
                <span>Please arrive 10 minutes early to get settled</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-500 mt-1">•</span>
                <span>Bring your laptop and charger</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-500 mt-1">•</span>
                <span>No prior programming experience required</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-500 mt-1">•</span>
                <span>Refreshments will be provided</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg shadow-2xl max-w-md w-full border border-border-dark">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-text-secondary">
                  Email Notifications
                </h3>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="text-text-muted hover:text-text-secondary"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-text-tertiary mb-6">
                Would you like to receive email updates about this event?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleRSVPSubmit(true)}
                  className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white rounded-lg font-semibold transition"
                >
                  <Mail className="w-5 h-5" />
                  <span>Yes, send me updates</span>
                </button>

                <button
                  onClick={() => handleRSVPSubmit(false)}
                  className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-surface-light hover:bg-surface-lighter text-text-secondary rounded-lg font-semibold transition border border-surface-lighter"
                >
                  <Bell className="w-5 h-5" />
                  <span>No, I'll check back later</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
