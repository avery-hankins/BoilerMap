import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import nodemailer from "nodemailer";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Logger function that writes to both console and file
const logFile = path.join(__dirname, "logs", "rsvp_email_job.log");

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;

  // Log to console
  console.log(logMessage);

  // Log to file
  try {
    // Ensure logs directory exists
    const logsDir = path.dirname(logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Append to log file
    fs.appendFileSync(logFile, logMessage + "\n", "utf8");
  } catch (error) {
    console.error("Failed to write to log file:", error);
  }
}

async function sendRSVPReminders() {
  try {
    log("=== RSVP Reminder Job Started ===");

    // 1. Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    log(`Looking for events between ${todayStart.toISOString()} and ${todayEnd.toISOString()}`);

    // 2. Find all events occurring today with their RSVPs
    const todaysEvents = await prisma.event.findMany({
      where: {
        startTime: {
          gte: todayStart,
          lte: todayEnd
        }
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            admins: {
              include: {
                user: {
                  select: {
                    email: true
                  }
                }
              }
            }
          }
        },
        room: {
          select: {
            buildingCode: true,
            roomNum: true
          }
        },
        rsvps: {
          where: {
            status: {
              in: ["email_yes", "going", "interested"]
            }
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
        }
      },
      orderBy: {
        startTime: "asc"
      }
    });

    log(`Found ${todaysEvents.length} event(s) scheduled for today`);

    if (todaysEvents.length === 0) {
      log("No events today - exiting");
      return;
    }

    // 3. Configure nodemailer (following existing pattern from index.ts)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    log("Email transporter configured");

    // 4. Send emails for each event
    let totalEmailsSent = 0;
    let eventsProcessed = 0;

    for (const event of todaysEvents) {
      const eventTime = event.startTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });

      log(`Processing Event ID ${event.id}: "${event.description || 'Untitled Event'}" by ${event.club.name} at ${eventTime}`);

      if (event.rsvps.length === 0) {
        log(`  Event ${event.id} has no RSVPs with status 'email_yes', 'going', or 'interested', skipping`);
        continue;
      }

      // Get all user emails (filter out nulls)
      const recipientEmails = event.rsvps
        .map((rsvp: any) => rsvp.user.email)
        .filter((email: any): email is string => email !== null);

      if (recipientEmails.length === 0) {
        log(`  Event ${event.id} has ${event.rsvps.length} RSVP(s) but no valid email addresses, skipping`);
        continue;
      }

      log(`  Found ${recipientEmails.length} recipient(s) for Event ${event.id}`);

      // Get club officer emails
      const officerEmails = event.club.admins
        .map((admin: any) => admin.user.email)
        .filter((email: any): email is string => email !== null);

      if (officerEmails.length > 0) {
        log(`  Found ${officerEmails.length} club officer(s) to cc`);
      }

      // Format location
      const location = `${event.room.buildingCode} ${event.room.roomNum}`;

      // Email subject and body
      const subject = `Reminder: ${event.club.name} Event Today`;

      const htmlBody = `
        <h2>Event Reminder</h2>
        <p>Hello!</p>
        <p>This is a reminder that you have RSVP'd to the following event happening today:</p>
        <ul>
          <li><strong>Event:</strong> ${event.description || "Event"}</li>
          <li><strong>Club:</strong> ${event.club.name}</li>
          <li><strong>Time:</strong> ${eventTime}</li>
          <li><strong>Location:</strong> ${location}</li>
        </ul>
        <p>We look forward to seeing you there!</p>
        <p>- BoilerMap Team</p>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666; margin-top: 15px;">
          To unsubscribe from this event, <a href="http://localhost:5173/event/${event.id}" style="color: #0066cc;">undo your RSVP</a>.
        </p>
      `;

      const textBody = `
Event Reminder

Hello!

This is a reminder that you have RSVP'd to the following event happening today:

Event: ${event.description || "Event"}
Club: ${event.club.name}
Time: ${eventTime}
Location: ${location}

We look forward to seeing you there!

- BoilerMap Team

---
To unsubscribe from this event, undo your RSVP at: http://localhost:5173/event/${event.id}
      `;

      try {
        // Send email (using BCC for mass email, following pattern from index.ts:1488-1494)
        await transporter.sendMail({
          from: "BoilerMap <boilermap@gmail.com>",
          to: process.env.EMAIL_USER, // Send to self as primary recipient
          cc: officerEmails.length > 0 ? officerEmails : undefined, // CC club officers
          bcc: recipientEmails,
          subject: subject,
          html: htmlBody,
          text: textBody
        });

        log(`   Successfully sent reminder for Event ${event.id} to ${recipientEmails.length} user(s)`);
        totalEmailsSent += recipientEmails.length;
        eventsProcessed++;
      } catch (error) {
        log(`   Failed to send email for Event ${event.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    log(`=== RSVP Reminder Job Completed ===`);
    log(`Summary: Processed ${eventsProcessed} event(s), sent ${totalEmailsSent} email(s)`);

  } catch (error) {
    log(`ERROR: RSVP reminder job failed - ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      log(`Stack trace: ${error.stack}`);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
    log("Database connection closed");
  }
}

// Run the job
sendRSVPReminders()
  .then(() => {
    log("Job exited successfully");
    process.exit(0);
  })
  .catch((error) => {
    log(`Job exited with error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
