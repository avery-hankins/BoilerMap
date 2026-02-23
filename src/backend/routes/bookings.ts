import { Router, Request, Response } from "express";
import { createEmailTransporter } from "../config/email";
import prisma from "../config/database";

const router = Router();

// Get all room booking requests
router.get("/room-booking-requests", async (req: Request, res: Response) => {
  try {
    const requests = await prisma.booking.findMany({
      include: {
        club: true,
        room: true,
        user: true
      }
    });

    res.json(requests);
  } catch (err: unknown) {
    console.error("Error fetching room booking requests:", err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : "Unknown error fetching room booking requests" });
  }
});

// Create a new room booking request
router.post("/room-booking-requests", async (req: Request, res: Response) => {
  try {
    console.log(req.body);
    const { clubId, eventName, attendees, date, time, additionalInfo, authId, roomId, userId } = req.body;

    // Validate required fields
    if (!date || !time) {
      return res.status(400).json({ error: "Date and time are required" });
    }

    if (!roomId) {
      return res.status(400).json({ error: "Room ID is required" });
    }

    // Get club from clubId
    const club = await prisma.club.findUnique({
      where: {
        id: clubId,
      }
    });

    if (!club) {
      res.status(404).json({ error: "Club not found" });
      return;
    }

    let start_time = new Date(date + "T" + time);

    // Fetch room details from Purdue API using the roomId (which is a Purdue API UUID)
    const purdueApiUrl = `https://api.purdue.io/odata/rooms?$filter=id eq ${roomId}&$expand=Building`;
    const roomResponse = await fetch(purdueApiUrl);

    if (!roomResponse.ok) {
      return res.status(404).json({ error: "Room not found in Purdue API" });
    }

    const roomData = await roomResponse.json();

    if (!roomData.value || roomData.value.length === 0) {
      return res.status(404).json({ error: "Room not found in Purdue API" });
    }

    const purdueRoom = roomData.value[0];
    const buildingCode = purdueRoom.Building?.ShortCode;
    const roomNum = purdueRoom.Number;
    const roomCapacity = purdueRoom.Capacity || 50; // Default capacity if not provided

    if (!buildingCode || !roomNum) {
      return res.status(400).json({ error: "Invalid room data from Purdue API" });
    }

    // Find or create the room in our database using buildingCode and roomNum
    const room = await prisma.room.upsert({
      where: {
        buildingCode_roomNum: {
          buildingCode: buildingCode,
          roomNum: roomNum
        }
      },
      update: {},
      create: {
        buildingCode: buildingCode,
        roomNum: roomNum,
        roomCapacity: roomCapacity
      }
    });

    const result = await prisma.booking.create({
      data: {
        club: { connect: { id: club.id } },
        room: { connect: { id: room.id } },
        expectedAttendance: parseInt(attendees),
        startTime: start_time,
        endTime: start_time,
        description: additionalInfo,
        user: { connect: { id: parseInt(userId) } },
        approvalStatus: "PENDING"
      }
    });

    res.status(201).json({
      room_booking_request_id: result.id,
      clubName: club.name,
      eventName,
      attendees,
      date,
      time,
      additionalInfo,
    });

    const user = await prisma.user.findUnique({
      where: {
        id: parseInt(userId)
      }
    });

    const transporter = createEmailTransporter();

    // Send email to creator of booking request
    if (user) {
      await transporter.sendMail({
        from: "BoilerMap <boilermap@gmail.com>",
        to: user.email,
        subject: "Room Booking Request Submitted",
        text: `Your room booking request has been submitted and is pending approval.`
      });
    } else {
      console.warn(`User with ID ${userId} not found. Cannot send submission email.`);
    }
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : "Unknown error creating room booking request" });
  }
});

// Approve room booking request
router.put("/room-booking-requests/:id/approve", async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id as string);

    const request = await prisma.booking.update({
      where: { id: requestId },
      data: {
        approvalStatus: "PRIMARY_APPROVED"
      }
    });

    res.json(request);

    const user = await prisma.user.findUnique({
      where: {
        id: request.userId
      }
    });

    const transporter = createEmailTransporter();

    if (user) {
      await transporter.sendMail({
        from: "BoilerMap <boilermap@gmail.com>",
        to: user.email,
        subject: "Room Booking Request Approved",
        text: `Your room booking request has been approved.`
      });
    } else {
      console.warn(`User with ID ${request.userId} not found. Cannot send approval email.`);
    }
  } catch (err: unknown) {
    console.error("Error approving room booking request:", err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : "Unknown error approving room booking request" });
  }
});

// Deny room booking request
router.put("/room-booking-requests/:id/deny", async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id as string);

    const request = await prisma.booking.update({
      where: { id: requestId },
      data: {
        approvalStatus: "DENIED"
      }
    });

    res.json(request);

    const user = await prisma.user.findUnique({
      where: {
        id: request.userId
      }
    });

    const transporter = createEmailTransporter();

    if (user) {
      await transporter.sendMail({
        from: "BoilerMap <boilermap@gmail.com>",
        to: user.email,
        subject: "Room Booking Request Denied",
        text: `Your room booking request has been denied.`
      });
    } else {
      console.warn(`User with ID ${request.userId} not found. Cannot send denial email.`);
    }
  } catch (err: unknown) {
    console.error("Error denying room booking request:", err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : "Unknown error denying room booking request" });
  }
});

export default router;
