import { API_URL } from "./config";
import React, { useState, useEffect } from "react";

interface Booking {
  id: number;
  startTime: string;
  endTime: string;
  purpose?: string;
  description?: string;
  user?: { firstName: string; lastName: string };
  club?: { name: string };
  room?: { buildingCode: string; roomNum: string };
  event?: { title: string };
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
}

interface Club {
  id: number;
  name: string;
}

interface Room {
  id: number;
  buildingCode: string;
  roomNum: string;
}

export default function AdminStats() {
  const [tab, setTab] = useState<"user" | "club" | "room" | "flags">("user");
  const [users, setUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedClub, setSelectedClub] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/stats/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setUsers(data);
  };

  const fetchClubs = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/stats/clubs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setClubs(data);
  };

  const fetchRooms = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/stats/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setRooms(data);
  };

  const fetchBookings = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      let url = `${API_URL}/api/stats/bookings`;
      if (tab === "user" && selectedUser) url += `?userId=${selectedUser}`;
      if (tab === "club" && selectedClub) url += `?clubId=${selectedClub}`;
      if (tab === "room" && selectedRoom)
        url = `${API_URL}/api/stats/room/${selectedRoom}`;
      if (tab === "flags") url = `${API_URL}/api/stats/flags`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBookings(data.bookings || data); // room endpoint returns {bookings, totalBookings}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchClubs();
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [tab, selectedUser, selectedClub, selectedRoom]);

  return (
    <div className="p-6 min-h-screen bg-gray-900 text-orange-300">
      <h2 className="text-3xl font-bold mb-6 text-orange-400">Admin Stats</h2>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setTab("user")}
          className="bg-orange-500 px-4 py-2 rounded"
        >
          User
        </button>
        <button
          onClick={() => setTab("club")}
          className="bg-orange-500 px-4 py-2 rounded"
        >
          Club
        </button>
        <button
          onClick={() => setTab("room")}
          className="bg-orange-500 px-4 py-2 rounded"
        >
          Room
        </button>
        <button
          onClick={() => setTab("flags")}
          className="bg-orange-500 px-4 py-2 rounded"
        >
          Flags
        </button>
      </div>

      {/* Selectors */}
      {tab === "user" && (
        <select
          value={selectedUser || ""}
          onChange={(e) => setSelectedUser(Number(e.target.value))}
          className="mb-4 p-2 rounded bg-gray-800 text-orange-300"
        >
          <option value="">Select user</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>
      )}
      {tab === "club" && (
        <select
          value={selectedClub || ""}
          onChange={(e) => setSelectedClub(Number(e.target.value))}
          className="mb-4 p-2 rounded bg-gray-800 text-orange-300"
        >
          <option value="">Select club</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      {tab === "room" && (
        <select
          value={selectedRoom || ""}
          onChange={(e) => setSelectedRoom(Number(e.target.value))}
          className="mb-4 p-2 rounded bg-gray-800 text-orange-300"
        >
          <option value="">Select room</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.buildingCode}-{r.roomNum}
            </option>
          ))}
        </select>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border border-gray-700 text-orange-200">
          <thead>
            <tr>
              <th>Room</th>
              <th>Event</th>
              <th>Purpose</th>
              <th>User</th>
              <th>Club</th>
              <th>Start Time</th>
              <th>End Time</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-gray-700">
                <td>
                  {b.room ? `${b.room.buildingCode}-${b.room.roomNum}` : "-"}
                </td>
                <td>{b.event?.title || "-"}</td>
                <td>{b.purpose || b.description || "-"}</td>
                <td>
                  {b.user ? `${b.user.firstName} ${b.user.lastName}` : "-"}
                </td>
                <td>{b.club?.name || "-"}</td>
                <td>{new Date(b.startTime).toLocaleString()}</td>
                <td>{new Date(b.endTime).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
