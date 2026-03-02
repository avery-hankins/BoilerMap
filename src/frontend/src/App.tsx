import { API_URL } from "./config";
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Profile from "./Profile";
import BoilermapUI from "./BoilerMap";
import ClubsList from "./ClubsList";
import ClubProfile from "./ClubProfile";
import EventSearch from "./EventSearch";
import EventDetailsPage from "./EventDetails";
import CreateEventPage from "./EventCreator";
import EventStatistics from "./EventStatistics";
import AdminDashboard from "./AdminDashboard";
import Error404Page from "./404";

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/message`)
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => console.error(err));
  }, []);

  return (
    <Routes>
      <Route path="/" element={<BoilermapUI />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/clubs" element={<ClubsList />} />
      <Route path="/clubs/:id" element={<ClubProfile />} />
      <Route path="/events" element={<EventSearch />} />
      <Route path="/eventcreator" element={<CreateEventPage />} />
      <Route path="/events/search" element={<EventSearch />} />
      <Route path="/event/:eventId" element={<EventDetailsPage />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<Error404Page />} />
    </Routes>
  );
}

export default App;
