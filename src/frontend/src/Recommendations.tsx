import { API_URL } from "./config";
import React, { useEffect, useState } from "react";

interface Event {
  id: number;
  title: string;
  startTime: string;
  description?: string;
  club: { id: number; name: string };
}

const Recommendations: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("token"); // your JWT
        const res = await fetch(`${API_URL}/api/recommendations/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const text = await res.text();
        console.log("Raw response:", text);
        const data = JSON.parse(text);
        if (!res.ok) throw new Error("Failed to fetch events");
        setEvents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) return <div>Loading recommendations...</div>;

  return (
    <div className="p-6 min-h-screen bg-gray-900 text-orange-300">
      <h2 className="text-3xl font-bold mb-6 text-orange-400">
        Recommended Events
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.isArray(events) &&
          events.map((ev) => (
            <div
              key={ev.id}
              className="border border-gray-700 p-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors shadow-md"
            >
              <h3 className="font-bold text-lg text-orange-300">{ev.title}</h3>
              <p className="text-sm text-orange-200">
                {new Date(ev.startTime).toLocaleString()}
              </p>
              <p className="text-sm mt-2 text-orange-200">
                {ev.description?.slice(0, 100)}...
              </p>
              <p className="text-xs mt-2 text-orange-400">
                Club: {ev.club.name}
              </p>
              <a
                href={`/events/${ev.id}`}
                className="text-orange-400 mt-2 block text-sm hover:text-orange-300"
              >
                View Event
              </a>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Recommendations;
