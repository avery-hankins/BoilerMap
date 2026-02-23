import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { authenticateToken } from "../middleware/auth";
import { upload } from "../config/multer";
import prisma from "../config/database";
import { uploadToS3, getFromS3, getUserProfilePhotoKey } from "../config/s3";

const router = Router();

// Get all users
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
  } catch (err: unknown) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : "Failed to fetch users" });
  }
});

router.get("/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        bio: true,
        fullWebsiteAdmin: {
          select: {
            id: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return user with role
    res.json({
      ...user,
      role: user.fullWebsiteAdmin ? "admin" : "student"
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});



// Get current user data (must be before /:id to avoid matching "userdata" as an id)
router.get("/userdata", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (userId === undefined) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: unknown) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: (error instanceof Error) ? error.message : 'Server error' });
  }
});

// Update current user data (must be before /:id to avoid matching "userdata" as an id)
router.put("/userdata", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (userId === undefined) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    console.log('Updating user:', userId);
    const { username, email, bio } = req.body;
    console.log('Updating user:', req.body);
    console.log('Type of bio:', typeof req.body.bio, 'Value:', req.body.bio);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { username, email, bio },
      select: {
        username: true,
        email: true,
        bio: true
      }
    });

    res.json(updatedUser);
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: (error instanceof Error) ? error.message : 'Failed to update profile' });
  }
});

// Get profile photo (must be before /:id to avoid matching "profile-photo" as an id)
router.get('/profile-photo', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (userId === undefined) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('=== BACKEND PHOTO REQUEST ===');
    console.log('User ID:', userId);

    const s3Key = getUserProfilePhotoKey(userId);
    console.log('S3 Key:', s3Key);

    try {
      // Try to fetch from S3
      const imageBuffer = await getFromS3(s3Key);
      console.log('✅ Photo found in S3');

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', imageBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      res.send(imageBuffer);
      console.log('✅ Photo sent successfully from S3');
    } catch (s3Error: any) {
      // If not found in S3, fall back to local default
      console.log('Photo not found in S3, checking local default');

      const defaultPhotoPath = path.join(__dirname, '../uploads', 'default.jpg');

      if (!fs.existsSync(defaultPhotoPath)) {
        console.error('Default photo missing — cannot send image');
        return res.status(404).json({ error: 'No profile or default image found' });
      }

      const stats = fs.statSync(defaultPhotoPath);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'no-cache');

      console.log('✅ Sending default file:', defaultPhotoPath);
      res.sendFile(defaultPhotoPath, (err: Error) => {
        if (err) {
          console.error('Error sending file:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to send file' });
          }
        } else {
          console.log('✅ Default file sent successfully');
        }
      });
    }
  } catch (error: unknown) {
    console.error('Error:', error);
    res.status(500).json({ error: (error instanceof Error) ? error.message : 'Failed to fetch profile photo' });
  }
});

// Upload profile photo (must be before /:id to avoid matching "upload-profile-photo" as an id)
router.put('/upload-profile-photo', authenticateToken, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const userId = req.userId;
    if (userId === undefined) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('=== UPLOADING PROFILE PHOTO TO S3 ===');
    console.log('User ID:', userId);
    console.log('File size:', req.file.size);
    console.log('File type:', req.file.mimetype);

    // Upload to S3
    const s3Key = getUserProfilePhotoKey(userId);
    const s3Url = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

    console.log('✅ Photo uploaded to S3:', s3Url);

    res.json({
      message: 'Profile photo uploaded successfully',
      url: s3Url,
      key: s3Key
    });
  } catch (err: unknown) {
    console.error('Error uploading profile photo:', err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : 'Failed to upload profile photo' });
  }
});

// Get club memberships (must be before /:id to avoid matching "club-memberships" as an id)
router.get('/club-memberships', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (userId === undefined) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const memberships = await prisma.clubMembership.findMany({
      where: {
        userId: userId
      }
    });

    res.json(memberships);
  } catch (error: unknown) {
    res.status(500).json({ error: (error instanceof Error) ? error.message : 'Server error' });
  }
});

// Leave a club (must be before /:id to avoid matching "club-memberships" as an id)
router.put('/club-memberships', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { clubId } = req.body;
    const userId = req.userId;
    if (userId === undefined) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!clubId) {
      return res.status(400).json({ error: 'Club ID is required' });
    }

    // Delete any matching membership between this user and club
    const deleted = await prisma.clubMembership.deleteMany({
      where: {
        userId: Number(userId),
        clubId: Number(clubId),
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ message: 'No matching membership found to remove' });
    }

    res.json({
      message: 'Successfully left the club',
      removedCount: deleted.count,
    });
  } catch (error: unknown) {
    console.error('Error removing club membership:', error);
    res.status(500).json({ error: (error instanceof Error) ? error.message : 'Failed to leave club' });
  }
});

// Get single user by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        bio: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err: unknown) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : "Unknown error fetching user" });
  }
});

// Get user's roles across all clubs
router.get("/:userId/roles", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId as string);

    // Get user info with bio
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        bio: true,
        username: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get all club memberships with roles
    const memberships = await prisma.clubMembership.findMany({
      where: { userId },
      include: {
        club: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Get clubs where user is admin
    const adminClubs = await prisma.clubAdmin.findMany({
      where: { userId },
      include: {
        club: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const roles = [
      ...memberships.map((m: any) => ({
        clubId: m.club.id,
        clubName: m.club.name,
        role: m.role || 'member',
        joinedAt: m.joinedAt
      })),
      ...adminClubs.map((a: any) => ({
        clubId: a.club.id,
        clubName: a.club.name,
        role: 'admin',
        joinedAt: null
      }))
    ];

    res.json({ user, roles });
  } catch (err: unknown) {
    console.error("Error fetching user roles:", err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : "Unknown error fetching user roles" });
  }
});

// Update user bio
router.put("/:id/bio", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    const { bio, requestingUserId } = req.body;

    // Check if user is updating their own bio
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: "You can only update your own bio" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { bio },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        bio: true
      }
    });

    res.json({ success: true, user });
  } catch (err: unknown) {
    console.error("Error updating bio:", err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : "Unknown error updating bio" });
  }
});

router.put("/:id/promote", async (req: Request, res: Response) => {
    try {
        const userIdToPromote = parseInt(req.params.id as string);

        const user = await prisma.user.findUnique({
            where: { id: userIdToPromote },
            include: { fullWebsiteAdmin: true }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user.fullWebsiteAdmin) {
            return res.status(400).json({ error: "User is already an admin" });
        }

        // Create admin entry in FullWebsiteAdmin table
        await prisma.fullWebsiteAdmin.create({
            data: { userId: userIdToPromote }
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

router.put("/:id/demote", async (req: Request, res: Response) => {
    try {
        const userIdToDemote = parseInt(req.params.id as string);
        const currentUserId = req.userId; // Already checked in middleware

        // Prevent self-demotion
        if (userIdToDemote === currentUserId) {
            return res.status(400).json({ error: "Cannot demote yourself" });
        }

        const user = await prisma.user.findUnique({
            where: { id: userIdToDemote },
            include: { fullWebsiteAdmin: true }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!user.fullWebsiteAdmin) {
            return res.status(400).json({ error: "User is not an admin" });
        }

        // Remove admin entry from FullWebsiteAdmin table
        await prisma.fullWebsiteAdmin.delete({
            where: { userId: userIdToDemote }
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

router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const userIdToDelete = parseInt(req.params.id as string);
        const currentUserId = req.userId; // Already checked in middleware

        // Prevent self-deletion
        if (userIdToDelete === currentUserId) {
            return res.status(400).json({ error: "Cannot delete your own account" });
        }

        const user = await prisma.user.findUnique({
            where: { id: userIdToDelete }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Delete user and all related data (requires correct onDelete: Cascade settings in schema)
        await prisma.user.delete({
            where: { id: userIdToDelete }
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

router.get("/:id/following", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get all clubs the user is following
    const following = await prisma.follow.findMany({
      where: { userId },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            description: true,
            authId: true,
            email: true,
            instagram: true,
            _count: {
              select: {
                memberships: true,
                events: true,
                posts: true
              }
            }
          }
        }
      },
      orderBy: {
        club: {
          name: 'asc'
        }
      }
    });

    // Map to a cleaner response format
    const clubs = following.map(f => ({
      ...f.club,
      memberCount: f.club._count.memberships,
      eventCount: f.club._count.events,
      postCount: f.club._count.posts,
      _count: undefined // Remove the _count object from response
    }));

    res.json({
      userId,
      followingCount: clubs.length,
      clubs
    });
  } catch (err: unknown) {
    console.error("Error fetching user following:", err);
    res.status(500).json({ 
      error: (err instanceof Error) ? err.message : "Failed to fetch following clubs" 
    });
  }
});

export default router;
