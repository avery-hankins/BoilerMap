import { Router, Request, Response } from "express";
import { createEmailTransporter } from "../config/email";
import { authenticateToken } from "../middleware/auth";
import prisma from "../config/database";

const router = Router();

// Send email to a specific email address
router.post("/email", async (req: Request, res: Response) => {
  const { email, subject, body, userEmail } = req.body;

  const transporter = createEmailTransporter();

  // Send email
  await transporter.sendMail({
    from: "BoilerMap <boilermap@gmail.com>",
    to: email,
    cc: userEmail,
    subject: subject,
    text: body,
  });

  res.json({ message: "Email sent successfully" });
});

// Send email to all club members
router.post("/email-club", async (req: Request, res: Response) => {
  const { clubID, subject, body, userEmail } = req.body;
  const club = await prisma.club.findUnique({
    where: {
      id: clubID,
    },
  });

  if (!club) {
    res.status(404).json({ error: "Club not found" });
    return;
  }

  // Get all members of club
  const memberships = await prisma.clubMembership.findMany({
    where: {
      clubId: clubID,
    },
  });

  // Find all users with the membership.userid
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: memberships.map((membership: any) => membership.userId),
      },
    },
  });

  const transporter = createEmailTransporter();

  await transporter.sendMail({
    from: "BoilerMap <boilermap@gmail.com>",
    to: userEmail,
    bcc: users
      .map((user: any) => user.email)
      .filter((email: any): email is string => email !== null),
    subject: subject,
    text: body,
  });

  res.json({ message: "Email sent successfully" });
});

// Send email to everyone
router.post("/email-everyone", async (req: Request, res: Response) => {
  const { subject, body, userEmail } = req.body;

  // Get all users
  const users = await prisma.user.findMany();

  const transporter = createEmailTransporter();

  // Send email to each user
  await transporter.sendMail({
    from: "BoilerMap <boilermap@gmail.com>",
    to: userEmail,
    bcc: users
      .map((user: any) => user.email)
      .filter((email: any): email is string => email !== null),
    subject: subject,
    text: body,
  });

  res.json({ message: "Email sent successfully" });
});

// Send email to event attendees
router.post(
  "/email-event",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { eventId, subject, body, userEmail } = req.body;
    const userId = req.userId;

    console.log("=== EMAIL-EVENT ENDPOINT CALLED ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("userId from token:", userId);
    console.log("Authorization header:", req.headers.authorization);
    console.log("=====================================");

    const transporter = createEmailTransporter();

    // Validation
    if (!eventId || !subject || !body) {
      console.log("❌ Missing required fields");
      return res
        .status(400)
        .json({ error: "Missing required fields: eventId, subject, body" });
    }

    if (userId === undefined) {
      console.log("❌ userId is undefined - user not authenticated");
      return res.status(401).json({ error: "User not authenticated" });
    }

    console.log("✅ Validation passed, userId:", userId);

    try {
      console.log("📋 Fetching event with ID:", eventId);

      // Get the event with club information
      const event = await prisma.event.findUnique({
        where: { id: parseInt(eventId) },
        include: {
          club: {
            include: {
              admins: true,
            },
          },
          room: true,
        },
      });

      if (!event) {
        console.log("❌ Event not found with ID:", eventId);
        return res.status(404).json({ error: "Event not found" });
      }

      console.log("✅ Event found:");
      console.log("  - Event ID:", event.id);
      console.log("  - Description:", event.description);
      console.log("  - Club ID:", event.clubId);
      console.log("  - Club Name:", event.club.name);
      console.log("  - Club Auth ID:", event.club.authId);
      console.log("  - Start Time:", event.startTime);
      console.log(
        "  - Room:",
        event.room
          ? `${event.room.buildingCode} ${event.room.roomNum}`
          : "No room",
      );

      console.log("👥 Club Admins for this event:");
      event.club.admins.forEach((admin: any) => {
        console.log(
          `  - Admin userId: ${admin.userId}, authId: ${admin.authId}`,
        );
      });

      // Check if user is admin of this club
      const isAdmin = event.club.admins.some(
        (admin: any) => admin.userId === userId,
      );

      console.log("🔐 Authorization check:");
      console.log("  - Current userId:", userId);
      console.log("  - Is admin of club?", isAdmin);

      if (!isAdmin) {
        console.log("❌ User is NOT admin of this club");
        console.log("  - User ID:", userId);
        console.log("  - Club ID:", event.clubId);
        console.log(
          "  - Club Admins:",
          event.club.admins.map((a: any) => a.userId),
        );
        return res.status(403).json({
          error: "You must be a club admin to send event emails",
          debug: {
            userId,
            clubId: event.clubId,
            clubName: event.club.name,
            clubAdmins: event.club.admins.map((a: any) => a.userId),
          },
        });
      }

      console.log("✅ User is authorized as club admin");

      // Get all RSVPs for this event where status is "email_yes"
      console.log("📧 Fetching RSVPs with email_yes status...");
      const rsvps = await prisma.rSVP.findMany({
        where: {
          eventId: parseInt(eventId),
          status: "email_yes",
        },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      console.log(`Found ${rsvps.length} RSVPs with email_yes status`);

      if (rsvps.length === 0) {
        console.log("⚠️ No attendees with email preferences found");
        return res.status(200).json({
          success: true,
          message: "No attendees with email preferences found for this event",
          emailsSent: 0,
        });
      }

      // Prepare email data
      const recipients = rsvps.map((rsvp: any) => ({
        email: rsvp.user.email,
        firstName: rsvp.user.firstName,
        lastName: rsvp.user.lastName,
      }));

      console.log("📬 Recipients:");
      recipients.forEach((recipient: any, index: number) => {
        console.log(
          `  ${index + 1}. ${recipient.firstName} ${recipient.lastName} <${recipient.email}>`,
        );
      });

      // Format event details for email
      const eventDate = new Date(event.startTime).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      const eventLocation = event.room
        ? `${event.room.buildingCode} ${event.room.roomNum}`
        : "Location TBA";

      console.log("📅 Email content:");
      console.log("  - Subject:", `[${event.club.name}] ${subject}`);
      console.log("  - Event Date:", eventDate);
      console.log("  - Location:", eventLocation);

      // Send emails to all recipients
      console.log("📤 Starting email sending process...");
      const emailPromises = recipients.map(
        async (recipient: any, index: number) => {
          const personalizedBody = `
Hi ${recipient.firstName},

${body}

---
Event Details:
${event.description || "Event"}
Date: ${eventDate}
Location: ${eventLocation}
Club: ${event.club.name}

You're receiving this email because you registered for this event and opted in to receive email updates.
`;

          const mailOptions = {
            from: "BoilerMap <boilermap@gmail.com>",
            to: recipient.email,
            subject: `[${event.club.name}] ${subject}`,
            text: personalizedBody,
            html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Hi ${recipient.firstName},</p>

            <p style="white-space: pre-wrap;">${body}</p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <h3 style="color: #333;">Event Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Event:</strong></td>
                <td style="padding: 8px 0;">${event.description || "Event"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Date:</strong></td>
                <td style="padding: 8px 0;">${eventDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Location:</strong></td>
                <td style="padding: 8px 0;">${eventLocation}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Club:</strong></td>
                <td style="padding: 8px 0;">${event.club.name}</td>
              </tr>
            </table>

            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              You're receiving this email because you registered for this event and opted in to receive email updates.
            </p>
          </div>
        `,
          };

          console.log(
            `  📧 Sending email ${index + 1}/${recipients.length} to ${recipient.email}`,
          );

          try {
            const info = await transporter.sendMail(mailOptions);
            console.log(
              `  ✅ Email ${index + 1} sent successfully:`,
              info.messageId,
            );
            return {
              accepted: info.accepted,
              rejected: info.rejected,
              messageId: info.messageId,
            };
          } catch (emailError) {
            console.error(
              `  ❌ Failed to send email ${index + 1}:`,
              emailError,
            );
            throw emailError;
          }
        },
      );

      // Wait for all emails to send
      console.log("⏳ Waiting for all emails to send...");
      const results = await Promise.allSettled(emailPromises);

      const successCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const failureCount = results.filter(
        (r) => r.status === "rejected",
      ).length;

      console.log("📊 Email sending results:");
      console.log(`  ✅ Successful: ${successCount}`);
      console.log(`  ❌ Failed: ${failureCount}`);
      console.log(`  📈 Total: ${recipients.length}`);

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.log(`  ❌ Email ${index + 1} failed:`, result.reason);
        }
      });

      console.log("=== EMAIL-EVENT ENDPOINT COMPLETED SUCCESSFULLY ===\n");

      res.json({
        success: true,
        message: `Successfully sent ${successCount} email(s) to event attendees`,
        emailsSent: successCount,
        emailsFailed: failureCount,
        totalRecipients: recipients.length,
      });
    } catch (err: unknown) {
      console.error("❌ ERROR in email-event endpoint:");
      console.error(
        "Error type:",
        err instanceof Error ? err.constructor.name : typeof err,
      );
      console.error(
        "Error message:",
        err instanceof Error ? err.message : String(err),
      );
      if (err instanceof Error && err.stack) {
        console.error("Stack trace:", err.stack);
      }
      console.error("=== EMAIL-EVENT ENDPOINT FAILED ===\n");

      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Failed to send event emails",
      });
    }
  },
);

// Send email notification when event is created
router.post(
  "/email-event-creation",
  authenticateToken,
  async (req: Request, res: Response) => {
    const {
      eventId,
      clubId,
      clubName,
      startTime,
      endTime,
      roomLocation,
      description,
      customSubject,
      customBody,
    } = req.body;
    const userId = req.userId;

    console.log("=== EMAIL-EVENT-CREATION ENDPOINT CALLED ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("userId from token:", userId);
    console.log("=====================================");

    const transporter = createEmailTransporter();

    // Validation
    if (!eventId || !clubId) {
      console.log("❌ Missing required fields");
      return res
        .status(400)
        .json({ error: "Missing required fields: eventId, clubId" });
    }

    if (userId === undefined) {
      console.log("❌ userId is undefined - user not authenticated");
      return res.status(401).json({ error: "User not authenticated" });
    }

    console.log("✅ Validation passed, userId:", userId);

    try {
      console.log("📋 Fetching club with ID:", clubId);

      // Get the club with admin information
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        include: {
          admins: true,
        },
      });

      if (!club) {
        console.log("❌ Club not found with ID:", clubId);
        return res.status(404).json({ error: "Club not found" });
      }

      console.log("✅ Club found:");
      console.log("  - Club ID:", club.id);
      console.log("  - Club Name:", club.name);

      // Check if user is admin or officer of this club
      const isAdmin = club.admins.some((admin: any) => admin.userId === userId);

      console.log("🔐 Authorization check:");
      console.log("  - Current userId:", userId);
      console.log("  - Is admin of club?", isAdmin);

      if (!isAdmin) {
        console.log("❌ User is NOT admin/officer of this club");
        return res.status(403).json({
          error:
            "You must be a club admin or officer to send event creation emails",
        });
      }

      console.log("✅ User is authorized as club admin/officer");

      // Get all club members
      console.log("📧 Fetching club members...");
      const memberships = await prisma.clubMembership.findMany({
        where: {
          clubId: clubId,
        },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      console.log(`Found ${memberships.length} club members`);

      if (memberships.length === 0) {
        console.log("⚠️ No club members found");
        return res.status(200).json({
          success: true,
          message: "No club members found to send email to",
          emailsSent: 0,
        });
      }

      // Prepare email data
      const recipients = memberships
        .filter((membership: any) => membership.user.email) // Filter out null emails
        .map((membership: any) => ({
          email: membership.user.email,
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
        }));

      console.log("📬 Recipients:");
      recipients.forEach((recipient: any, index: number) => {
        console.log(
          `  ${index + 1}. ${recipient.firstName} ${recipient.lastName} <${recipient.email}>`,
        );
      });

      // Format event details for email
      const eventDate = new Date(startTime).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      const eventEndTime = new Date(endTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

      // Determine subject and body
      let emailSubject: string;
      let emailBody: string;

      if (customSubject && customBody) {
        // Use custom email
        emailSubject = customSubject;
        emailBody = customBody;
        console.log("📝 Using custom email content");
      } else {
        // Use default email
        emailSubject = `New Event: ${description || "Upcoming Event"}`;
        emailBody = `We're excited to announce a new event from ${clubName}!`;
        console.log("📝 Using default email content");
      }

      console.log("📅 Email content:");
      console.log("  - Subject:", `[${clubName}] ${emailSubject}`);
      console.log("  - Event Date:", eventDate);
      console.log("  - Location:", roomLocation);

      // Send emails to all recipients
      console.log("📤 Starting email sending process...");
      const emailPromises = recipients.map(
        async (recipient: any, index: number) => {
          const personalizedBody = `
Hi ${recipient.firstName},

${emailBody}

---
Event Details:
${description || "Event details coming soon"}
Date: ${eventDate} - ${eventEndTime}
Location: ${roomLocation}
Club: ${clubName}

Visit BoilerMap to RSVP and get more information about this event!
`;

          const mailOptions = {
            from:
              club.email ||
              process.env.EMAIL_USER ||
              "BoilerMap <boilermap@gmail.com>",
            to: recipient.email,
            subject: `[${clubName}] ${emailSubject}`,
            text: personalizedBody,
            html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Hi ${recipient.firstName},</p>

            <p style="white-space: pre-wrap;">${emailBody}</p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <h3 style="color: #333;">Event Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Event:</strong></td>
                <td style="padding: 8px 0;">${description || "Event details coming soon"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Date:</strong></td>
                <td style="padding: 8px 0;">${eventDate} - ${eventEndTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Location:</strong></td>
                <td style="padding: 8px 0;">${roomLocation}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Club:</strong></td>
                <td style="padding: 8px 0;">${clubName}</td>
              </tr>
            </table>

            <p style="margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}"
                 style="background-color: #CEB888; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Visit BoilerMap to RSVP
              </a>
            </p>

            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              You're receiving this email because you're a member of ${clubName}.
            </p>
          </div>
        `,
          };

          console.log(
            `  📧 Sending email ${index + 1}/${recipients.length} to ${recipient.email}`,
          );

          try {
            const info = await transporter.sendMail(mailOptions);
            console.log(
              `  ✅ Email ${index + 1} sent successfully:`,
              info.messageId,
            );
            return {
              accepted: info.accepted,
              rejected: info.rejected,
              messageId: info.messageId,
            };
          } catch (emailError) {
            console.error(
              `  ❌ Failed to send email ${index + 1}:`,
              emailError,
            );
            throw emailError;
          }
        },
      );

      // Wait for all emails to send
      console.log("⏳ Waiting for all emails to send...");
      const results = await Promise.allSettled(emailPromises);

      const successCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const failureCount = results.filter(
        (r) => r.status === "rejected",
      ).length;

      console.log("📊 Email sending results:");
      console.log(`  ✅ Successful: ${successCount}`);
      console.log(`  ❌ Failed: ${failureCount}`);
      console.log(`  📈 Total: ${recipients.length}`);

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.log(`  ❌ Email ${index + 1} failed:`, result.reason);
        }
      });

      console.log(
        "=== EMAIL-EVENT-CREATION ENDPOINT COMPLETED SUCCESSFULLY ===\n",
      );

      res.json({
        success: true,
        message: `Successfully sent ${successCount} email(s) to club members`,
        emailsSent: successCount,
        emailsFailed: failureCount,
        totalRecipients: recipients.length,
      });
    } catch (err: unknown) {
      console.error("❌ ERROR in email-event-creation endpoint:");
      console.error(
        "Error type:",
        err instanceof Error ? err.constructor.name : typeof err,
      );
      console.error(
        "Error message:",
        err instanceof Error ? err.message : String(err),
      );
      if (err instanceof Error && err.stack) {
        console.error("Stack trace:", err.stack);
      }
      console.error("=== EMAIL-EVENT-CREATION ENDPOINT FAILED ===\n");

      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : "Failed to send event creation emails",
      });
    }
  },
);

// Send blast email to club members (club leader only)
router.post('/email-blast-club', authenticateToken, async (req: Request, res: Response) => {
  const { clubId, subject, body } = req.body;
  const userId = req.userId;

  console.log('=== EMAIL-BLAST-CLUB ENDPOINT CALLED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('userId from token:', userId);
  console.log('=========================================');

  const transporter = createEmailTransporter();

  // Validation
  if (!clubId || !subject || !body) {
    console.log('❌ Missing required fields');
    return res.status(400).json({ error: 'Missing required fields: clubId, subject, body' });
  }

  if (userId === undefined) {
    console.log('❌ userId is undefined - user not authenticated');
    return res.status(401).json({ error: 'User not authenticated' });
  }

  // Check for empty subject or body
  if (subject.trim() === '') {
    return res.status(400).json({ error: 'Subject cannot be empty' });
  }

  if (body.trim() === '') {
    return res.status(400).json({ error: 'Message body cannot be empty' });
  }

  console.log('✅ Validation passed, userId:', userId);

  try {
    console.log('📋 Fetching club with ID:', clubId);

    // Get the club with admin information
    const club = await prisma.club.findUnique({
      where: { id: parseInt(clubId) },
      include: {
        admins: true,
      }
    });

    if (!club) {
      console.log('❌ Club not found with ID:', clubId);
      return res.status(404).json({ error: 'Club not found' });
    }

    console.log('✅ Club found:');
    console.log('  - Club ID:', club.id);
    console.log('  - Club Name:', club.name);
    console.log('  - Club Auth ID:', club.authId);

    // Check if user is admin of this club
    const isAdmin = club.admins.some((admin: any) => admin.userId === userId);

    console.log('🔐 Authorization check:');
    console.log('  - Current userId:', userId);
    console.log('  - Is admin of club?', isAdmin);

    if (!isAdmin) {
      console.log('❌ User is NOT admin of this club');
      return res.status(403).json({
        error: 'You must be a club admin to send blast emails',
        debug: {
          userId,
          clubId: club.id,
          clubName: club.name,
          clubAdmins: club.admins.map((a: any) => a.userId)
        }
      });
    }

    console.log('✅ User is authorized as club admin');

    // Get all memberships for this club, excluding those who unsubscribed
    console.log('📧 Fetching club members...');
    const memberships = await prisma.clubMembership.findMany({
      where: {
        clubId: parseInt(clubId),
        emailUnsubscribed: false, // Only get members who haven't unsubscribed
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    console.log(`Found ${memberships.length} club members (excluding unsubscribed)`);

    if (memberships.length === 0) {
      console.log('⚠️ No members found for this club');
      return res.status(200).json({
        success: true,
        message: 'No members found to send emails to',
        emailsSent: 0
      });
    }

    // Separate officers and regular members
    const officers = memberships
      .filter((m: any) => m.role === 'Officer')
      .map((m: any) => m.user.email);

    const regularMembers = memberships
      .filter((m: any) => m.role !== 'Officer')
      .map((m: any) => m.user.email);

    console.log('👥 Email distribution:');
    console.log(`  - Officers (CC): ${officers.length}`);
    console.log(`  - Regular Members (BCC): ${regularMembers.length}`);

    const fromEmail = process.env.EMAIL_USER || 'boilermap@gmail.com';

    // Create unsubscribe URL (frontend route to be created)
    const unsubscribeUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe?clubId=${clubId}`;

    // Compose email body with unsubscribe link
    const emailBody = `${body}

---

This email was sent to members of ${club.name}.

To unsubscribe from future emails from this club, click here: ${unsubscribeUrl}
`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p style="white-space: pre-wrap;">${body}</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

        <p style="color: #666; font-size: 12px;">
          This email was sent to members of <strong>${club.name}</strong>.
        </p>

        <p style="color: #666; font-size: 12px;">
          To unsubscribe from future emails from this club,
          <a href="${unsubscribeUrl}" style="color: #0066cc;">click here</a>.
        </p>
      </div>
    `;

    console.log('📤 Sending email...');
    console.log('  - From:', fromEmail);
    console.log('  - Subject:', subject);
    console.log('  - CC (officers):', officers.length);
    console.log('  - BCC (members):', regularMembers.length);

    const mailOptions = {
      from: fromEmail,
      to: fromEmail, // Send to sender as primary recipient
      cc: officers.length > 0 ? officers : undefined,
      bcc: regularMembers.length > 0 ? regularMembers : undefined,
      subject: `[${club.name}] ${subject}`,
      text: emailBody,
      html: htmlBody,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', info.messageId);

      console.log('=== EMAIL-BLAST-CLUB ENDPOINT COMPLETED SUCCESSFULLY ===\n');

      res.json({
        success: true,
        message: `Successfully sent email to ${memberships.length} club member(s)`,
        emailsSent: memberships.length,
        officersCC: officers.length,
        membersBCC: regularMembers.length,
      });
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      throw emailError;
    }

  } catch (err: unknown) {
    console.error('❌ ERROR in email-blast-club endpoint:');
    console.error('Error type:', err instanceof Error ? err.constructor.name : typeof err);
    console.error('Error message:', err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) {
      console.error('Stack trace:', err.stack);
    }
    console.error('=== EMAIL-BLAST-CLUB ENDPOINT FAILED ===\n');

    res.status(500).json({
      error: (err instanceof Error) ? err.message : 'Failed to send blast email'
    });
  }
});

// Unsubscribe from club emails
router.post('/email-unsubscribe', authenticateToken, async (req: Request, res: Response) => {
  const { clubId } = req.body;
  const userId = req.userId;

  if (!clubId || userId === undefined) {
    return res.status(400).json({ error: 'Missing required fields: clubId' });
  }

  try {
    // Check if membership exists
    const membership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId: userId,
          clubId: parseInt(clubId)
        }
      }
    });

    if (!membership) {
      return res.status(404).json({ error: 'You are not a member of this club' });
    }

    // Update the membership to unsubscribe from emails
    await prisma.clubMembership.update({
      where: {
        userId_clubId: {
          userId: userId,
          clubId: parseInt(clubId)
        }
      },
      data: {
        emailUnsubscribed: true
      }
    });

    res.json({
      success: true,
      message: 'Successfully unsubscribed from club emails'
    });

  } catch (err: unknown) {
    console.error('❌ ERROR in email-unsubscribe endpoint:', err);
    res.status(500).json({
      error: (err instanceof Error) ? err.message : 'Failed to unsubscribe from emails'
    });
  }
});

// Resubscribe to club emails
router.post('/email-resubscribe', authenticateToken, async (req: Request, res: Response) => {
  const { clubId } = req.body;
  const userId = req.userId;

  if (!clubId || userId === undefined) {
    return res.status(400).json({ error: 'Missing required fields: clubId' });
  }

  try {
    // Check if membership exists
    const membership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId: userId,
          clubId: parseInt(clubId)
        }
      }
    });

    if (!membership) {
      return res.status(404).json({ error: 'You are not a member of this club' });
    }

    // Update the membership to resubscribe to emails
    await prisma.clubMembership.update({
      where: {
        userId_clubId: {
          userId: userId,
          clubId: parseInt(clubId)
        }
      },
      data: {
        emailUnsubscribed: false
      }
    });

    res.json({
      success: true,
      message: 'Successfully resubscribed to club emails'
    });

  } catch (err: unknown) {
    console.error('❌ ERROR in email-resubscribe endpoint:', err);
    res.status(500).json({
      error: (err instanceof Error) ? err.message : 'Failed to resubscribe to emails'
    });
  }
});

export default router;
