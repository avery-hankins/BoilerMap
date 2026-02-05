import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import prisma from "../config/database";

const router = Router();

// Create a new club
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, authId } = req.body;

    const club = await prisma.club.create({
      data: {
        name,
        description,
        authId,
      },
    });

    res.status(201).json({
      club_id: club.id,
      name: club.name,
      description: club.description,
      auth_id: club.authId,
    });
  } catch (err: unknown) {
    console.error("Error creating club:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown error creating club",
    });
  }
});

// Get all clubs with optional sorting
router.get("/", async (req: Request, res: Response) => {
  try {
    const { sortBy } = req.query;
    const sortByTrending = sortBy === "trending";

    const clubs = await prisma.club.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        email: true,
        _count: {
          select: {
            memberships: true,
            events: true,
            follows: true, // Count followers
          },
        },
      },
      orderBy: sortByTrending
        ? { follows: { _count: "desc" } } // Sort by follower count descending
        : { name: "asc" }, // Default alphabetical sort
    });

    // Add followerCount field for easier frontend access
    const clubsWithFollowers = clubs.map((club: any) => ({
      ...club,
      followerCount: club._count.follows,
    }));

    res.json(clubsWithFollowers);
  } catch (err: unknown) {
    console.error("Error fetching clubs:", err);
    res.status(500).json({
      error:
        err instanceof Error ? err.message : "Unknown error fetching clubs",
    });
  }
});

// Convert club ID to club name
router.get(
  "/convert-clubid",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { clubId } = req.query;
      if (!clubId) {
        return res.status(400).json({ error: "clubId is required" });
      }

      const club = await prisma.club.findUnique({
        where: { id: Number(clubId) },
        select: { name: true },
      });

      if (!club) {
        return res.status(404).json({ error: "Club not found" });
      }

      res.json({ name: club.name });
    } catch (error: unknown) {
      console.error("Error converting clubId:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Server error while retrieving club name",
      });
    }
  },
);

// Get auth/role for user in a club
router.get(
  "/getauthbyclub/:clubId",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { clubId } = req.params;
    const userId = req.userId;

    if (userId === undefined) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      const membership = await prisma.clubMembership.findUnique({
        where: {
          userId_clubId: {
            userId: userId,
            clubId: parseInt(clubId),
          },
        },
        include: { club: true },
      });

      if (!membership) {
        return res.json({ isAdmin: false, role: "member" });
      }

      const admin = await prisma.clubAdmin.findUnique({
        where: {
          userId_authId: {
            userId: userId,
            authId: membership.club.authId,
          },
        },
      });

      const role = admin ? "admin" : "member";
      res.json({ role });
    } catch (err: unknown) {
      console.error("Error in getauthbyclub:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to fetch role",
      });
    }
  },
);

// Check if user is following a club
router.get(
  "/:clubId/follow-status",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const clubId = parseInt(req.params.clubId);
      const userId = req.userId;

      if (userId === undefined) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!clubId || isNaN(clubId)) {
        return res.status(400).json({ error: "Invalid club ID" });
      }

      const club = await prisma.club.findUnique({
        where: { id: clubId },
      });

      if (!club) {
        return res.status(404).json({ error: "Club not found" });
      }

      const follow = await prisma.follow.findUnique({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
      });

      res.json({
        isFollowing: !!follow,
        clubId,
        userId,
      });
    } catch (err: unknown) {
      console.error("Error checking follow status:", err);
      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Failed to check follow status",
      });
    }
  },
);

// Get follower count for a club
router.get("/:clubId/followers", async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId);

    if (!clubId || isNaN(clubId)) {
      return res.status(400).json({ error: "Invalid club ID" });
    }
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                bio: true,
              },
            },
          },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        },
        admins: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                bio: true,
              },
            },
          },
        },
        events: {
          where: {
            startTime: {
              gte: new Date(), // Only upcoming events
            },
          },
          include: {
            room: {
              select: {
                buildingCode: true,
                roomNum: true,
              },
            },
            booking: {
              select: {
                startTime: true,
                endTime: true,
                description: true,
                expectedAttendance: true,
              },
            },
          },
          orderBy: { startTime: "asc" },
          take: 10, // Show next 10 events
        },
      },
    });

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }
    // Format members for backwards compatibility
    const members = [
      ...club.admins.map((admin: any) => ({
        User_ID: admin.user.id,
        FirstName: admin.user.firstName,
        LastName: admin.user.lastName,
        Email: admin.user?.email,
        Bio: admin.user.bio,
        Role: "admin",
      })),
      ...club.memberships.map((membership: any) => ({
        User_ID: membership.user.id,
        FirstName: membership.user.firstName,
        LastName: membership.user.lastName,
        Email: membership.user?.email,
        Bio: membership.user.bio,
        Role: membership.role || "member",
      })),
    ];

    res.json({ ...club, members });
  } catch (err: unknown) {
    console.error("Error fetching club:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown error fetching club",
    });
  }
});

// Update a club profile
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.id);
    const { name, description, email, officerEmail, instagram } = req.body;

    const club = await prisma.club.update({
      where: { id: clubId },
      data: {
        name,
        description,
        email,
        officerEmail,
        instagram,
      },
    });

    res.json(club);
  } catch (err: unknown) {
    console.error("Error updating club:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown error updating club",
    });
  }
});

// Follow a club
router.post(
  "/:clubId/follow",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const clubId = parseInt(req.params.clubId);
      const userId = req.userId;

      if (userId === undefined) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!clubId || isNaN(clubId)) {
        return res.status(400).json({ error: "Invalid club ID" });
      }

      const club = await prisma.club.findUnique({
        where: { id: clubId },
      });

      if (!club) {
        return res.status(404).json({ error: "Club not found" });
      }

      const existingFollow = await prisma.follow.findUnique({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
      });

      if (existingFollow) {
        return res.status(400).json({
          error: "Already following this club",
          isFollowing: true,
        });
      }

      await prisma.follow.create({
        data: {
          userId,
          clubId,
        },
      });

      const followerCount = await prisma.follow.count({
        where: { clubId },
      });

      res.status(201).json({
        message: "Successfully followed club",
        isFollowing: true,
        clubId,
        clubName: club.name,
        followerCount,
      });
    } catch (err: unknown) {
      console.error("Error following club:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to follow club",
      });
    }
  },
);

// Unfollow a club
router.delete(
  "/:clubId/follow",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const clubId = parseInt(req.params.clubId);
      const userId = req.userId;

      if (userId === undefined) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!clubId || isNaN(clubId)) {
        return res.status(400).json({ error: "Invalid club ID" });
      }

      const existingFollow = await prisma.follow.findUnique({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
      });

      if (!existingFollow) {
        return res.status(400).json({
          error: "Not following this club",
          isFollowing: false,
        });
      }

      await prisma.follow.delete({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
      });

      const followerCount = await prisma.follow.count({
        where: { clubId },
      });

      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { name: true },
      });

      res.json({
        message: "Successfully unfollowed club",
        isFollowing: false,
        clubId,
        clubName: club?.name,
        followerCount,
      });
    } catch (err: unknown) {
      console.error("Error unfollowing club:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to unfollow club",
      });
    }
  },
);

// Check if user can edit club (is admin or officer)
router.get(
  "/:id/can-edit",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const clubId = parseInt(req.params.id);
      const userId = req.userId;
      if (userId === undefined) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      console.log("=== CAN EDIT CHECK ===");
      console.log("Club ID:", clubId);
      console.log("User ID (from token):", userId);

      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { authId: true },
      });

      if (!club) {
        return res.status(404).json({ error: "Club not found" });
      }

      const isAdmin = await prisma.clubAdmin.findUnique({
        where: {
          userId_authId: {
            userId,
            authId: club.authId,
          },
        },
      });

      console.log("Is admin?", !!isAdmin);

      if (isAdmin) {
        return res.json({ canEdit: true, role: "admin" });
      }

      const membership = await prisma.clubMembership.findUnique({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
      });

      console.log("Is officer?", membership?.role === "officer");

      if (membership?.role === "officer") {
        return res.json({ canEdit: true, role: "officer" });
      }

      return res.json({ canEdit: false, role: membership?.role || "none" });
    } catch (err: unknown) {
      console.error("Error checking edit permissions:", err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : "Unknown error checking edit permissions",
      });
    }
  },
);

// Assign a role to a member
router.put(
  "/:clubId/members/:userId/role",
  async (req: Request, res: Response) => {
    try {
      const clubId = parseInt(req.params.clubId);
      const userId = parseInt(req.params.userId);
      const { role, managerId } = req.body;

      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { authId: true },
      });

      if (!club) {
        return res.status(404).json({ error: "Club not found" });
      }

      const isAdmin = await prisma.clubAdmin.findUnique({
        where: {
          userId_authId: {
            userId: parseInt(managerId),
            authId: club.authId,
          },
        },
      });

      if (!isAdmin) {
        return res.status(403).json({
          error: "Permission denied. Only club admins can assign roles.",
        });
      }

      const membership = await prisma.clubMembership.upsert({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
        update: {
          role: role,
        },
        create: {
          userId,
          clubId,
          role: role,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: `Role "${role}" assigned successfully`,
        membership: {
          User_ID: membership.user.id,
          FirstName: membership.user.firstName,
          LastName: membership.user.lastName,
          Email: membership.user?.email,
          Role: membership.role,
        },
      });
    } catch (err: unknown) {
      console.error("Error assigning role:", err);
      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Unknown error assigning role",
      });
    }
  },
);
// Remove a user from a club
router.delete(
  "/:clubId/members/:userId",
  async (req: Request, res: Response) => {
    try {
      const clubId = parseInt(req.params.clubId);
      const userId = parseInt(req.params.userId);
      const { managerId } = req.body;

      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { authId: true },
      });

      if (!club) {
        return res.status(404).json({ error: "Club not found" });
      }

      const isAdmin = await prisma.clubAdmin.findUnique({
        where: {
          userId_authId: {
            userId: parseInt(managerId),
            authId: club.authId,
          },
        },
      });

      /*if (!isAdmin) {
        return res.status(403).json({
          error: "Permission denied. Only club admins can remove members.",
        });
      }*/

      const membership = await prisma.clubMembership.findUnique({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!membership) {
        return res.status(404).json({
          error: "User is not a member of this club",
        });
      }

      await prisma.clubMembership.delete({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
      });

      res.json({
        success: true,
        message: "User successfully removed from club",
        removedMember: {
          User_ID: membership.user.id,
          FirstName: membership.user.firstName,
          LastName: membership.user.lastName,
          Email: membership.user?.email,
          Role: membership.role,
        },
      });
    } catch (err: unknown) {
      console.error("Error removing user from club:", err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : "Unknown error removing user from club",
      });
    }
  },
);

// Remove a role from a member (set to "member")
router.delete(
  "/:clubId/members/:userId/role",
  async (req: Request, res: Response) => {
    try {
      const clubId = parseInt(req.params.clubId);
      const userId = parseInt(req.params.userId);
      const { managerId } = req.body;

      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { authId: true },
      });

      if (!club) {
        return res.status(404).json({ error: "Club not found" });
      }

      const isAdmin = await prisma.clubAdmin.findUnique({
        where: {
          userId_authId: {
            userId: managerId,
            authId: club.authId,
          },
        },
      });

      if (!isAdmin) {
        return res.status(403).json({
          error: "Permission denied. Only club admins can remove roles.",
        });
      }

      const membership = await prisma.clubMembership.update({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
        data: {
          role: "member",
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: "Role removed successfully",
        membership: {
          User_ID: membership.user.id,
          FirstName: membership.user.firstName,
          LastName: membership.user.lastName,
          Email: membership.user.email,
          Role: membership.role,
        },
      });
    } catch (err: unknown) {
      console.error("Error removing role:", err);
      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Unknown error removing role",
      });
    }
  },
);

// Get all events for a specific club
router.get("/:clubId/events", async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId);

    if (isNaN(clubId)) {
      return res.status(400).json({ error: "Invalid club ID" });
    }

    const events = await prisma.event.findMany({
      where: { clubId },
      include: {
        room: {
          select: {
            buildingCode: true,
            roomNum: true,
            roomCapacity: true,
          },
        },
        booking: {
          select: {
            description: true,
            startTime: true,
            endTime: true,
            expectedAttendance: true,
          },
        },
        _count: {
          select: {
            rsvps: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return res.json(events);
  } catch (err: unknown) {
    console.error("Error fetching club events:", err);
    res.status(500).json({
      error:
        err instanceof Error
          ? err.message
          : "Unknown error fetching club events",
    });
  }
});

router.get(
  "/api/clubs/:clubId/follow-status",
  authenticateToken,
  async (req, res) => {
    try {
      const clubId = parseInt(req.params.clubId);
      const userId = req.userId;

      if (!clubId || isNaN(clubId)) {
        return res.status(400).json({ error: "Invalid club ID" });
      }

      // Check if club exists
      const club = await prisma.club.findUnique({
        where: { id: clubId },
      });

      if (!club) {
        return res.status(404).json({ error: "Club not found" });
      }
      if (userId === undefined) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Check if user is following the club
      const follow = await prisma.follow.findUnique({
        where: {
          userId_clubId: {
            userId: userId,
            clubId: clubId,
          },
        },
      });

      res.json({
        isFollowing: !!follow,
        clubId: clubId,
        userId: userId,
      });
    } catch (error) {
      console.error("Error checking follow status:", error);
      res.status(500).json({ error: "Failed to check follow status" });
    }
  },
);

router.get(
  "/requests",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;

      if (userId === undefined) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Find all clubs where the current user is an admin
      const adminClubs = await prisma.clubAdmin.findMany({
        where: { userId },
        select: { authId: true },
      });

      if (adminClubs.length === 0) {
        return res.json([]);
      }

      const adminAuthIds = adminClubs.map((ac) => ac.authId);

      // Get all clubs the user administers (to get club IDs)
      const clubs = await prisma.club.findMany({
        where: {
          authId: { in: adminAuthIds },
        },
        select: { id: true },
      });

      const adminClubIds = clubs.map((c) => c.id);

      // Fetch all pending requests for those clubs
      const requests = await prisma.clubRequests.findMany({
        where: {
          clubId: { in: adminClubIds },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          club: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: {
          id: "desc", // Most recent requests first
        },
      });

      res.json(requests);
    } catch (error: unknown) {
      console.error("Error fetching club requests:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch club requests",
      });
    }
  },
);

// Get the current user's sent join requests
router.get(
  "/my-requests",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;

      if (userId === undefined) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Fetch all requests sent by the current user
      const requests = await prisma.clubRequests.findMany({
        where: {
          userId: userId,
        },
        include: {
          club: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: {
          id: "desc",
        },
      });

      res.json(requests);
    } catch (error: unknown) {
      console.error("Error fetching user's club requests:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch user's club requests",
      });
    }
  },
);

/**
 * POST /api/clubs/:clubid/accept
 * Accept a user's request to join a club
 */
router.post(
  "/:clubid/accept",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const clubId = parseInt(req.params.clubid);
      const { requestId } = req.body;

      if (userId === undefined) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!requestId) {
        return res.status(400).json({ error: "Request ID is required" });
      }

      if (isNaN(clubId)) {
        return res.status(400).json({ error: "Invalid club ID" });
      }

      // Verify the request exists and belongs to this club
      const request = await prisma.clubRequests.findUnique({
        where: { id: requestId },
        include: { club: true },
      });

      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      if (request.clubId !== clubId) {
        return res
          .status(400)
          .json({ error: "Request does not belong to this club" });
      }

      // Get the club's authId
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { authId: true },
      });

      if (!club) {
        return res.status(404).json({ error: "Club not found" });
      }

      // Verify the current user is an admin of this club
      const isAdmin = await prisma.clubAdmin.findUnique({
        where: {
          userId_authId: {
            userId,
            authId: club.authId,
          },
        },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "You are not authorized to manage this club" });
      }

      // Check if user is already a member
      const existingMembership = await prisma.clubMembership.findUnique({
        where: {
          userId_clubId: {
            userId: request.userId,
            clubId: clubId,
          },
        },
      });

      if (existingMembership) {
        // Delete the request since they're already a member
        await prisma.clubRequests.delete({
          where: { id: requestId },
        });
        return res
          .status(400)
          .json({ error: "User is already a member of this club" });
      }

      // Use a transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // Create the club membership
        await tx.clubMembership.create({
          data: {
            userId: request.userId,
            clubId: clubId,
            role: "Member",
          },
        });

        // Delete the request
        await tx.clubRequests.delete({
          where: { id: requestId },
        });
      });

      res.json({
        success: true,
        message: "User accepted into club",
        userId: request.userId,
        clubId: clubId,
      });
    } catch (error: unknown) {
      console.error("Error accepting club request:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to accept club request",
      });
    }
  },
);

/**
 * POST /api/clubs/:clubid/reject
 * Reject a user's request to join a club
 */
router.post(
  "/:clubid/reject",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const clubId = parseInt(req.params.clubid);
      const { requestId } = req.body;

      if (userId === undefined) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!requestId) {
        return res.status(400).json({ error: "Request ID is required" });
      }

      if (isNaN(clubId)) {
        return res.status(400).json({ error: "Invalid club ID" });
      }

      // Verify the request exists and belongs to this club
      const request = await prisma.clubRequests.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      if (request.clubId !== clubId) {
        return res
          .status(400)
          .json({ error: "Request does not belong to this club" });
      }

      // Get the club's authId
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { authId: true },
      });

      if (!club) {
        return res.status(404).json({ error: "Club not found" });
      }

      // Verify the current user is an admin of this club
      const isAdmin = await prisma.clubAdmin.findUnique({
        where: {
          userId_authId: {
            userId,
            authId: club.authId,
          },
        },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "You are not authorized to manage this club" });
      }

      // Delete the request (rejection means simply removing it)
      await prisma.clubRequests.delete({
        where: { id: requestId },
      });

      res.json({
        success: true,
        message: "Request rejected and removed",
        requestId: requestId,
      });
    } catch (error: unknown) {
      console.error("Error rejecting club request:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to reject club request",
      });
    }
  },
);

/**
 * POST /api/clubs/:clubid/request
 * Create a new request to join a club
 */
router.post(
  "/:clubid/request",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const clubId = parseInt(req.params.clubid);

      if (userId === undefined) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (isNaN(clubId)) {
        return res.status(400).json({ error: "Invalid club ID" });
      }

      // Check if club exists
      const club = await prisma.club.findUnique({
        where: { id: clubId },
      });

      if (!club) {
        return res.status(404).json({ error: "Club not found" });
      }

      // Check if already a member
      const existingMembership = await prisma.clubMembership.findUnique({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
      });

      if (existingMembership) {
        return res
          .status(400)
          .json({ error: "You are already a member of this club" });
      }

      // Check if request already exists
      const existingRequest = await prisma.clubRequests.findUnique({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
      });

      if (existingRequest) {
        return res
          .status(400)
          .json({ error: "You have already requested to join this club" });
      }

      // Create the request
      const request = await prisma.clubRequests.create({
        data: {
          userId,
          clubId,
        },
        include: {
          user: {
            select: {
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          club: {
            select: {
              name: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Join request submitted",
        request,
      });
    } catch (error: unknown) {
      console.error("Error creating club request:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to create club request",
      });
    }
  },
);

// Get follower count for a club
router.get("/api/clubs/:clubId/followers", async (req, res) => {
  try {
    const clubId = parseInt(req.params.clubId);

    if (!clubId || isNaN(clubId)) {
      return res.status(400).json({ error: "Invalid club ID" });
    }

    const followerCount = await prisma.follow.count({
      where: { clubId: clubId },
    });

    res.json({
      clubId: clubId,
      followerCount: followerCount,
    });
  } catch (error) {
    console.error("Error getting follower count:", error);
    res.status(500).json({ error: "Failed to get follower count" });
  }
});

// Follow a club
router.post(
  "/api/clubs/:clubId/follow",
  authenticateToken,
  async (req, res) => {
    try {
      const clubId = parseInt(req.params.clubId);
      const userId = req.userId;

      if (!clubId || isNaN(clubId)) {
        return res.status(400).json({ error: "Invalid club ID" });
      }

      // Check if club exists
      const club = await prisma.club.findUnique({
        where: { id: clubId },
      });

      if (!club) {
        return res.status(404).json({ error: "Club not found" });
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (userId === undefined) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Check if already following
      const existingFollow = await prisma.follow.findUnique({
        where: {
          userId_clubId: {
            userId: userId,
            clubId: clubId,
          },
        },
      });

      if (existingFollow) {
        return res.status(400).json({
          error: "Already following this club",
          isFollowing: true,
        });
      }

      // Create follow relationship
      await prisma.follow.create({
        data: {
          userId: userId,
          clubId: clubId,
        },
      });

      // Get updated follower count
      const followerCount = await prisma.follow.count({
        where: { clubId: clubId },
      });

      res.status(201).json({
        message: "Successfully followed club",
        isFollowing: true,
        clubId: clubId,
        clubName: club.name,
        followerCount: followerCount,
      });
    } catch (error) {
      console.error("Error following club:", error);
      res.status(500).json({ error: "Failed to follow club" });
    }
  },
);

// Unfollow a club
router.delete(
  "/api/clubs/:clubId/follow",
  authenticateToken,
  async (req, res) => {
    try {
      const clubId = parseInt(req.params.clubId);
      const userId = req.userId;

      if (!clubId || isNaN(clubId)) {
        return res.status(400).json({ error: "Invalid club ID" });
      }
      if (userId === undefined) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      // Check if follow relationship exists
      const existingFollow = await prisma.follow.findUnique({
        where: {
          userId_clubId: {
            userId: userId,
            clubId: clubId,
          },
        },
      });

      if (!existingFollow) {
        return res.status(400).json({
          error: "Not following this club",
          isFollowing: false,
        });
      }

      // Delete follow relationship
      await prisma.follow.delete({
        where: {
          userId_clubId: {
            userId: userId,
            clubId: clubId,
          },
        },
      });

      // Get updated follower count
      const followerCount = await prisma.follow.count({
        where: { clubId: clubId },
      });

      // Get club name for response
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { name: true },
      });

      res.json({
        message: "Successfully unfollowed club",
        isFollowing: false,
        clubId: clubId,
        clubName: club?.name,
        followerCount: followerCount,
      });
    } catch (error) {
      console.error("Error unfollowing club:", error);
      res.status(500).json({ error: "Failed to unfollow club" });
    }
  },
);

// ===== GENERIC ROUTES COME LAST =====

// Get all clubs
router.get("/", async (req: Request, res: Response) => {
  try {
    const clubs = await prisma.club.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        email: true,
        _count: {
          select: {
            memberships: true,
            events: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    res.json(clubs);
  } catch (err: unknown) {
    console.error("Error fetching clubs:", err);
    res.status(500).json({
      error:
        err instanceof Error ? err.message : "Unknown error fetching clubs",
    });
  }
});

// Get a single club profile (with members and events)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.id);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                bio: true,
              },
            },
          },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        },
        admins: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                bio: true,
              },
            },
          },
        },
        events: {
          where: {
            startTime: {
              gte: new Date(),
            },
          },
          include: {
            room: {
              select: {
                buildingCode: true,
                roomNum: true,
              },
            },
            booking: {
              select: {
                startTime: true,
                endTime: true,
                description: true,
                expectedAttendance: true,
              },
            },
          },
          orderBy: { startTime: "asc" },
          take: 10,
        },
      },
    });

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    const members = [
      ...club.admins.map((admin: any) => ({
        User_ID: admin.user.id,
        FirstName: admin.user.firstName,
        LastName: admin.user.lastName,
        Email: admin.user?.email,
        Bio: admin.user.bio,
        Role: "admin",
      })),
      ...club.memberships.map((membership: any) => ({
        User_ID: membership.user.id,
        FirstName: membership.user.firstName,
        LastName: membership.user.lastName,
        Email: membership.user?.email,
        Bio: membership.user.bio,
        Role: membership.role || "member",
      })),
    ];

    res.json({ ...club, members });
  } catch (err: unknown) {
    console.error("Error fetching club:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown error fetching club",
    });
  }
});

// Update a club profile
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.id);
    const { name, description, email, officerEmail, instagram } = req.body;

    const club = await prisma.club.update({
      where: { id: clubId },
      data: {
        name,
        description,
        email,
        officerEmail,
        instagram,
      },
    });

    res.json(club);
  } catch (err: unknown) {
    console.error("Error updating club:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown error updating club",
    });
  }
});

// Create a new club
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, authId } = req.body;

    const club = await prisma.club.create({
      data: {
        name,
        description,
        authId,
      },
    });

    res.status(201).json({
      club_id: club.id,
      name: club.name,
      description: club.description,
      auth_id: club.authId,
    });
  } catch (err: unknown) {
    console.error("Error creating club:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown error creating club",
    });
  }
});

export default router;
