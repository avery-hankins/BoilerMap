import { Router, Request, Response } from "express";
import prisma from "../config/database";

const router = Router();

// Get all buildings from Purdue.io API
router.get("/buildings", async (req: Request, res: Response) => {
  try {
    const response = await fetch('https://api.purdue.io/odata/Buildings?$select=Name,ShortCode&$orderby=Name asc');

    if (!response.ok) {
      throw new Error("Failed to fetch buildings from Purdue.io");
    }

    const data = await response.json();

    // Transform to simpler format and remove duplicates by code
    const buildingsMap = new Map();

    data.value.forEach((building: any) => {
      // Only add if we haven't seen this code before
      if (!buildingsMap.has(building.ShortCode)) {
        buildingsMap.set(building.ShortCode, {
          code: building.ShortCode,
          name: building.Name
        });
      }
    });

    // Convert map to array and sort alphabetically by name
    const buildings = Array.from(buildingsMap.values())
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    res.json(buildings);
  } catch (err) {
    console.error("Error fetching buildings:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get all tags
router.get("/tags", async (req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(tags);
  } catch (err) {
    console.error("Error fetching tags:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Simple test message endpoint
router.get("/message", (req: Request, res: Response) => {
  res.json({ message: "Hello from the backend!" });
});

export default router;
