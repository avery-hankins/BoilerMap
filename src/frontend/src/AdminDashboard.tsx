import { API_URL } from "./config";
import React, { useState, useEffect } from "react";
import {
  Users,
  Shield,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  Filter,
  AlertCircle,
  UserCog,
  X,
} from "lucide-react";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "club_leader" | "student";
  bio?: string;
  _count?: {
    clubMemberships: number;
    clubAdmins: number;
  };
}

interface AdminDashboardProps {
  setView?: (view: string) => void;
}

export default function AdminDashboard({ setView }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClubLeader, setIsClubLeader] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  const checkAdminStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to access this page");
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to verify status");
      }

      const userData = await response.json();

      // Check if user is a website admin, club admin, or officer
      const isWebsiteAdmin = userData.role === "admin";
      const isClubAdmin = userData._count?.clubAdmins > 0;
      const isClubOfficer = userData.clubMemberships?.some(
        (m: any) => m.role === "officer",
      );

      if (!isWebsiteAdmin) {
        setError("Access denied. You must be a website admin");
        setIsLoading(false);
        return;
      }

      // Set permissions
      setIsAdmin(isWebsiteAdmin); // Only website admins can promote/demote/delete
      setIsClubLeader(isWebsiteAdmin || isClubAdmin || isClubOfficer); // Can view user list
    } catch (err) {
      console.error("Error checking status:", err);
      setError("Failed to verify permissions");
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/api/users/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.firstName.toLowerCase().includes(query) ||
          user.lastName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query),
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handlePromoteUser = async (userId: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/users/${userId}/promote`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to promote user");
      }

      const result = await response.json();
      alert(result.message);
      fetchUsers();
    } catch (err: any) {
      alert("Error promoting user: " + err.message);
    }
  };

  const handleDemoteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to demote this user?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/users/${userId}/demote`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to demote user");
      }

      const result = await response.json();
      alert(result.message);
      fetchUsers();
    } catch (err: any) {
      alert("Error demoting user: " + err.message);
    }
  };

  const handleDeleteUser = async (userId: number, userEmail: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${userEmail}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/admin/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user");
      }

      const result = await response.json();
      alert(result.message);
      setShowUserModal(false);
      fetchUsers();
    } catch (err: any) {
      alert("Error deleting user: " + err.message);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-900 text-purple-300 border-purple-700";
      case "club_leader":
        return "bg-blue-900 text-blue-300 border-blue-700";
      case "student":
        return "bg-gray-700 text-gray-300 border-gray-600";
      default:
        return "bg-gray-700 text-gray-300 border-gray-600";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "club_leader":
        return "Club Leader";
      case "student":
        return "Student";
      default:
        return role;
    }
  };

  const canPromote = (role: string) => {
    return role === "student" || role === "club_leader";
  };

  const canDemote = (role: string) => {
    return role === "club_leader" || role === "admin";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  if (error && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <p className="text-gray-400 mb-4">
            You need administrator privileges to access this page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <p className="text-gray-400">Manage users and system permissions</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-white">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Admins</p>
                <p className="text-2xl font-bold text-white">
                  {users.filter((u) => u.role === "admin").length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Club Leaders</p>
                <p className="text-2xl font-bold text-white">
                  {users.filter((u) => u.role === "club_leader").length}
                </p>
              </div>
              <UserCog className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Students</p>
                <p className="text-2xl font-bold text-white">
                  {users.filter((u) => u.role === "student").length}
                </p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins</option>
                <option value="club_leader">Club Leaders</option>
                <option value="student">Students</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center">
                      <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400">No users found</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-750 transition cursor-pointer"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUserModal(true);
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.firstName.charAt(0)}
                            {user.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-gray-400 text-sm">
                              ID: {user.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-300">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}
                        >
                          {getRoleDisplayName(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {canPromote(user.role) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePromoteUser(user.id);
                              }}
                              className="p-2 bg-green-600 hover:bg-green-500 text-white rounded transition"
                              title="Promote User"
                            >
                              <ArrowUpCircle size={16} />
                            </button>
                          )}
                          {canDemote(user.role) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDemoteUser(user.id);
                              }}
                              className="p-2 bg-orange-600 hover:bg-orange-500 text-white rounded transition"
                              title="Demote User"
                            >
                              <ArrowDownCircle size={16} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(user.id, user.email);
                            }}
                            className="p-2 bg-red-600 hover:bg-red-500 text-white rounded transition"
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-center text-gray-400 text-sm">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
                    {selectedUser.firstName.charAt(0)}
                    {selectedUser.lastName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <span
                      className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(selectedUser.role)}`}
                    >
                      {getRoleDisplayName(selectedUser.role)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-white hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Users size={18} className="text-blue-400" />
                  User Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">User ID:</span>
                    <span className="text-white">{selectedUser.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <a
                      href={`mailto:${selectedUser.email}`}
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {selectedUser.email}
                    </a>
                  </div>
                  {selectedUser._count && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Club Memberships:</span>
                        <span className="text-white">
                          {selectedUser._count.clubMemberships}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Admin of Clubs:</span>
                        <span className="text-white">
                          {selectedUser._count.clubAdmins}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedUser.bio && (
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <h4 className="font-semibold text-white mb-2">Bio</h4>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">
                    {selectedUser.bio}
                  </p>
                </div>
              )}

              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <h4 className="font-semibold text-white mb-3">
                  Administrative Actions
                </h4>
                <div className="space-y-2">
                  {canPromote(selectedUser.role) && (
                    <button
                      onClick={() => {
                        handlePromoteUser(selectedUser.id);
                        setShowUserModal(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition font-medium"
                    >
                      <ArrowUpCircle size={18} />
                      Promote User
                    </button>
                  )}
                  {canDemote(selectedUser.role) && (
                    <button
                      onClick={() => {
                        handleDemoteUser(selectedUser.id);
                        setShowUserModal(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition font-medium"
                    >
                      <ArrowDownCircle size={18} />
                      Demote User
                    </button>
                  )}
                  <button
                    onClick={() =>
                      handleDeleteUser(selectedUser.id, selectedUser.email)
                    }
                    className="w-full flex items-center justify-center gap-2 p-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition font-medium"
                  >
                    <Trash2 size={18} />
                    Delete User
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowUserModal(false)}
                className="w-full p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
