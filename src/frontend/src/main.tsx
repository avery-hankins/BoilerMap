import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import ProtectedRoute from "./ProtectedRoute";
import SignupPage from "./Signup";
import VerifyPage from "./VerifyPage";
import Profile from "./Profile";
import UserInfo from "./userInfo";
import RoomInfo from "./RoomInfo";
import BookRoom from "./BookRoom";
import RoomListing from "./RoomListing";
import EmailBlast from "./EmailBlast";
import AdminPortal from "./AdminPortal";
import BookingManagement from "./BookingManagement";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import Error404Page from "./404";
import EventDetailsPage from "./EventInfo";
import EventEmailUI from "./EventEmailBlast";
import ClubBlastEmailUI from "./ClubBlastEmail";
import EmailUnsubscribe from "./EmailUnsubscribe";
import ClubRegistrationForm from "./ClubRegistrationForm";
import EventStatistics from "./EventStatistics";
import { ThemeProvider } from "./ThemeContext";
import Recommendations from "./Recommendations";
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Routes inside App */}
          <Route path="/*" element={<App />} />

          {/* Other top-level routes */}
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/userInfo"
            element={
              <ProtectedRoute>
                <UserInfo />
              </ProtectedRoute>
            }
          />
          <Route path="/room" element={<RoomInfo />} />
          <Route path="/book" element={<BookRoom />} />
          <Route path="/room_listing" element={<RoomListing />} />
          <Route path="/event" element={<EventDetailsPage />} />
          <Route path="/event_email" element={<EventEmailUI />} />
          <Route
            path="/club-blast-email"
            element={
              <ProtectedRoute>
                <ClubBlastEmailUI />
              </ProtectedRoute>
            }
          />
          <Route path="/unsubscribe" element={<EmailUnsubscribe />} />
          <Route
            path="/event_statistics/:clubId"
            element={<EventStatistics />}
          />
          <Route
            path="/email"
            element={
              <ProtectedRoute>
                <EmailBlast />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              // TODO make even more protected (only admins can access)
              <ProtectedRoute>
                <AdminPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <BookingManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/register-club"
            element={
              <ProtectedRoute>
                <ClubRegistrationForm />
              </ProtectedRoute>
            }
          />
          <Route path="/404" element={<Error404Page />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
