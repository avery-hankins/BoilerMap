// src/routes/recommendations.ts

import { Router } from "express";
import prisma from "../config/database"; // wherever you export your Prisma client
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, async (req, res) => {
  const userId = req.userId; // comes from JWT middleware
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const NUM_EVENTS = 8;

  // 1️⃣ Get clubs the user is a member of
  const userClubs = await prisma.clubMembership.findMany({
    where: { userId },
    select: { clubId: true },
  });

  const clubIds = userClubs.map(c => c.clubId);

  let recommended: any[] = [];

  // 2️⃣ Tier 1: Events from user's clubs
  if (clubIds.length > 0) {
    const clubEvents = await prisma.event.findMany({
      where: {
        clubId: { in: clubIds },
        startTime: { gte: new Date() },
      },
      orderBy: { startTime: "asc" },
      take: NUM_EVENTS,
      include: { club: true }, // optional: include club info
    });

    recommended = [...clubEvents];
  }

  // 3️⃣ Tier 2: Fallback to upcoming events if needed
  if (recommended.length < NUM_EVENTS) {
    const needed = NUM_EVENTS - recommended.length;

    const fallbackEvents = await prisma.event.findMany({
      where: {
        startTime: { gte: new Date() },
        id: { notIn: recommended.map(e => e.id) },
      },
      orderBy: { startTime: "asc" },
      take: needed,
      include: { club: true },
    });

    recommended = [...recommended, ...fallbackEvents];
  }

  res.json(recommended);
});

export default router;