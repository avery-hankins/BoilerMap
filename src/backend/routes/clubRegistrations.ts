import { Router, Request, Response } from "express";
import { createEmailTransporter } from "../config/email";
import prisma from "../config/database";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Middleware to check if user is a system admin
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { fullWebsiteAdmin: true }
    });

    if (!user || !user.fullWebsiteAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (err: unknown) {
    console.error("Error checking admin status:", err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : "Unknown error" });
  }
};

// Get all club registration requests (admin only)
router.get("/", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const whereClause: any = {};
    if (status && typeof status === 'string') {
      whereClause.status = status;
    }

    const requests = await prisma.clubRegistration.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(requests);
  } catch (err: unknown) {
    console.error("Error fetching club registration requests:", err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : "Unknown error fetching club registration requests" });
  }
});

// Get a specific club registration request
router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);

    const request = await prisma.clubRegistration.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: "Club registration request not found" });
    }

    // Check if user is admin or the requester
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { fullWebsiteAdmin: true }
    });

    const isRequester = request.userId === req.userId;

    if (!user?.fullWebsiteAdmin && !isRequester) {
      return res.status(403).json({ error: "You don't have permission to view this request" });
    }

    res.json(request);
  } catch (err: unknown) {
    console.error("Error fetching club registration request:", err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : "Unknown error" });
  }
});

// Submit a new club registration request
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      clubName,
      clubDescription
    } = req.body;

    // Validate required fields
    if (!clubName) {
      return res.status(400).json({
        error: "Club name is required"
      });
    }

    // Create the registration request
    const registration = await prisma.clubRegistration.create({
      data: {
        userId: req.userId!,
        clubName,
        clubDescription: clubDescription || null,
        status: "PENDING"
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      message: "Club registration request submitted successfully",
      registration
    });

    // Send confirmation email to requester
    const transporter = createEmailTransporter();

    await transporter.sendMail({
      from: "BoilerMap <boilermap@gmail.com>",
      to: registration.user.email,
      subject: "Club Registration Request Submitted",
      text: `Your club registration request for "${clubName}" has been submitted successfully.\n\nWe will review your request and notify you of the decision.\n\nThank you for your interest in creating a club on BoilerMap!`
    });

  } catch (err: unknown) {
    console.error("Error creating club registration request:", err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : "Unknown error creating club registration request" });
  }
});

// Approve club registration request (admin only)
router.put("/:id/approve", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);

    // Check if request exists and is pending
    const existingRequest = await prisma.clubRegistration.findUnique({
      where: { id: requestId }
    });

    if (!existingRequest) {
      return res.status(404).json({ error: "Club registration request not found" });
    }

    if (existingRequest.status !== "PENDING") {
      return res.status(400).json({ error: "This request has already been processed" });
    }

    // Update the request status
    const request = await prisma.clubRegistration.update({
      where: { id: requestId },
      data: {
        status: "APPROVED"
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: "Club registration request approved",
      request
    });

    // Send approval email to requester
    const transporter = createEmailTransporter();

    const emailText = `Great news! Your club registration request for "${request.clubName}" has been approved!\n\nYou can now set up your club on BoilerMap. An administrator will be in touch with next steps for creating your official club profile.\n\nThank you for contributing to the Purdue community!`;

    await transporter.sendMail({
      from: "BoilerMap <boilermap@gmail.com>",
      to: request.user.email,
      subject: "Club Registration Request Approved!",
      text: emailText
    });

  } catch (err: unknown) {
    console.error("Error approving club registration request:", err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : "Unknown error approving club registration request" });
  }
});

// Deny club registration request (admin only)
router.put("/:id/deny", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);

    // Check if request exists and is pending
    const existingRequest = await prisma.clubRegistration.findUnique({
      where: { id: requestId }
    });

    if (!existingRequest) {
      return res.status(404).json({ error: "Club registration request not found" });
    }

    if (existingRequest.status !== "PENDING") {
      return res.status(400).json({ error: "This request has already been processed" });
    }

    // Update the request status
    const request = await prisma.clubRegistration.update({
      where: { id: requestId },
      data: {
        status: "NOTAPPROVED"
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: "Club registration request denied",
      request
    });

    // Send denial email to requester
    const transporter = createEmailTransporter();

    const emailText = `We regret to inform you that your club registration request for "${request.clubName}" has been denied.\n\nIf you believe this was in error or would like to appeal this decision, please contact the BoilerMap administration team.\n\nThank you for your interest in creating a club on BoilerMap.`;

    await transporter.sendMail({
      from: "BoilerMap <boilermap@gmail.com>",
      to: request.user.email,
      subject: "Club Registration Request Denied",
      text: emailText
    });

  } catch (err: unknown) {
    console.error("Error denying club registration request:", err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : "Unknown error denying club registration request" });
  }
});

export default router;
