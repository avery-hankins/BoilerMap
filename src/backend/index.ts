import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import clubRoutes from "./routes/clubs";
import eventRoutes from "./routes/events";
import bookingRoutes from "./routes/bookings";
import emailRoutes from "./routes/emails";
import miscRoutes from "./routes/misc";
import taskRoutes from "./routes/tasks"
import clubRegistrationRoutes from "./routes/clubRegistrations";
import calendarRoutes from "./routes/calendar";
import adminRoutes from './routes/admin';
import recommendationRoutes from "./routes/recommendations";
import statsRoutes from "./routes/stats";

const app = express();
const PORT = process.env.PORT || 3000;


// Enable CORS for all origins and all routes
// TODO: This is dangerous and only for development
app.use(
  cors({
    origin: "http://localhost:5173", // Your frontend URL
    credentials: true,
  }),
);
app.use(express.json());

// Resolve absolute path to frontend
const frontendPath = path.join(__dirname, "../frontend/dist");

// Serve static uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve static photos directory
app.use("/photos", express.static(path.join(__dirname, "photos")));

// Mount API routes
// Resource-specific routes (RESTful pattern)
app.use("/api/users", userRoutes); // All user-related routes
app.use("/api/clubs", clubRoutes); // All club-related routes
app.use("/api/events", eventRoutes); // All event-related routes
app.use("/api/tasks", taskRoutes);     // All task-related routes
app.use("/api/club-registrations", clubRegistrationRoutes); // Club registration approval routes
app.use("/api/calendar", calendarRoutes); // Calendar feed routes
app.use('/api/admin', adminRoutes);

// Recommendations
app.use("/api/recommendations", recommendationRoutes);

// Stats
app.use("/api/stats", statsRoutes)

// General API routes
app.use("/api", authRoutes); // Authentication routes (login, signup, verify, etc.)
app.use("/api", bookingRoutes); // Room booking routes
app.use("/api", emailRoutes); // Email routes
app.use("/api", miscRoutes); // Miscellaneous routes (buildings, tags, message)

// CalDAV routes (need to be at root level to support PROPFIND method)
app.use("/", calendarRoutes); // CalDAV calendar sync routes

// Serve static frontend files
app.use(express.static(frontendPath));

// Catch-all middleware for frontend SPA (only in production, not in tests)
// This handles client-side routing by serving index.html for unmatched routes
if (process.env.NODE_ENV !== "test") {
  app.use((req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// Only start the server if this file is run directly (not imported by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend listening at http://localhost:${PORT}`);
  });
}

export default app;
