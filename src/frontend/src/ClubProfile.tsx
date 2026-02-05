import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Users,
  ArrowLeft,
  AlertCircle,
  Calendar,
  Mail,
  Edit2,
  Save,
  X,
  Instagram,
  UserCog,
  Shield,
  Trash2,
  User as UserIcon,
  ClipboardList,
  Heart,
  HeartOff,
  BarChart3,
} from "lucide-react";

interface ClubProfileRoom {
  buildingCode: string;
  roomNum: string;
}

interface ClubProfileBooking {
  description: string;
  expectedAttendance: number;
}

interface ClubProfileEvent {
  id: string;
  description: string;
  booking?: ClubProfileBooking;
  startTime: string;
  endTime: string;
  room?: ClubProfileRoom;
}

interface ClubProfileMember {
  FirstName: string;
  LastName: string;
  Email?: string;
  User_ID: string;
  Role?: string;
  Bio?: string;
}

interface ClubProfileUserRole {
  clubName: string;
  role: string;
}

interface ClubProfileClub {
  id: string;
  name: string;
  description?: string;
  email?: string;
  officerEmail?: string;
  instagram?: string;
  profilePicture?: string;
  members?: ClubProfileMember[];
  events?: ClubProfileEvent[];
}

interface TaskForm {
  taskName: string;
  taskDescription: string;
}

export default function ClubProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [club, setClub] = useState<ClubProfileClub | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [hasRequestedToJoin, setHasRequestedToJoin] = useState(false);
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ClubProfileClub>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<ClubProfileMember | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ClubProfileMember | null>(
    null,
  );
  const [userRoles, setUserRoles] = useState<ClubProfileUserRole[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskMember, setSelectedTaskMember] =
    useState<ClubProfileMember | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>({
    taskName: "",
    taskDescription: "",
  });
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);

  // Follow/Unfollow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const currentUserId = "1";

  useEffect(() => {
    fetchClubData();
    checkEditPermissions();
    checkMembershipStatus();
    fetchFollowStatus();
    fetchFollowerCount();
    checkMembershipStatus();
  }, [id]);

  const fetchClubData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:3000/api/clubs/${id}`);

      if (!response.ok) {
        throw new Error("Club not found");
      }

      const data: ClubProfileClub = await response.json();
      console.log("Club data:", data);
      setClub(data);
      setProfilePicture(data.profilePicture || null);
      setEditForm({
        name: data.name || "",
        description: data.description || "",
        email: data.email || "",
        officerEmail: data.officerEmail || "",
        instagram: data.instagram || "",
      });
      setError(null);
    } catch (error: any) {
      console.error("Error fetching club:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  const checkMembershipStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Check if user is a member
      const memberResponse = await fetch(
        `http://localhost:3000/api/clubs/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (memberResponse.ok) {
        const clubData = await memberResponse.json();
        const userId = localStorage.getItem("userId"); // You may need to adjust this based on how you store userId

        // Check if current user is in the members list
        const isUserMember = clubData.members?.some(
          (member: any) => member.User_ID === userId,
        );
        setIsMember(isUserMember);

        // If not a member, check if they have a pending request
        if (!isUserMember) {
          checkPendingRequest();
        }
      }
    } catch (error) {
      console.error("Error checking membership status:", error);
    }
  };

  const checkPendingRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // This assumes you have an endpoint to check if user has a pending request
      // If not, you can skip this check and just show the button
      // The backend will return an error if they already have a request
      const response = await fetch(`http://localhost:3000/api/clubs/requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const requests = await response.json();
        const hasPendingRequest = requests.some(
          (req: any) => req.clubId === parseInt(id!),
        );
        setHasRequestedToJoin(hasPendingRequest);
      }
    } catch (error) {
      console.error("Error checking pending request:", error);
    }
  };

  const handleRequestToJoin = async () => {
    try {
      setIsRequestLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please log in to request to join clubs");
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/clubs/${id}/request`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit join request");
      }

      const data = await response.json();
      alert(data.message || "Join request submitted successfully!");
      setHasRequestedToJoin(true);
    } catch (error: any) {
      console.error("Error requesting to join:", error);
      alert("Error: " + error.message);
    } finally {
      setIsRequestLoading(false);
    }
  };

  const checkEditPermissions = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/clubs/${id}/can-edit`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      console.log(data.canEdit);
      setCanEdit(data.canEdit || false);
    } catch (error) {
      console.error("Error checking permissions:", error);
      setCanEdit(false);
    }
  };

  const fetchFollowStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found, user not authenticated");
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/clubs/${id}/follow-status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);
      } else {
        console.error("Failed to fetch follow status:", response.status);
      }
    } catch (error) {
      console.error("Error fetching follow status:", error);
    }
  };

  const fetchFollowerCount = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please log in to follow clubs");
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/clubs/${id}/followers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setFollowerCount(data.followerCount);
      } else {
        console.error("Failed to fetch follower count:", response.status);
      }
    } catch (error) {
      console.error("Error fetching follower count:", error);
    }
  };

  const handleFollowToggle = async () => {
    try {
      setIsFollowLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please log in to follow clubs");
        return;
      }

      const url = `http://localhost:3000/api/clubs/${id}/follow`;
      const method = isFollowing ? "DELETE" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update follow status");
      }

      const data = await response.json();
      setIsFollowing(data.isFollowing);
      setFollowerCount(data.followerCount);

      // Show success message
      const action = data.isFollowing ? "followed" : "unfollowed";
      console.log(`Successfully ${action} ${data.clubName}`);
    } catch (error: any) {
      console.error("Error toggling follow:", error);
      alert("Error: " + error.message);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const fetchUserRoles = async (userId: string) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/users/${userId}/roles`,
      );
      if (response.ok) {
        const roles: ClubProfileUserRole[] = await response.json();
        setUserRoles(roles);
      }
    } catch (error) {
      console.error("Error fetching user roles:", error);
      setUserRoles([]);
    }
  };

  const handleUserClick = async (member: ClubProfileMember) => {
    setSelectedUser(member);
    setShowUserModal(true);
    await fetchUserRoles(member.User_ID);
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`http://localhost:3000/api/clubs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error("Failed to update club");
      }

      const updatedClub: ClubProfileClub = await response.json();
      setClub({ ...club, ...updatedClub });
      setIsEditMode(false);
      alert("Club profile updated successfully!");
    } catch (error: any) {
      alert("Error updating club: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/clubs/${id}/members/${userId}/role`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: newRole,
            managerId: currentUserId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to assign role");
        return;
      }

      alert(data.message);
      setShowRoleModal(false);
      fetchClubData();
    } catch (error: any) {
      alert("Error assigning role: " + error.message);
    }
  };

  const handleRemoveRole = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/api/clubs/${id}/members/${userId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            managerId: currentUserId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to remove role");
        return;
      }

      alert(data.message);
      fetchClubData();
    } catch (error: any) {
      alert("Error removing role: " + error.message);
    }
  };

  const handleOpenTaskModal = (member: ClubProfileMember) => {
    setSelectedTaskMember(member);
    setTaskForm({ taskName: "", taskDescription: "" });
    setShowTaskModal(true);
  };

  const handleTaskFormChange = (field: keyof TaskForm, value: string) => {
    setTaskForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitTask = async () => {
    if (!taskForm.taskName.trim()) {
      alert("Please enter a task name");
      return;
    }

    if (!selectedTaskMember) return;

    try {
      setIsSubmittingTask(true);

      const taskData = {
        clubId: id,
        assignedTo: selectedTaskMember.User_ID,
        assignedToName: `${selectedTaskMember.FirstName} ${selectedTaskMember.LastName}`,
        taskName: taskForm.taskName,
        taskDescription: taskForm.taskDescription,
        assignedBy: currentUserId,
        timestamp: new Date().toISOString(),
      };

      console.log("Task assignment (placeholder):", taskData);

      alert(
        `Task "${taskForm.taskName}" assigned to ${selectedTaskMember.FirstName} ${selectedTaskMember.LastName}!\n\n(Note: Backend integration pending)`,
      );

      setShowTaskModal(false);
      setSelectedTaskMember(null);
      setTaskForm({ taskName: "", taskDescription: "" });
    } catch (error: any) {
      console.error("Error assigning task:", error);
      alert("Error assigning task: " + error.message);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleProfilePictureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    try {
      setIsUploadingPicture(true);

      // Convert to base64 for local storage/preview
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setProfilePicture(base64String);

        // TODO: Replace with actual API endpoint when backend is implemented
        // const formData = new FormData();
        // formData.append('profilePicture', file);
        //
        // const response = await fetch(`http://localhost:3000/api/clubs/${id}/profile-picture`, {
        //   method: 'POST',
        //   headers: {
        //     Authorization: `Bearer ${localStorage.getItem('token')}`,
        //   },
        //   body: formData,
        // });
        //
        // if (!response.ok) {
        //   throw new Error('Failed to upload profile picture');
        // }
        //
        // const data = await response.json();
        // setProfilePicture(data.profilePictureUrl);

        console.log("Profile picture uploaded (placeholder):", {
          clubId: id,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        });

        alert(
          "Profile picture updated!\n\n(Note: Backend integration pending)",
        );
      };

      reader.onerror = () => {
        throw new Error("Failed to read file");
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Error uploading profile picture:", error);
      alert("Error uploading profile picture: " + error.message);
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!confirm("Are you sure you want to remove the profile picture?")) {
      return;
    }

    try {
      setIsUploadingPicture(true);

      // TODO: Replace with actual API endpoint when backend is implemented
      // const response = await fetch(`http://localhost:3000/api/clubs/${id}/profile-picture`, {
      //   method: 'DELETE',
      //   headers: {
      //     Authorization: `Bearer ${localStorage.getItem('token')}`,
      //   },
      // });
      //
      // if (!response.ok) {
      //   throw new Error('Failed to remove profile picture');
      // }

      setProfilePicture(null);
      console.log("Profile picture removed (placeholder)");
      alert("Profile picture removed!\n\n(Note: Backend integration pending)");
    } catch (error: any) {
      console.error("Error removing profile picture:", error);
      alert("Error removing profile picture: " + error.message);
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark flex items-center justify-center">
        <div className="text-text-primary text-xl">
          Loading club information...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <div className="text-red-400 text-xl mb-4">Error: {error}</div>
          <button
            onClick={handleBackClick}
            className="px-6 py-3 bg-accent-dark hover:bg-accent text-text-primary rounded-lg font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={handleBackClick}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary mb-6 transition"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="bg-surface rounded-lg shadow-2xl overflow-hidden border border-border">
          <div className="bg-gradient-to-r from-accent-dark to-primary-400 text-text-primary p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt={`${club?.name} profile`}
                      className="w-20 h-20 rounded-lg shadow-lg object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-white rounded-lg shadow-lg flex items-center justify-center text-3xl font-bold text-accent-dark">
                      {club?.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {canEdit && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label
                        htmlFor="profile-picture-upload"
                        className="cursor-pointer text-white text-xs font-medium"
                      >
                        {isUploadingPicture ? "Uploading..." : "Change"}
                      </label>
                      <input
                        id="profile-picture-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureUpload}
                        disabled={isUploadingPicture}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
                <div>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="text-3xl font-bold bg-white/20 px-3 py-1 rounded border-2 border-white/30 text-text-primary"
                      placeholder="Club Name"
                    />
                  ) : (
                    <h1 className="text-3xl font-bold">{club?.name}</h1>
                  )}
                  {club?.members && (
                    <div className="flex items-center gap-4 mt-2 text-primary-100">
                      <span className="flex items-center gap-1">
                        <Users size={18} />
                        {club.members.length} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart size={18} />
                        {followerCount} followers
                      </span>
                      {club.events && club.events.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Calendar size={18} />
                          {club.events.length} upcoming events
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => navigate(`/event_statistics/${id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition font-semibold"
                  >
                    <BarChart3 size={18} />
                    Event Statistics
                  </button>
                )}

                {/* Request to Join / Follow / Unfollow Button - shown when not in edit mode */}
                {!isEditMode && (
                  <>
                    {!isMember && !hasRequestedToJoin && (
                      <button
                        onClick={handleRequestToJoin}
                        disabled={isRequestLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50"
                      >
                        {isRequestLoading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
                        ) : (
                          <>
                            <UserIcon size={18} />
                            Request to Join
                          </>
                        )}
                      </button>
                    )}

                    {hasRequestedToJoin && !isMember && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold cursor-default">
                        <AlertCircle size={18} />
                        Request Pending
                      </div>
                    )}

                    <button
                      onClick={handleFollowToggle}
                      disabled={isFollowLoading}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50 ${
                        isFollowing
                          ? "bg-surface-light text-text-primary hover:bg-surface-lighter border-2 border-white/30"
                          : "bg-white text-accent-dark hover:bg-gray-100"
                      }`}
                    >
                      {isFollowLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
                      ) : isFollowing ? (
                        <>
                          <HeartOff size={18} />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <Heart size={18} />
                          Follow
                        </>
                      )}
                    </button>
                  </>
                )}

                {/* Edit Button - shown to editors when not in edit mode */}
                {canEdit && !isEditMode && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-accent-dark rounded-lg hover:bg-gray-100 transition font-semibold"
                  >
                    <Edit2 size={18} />
                    Edit Profile
                  </button>
                )}

                {/* Save/Cancel Buttons - shown in edit mode */}
                {isEditMode && (
                  <>
                    <button
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-accent-dark rounded-lg hover:bg-gray-100 transition font-semibold disabled:opacity-50"
                    >
                      <Save size={18} />
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditMode(false);
                        fetchClubData();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-surface-light text-text-primary rounded-lg hover:bg-surface-lighter transition"
                    >
                      <X size={18} />
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="p-4 bg-surface-light rounded-lg border border-border-light">
                  <h3 className="font-semibold text-text-secondary mb-2">
                    About
                  </h3>
                  {isEditMode ? (
                    <textarea
                      value={editForm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full p-3 bg-surface border border-border-light rounded text-text-primary min-h-[100px]"
                      placeholder="Enter club description..."
                    />
                  ) : (
                    <p className="text-text-tertiary whitespace-pre-wrap">
                      {club?.description || "No description available."}
                    </p>
                  )}
                </div>

                {club?.events && club.events.length > 0 && (
                  <div className="p-4 bg-surface-light rounded-lg border border-border-light">
                    <h3 className="font-semibold text-text-secondary mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-accent-light" />
                      Upcoming Events
                    </h3>
                    <div className="space-y-3">
                      {club.events.map((event) => (
                        <div
                          key={event.id}
                          className="p-3 bg-surface rounded border border-border-light hover:border-border-focus cursor-pointer transition"
                          onClick={() => navigate(`/event/${event.id}`)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-text-primary">
                              {event.description ||
                                event.booking?.description ||
                                "Event"}
                            </h4>
                            <span className="text-xs text-accent-light">
                              {new Date(event.startTime).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-text-muted">
                            <span>
                              {new Date(event.startTime).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                              {" - "}
                              {new Date(event.endTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {event.room && (
                              <span>
                                📍 {event.room.buildingCode}{" "}
                                {event.room.roomNum}
                              </span>
                            )}
                            {event.booking?.expectedAttendance && (
                              <span>
                                👥 {event.booking.expectedAttendance} expected
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {club?.members && club.members.length > 0 && (
                  <div className="p-4 bg-surface-light rounded-lg border border-border-light">
                    <h3 className="font-semibold text-text-secondary mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5 text-accent-light" />
                      Members & Officers
                    </h3>
                    <div className="space-y-2">
                      {club.members.map((member, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-surface rounded border border-border-light"
                        >
                          <div
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition"
                            onClick={() => handleUserClick(member)}
                          >
                            <div className="w-10 h-10 bg-accent-darker rounded-full flex items-center justify-center text-accent-light font-semibold">
                              {member.FirstName.charAt(0)}
                              {member.LastName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-text-secondary hover:text-accent-light transition">
                                {member.FirstName} {member.LastName}
                              </div>
                              {member.Email && (
                                <div className="text-xs text-text-muted">
                                  {member.Email}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {member.Role && (
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                                  member.Role === "admin"
                                    ? "bg-purple-900 text-purple-300"
                                    : member.Role === "officer"
                                      ? "bg-accent-darker text-accent-lighter"
                                      : "bg-surface-light text-text-tertiary"
                                }`}
                              >
                                {member.Role}
                              </span>
                            )}
                            {canEdit && member.User_ID !== currentUserId && (
                              <div className="flex gap-1">
                                <button
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleOpenTaskModal(member);
                                  }}
                                  className="p-2 bg-green-600 hover:bg-green-500 text-white rounded transition"
                                  title="Assign Task"
                                >
                                  <ClipboardList size={16} />
                                </button>
                                {canEdit && (
                                  <>
                                    <button
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setSelectedMember(member);
                                        setShowRoleModal(true);
                                      }}
                                      className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition"
                                      title="Assign Role"
                                    >
                                      <UserCog size={16} />
                                    </button>
                                    {member.Role &&
                                      member.Role !== "member" && (
                                        <button
                                          onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            handleRemoveRole(member.User_ID);
                                          }}
                                          className="p-2 bg-red-600 hover:bg-red-500 text-white rounded transition"
                                          title="Remove Role"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-surface-light rounded-lg border border-border-light">
                  <h3 className="font-semibold text-text-secondary mb-3">
                    Profile Picture
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      {profilePicture ? (
                        <img
                          src={profilePicture}
                          alt={`${club?.name} profile`}
                          className="w-32 h-32 rounded-lg object-cover shadow-lg"
                        />
                      ) : (
                        <div className="w-32 h-32 bg-accent-darker rounded-lg flex items-center justify-center text-5xl font-bold text-accent-light shadow-lg">
                          {club?.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {canEdit && (
                      <div className="space-y-2">
                        <label
                          htmlFor="sidebar-profile-picture-upload"
                          className="block w-full p-2 bg-accent-dark hover:bg-accent text-text-primary rounded-lg transition font-medium text-center cursor-pointer"
                        >
                          {isUploadingPicture
                            ? "Uploading..."
                            : profilePicture
                              ? "Change Picture"
                              : "Upload Picture"}
                        </label>
                        <input
                          id="sidebar-profile-picture-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureUpload}
                          disabled={isUploadingPicture}
                          className="hidden"
                        />
                        {profilePicture && (
                          <button
                            onClick={handleRemoveProfilePicture}
                            disabled={isUploadingPicture}
                            className="w-full p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition font-medium disabled:opacity-50"
                          >
                            Remove Picture
                          </button>
                        )}
                        <p className="text-xs text-text-muted text-center">
                          Max size: 5MB. Supported: JPG, PNG, GIF
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-surface-light rounded-lg border border-border-light">
                  <h3 className="font-semibold text-text-secondary mb-3">
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    {isEditMode ? (
                      <>
                        <div>
                          <label className="text-xs text-text-muted block mb-1">
                            Club Email
                          </label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              setEditForm({
                                ...editForm,
                                email: e.target.value,
                              })
                            }
                            className="w-full p-2 bg-surface border border-border-light rounded text-text-primary text-sm"
                            placeholder="club@example.com"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-text-muted block mb-1">
                            Officer Email
                          </label>
                          <input
                            type="email"
                            value={editForm.officerEmail}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              setEditForm({
                                ...editForm,
                                officerEmail: e.target.value,
                              })
                            }
                            className="w-full p-2 bg-surface border border-border-light rounded text-text-primary text-sm"
                            placeholder="officer@example.com"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-text-muted block mb-1">
                            Instagram
                          </label>
                          <input
                            type="text"
                            value={editForm.instagram}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              setEditForm({
                                ...editForm,
                                instagram: e.target.value,
                              })
                            }
                            className="w-full p-2 bg-surface border border-border-light rounded text-text-primary text-sm"
                            placeholder="@clubname or https://instagram.com/..."
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {club?.email && (
                          <a
                            href={`mailto:${club.email}`}
                            className="flex items-center gap-2 text-text-tertiary hover:text-accent-light transition"
                          >
                            <Mail size={18} />
                            <span className="text-sm break-all">
                              {club.email}
                            </span>
                          </a>
                        )}
                        {club?.officerEmail && (
                          <a
                            href={`mailto:${club.officerEmail}`}
                            className="flex items-center gap-2 text-text-tertiary hover:text-accent-light transition"
                          >
                            <Mail size={18} />
                            <span className="text-sm break-all">
                              Officer: {club.officerEmail}
                            </span>
                          </a>
                        )}
                        {club?.instagram && (
                          <a
                            href={
                              club.instagram.startsWith("http")
                                ? club.instagram
                                : `https://instagram.com/${club.instagram.replace("@", "")}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-text-tertiary hover:text-pink-400 transition"
                          >
                            <Instagram size={18} />
                            <span className="text-sm">{club.instagram}</span>
                          </a>
                        )}
                        {!club?.email &&
                          !club?.officerEmail &&
                          !club?.instagram && (
                            <p className="text-text-disabled text-sm italic">
                              No contact information available
                            </p>
                          )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Assignment Modal */}
      {showTaskModal && selectedTaskMember && (
        <div className="fixed inset-0 bg-background-dark/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg max-w-lg w-full mx-4 border border-border">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-lg">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-white" />
                <div>
                  <h3 className="text-2xl font-bold text-white">Assign Task</h3>
                  <p className="text-green-100 text-sm">
                    To: {selectedTaskMember.FirstName}{" "}
                    {selectedTaskMember.LastName}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-text-secondary font-medium mb-2">
                  Task Name *
                </label>
                <input
                  type="text"
                  value={taskForm.taskName}
                  onChange={(e) =>
                    handleTaskFormChange("taskName", e.target.value)
                  }
                  placeholder="Enter task name..."
                  className="w-full p-3 bg-surface-light border border-border-light rounded text-text-primary focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-text-secondary font-medium mb-2">
                  Task Description
                </label>
                <textarea
                  value={taskForm.taskDescription}
                  onChange={(e) =>
                    handleTaskFormChange("taskDescription", e.target.value)
                  }
                  placeholder="Enter task description (optional)..."
                  className="w-full p-3 bg-surface-light border border-border-light rounded text-text-primary min-h-[120px] focus:ring-2 focus:ring-green-500 focus:border-transparent resize-vertical"
                  maxLength={500}
                />
                <div className="text-xs text-text-muted mt-1">
                  {taskForm.taskDescription.length}/500 characters
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSubmitTask}
                  disabled={isSubmittingTask || !taskForm.taskName.trim()}
                  className="flex-1 p-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingTask ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <ClipboardList size={18} />
                      Assign Task
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setSelectedTaskMember(null);
                    setTaskForm({ taskName: "", taskDescription: "" });
                  }}
                  disabled={isSubmittingTask}
                  className="px-6 p-3 bg-surface-light hover:bg-surface-lighter text-text-primary rounded-lg transition font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 text-xs text-amber-200">
                <strong>Note:</strong> Task assignment backend is pending
                implementation. Task data will be logged to console.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-background-dark/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg max-w-lg w-full mx-4 border border-border max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-lg">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-3xl font-bold text-blue-600">
                  {selectedUser.FirstName.charAt(0)}
                  {selectedUser.LastName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {selectedUser.FirstName} {selectedUser.LastName}
                  </h3>
                  <p className="text-blue-100 text-sm">{selectedUser.Email}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-surface-light rounded-lg p-4 border border-border-light">
                <h4 className="font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <UserIcon size={18} className="text-blue-400" />
                  User Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Name:</span>
                    <span className="text-text-secondary">
                      {selectedUser.FirstName} {selectedUser.LastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Email:</span>
                    <a
                      href={`mailto:${selectedUser.Email}`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {selectedUser.Email}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Role in this club:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                        selectedUser.Role === "admin"
                          ? "bg-purple-900 text-purple-300"
                          : selectedUser.Role === "officer"
                            ? "bg-accent-darker text-accent-lighter"
                            : "bg-surface-light text-text-tertiary"
                      }`}
                    >
                      {selectedUser.Role || "Member"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-light rounded-lg p-4 border border-border-light">
                <h4 className="font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <UserIcon size={18} className="text-blue-400" />
                  Bio
                </h4>
                <p className="text-text-tertiary whitespace-pre-wrap">
                  {selectedUser.Bio || "No bio available."}
                </p>
              </div>

              {userRoles.length > 0 && (
                <div className="bg-surface-light rounded-lg p-4 border border-border-light">
                  <h4 className="font-semibold text-text-secondary mb-3 flex items-center gap-2">
                    <Shield size={18} className="text-accent-light" />
                    All Club Memberships
                  </h4>
                  <div className="space-y-2">
                    {userRoles.map((role, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-surface rounded"
                      >
                        <span className="text-text-tertiary text-sm">
                          {role.clubName}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                            role.role === "admin"
                              ? "bg-purple-900 text-purple-300"
                              : role.role === "officer"
                                ? "bg-accent-darker text-accent-lighter"
                                : "bg-surface-light text-text-tertiary"
                          }`}
                        >
                          {role.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                  setUserRoles([]);
                }}
                className="w-full p-3 bg-surface-light hover:bg-surface-lighter text-text-primary rounded-lg transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {showRoleModal && selectedMember && (
        <div className="fixed inset-0 bg-background-dark/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4 border border-border">
            <h3 className="text-xl font-bold text-text-primary mb-4">
              Assign Role to {selectedMember.FirstName}{" "}
              {selectedMember.LastName}
            </h3>
            <div className="space-y-2">
              <button
                onClick={() =>
                  handleAssignRole(selectedMember.User_ID, "officer")
                }
                className="w-full p-3 bg-accent-dark hover:bg-accent text-text-primary rounded-lg transition font-medium"
              >
                <UserCog className="inline mr-2" size={18} />
                Assign as Officer
              </button>
              <button
                onClick={() =>
                  handleAssignRole(selectedMember.User_ID, "member")
                }
                className="w-full p-3 bg-surface-lighter hover:bg-border-light text-text-primary rounded-lg transition font-medium"
              >
                <Users className="inline mr-2" size={18} />
                Set as Member
              </button>
              <button
                onClick={() => setShowRoleModal(false)}
                className="w-full p-3 bg-surface-light hover:bg-surface-lighter text-text-primary rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
