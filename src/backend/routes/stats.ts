import { Router } from "express";
import prisma from "../config/database";
import { authenticateToken } from "../middleware/auth";

const router = Router();

declare global {
  interface Date {
    getWeekNumber(): number;
  }
}

// Get all users
router.get("/users", authenticateToken, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
        select: { id: true, firstName: true, lastName: true, email: true },
        });
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Get all clubs
router.get("/clubs", authenticateToken, async (req, res) => {
    try {
        const clubs = await prisma.club.findMany({
        select: { id: true, name: true },
        });
        res.json(clubs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch clubs" });
    }
});

// Get all rooms
router.get("/rooms", authenticateToken, async (req, res) => {
    try {
        const rooms = await prisma.room.findMany({
        select: { id: true, buildingCode: true, roomNum: true, roomCapacity: true },
        });
        res.json(rooms);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
});

// Get bookings by user or club
router.get("/bookings", authenticateToken, async (req, res) => {
    const { userId, clubId } = req.query;

    try {
        const where: any = {};
        if (userId) where.userId = Number(userId);
        if (clubId) where.clubId = Number(clubId);

        const bookings = await prisma.booking.findMany({
        where,
        include: {
            room: true,
            event: true,
            club: true,
            user: true,
        },
        orderBy: { startTime: "desc" },
        });

        res.json(bookings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch bookings" });
    }
});

// Get bookings by room
router.get("/room/:roomId", authenticateToken, async (req, res) => {
    const roomId = req.params.roomId as string;

    try {
        const bookings = await prisma.booking.findMany({
        where: { roomId: Number(roomId) },
        include: { user: true, event: true, club: true },
        });

        res.json({
        totalBookings: bookings.length,
        bookings,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch room bookings" });
    }
});

// Get flags (irregular bookings: >3 per week)
router.get("/flags", authenticateToken, async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
        include: { user: true, club: true, room: true, event: true },
        });

        const flags: any[] = [];
        const weekCounts: Record<string, Record<number, number>> = {};

        bookings.forEach((b) => {
        const week = new Date(b.startTime).getWeekNumber(); // helper function below
        const key = b.userId || b.clubId || 0;

        if (!weekCounts[week]) weekCounts[week] = {};
        if (!weekCounts[week][key]) weekCounts[week][key] = 0;

        weekCounts[week][key] += 1;

        if (weekCounts[week][key] > 3) {
            flags.push(b);
        }
        });

        res.json(flags);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch flags" });
    }
});

// Helper to get week number
Date.prototype.getWeekNumber = function () {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export default router;
