import express, { Request, Response } from 'express';
import prisma from '../config/database';
import { generateICSCalendar, generateCalDAVResponse, CalendarEvent } from '../utils/calendarGenerator';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware to verify calendar access token
 * Supports both JWT tokens and calendar-specific access tokens
 */
function verifyCalendarAccess(req: Request, res: Response, next: Function) {
  const token = req.query.token as string;
  const authHeader = req.headers.authorization;

  let userId: number | null = null;

  // Try JWT from Authorization header first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwtToken = authHeader.substring(7);
    try {
      const decoded = jwt.verify(jwtToken, JWT_SECRET) as { userId: number };
      userId = decoded.userId;
    } catch (err) {
      // JWT invalid, will try token parameter next
    }
  }

  // Try calendar access token from query parameter
  if (!userId && token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; type: string };
      if (decoded.type === 'calendar') {
        userId = decoded.userId;
      }
    } catch (err) {
      return res.status(401).json({ error: 'Invalid calendar access token' });
    }
  }

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.userId = userId;
  next();
}

/**
 * Generate a calendar-specific access token for a user
 * This token never expires and is specifically for calendar access only
 */
router.post('/generate-token', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const jwtToken = authHeader.substring(7);

  try {
    const decoded = jwt.verify(jwtToken, JWT_SECRET) as { userId: number };

    // Generate a calendar-specific token that doesn't expire
    const calendarToken = jwt.sign(
      { userId: decoded.userId, type: 'calendar' },
      JWT_SECRET,
      { expiresIn: '10y' } // Very long expiration for calendar subscriptions
    );

    return res.json({
      token: calendarToken,
      feedUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/calendar/feed?token=${calendarToken}`,
      caldavUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/caldav/${decoded.userId}/`
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
});

/**
 * GET /api/calendar/feed
 * Get ICS feed of all events the user has RSVP'd to
 * Requires authentication via token parameter or Bearer token
 */
router.get('/feed', verifyCalendarAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Get all events the user has RSVP'd to (upcoming events only)
    const rsvps = await prisma.rSVP.findMany({
      where: {
        userId,
        event: {
          endTime: {
            gte: new Date() // Only include future/ongoing events
          }
        }
      },
      include: {
        event: {
          include: {
            club: {
              select: {
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
                description: true
              }
            }
          }
        }
      },
      orderBy: {
        event: {
          startTime: 'asc'
        }
      }
    });

    // Extract events from RSVPs
    const events: CalendarEvent[] = rsvps.map((rsvp: any) => rsvp.event);

    // Generate ICS file
    const icsContent = generateICSCalendar(events, 'BoilerMap Events');

    if (!icsContent) {
      return res.status(500).json({ error: 'Failed to generate calendar file' });
    }

    // Set headers for ICS file
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="boilermap-events.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.send(icsContent);
  } catch (error) {
    console.error('Error generating calendar feed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/calendar/download
 * Download ICS file of user's events
 * Same as /feed but with download disposition
 */
router.get('/download', verifyCalendarAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const rsvps = await prisma.rSVP.findMany({
      where: {
        userId,
        event: {
          endTime: {
            gte: new Date()
          }
        }
      },
      include: {
        event: {
          include: {
            club: {
              select: {
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
                description: true
              }
            }
          }
        }
      },
      orderBy: {
        event: {
          startTime: 'asc'
        }
      }
    });

    const events: CalendarEvent[] = rsvps.map((rsvp: any) => rsvp.event);
    const icsContent = generateICSCalendar(events, 'BoilerMap Events');

    if (!icsContent) {
      return res.status(500).json({ error: 'Failed to generate calendar file' });
    }

    // Force download
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="boilermap-events.ics"');

    return res.send(icsContent);
  } catch (error) {
    console.error('Error downloading calendar:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * CalDAV: PROPFIND /caldav/:userId/
 * Get calendar collection properties
 */
router.propfind('/caldav/:userId', verifyCalendarAccess, async (req: Request, res: Response) => {
  try {
    const requestedUserId = parseInt(req.params.userId as string);
    const authenticatedUserId = req.userId!;

    // Ensure user can only access their own calendar
    if (requestedUserId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get user's events
    const rsvps = await prisma.rSVP.findMany({
      where: {
        userId: authenticatedUserId,
        event: {
          endTime: {
            gte: new Date()
          }
        }
      },
      include: {
        event: {
          include: {
            club: {
              select: {
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
                description: true
              }
            }
          }
        }
      },
      orderBy: {
        event: {
          startTime: 'asc'
        }
      }
    });

    const events: CalendarEvent[] = rsvps.map((rsvp: any) => rsvp.event);
    const xmlResponse = generateCalDAVResponse(authenticatedUserId, events);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('DAV', '1, 2, 3, calendar-access');
    res.status(207); // Multi-Status
    return res.send(xmlResponse);
  } catch (error) {
    console.error('Error handling PROPFIND request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * CalDAV: OPTIONS /caldav/:userId/
 * Advertise CalDAV capabilities
 */
router.options('/caldav/:userId', (req: Request, res: Response) => {
  res.setHeader('DAV', '1, 2, 3, calendar-access');
  res.setHeader('Allow', 'OPTIONS, GET, HEAD, PROPFIND, REPORT');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, HEAD, PROPFIND, REPORT');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth');
  return res.status(200).send();
});

/**
 * CalDAV: GET /caldav/:userId/events/:eventId.ics
 * Get individual event as ICS
 */
router.get('/caldav/:userId/events/:eventId.ics', verifyCalendarAccess, async (req: Request, res: Response) => {
  try {
    const requestedUserId = parseInt(req.params.userId as string);
    const authenticatedUserId = req.userId!;
    const eventId = parseInt(req.params.eventId as string);

    // Ensure user can only access their own calendar
    if (requestedUserId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if user has RSVP'd to this event
    const rsvp = await prisma.rSVP.findUnique({
      where: {
        userId_eventId: {
          userId: authenticatedUserId,
          eventId
        }
      },
      include: {
        event: {
          include: {
            club: {
              select: {
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
                description: true
              }
            }
          }
        }
      }
    });

    if (!rsvp) {
      return res.status(404).json({ error: 'Event not found or not RSVP\'d' });
    }

    const icsContent = generateICSCalendar([rsvp.event], 'BoilerMap Event');

    if (!icsContent) {
      return res.status(500).json({ error: 'Failed to generate event' });
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('ETag', `"${eventId}-${rsvp.event.startTime.getTime()}"`);
    return res.send(icsContent);
  } catch (error) {
    console.error('Error fetching event:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
