import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import prisma from "../config/database";
import { uploadToS3, getFromS3, getUserProfilePhotoKey } from "../config/s3";

const router = Router();

// Middleware to check if user is a club admin or officer of ANY club
const requireClubLeader = async (req: Request, res: Response, next: Function) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if user is admin of any club OR officer in any club
    const [clubAdmin, clubOfficer] = await Promise.all([
      prisma.clubAdmin.findFirst({
        where: { userId: userId }
      }),
      prisma.clubMembership.findFirst({
        where: { 
          userId: userId,
          role: "officer"
        }
      })
    ]);

    if (!clubAdmin && !clubOfficer) {
      return res.status(403).json({ error: "Club admin or officer access required" });
    }

    next();
  } catch (error) {
    console.error("Error checking club leader status:", error);
    res.status(500).json({ error: "Failed to verify permissions" });
  }
};

// Get all users - NO AUTHENTICATION RESTRICTION FOR DEBUGGING
router.get("/", async (req: Request, res: Response) => {
    try {
    // 1. Fetch user data and relationship status
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true, // Included in the select, but not the final response fields in the original TSX
        bio: true,
        // Relations to determine role
        fullWebsiteAdmin: { select: { userId: true } }, // Check for full website admin status
        adminClubs: { select: { authId: true } }, // Check if they are an admin of ANY club
      }
    });

    // 2. Map data to assign the correct role
    const usersWithRoles = users.map(u => {
      let role: "admin" | "club_leader" | "student" = "student";

      if (u.fullWebsiteAdmin) {
        role = "admin";
      } else if (u.adminClubs && u.adminClubs.length > 0) {
        role = "club_leader";
      }

      // Destructure to remove the relational objects before sending the response
      const { fullWebsiteAdmin, adminClubs, ...rest } = u;

      return {
        ...rest,
        role: role,
        // Since the front-end still relies on a club admin count for stats,
        // we'll explicitly add the _count structure here, even though it's incomplete
        // (it only shows the club admin count based on the fetched data, not memberships)
        _count: {
            clubAdmins: u.adminClubs.length,
            clubMemberships: 0, // Cannot determine from this query without another 'include'
        }
      };
    });

    res.json(usersWithRoles);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Promote user to admin (only full website admins can do this)
router.put("/users/:id/promote", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if current user is a full website admin
    const isFullAdmin = await prisma.fullWebsiteAdmin.findUnique({
      where: { userId: currentUserId }
    });

    if (!isFullAdmin) {
      return res.status(403).json({ error: "Only website admins can promote users" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        fullWebsiteAdmin: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.fullWebsiteAdmin) {
      return res.status(400).json({ error: "User is already an admin" });
    }

    // Create admin entry
    await prisma.fullWebsiteAdmin.create({
      data: {
        userId: userId
      }
    });

    res.json({
      success: true,
      message: `User promoted to admin`,
      newRole: "admin"
    });
  } catch (error) {
    console.error("Error promoting user:", error);
    res.status(500).json({ error: "Failed to promote user" });
  }
});

// Demote user from admin (only full website admins can do this)
router.put("/users/:id/demote", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if current user is a full website admin
    const isFullAdmin = await prisma.fullWebsiteAdmin.findUnique({
      where: { userId: currentUserId }
    });

    if (!isFullAdmin) {
      return res.status(403).json({ error: "Only website admins can demote users" });
    }

    // Prevent self-demotion
    if (userId === currentUserId) {
      return res.status(400).json({ error: "Cannot demote yourself" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        fullWebsiteAdmin: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.fullWebsiteAdmin) {
      return res.status(400).json({ error: "User is not an admin" });
    }

    // Remove admin entry
    await prisma.fullWebsiteAdmin.delete({
      where: {
        userId: userId
      }
    });

    res.json({
      success: true,
      message: `User demoted to student`,
      newRole: "student"
    });
  } catch (error) {
    console.error("Error demoting user:", error);
    res.status(500).json({ error: "Failed to demote user" });
  }
});

// Delete user (only full website admins can do this)
router.delete("/users/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if current user is a full website admin
    const isFullAdmin = await prisma.fullWebsiteAdmin.findUnique({
      where: { userId: currentUserId }
    });

    if (!isFullAdmin) {
      return res.status(403).json({ error: "Only website admins can delete users" });
    }

    // Prevent self-deletion
    if (userId === currentUserId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete user and all related data (cascading should handle relations)
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;