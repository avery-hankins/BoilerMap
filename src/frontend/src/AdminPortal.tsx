import React, { useState } from "react";
import { Mail, Calendar, Building2, Users } from "lucide-react";
import BookingManagement from "./BookingManagement";
import ClubApprovalManagement from "./ClubApprovalManagement";
import AdminDashboard from "./AdminDashboard";
import { useNavigate } from "react-router-dom";

export default function AdminPortal() {
  const navigate = useNavigate();
  const [view, setView] = useState("dashboard");

  // If we're in the bookings view, render the BookingManagement component
  if (view === "bookings") {
    return <BookingManagement setView={setView} />;
  }

  // If we're in the club approvals view, render the ClubApprovalManagement component
  if (view === "club-approvals") {
    return <ClubApprovalManagement setView={setView} />;
  }

  // If we're in the user management view, render the AdminDashboard component
  if (view === "user-management") {
    return <AdminDashboard setView={setView} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark mb-6 p-6">
          <div className="bg-gradient-to-r from-accent-dark to-accent text-white p-6 -m-6 mb-6 rounded-t-lg">
            <h1 className="text-4xl font-bold">Admin Portal</h1>
            <p className="text-text-secondary mt-2">
              Purdue Room Management System
            </p>
          </div>
          <p className="text-text-tertiary">
            Welcome back, Admin. Select an option below to manage the system.
          </p>
        </div>

        {/* Quick Stats */}
        {/* <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-xl">
            <div className="flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-sm">Pending Bookings</p>
                <p className="text-4xl font-bold text-amber-400 mt-2">{pendingCount}</p>
            </div>
            <Clock className="w-12 h-12 text-amber-400" />
            </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-xl">
            <div className="flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-sm">Room Capacity</p>
                <p className="text-4xl font-bold text-amber-400 mt-2">53</p>
            </div>
            <Users className="w-12 h-12 text-amber-400" />
            </div>
        </div>
        </div> */}

        {/* Main Action Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Email Blast */}
          <button
            onClick={() => navigate("/email")}
            className="bg-surface border border-border-dark rounded-lg p-8 shadow-xl hover:shadow-2xl transform transition hover:scale-105 hover:border-accent text-left group"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-4 bg-gradient-to-r from-accent-dark to-accent rounded-lg group-hover:from-accent group-hover:to-accent-light transition">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-secondary">
                  Email Blast
                </h2>
                <p className="text-text-muted mt-1">Send emails to users</p>
              </div>
            </div>
            <p className="text-text-tertiary">
              Send emails to individuals, specific clubs, or everyone in the
              database. Perfect for announcements and updates.
            </p>
          </button>

          {/* Usage Stats */}
          <button
            onClick={() => setView("stats")}
            className="bg-surface border border-border-dark rounded-lg p-8 shadow-xl hover:shadow-2xl transform transition hover:scale-105 hover:border-accent text-left group relative"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-4 bg-gradient-to-r from-accent-dark to-accent rounded-lg group-hover:from-accent group-hover:to-accent-light transition">
                {/* You can use an icon like Calendar or BarChart */}
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-secondary">
                  Usage Stats
                </h2>
                <p className="text-text-muted mt-1">View bookings and flags</p>
              </div>
            </div>
            <p className="text-text-tertiary">
              Monitor room booking trends for users, clubs, and rooms. Flag
              irregular activity.
            </p>
          </button>

          {/* Room Bookings */}
          <button
            onClick={() => setView("bookings")}
            className="bg-surface border border-border-dark rounded-lg p-8 shadow-xl hover:shadow-2xl transform transition hover:scale-105 hover:border-accent text-left group relative"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-4 bg-gradient-to-r from-accent-dark to-accent rounded-lg group-hover:from-accent group-hover:to-accent-light transition">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-secondary">
                  Room Bookings
                </h2>
                <p className="text-text-muted mt-1">Review and approve</p>
              </div>
            </div>
            <p className="text-text-tertiary">
              Review, approve, or deny room booking requests from clubs and
              organizations.
            </p>
          </button>

          {/* Club Approvals */}
          <button
            onClick={() => setView("club-approvals")}
            className="bg-surface border border-border-dark rounded-lg p-8 shadow-xl hover:shadow-2xl transform transition hover:scale-105 hover:border-accent text-left group relative"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-4 bg-gradient-to-r from-accent-dark to-accent rounded-lg group-hover:from-accent group-hover:to-accent-light transition">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-secondary">
                  Club Approvals
                </h2>
                <p className="text-text-muted mt-1">Review new clubs</p>
              </div>
            </div>
            <p className="text-text-tertiary">
              Review, approve, or deny club registration requests from students
              wanting to create new clubs.
            </p>
          </button>

          {/* User Management - NEW */}
          <button
            onClick={() => setView("user-management")}
            className="bg-surface border border-border-dark rounded-lg p-8 shadow-xl hover:shadow-2xl transform transition hover:scale-105 hover:border-accent text-left group relative"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg group-hover:from-purple-500 group-hover:to-indigo-500 transition">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-secondary">
                  User Management
                </h2>
                <p className="text-text-muted mt-1">Manage user roles</p>
              </div>
            </div>
            <p className="text-text-tertiary">
              View all users, promote or demote admins, and manage user accounts
              in the system.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
