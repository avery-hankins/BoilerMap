  import { Router, Request, Response } from "express";
  import path from "path";
  import fs from "fs";
  import multer from "multer";
  import { authenticateToken } from "../middleware/auth";
  import { upload } from "../config/multer";
  import prisma from "../config/database";
  import { uploadToS3, getFromS3, getEventImageKey } from "../config/s3";

  const router = Router();

  // Get event list with full details
  router.get('/eventlist', authenticateToken, async (req: Request, res: Response) => {
    try {
      const events = await prisma.event.findMany({
        include: {
          room: {
            select: {
              id: true,
              buildingCode: true,
              roomNum: true,
              roomCapacity: true
            }
          },
          booking: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              expectedAttendance: true,
              description: true,
              approvalStatus: true
            }
          },
          club: {
            select: {
              id: true,
              name: true,
              description: true,
              email: true,
              instagram: true
            }
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          startTime: 'asc'
        }
      });

      res.json(events);
    } catch (err: unknown) {
      console.error("Error fetching events:", err);
      res.status(500).json({
        error: (err instanceof Error) ? err.message : "Unknown error fetching events"
      });
    }
  });

// Create a new event
  router.post("/makeevent", authenticateToken, upload.single('image'), async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
      const userId = req.userId;
      if (userId === undefined) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const {
        clubId,
        roomId,
        bookingId,
        startTime,
        endTime,
        description,
        isRecurring,
        tagIds
      } = req.body;

      // Validate required fields
      if (!clubId || !roomId || !startTime || !endTime) {
        return res.status(400).json({
          error: 'Missing required fields: clubId, roomId, startTime, endTime are required'
        });
      }

      // Helper function to convert UTC to EST for display
      const convertUTCToEST = (utcDate: Date): string => {
        // Convert UTC date to EST string (UTC-5)
        const estDate = new Date(utcDate.getTime() - (5 * 60 * 60 * 1000));
        return estDate.toISOString();
      };

      // Validate dates - incoming times are in UTC
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      if (end <= start) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }

      // Check if user is authorized (must be club admin or have a role)
      const club = await prisma.club.findUnique({
        where: { id: parseInt(clubId) },
        select: { authId: true, name: true }
      });

      if (!club) {
        return res.status(404).json({ error: 'Club not found' });
      }

      // Check if user is admin
      const isAdmin = await prisma.clubAdmin.findUnique({
        where: {
          userId_authId: {
            userId: userId,
            authId: club.authId
          }
        }
      });

      // Check if user is at least a member with officer role
      const membership = await prisma.clubMembership.findUnique({
        where: {
          userId_clubId: {
            userId: userId,
            clubId: parseInt(clubId)
          }
        }
      });

      if (!isAdmin && membership?.role !== 'officer') {
        return res.status(403).json({
          error: 'Permission denied. Only club admins and officers can create events.'
        });
      }

      // Verify room exists
      const room = await prisma.room.findUnique({
        where: { id: parseInt(roomId) }
      });

      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      // Booking ID is required - events can only be created from existing bookings
      if (!bookingId) {
        return res.status(400).json({
          error: 'Booking ID is required. Events must be created from approved bookings.'
        });
      }

      // Verify booking exists and is approved
      const booking = await prisma.booking.findUnique({
        where: { id: parseInt(bookingId) }
      });

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      if (booking.approvalStatus === 'DENIED') {
        return res.status(400).json({ error: 'Cannot create event from denied booking' });
      }

      if (booking.approvalStatus === 'PENDING') {
        return res.status(400).json({ error: 'Booking must be approved before creating event' });
      }

      // Check if this booking already has an event
      const existingEvent = await prisma.event.findFirst({
        where: { bookingId: parseInt(bookingId) }
      });

      if (existingEvent) {
        return res.status(409).json({
          error: 'An event already exists for this booking',
          eventId: existingEvent.id
        });
      }

      // Create the event
      const event = await prisma.event.create({
        data: {
          roomId: parseInt(roomId),
          bookingId: booking.id,
          clubId: parseInt(clubId),
          startTime: start,
          endTime: end,
          description: description || null,
          isRecurring: isRecurring === true || isRecurring === 'true',
          numRSVPs: 0
        },
        include: {
          club: {
            select: {
              id: true,
              name: true
            }
          },
          room: {
            select: {
              buildingCode: true,
              roomNum: true,
              roomCapacity: true
            }
          },
          booking: {
            select: {
              startTime: true,
              endTime: true,
              expectedAttendance: true,
              description: true,
              approvalStatus: true
            }
          }
        }
      });

      // Handle image upload if present
      let imagePath = null;

      console.log('Checking for uploaded file...');
      console.log('req.file exists:', !!req.file);

      if (req.file) {
        console.log('File details:', {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          hasBuffer: !!req.file.buffer,
          bufferLength: req.file.buffer?.length
        });

        try {
          // Verify buffer exists
          if (!req.file.buffer) {
            console.error('File buffer is undefined!');
            throw new Error('File buffer is undefined');
          }

          // Generate filename with original extension
          const ext = path.extname(req.file.originalname);
          const filename = `image${ext}`;

          console.log('Uploading to S3...');

          // Upload to S3
          const s3Key = getEventImageKey(event.id, filename);
          const s3Url = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

          console.log(`✅ Image uploaded to S3: ${s3Url}`);
          console.log(`S3 Key: ${s3Key}`);

          // Store S3 URL for response and database
          imagePath = s3Url;

          // Update event with image path
          await prisma.event.update({
            where: { id: event.id },
            data: { imagePath: s3Key }
          });

          console.log('✅ Event updated with S3 image path');

        } catch (imageError) {
          console.error('Error uploading image to S3:', imageError);
          // Continue without failing the entire request
        }
      } else {
        console.log('No file uploaded with request');
      }

      // Handle event tags if present
      if (tagIds) {
        try {
          const parsedTagIds = JSON.parse(tagIds);
          console.log('Parsed tag IDs:', parsedTagIds);

          if (Array.isArray(parsedTagIds) && parsedTagIds.length > 0) {
            // Create EventTag entries for each selected tag
            const eventTagsData = parsedTagIds.map((tagId: number) => ({
              eventId: event.id,
              tagId: parseInt(String(tagId))
            }));

            await prisma.eventTags.createMany({
              data: eventTagsData
            });

            console.log(`✅ Created ${eventTagsData.length} event tags`);
          }
        } catch (tagError) {
          console.error('❌ Error saving event tags:', tagError);
        }
      } else {
        console.log('No tags provided for this event');
      }

      // Handle recurring event duplication (for demo)
      if (isRecurring === true || isRecurring === 'true') {
        const repeatCount = 15; // arbitrary for demo (16 total incl. original)

        const recurringEvents = [];

        for (let i = 1; i <= repeatCount; i++) {
          const nextStart = new Date(start);
          const nextEnd = new Date(end);
          nextStart.setDate(start.getDate() + 7 * i);
          nextEnd.setDate(end.getDate() + 7 * i);

          recurringEvents.push({
            roomId: parseInt(roomId),
            bookingId: booking.id,
            clubId: parseInt(clubId),
            startTime: nextStart,
            endTime: nextEnd,
            description: description || null,
            isRecurring: true,
            numRSVPs: 0,
          });
        }

        // Bulk insert
        await prisma.event.createMany({
          data: recurringEvents,
        });

        console.log(`✅ Created ${repeatCount} recurring copies for event ${event.id}`);
      }
      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        event: {
          ...event,
          startTime: convertUTCToEST(event.startTime),
          endTime: convertUTCToEST(event.endTime),
          imagePath: imagePath,
          booking: event.booking ? {
            ...event.booking,
            startTime: convertUTCToEST(event.booking.startTime),
            endTime: convertUTCToEST(event.booking.endTime)
          } : event.booking
        }
      });

    } catch (error: unknown) {
      console.error('Error creating event:', error);

      // Check if it's a multer error
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ error: `Upload error: ${error.message}` });
      }

      res.status(500).json({
        error: (error instanceof Error) ? error.message : 'Server error while creating event'
      });
    }
  });
  
  // Get image for an event
  router.get("/get-image-by-event/:eventId", async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId as string;

      // Validate eventId
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      // Verify event exists and get its imagePath
      const event = await prisma.event.findUnique({
        where: { id: parseInt(eventId) },
        select: { id: true, imagePath: true }
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check if event has an image stored
      if (!event.imagePath) {
        return res.status(404).json({ error: 'No image found for this event' });
      }

      console.log('Fetching image from S3 for event:', eventId);
      console.log('S3 Key:', event.imagePath);

      try {
        // Fetch image from S3
        const imageBuffer = await getFromS3(event.imagePath);

        // Determine content type based on file extension
        const ext = path.extname(event.imagePath).toLowerCase();
        const contentTypeMap: { [key: string]: string } = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };

        const contentType = contentTypeMap[ext] || 'application/octet-stream';

        // Set appropriate headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', imageBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

        console.log('✅ Sending image from S3');
        res.send(imageBuffer);

      } catch (s3Error: any) {
        console.error('Error fetching from S3:', s3Error);
        return res.status(404).json({ error: 'Image not found in storage' });
      }

    } catch (error: unknown) {
      console.error('Error fetching event image:', error);
      res.status(500).json({
        error: (error instanceof Error) ? error.message : 'Server error while fetching image'
      });
    }
  });

  // RSVP to an event
  router.post('/rsvp', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      if (userId === undefined) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { eventId, emailNotifications } = req.body;

      // Validate required fields
      if (!eventId) {
        return res.status(400).json({ error: 'Event ID is required' });
      }

      // emailNotifications is optional, defaults to true (they want emails)
      const wantsEmails = emailNotifications !== false;
      const status = wantsEmails ? 'email_yes' : 'email_no';

      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id: parseInt(eventId) },
        select: {
          id: true,
          clubId: true,
          numRSVPs: true
        }
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check if user already has an RSVP for this event
      const existingRSVP = await prisma.rSVP.findUnique({
        where: {
          userId_eventId: {
            userId: userId,
            eventId: parseInt(eventId)
          }
        }
      });

      let rsvp;
      let wasUpdated = false;

      if (existingRSVP) {
        // Update existing RSVP (change email preference)
        rsvp = await prisma.rSVP.update({
          where: {
            userId_eventId: {
              userId: userId,
              eventId: parseInt(eventId)
            }
          },
          data: {
            status: status
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            event: {
              select: {
                id: true,
                description: true,
                startTime: true,
                endTime: true,
                club: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        });
        wasUpdated = true;
      } else {
        // Create new RSVP
        rsvp = await prisma.rSVP.create({
          data: {
            userId: userId,
            eventId: parseInt(eventId),
            status: status
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            event: {
              select: {
                id: true,
                description: true,
                startTime: true,
                endTime: true,
                club: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        });

        // Increment numRSVPs count for new RSVP
        await prisma.event.update({
          where: { id: parseInt(eventId) },
          data: { numRSVPs: { increment: 1 } }
        });
      }

      res.status(wasUpdated ? 200 : 201).json({
        success: true,
        message: wasUpdated ? 'RSVP updated successfully' : 'RSVP created successfully',
        rsvp: rsvp,
        emailNotifications: wantsEmails
      });

    } catch (error: unknown) {
      console.error('Error creating/updating RSVP:', error);
      res.status(500).json({
        error: (error instanceof Error) ? error.message : 'Server error while processing RSVP'
      });
    }
  });

  // Cancel RSVP
  router.delete('/rsvp/:eventId', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      if (userId === undefined) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const eventId = req.params.eventId as string;

      // Validate event ID
      if (!eventId) {
        return res.status(400).json({ error: 'Event ID is required' });
      }

      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id: parseInt(eventId) },
        select: {
          id: true,
          numRSVPs: true
        }
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check if RSVP exists
      const existingRSVP = await prisma.rSVP.findUnique({
        where: {
          userId_eventId: {
            userId: userId,
            eventId: parseInt(eventId)
          }
        }
      });

      if (!existingRSVP) {
        return res.status(404).json({ error: 'RSVP not found. You have not RSVPd to this event.' });
      }

      // Delete the RSVP
      await prisma.rSVP.delete({
        where: {
          userId_eventId: {
            userId: userId,
            eventId: parseInt(eventId)
          }
        }
      });

      // Decrement numRSVPs count
      await prisma.event.update({
        where: { id: parseInt(eventId) },
        data: { numRSVPs: { decrement: 1 } }
      });

      res.status(200).json({
        success: true,
        message: 'RSVP cancelled successfully'
      });

    } catch (error: unknown) {
      console.error('Error deleting RSVP:', error);
      res.status(500).json({
        error: (error instanceof Error) ? error.message : 'Server error while cancelling RSVP'
      });
    }
  });

  // Get likes for an event
  router.get("/:eventId/likes", authenticateToken, async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId as string;
      const userId = req.userId;
      if (typeof userId !== "number") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const [count, userLike] = await Promise.all([
        prisma.likesEvents.count({
          where: { eventId: Number(eventId) },
        }),
        prisma.likesEvents.findUnique({
          where: {
            userId_eventId: {
              userId,
              eventId: Number(eventId),
            },
          },
        }),
      ]);

      res.json({
        count,
        likedByUser: !!userLike,
      });
    } catch (error) {
      console.error("Error fetching likes:", error);
      res.status(500).json({ error: "Failed to fetch likes" });
    }
  });

  // Like an event
  router.post("/:eventId/like", authenticateToken, async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId as string;
      const userId = req.userId;
      if (typeof userId !== "number") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await prisma.likesEvents.create({
        data: {
          userId,
          eventId: Number(eventId),
        },
      });

      res.json({ message: "Event liked successfully" });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(400).json({ error: "Already liked" });
      }
      console.error("Error liking event:", error);
      res.status(500).json({ error: "Failed to like event" });
    }
  });

  // Unlike an event
  router.delete("/:eventId/like", authenticateToken, async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId as string;
      const userId = req.userId;
      if (typeof userId !== "number") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await prisma.likesEvents.delete({
        where: {
          userId_eventId: {
            userId,
            eventId: Number(eventId),
          },
        },
      });

      res.json({ message: "Event unliked successfully" });
    } catch (error: any) {
      console.error("Error unliking event:", error);
      res.status(500).json({ error: "Failed to unlike event" });
    }
  });

  

router.get("/:eventId/views", async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;

    const event = await prisma.event.findUnique({
      where: { id: Number(eventId) },
      select: { views: true }
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ views: event.views });
  } catch (err: unknown) {
    console.error("Error fetching view count:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to fetch view count"
    });
  }
});

router.post("/:eventId/views", async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;

    const updated = await prisma.event.update({
      where: { id: Number(eventId) },
      data: {
        views: {
          increment: 1,
        },
      },
      select: { views: true },
    });

    res.json({
      message: "View count updated",
      views: updated.views,
    });
  } catch (err: unknown) {
    console.error("Error updating views:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to update views",
    });
  }
});

// Get all tags
router.get('/gettags', async (req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    });
    res.status(200).json(tags); 
  } catch (error: unknown) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ 
      error: (error instanceof Error) ? error.message : 'Server error while fetching tags' 
    });
  }
});


  // Search events
  router.get("/search", async (req: Request, res: Response) => {
    try {
      console.log('events search query params:', req.query);

      const { query, dateFilter, sortBy, location, minAttendeesFilter, maxAttendeesFilter, tagFilter } = req.query;
      const tagFilterValue = typeof tagFilter === 'string' ? tagFilter : '';
      const searchQuery = typeof query === 'string' ? query.toLowerCase() : '';
      const dateFilterValue = typeof dateFilter === 'string' ? dateFilter : 'all';
      const sortByValue = typeof sortBy === 'string' ? sortBy : 'date';
      const locationFilter = typeof location === 'string' ? location : '';
      const minAttendeesThreshold = minAttendeesFilter ? parseInt(minAttendeesFilter as string, 10) : 0;
      const maxAttendeesThreshold = maxAttendeesFilter ? parseInt(maxAttendeesFilter as string, 10) : 0;

      // Calculate date range based on filter
      let startDate = new Date();
      let endDate: Date | undefined;

      switch (dateFilterValue) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 7);
          break;
        case 'month':
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'all':
        default:
          startDate.setHours(0, 0, 0, 0);
          endDate = undefined;
          break;
      }

      // Build where clause for date filtering
      const dateWhere = endDate
        ? {
            startTime: {
              gte: startDate,
              lte: endDate
            }
          }
        : {
            startTime: {
              gte: startDate
            }
          };

      // Build location filter
      let whereClause: any = dateWhere;

      if (locationFilter) {
        whereClause = {
          ...whereClause,
          room: {
            buildingCode: locationFilter
          }
        };
      }

      // Add tag filter to where clause if provided
      if (tagFilterValue) {
        whereClause = {
          ...whereClause,
          tags: {
            some: {
              tagId: parseInt(tagFilterValue, 10)
            }
          }
        };
      }

      // Build orderBy clause based on sortBy parameter
      const orderBy = sortByValue === 'popular'
        ? [
            { numRSVPs: 'desc' as const },
            { startTime: 'asc' as const }
          ]
        : [{ startTime: 'asc' as const }];

      // Fetch events with all filters and sorting
      const allEvents = await prisma.event.findMany({
        where: whereClause,
        include: {
          club: {
            select: {
              id: true,
              name: true
            }
          },
          room: {
            select: {
              buildingCode: true,
              roomNum: true
            }
          },
          booking: {
            select: {
              description: true,
              expectedAttendance: true
            }
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              rsvps: true
            }
          }
        },
        orderBy
      });

      // Apply search filter if query provided
      let events = searchQuery
        ? allEvents.filter((event: any) => {
            const eventDesc = (event.description || '').toLowerCase();
            const bookingDesc = (event.booking?.description || '').toLowerCase();
            const clubName = (event.club?.name || '').toLowerCase();

            return eventDesc.includes(searchQuery) ||
                  bookingDesc.includes(searchQuery) ||
                  clubName.includes(searchQuery);
          })
        : allEvents;

      // Apply min attendees filter if provided
      if (minAttendeesThreshold > 0) {
        events = events.filter(
          (event: any) => event._count.rsvps >= minAttendeesThreshold
        );
      }

      // Apply max attendees filter if provided
      if (maxAttendeesThreshold > 0) {
        events = events.filter(
          (event: any) => event._count.rsvps <= maxAttendeesThreshold
        );
      }

      res.json(events.slice(0, 50)); // Limit to 50 results
    } catch (err) {
      console.error("Error searching events:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Get all upcoming events (no search)
  router.get("/", async (req: Request, res: Response) => {
    try {
      const events = await prisma.event.findMany({
        where: {
          startTime: {
            gte: new Date()
          }
        },
        include: {
          club: {
            select: {
              id: true,
              name: true
            }
          },
          room: {
            select: {
              buildingCode: true,
              roomNum: true
            }
          },
          booking: {
            select: {
              description: true,
              expectedAttendance: true
            }
          }
        },
        orderBy: { startTime: 'asc' },
        take: 50
      });

      res.json(events);
    } catch (err) {
      console.error("Error fetching events:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Get events for a specific user (admin of clubs) - must be before /:id route
  interface EventResponse {
    id: string;
    name: string;
    date: Date | string;
    clubName: string;
  }

  router.get('/events-for-user', async (req: Request, res: Response): Promise<void> => {
    try {
      const userEmail = req.query.email as string;

      if (!userEmail) {
        res.status(400).json({ error: 'Email parameter is required' });
        return;
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Find all clubs where user is an admin
      const clubAdmins = await prisma.clubAdmin.findMany({
        where: {
          userId: user.id,
        },
        select: {
          club: {
            select: {
              id: true,
            },
          },
        },
      });

      const clubIds = clubAdmins.map((ca: any) => ca.club.id);

      if (clubIds.length === 0) {
        res.json([]);
        return;
      }

      // Get all upcoming events for those clubs
      const events = await prisma.event.findMany({
        where: {
          clubId: {
            in: clubIds,
          },
          startTime: {
            gte: new Date(),
          },
        },
        include: {
          club: true,
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      // Transform to match expected format
      const formattedEvents = events.map((event: any) => ({
        id: event.id.toString(),
        name: event.description || 'Unnamed Event',
        date: event.startTime.toISOString(),
        clubName: event.club.name,
      }));

      res.json(formattedEvents);
    } catch (error) {
      console.error('Error fetching events for user:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  // Get a single event by ID
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id as string);

      if (isNaN(eventId)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          club: {
            select: {
              id: true,
              name: true
            }
          },
          room: {
            select: {
              buildingCode: true,
              roomNum: true
            }
          },
          booking: {
            select: {
              description: true,
              expectedAttendance: true
            }
          },
          _count: {
            select: {
              rsvps: true
            }
          }
        }
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      res.json(event);
    } catch (err) {
      console.error("Error fetching event:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Toggle RSVP for an event (alternative endpoint)
  router.post("/:id/rsvp", authenticateToken, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id as string);
      const userId = req.userId;

      const { emailPreference } = req.body;
      console.log(String(emailPreference));
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (isNaN(eventId)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }

      // Validate emailPreference if provided
      if (emailPreference && emailPreference !== 'email_yes' && emailPreference !== 'email_no') {
        return res.status(400).json({ error: "Invalid email preference. Must be 'email_yes' or 'email_no'" });
      }

      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Check if user already has an RSVP
      const existingRSVP = await prisma.rSVP.findUnique({
        where: {
          userId_eventId: {
            userId,
            eventId
          }
        }
      });

      if (existingRSVP) {
        // Delete the RSVP (toggle off)
        await prisma.rSVP.delete({
          where: {
            userId_eventId: {
              userId,
              eventId
            }
          }
        });

        // Decrement the RSVP count
        await prisma.event.update({
          where: { id: eventId },
          data: { numRSVPs: { decrement: 1 } }
        });

        res.json({ rsvpd: false, message: "RSVP cancelled" });
      } else {
        const status = emailPreference || 'email_yes';

        // Create the RSVP (toggle on)
        await prisma.rSVP.create({
          data: {
            userId,
            eventId,
            status: emailPreference
          }
        });

        // Increment the RSVP count
        await prisma.event.update({
          where: { id: eventId },
          data: { numRSVPs: { increment: 1 } }
        });

        res.json({
          rsvpd: true,
          message: "RSVP confirmed",
          emailPreference: status
        });
      }
    } catch (err) {
      console.error("Error toggling RSVP:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Check RSVP status for current user
  router.get("/:id/rsvp-status", authenticateToken, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id as string);
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (isNaN(eventId)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }

      const rsvp = await prisma.rSVP.findUnique({
        where: {
          userId_eventId: {
            userId,
            eventId
          }
        }
      });

      res.json({ rsvpd: !!rsvp });
    } catch (err) {
      console.error("Error checking RSVP status:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Get list of all users who RSVPd to an event
  router.get("/:id/rsvps", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id as string);

      if (isNaN(eventId)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }

      const rsvps = await prisma.rSVP.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              bio: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      const attendees = rsvps.map((rsvp: any) => ({
        id: rsvp.user.id,
        firstName: rsvp.user.firstName,
        lastName: rsvp.user.lastName,
        email: rsvp.user.email,
        bio: rsvp.user.bio,
        profilePicture: `/uploads/${rsvp.user.id}/profile.jpg`,
        rsvpDate: rsvp.createdAt
      }));

      res.json({ count: attendees.length, attendees });
    } catch (err) {
      console.error("Error fetching RSVPs:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

// Check if current user can edit/delete an event
router.get("/:eventId/can-edit", authenticateToken, async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const userId = req.userId;
    
    if (typeof userId !== "number") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 1. Get the event to find the clubId
    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
      select: { 
        id: true,
        clubId: true,
        club: {
          select: {
            name: true
          }
        }
      }
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // 2. Check if user is admin of the club (via clubAdmin table)
    const isAdmin = await prisma.clubAdmin.findFirst({
      where: {
        userId: userId,
        club: {
          id: event.clubId
        }
      }
    });
    
    // 3. Check if user is officer or admin of the club (via clubMembership table)
    const membership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId: userId,
          clubId: event.clubId
        }
      },
      select: { role: true }
    });
    
    // 4. Determine edit permissions
    const canEdit = isAdmin !== null || (membership && (membership.role === 'admin' || membership.role === 'officer'));
    
    res.json({ 
      canEdit,
      clubName: event.club.name
    });
    
  } catch (error) {
    console.error('Error checking edit permissions:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete an event (only for authorized users)
router.delete("/:eventId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const userId = req.userId;
    
    if (typeof userId !== "number") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 1. Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
      include: {
        club: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // 2. Check edit permissions first
    const isAdmin = await prisma.clubAdmin.findFirst({
      where: {
        userId: userId,
        club: {
          id: event.clubId
        }
      }
    });
    
    const membership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId: userId,
          clubId: event.clubId
        }
      },
      select: { role: true }
    });
    
    const canEdit = isAdmin !== null || (membership && (membership.role === 'admin' || membership.role === 'officer'));
    
    if (!canEdit) {
      return res.status(403).json({ 
        error: 'You do not have permission to delete this event. Only club admins and officers can delete events.' 
      });
    }
    
    // 3. Check if the event has already occurred
    const now = new Date();
    const eventEndTime = new Date(event.endTime);
    const hasOccurred = now > eventEndTime;
    
    // Optional: Add a confirmation for past events
    if (hasOccurred) {
      // You could add additional logic here if needed
      // For example, require admin confirmation for past events
    }
    
    // 4. Delete related records in correct order (if cascading deletes aren't set up in schema)
    // Note: Prisma schema should have cascade deletes for relations, but we handle manually if needed
    
    // Delete event tags
    await prisma.eventTags.deleteMany({
      where: { eventId: parseInt(eventId) }
    });
    
    // Delete likes for this event
    await prisma.likesEvents.deleteMany({
      where: { eventId: parseInt(eventId) }
    });
    
    // Delete RSVPs for this event
    await prisma.rSVP.deleteMany({
      where: { eventId: parseInt(eventId) }
    });
    
    // Delete the event image from S3 if it exists
    if (event.imagePath) {
      try {
        // Import the delete function from S3 config
        const { deleteFromS3 } = require("../config/s3");
        await deleteFromS3(event.imagePath);
        console.log(`✅ Deleted event image from S3: ${event.imagePath}`);
      } catch (s3Error) {
        console.error('Error deleting event image from S3:', s3Error);
        // Continue with deletion even if S3 delete fails
      }
    }
    
    // 5. Finally delete the event itself
    const deletedEvent = await prisma.event.delete({
      where: { id: parseInt(eventId) },
      include: {
        club: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`✅ Event deleted: ${deletedEvent.id} from club: ${deletedEvent.club.name}`);
    
    res.json({ 
      success: true,
      message: 'Event deleted successfully',
      event: {
        id: deletedEvent.id,
        clubName: deletedEvent.club.name,
        description: deletedEvent.description
      }
    });
    
  } catch (error: any) {
    console.error('Error deleting event:', error);
    
    // Handle specific errors
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Event not found or already deleted' });
    }
    
    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
      return res.status(409).json({ 
        error: 'Cannot delete event because it has related records. Please contact support.' 
      });
    }
    
    res.status(500).json({ 
      error: error.message || "Internal server error while deleting event" 
    });
  }
});

// PUT /api/events/:eventId - Update an event
router.put('/:eventId', authenticateToken, upload.single('image'), async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    const userId = req.userId;
    
    if (typeof userId !== "number") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Parse form data
    const { title, description, tagIds } = req.body;
    console.log('Update event request:', { eventId, title, description, tagIds });
    
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
      include: {
        booking: {
          select: { id: true }
        }
      }
    });
    
    if (!event) {
      console.log('Event not found:', eventId);
      return res.status(404).json({ 
        success: false,
        error: 'Event not found' 
      });
    }
    
    // Check edit permissions
    const isAdmin = await prisma.clubAdmin.findFirst({
      where: {
        userId: userId,
        club: {
          id: event.clubId
        }
      }
    });
    
    const membership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId: userId,
          clubId: event.clubId
        }
      },
      select: { role: true }
    });
    
    const canEdit = isAdmin !== null || (membership && (membership.role === 'admin' || membership.role === 'officer'));
    
    if (!canEdit) {
      console.log('Permission denied for user:', userId, 'on event:', eventId);
      return res.status(403).json({ 
        success: false,
        error: 'You do not have permission to edit this event. Only club admins and officers can edit events.' 
      });
    }
    
    // Parse tagIds if provided
    let parsedTagIds: number[] = [];
    if (tagIds) {
      try {
        parsedTagIds = JSON.parse(tagIds);
      } catch (err) {
        console.error('Error parsing tagIds:', err);
      }
    }
    
    // Prepare update data
    const updatePromises = [];
    
    // Update event description if provided
    if (description !== undefined) {
      updatePromises.push(
        prisma.event.update({
          where: { id: parseInt(eventId) },
          data: { description }
        })
      );
    }
    
    // Update booking description (title) if provided and booking exists
    if (title !== undefined && event.booking) {
      updatePromises.push(
        prisma.booking.update({
          where: { id: event.booking.id },
          data: { description: title }
        })
      );
    }
    
    // Execute updates
    await Promise.all(updatePromises);
    
    // Fetch updated event
    const updatedEvent = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        room: {
          select: {
            buildingCode: true,
            roomNum: true,
            roomCapacity: true
          }
        },
        booking: {
          select: {
            description: true
          }
        }
      }
    });
    
    if (!updatedEvent) {
      return res.status(404).json({ 
        success: false,
        error: 'Event not found after update' 
      });
    }
    
    // Handle image upload if present
    let imagePath = null;
    if (req.file) {
      try {
        if (!req.file.buffer) {
          throw new Error('File buffer is undefined');
        }
        
        const ext = path.extname(req.file.originalname);
        const filename = `image${ext}`;
        
        const s3Key = getEventImageKey(parseInt(eventId), filename);
        const s3Url = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);
        
        console.log(`✅ Image uploaded to S3: ${s3Url}`);
        
        imagePath = s3Url;
        
        await prisma.event.update({
          where: { id: parseInt(eventId) },
          data: { imagePath: s3Key }
        });
        
      } catch (imageError) {
        console.error('Error uploading image to S3:', imageError);
      }
    }
    
    // Update event tags if tagIds were provided
    if (parsedTagIds.length > 0) {
      // First, delete existing tags
      await prisma.eventTags.deleteMany({
        where: { eventId: parseInt(eventId) }
      });
      
      // Then add new tags
      const eventTagsData = parsedTagIds.map((tagId: number) => ({
        eventId: parseInt(eventId),
        tagId: parseInt(String(tagId))
      }));
      
      await prisma.eventTags.createMany({
        data: eventTagsData
      });
      
      console.log(`✅ Updated ${eventTagsData.length} event tags`);
    }
    
    res.json({
      success: true,
      message: 'Event updated successfully',
      event: updatedEvent,
      imagePath: imagePath
    });
    
  } catch (error: any) {
    console.error('Error updating event:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        success: false,
        error: 'Event not found' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: error.message || "Internal server error while updating event" 
    });
  }
}); 

  export default router;
