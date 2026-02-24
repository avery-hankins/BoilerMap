import { API_URL } from "./config";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Edit2,
  Save,
  X,
  Upload,
  LogOut,
  Home,
  Users,
  ClipboardList,
  CheckCircle,
  Building,
  UserCheck,
  Calendar,
  Copy,
  Download,
  ExternalLink,
} from "lucide-react";

interface UserData {
  id: number;
  username: string;
  email: string;
  bio: string;
}

interface Membership {
  clubId: number;
  clubName?: string;
  role?: string;
}

interface FollowingClub {
  id: number;
  name: string;
  description: string;
  instagram?: string;
  memberCount: number;
  eventCount: number;
}

interface FormData {
  username: string;
  email: string;
  bio: string;
}

interface ClubNameCache {
  [key: number]: string;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  createdAt: string;
  userTasks?: Array<{
    user: {
      id: number;
      firstName: string;
      lastName: string;
    };
  }>;
}

function UserInfo() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [followingClubs, setFollowingClubs] = useState<FollowingClub[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    bio: "",
  });
  const [saving, setSaving] = useState(false);
  const [removingClub, setRemovingClub] = useState<number | null>(null);
  const [unfollowingClub, setUnfollowingClub] = useState<number | null>(null);
  const [completingTask, setCompletingTask] = useState<number | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [calendarFeedUrl, setCalendarFeedUrl] = useState<string | null>(null);
  const [caldavUrl, setCaldavUrl] = useState<string | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleHomeRedirect = () => {
    navigate("/");
  };

  const fetchClubNamesFor = async (
    clubIds: number[],
    token: string,
  ): Promise<ClubNameCache> => {
    const nameCache: ClubNameCache = {};
    const results: ClubNameCache = {};

    const uniqueIds = Array.from(
      new Set(clubIds.map((id: number) => Number(id))),
    );

    await Promise.all(
      uniqueIds.map(async (id: number) => {
        try {
          const resp = await fetch(
            `${API_URL}/api/clubs/convert-clubid?clubId=${id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (!resp.ok) {
            nameCache[id] = `Club ${id}`;
            return;
          }
          const data = await resp.json();
          nameCache[id] = data.name || `Club ${id}`;
        } catch (err) {
          console.error(`Error fetching club name for ${id}:`, err);
          nameCache[id] = `Club ${id}`;
        }
      }),
    );

    uniqueIds.forEach(
      (id: number) => (results[id] = nameCache[id] || `Club ${id}`),
    );
    return results;
  };

  const fetchMembershipRoles = async (
    memberships: Membership[],
    token: string,
  ): Promise<Membership[]> => {
    const updatedMemberships = await Promise.all(
      memberships.map(async (m: Membership) => {
        try {
          const resp = await fetch(
            `${API_URL}/api/clubs/getauthbyclub/${m.clubId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (!resp.ok) throw new Error("Failed to fetch role");
          const data = await resp.json();

          return {
            ...m,
            role: data.role
              ? data.role.charAt(0).toUpperCase() + data.role.slice(1)
              : "Unknown",
          };
        } catch (err) {
          console.error("Error fetching role for club", m.clubId, err);
          return { ...m, role: "Unknown" };
        }
      }),
    );
    return updatedMemberships;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Not logged in.");

        const userResponse = await fetch(
          `${API_URL}/api/users/userdata`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!userResponse.ok) throw new Error("Failed to fetch user data");
        const user = await userResponse.json();
        setUserData(user);
        setFormData({
          username: user.username || "",
          email: user.email || "",
          bio: user.bio || "",
        });

        try {
          const photoResponse = await fetch(
            `${API_URL}/api/users/profile-photo`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (photoResponse.ok) {
            const blob = await photoResponse.blob();
            setPhotoURL(URL.createObjectURL(blob));
          } else {
            setPhotoURL(null);
          }
        } catch (photoErr) {
          console.warn("Profile photo fetch failed:", photoErr);
          setPhotoURL(null);
        }

        const membershipsResponse = await fetch(
          `${API_URL}/api/users/club-memberships`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const membershipData = membershipsResponse.ok
          ? await membershipsResponse.json()
          : [];

        if (membershipData.length > 0) {
          const clubIds = membershipData.map((m: Membership) => m.clubId);
          const namesMap = await fetchClubNamesFor(clubIds, token);

          let membershipWithNames = membershipData.map((m: Membership) => ({
            ...m,
            clubName: namesMap[m.clubId] || `Club ${m.clubId}`,
          }));

          membershipWithNames = await fetchMembershipRoles(
            membershipWithNames,
            token,
          );

          setMemberships(membershipWithNames);
        } else {
          setMemberships([]);
        }

        // Fetch tasks from database
        if (user.id) {
          try {
            const tasksResponse = await fetch(
              `${API_URL}/api/tasks/user/${user.id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (tasksResponse.ok) {
              const tasksData = await tasksResponse.json();
              setTasks(tasksData);
            } else {
              console.warn("Failed to fetch tasks");
              setTasks([]);
            }
          } catch (tasksErr) {
            console.error("Error fetching tasks:", tasksErr);
            setTasks([]);
          }
        }
        // Fetch clubs the user is following
        const userId = user.id;
        if (userId) {
          try {
            const followingResponse = await fetch(
              `${API_URL}/api/users/${userId}/following`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            if (followingResponse.ok) {
              const followingData = await followingResponse.json();
              setFollowingClubs(followingData.clubs || []);
            } else {
              setFollowingClubs([]);
            }
          } catch (followingErr) {
            console.warn("Failed to fetch following clubs:", followingErr);
            setFollowingClubs([]);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (photoURL) URL.revokeObjectURL(photoURL);
    };
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/users/userdata`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          bio: formData.bio,
        }),
      });

      const text = await response.text();
      if (!response.ok)
        throw new Error(JSON.parse(text).error || "Failed to update profile");
      const updatedData = JSON.parse(text);
      setUserData(updatedData);
      setIsEditing(false);
    } catch (err: any) {
      console.error("Update error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: userData?.username || "",
      email: userData?.email || "",
      bio: userData?.bio || "",
    });
    setIsEditing(false);
    setError(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setPhotoFile(file);
      setPhotoURL(URL.createObjectURL(file));
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    setUploadingPhoto(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const formDataObj = new FormData();
      formDataObj.append("photo", photoFile);

      const response = await fetch(
        `${API_URL}/api/users/upload-profile-photo`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: formDataObj,
        },
      );

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to upload photo");

      try {
        const photoResponse = await fetch(
          `${API_URL}/api/users/profile-photo`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (photoResponse.ok) {
          const blob = await photoResponse.blob();
          if (photoURL) URL.revokeObjectURL(photoURL);
          setPhotoURL(URL.createObjectURL(blob));
        }
      } catch (refreshErr) {
        console.warn("Could not refresh photo after upload:", refreshErr);
      }

      alert("Profile photo uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
      setPhotoFile(null);
    }
  };

  const handleLeaveClub = async (clubId: number) => {
    const confirmLeave = window.confirm(
      "Are you sure you want to leave this club?",
    );
    if (!confirmLeave) return;

    try {
      setRemovingClub(clubId);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/users/club-memberships`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ clubId }),
        },
      );

      let result;
      try {
        result = await response.json();
      } catch {
        const text = await response.text();
        throw new Error(`Unexpected server response: ${text}`);
      }

      if (!response.ok) throw new Error(result.error || "Failed to leave club");

      setMemberships((prev) => prev.filter((m) => m.clubId !== clubId));
      alert("You have successfully left the club.");
    } catch (err: any) {
      console.error("Error leaving club:", err);
      alert(err.message);
    } finally {
      setRemovingClub(null);
    }
  };

  const handleUnfollowClub = async (clubId: number) => {
    const confirmUnfollow = window.confirm(
      "Are you sure you want to unfollow this club?",
    );
    if (!confirmUnfollow) return;

    try {
      setUnfollowingClub(clubId);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/clubs/${clubId}/follow`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      let result;
      try {
        result = await response.json();
      } catch {
        const text = await response.text();
        throw new Error(`Unexpected server response: ${text}`);
      }

      if (!response.ok)
        throw new Error(result.error || "Failed to unfollow club");

      setFollowingClubs((prev) => prev.filter((club) => club.id !== clubId));
      alert("You have successfully unfollowed the club.");
    } catch (err: any) {
      console.error("Error unfollowing club:", err);
      alert(err.message);
    } finally {
      setUnfollowingClub(null);
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    const confirmComplete = window.confirm(
      "Mark this task as complete? This will remove it from your task list.",
    );
    if (!confirmComplete) return;

    try {
      setCompletingTask(taskId);

      const token = localStorage.getItem("token");
      if (!userData?.id) {
        throw new Error("User ID not found");
      }

      const response = await fetch(
        `${API_URL}/api/tasks/${taskId}/user/${userData.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to complete task");
      }

      // Remove task from local state
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      alert("Task completed successfully!");
    } catch (err: any) {
      console.error("Error completing task:", err);
      alert(err.message);
    } finally {
      setCompletingTask(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const generateCalendarToken = async () => {
    try {
      setLoadingCalendar(true);
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/api/calendar/generate-token`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to generate calendar token");
      }

      const data = await response.json();
      setCalendarToken(data.token);
      setCalendarFeedUrl(data.feedUrl);
      setCaldavUrl(data.caldavUrl);
    } catch (err: any) {
      console.error("Error generating calendar token:", err);
      alert(err.message);
    } finally {
      setLoadingCalendar(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy to clipboard");
    }
  };

  const downloadICS = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/calendar/download?token=${calendarToken}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to download calendar");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "boilermap-events.ics";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Error downloading calendar:", err);
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark flex items-center justify-center">
        <div className="text-text-tertiary text-xl">Loading user data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark flex items-center justify-center">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark">
          <div className="bg-gradient-to-r from-accent-dark to-accent text-white p-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <User className="w-8 h-8" />
              User Profile
            </h1>
          </div>
        </div>

        <div className="bg-surface rounded-lg shadow-2xl border border-border-dark p-6">
          <div className="flex flex-col items-center mb-8">
            {photoURL ? (
              <img
                src={photoURL}
                alt="Profile"
                className="w-40 h-40 rounded-full object-cover border-4 border-accent-dark shadow-lg"
                onError={() => setPhotoURL(null)}
              />
            ) : (
              <div className="w-40 h-40 rounded-full bg-surface-light border-4 border-accent-dark flex items-center justify-center">
                <User className="w-20 h-20 text-text-disabled" />
              </div>
            )}

            <div className="mt-4 flex flex-col items-center gap-2">
              <label className="cursor-pointer bg-surface-light hover:bg-surface-lighter text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-border-light">
                <Upload className="w-4 h-4" />
                Choose Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
              {photoFile && (
                <button
                  onClick={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="bg-gradient-to-r from-accent-dark to-accent hover:from-accent hover:to-accent-light text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                </button>
              )}
            </div>
          </div>

          {!isEditing ? (
            <div className="space-y-4">
              <div className="p-4 bg-surface-light rounded-lg border border-border-light">
                <div className="flex items-center gap-2 text-accent-light mb-2">
                  <User className="w-5 h-5" />
                  <span className="font-semibold">Username</span>
                </div>
                <div className="text-white text-lg">{userData?.username}</div>
              </div>

              <div className="p-4 bg-surface-light rounded-lg border border-border-light">
                <div className="flex items-center gap-2 text-accent-light mb-2">
                  <Mail className="w-5 h-5" />
                  <span className="font-semibold">Email</span>
                </div>
                <div className="text-white text-lg">{userData?.email}</div>
              </div>

              <div className="p-4 bg-surface-light rounded-lg border border-border-light">
                <div className="text-accent-light font-semibold mb-2">Bio</div>
                <p className="text-text-tertiary">
                  {userData?.bio || "No bio added yet."}
                </p>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="w-full bg-gradient-to-r from-accent-dark to-accent hover:from-accent hover:to-accent-light text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-105 flex items-center justify-center gap-2"
              >
                <Edit2 className="w-5 h-5" />
                Edit Profile
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-text-tertiary font-semibold mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-surface-light text-white rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-text-tertiary font-semibold mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  readOnly
                  className="w-full px-4 py-3 bg-surface-lighter text-text-muted rounded-lg border border-border-light cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-text-tertiary font-semibold mb-2">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  maxLength={500}
                  placeholder="Tell us about yourself..."
                  className="w-full px-4 py-3 bg-surface-light text-white rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-accent resize-vertical"
                />
                <small className="text-text-muted">
                  {formData.bio.length}/500 characters
                </small>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-accent-dark to-accent hover:from-accent hover:to-accent-light text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 bg-surface-light hover:bg-surface-lighter text-white font-semibold py-3 px-6 rounded-lg border border-border-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Tasks Section */}
        <div className="bg-surface rounded-lg shadow-2xl border border-border-dark p-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-accent-light" />
            My Tasks
          </h2>

          {tasks.length === 0 ? (
            <p className="text-text-muted text-center py-8">
              No pending tasks. Great job!
            </p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-surface-light border border-border-light rounded-lg p-4 hover:bg-surface-lighter transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg mb-1">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-text-tertiary text-sm mb-3">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={completingTask === task.id}
                      className="ml-4 p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
                      title="Mark as complete"
                    >
                      <CheckCircle className="w-5 h-5" />
                      {completingTask === task.id
                        ? "Completing..."
                        : "Complete"}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm">
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-text-muted">
                        <ClipboardList className="w-4 h-4 text-accent-light" />
                        <span>Due: {formatDate(task.dueDate)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-text-muted">
                      <ClipboardList className="w-4 h-4 text-accent-light" />
                      <span>Created: {formatDate(task.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar Subscription Section */}
        <div className="bg-surface rounded-lg shadow-2xl border border-border-dark p-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-accent-light" />
            Calendar Sync
          </h2>

          <p className="text-text-tertiary mb-6">
            Sync your RSVP'd events with your personal calendar. Subscribe to
            your calendar feed to automatically receive updates when you RSVP to
            new events.
          </p>

          {!calendarFeedUrl ? (
            <button
              onClick={generateCalendarToken}
              disabled={loadingCalendar}
              className="w-full bg-gradient-to-r from-accent-dark to-accent hover:from-accent hover:to-accent-light text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              {loadingCalendar ? "Generating..." : "Generate Calendar Feed"}
            </button>
          ) : (
            <div className="space-y-4">
              {/* Calendar Feed URL */}
              <div className="bg-surface-light border border-border-light rounded-lg p-4">
                <label className="block text-accent-light font-semibold mb-2">
                  Calendar Feed URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={calendarFeedUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-surface-lighter text-text-secondary text-sm rounded border border-border-light font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(calendarFeedUrl)}
                    className="bg-accent-dark hover:bg-accent text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    {copiedUrl ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={downloadICS}
                  className="bg-surface-light hover:bg-surface-lighter text-white font-semibold py-3 px-4 rounded-lg border border-border-light transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download .ICS File
                </button>
                <button
                  onClick={generateCalendarToken}
                  disabled={loadingCalendar}
                  className="bg-surface-light hover:bg-surface-lighter text-white font-semibold py-3 px-4 rounded-lg border border-border-light transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Calendar className="w-5 h-5" />
                  {loadingCalendar ? "Regenerating..." : "Regenerate URL"}
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-surface-light border border-accent-dark border-opacity-30 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-accent-light" />
                  How to Subscribe
                </h3>

                <div className="space-y-4 text-text-tertiary text-sm">
                  <div>
                    <p className="font-semibold text-accent-light mb-1">
                      For iCloud Calendar (iPhone/Mac):
                    </p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Open the Calendar app</li>
                      <li>
                        Go to File → New Calendar Subscription (Mac) or tap
                        "Calendars" → "Add Calendar" (iPhone)
                      </li>
                      <li>Paste the Calendar Feed URL above</li>
                      <li>Set auto-refresh to check for updates regularly</li>
                    </ol>
                  </div>

                  <div>
                    <p className="font-semibold text-accent-light mb-1">
                      For Google Calendar:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Open Google Calendar on desktop</li>
                      <li>Click the "+" next to "Other calendars"</li>
                      <li>Select "From URL"</li>
                      <li>Paste the Calendar Feed URL above</li>
                      <li>Click "Add calendar"</li>
                    </ol>
                  </div>

                  <div>
                    <p className="font-semibold text-accent-light mb-1">
                      One-time Import:
                    </p>
                    <p className="ml-2">
                      Click "Download .ICS File" above and open it with your
                      calendar app for a one-time import of your current events.
                      Note: This won't auto-update when you RSVP to new events.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-surface rounded-lg shadow-2xl border border-border-dark p-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-7 h-7 text-accent-light" />
            My Club Memberships
          </h2>

          {memberships.length === 0 ? (
            <p className="text-text-muted text-center py-8">
              You haven&apos;t joined any clubs yet.
            </p>
          ) : (
            <div className="space-y-3">
              {memberships.map((membership) => (
                <div
                  key={membership.clubId}
                  className="bg-surface-light border border-border-light rounded-lg p-4 flex justify-between items-center hover:bg-surface-lighter transition-colors"
                >
                  <div>
                    <div className="text-white font-semibold text-lg">
                      {membership.clubName || `Club ${membership.clubId}`}
                    </div>
                    {membership.role && (
                      <div className="text-accent-light text-sm mt-1">
                        {membership.role}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleLeaveClub(membership.clubId)}
                    disabled={removingClub === membership.clubId}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removingClub === membership.clubId
                      ? "Leaving..."
                      : "Leave Club"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-lg shadow-2xl border border-border-dark p-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-7 h-7 text-accent-light" />
            Clubs I&apos;m Following
          </h2>

          {followingClubs.length === 0 ? (
            <p className="text-text-muted text-center py-8">
              You aren&apos;t following any clubs yet.
            </p>
          ) : (
            <div className="space-y-3">
              {followingClubs.map((club) => (
                <div
                  key={club.id}
                  className="bg-surface-light border border-border-light rounded-lg p-4 flex justify-between items-center hover:bg-surface-lighter transition-colors"
                >
                  <div>
                    <div className="text-white font-semibold text-lg">
                      {club.name}
                    </div>
                    {club.description && (
                      <div className="text-text-muted text-sm mt-1">
                        {club.description}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnfollowClub(club.id)}
                    disabled={unfollowingClub === club.id}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {unfollowingClub === club.id
                      ? "Unfollowing..."
                      : "Unfollow"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleHomeRedirect}
            className="flex-1 bg-gradient-to-r from-accent-dark to-accent hover:from-accent hover:to-accent-light text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-105 flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Home
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-105 flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserInfo;
