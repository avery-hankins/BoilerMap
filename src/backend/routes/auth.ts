import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { createEmailTransporter } from "../config/email";
import { authenticateToken } from "../middleware/auth";
import prisma from "../config/database";

const router = Router();

// Forgot password - send reset link
router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return a generic message (avoid leaking which emails exist)
    if (!user) {
      return res.json({ message: "If this email exists, a reset link will be sent." });
    }

    // Generate token and expiry
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

    // Store token in DB
    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    // Create reset link (frontend route)
    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;

    // Send email
    const transporter = createEmailTransporter();
    const mailOptions = {
      from: `"Your App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>Hello ${user.firstName || user.username},</p>
        <p>You requested to reset your password. Click the link below:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 30 minutes.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "If this email exists, a reset link will be sent." });
  } catch (error: unknown) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: (error instanceof Error) ? error.message : "Server error while sending reset email." });
  }
});

// Reset password with token
router.post("/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body;

  try {
    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: { password: password },
    });

    await prisma.passwordResetToken.delete({ where: { token } });

    res.json({ message: "Password successfully reset!" });
  } catch (error: unknown) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: (error instanceof Error) ? error.message : "Server error while resetting password." });
  }
});

// Signup - send verification code
router.post('/signup', async (req: Request, res: Response) => {
  const { firstName, lastName, username, email, password } = req.body;

  if (!email.endsWith('@purdue.edu')) {
    return res.status(400).json({ error: 'Email must end with @purdue.edu' });
  }

  try {
    // Check if already registered
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Delete any previous pending entries for this email
    await prisma.pendingUserVerification.deleteMany({ where: { email } });

    // Generate code & expiry
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // Store pending verification
    await prisma.pendingUserVerification.create({
      data: { firstName, lastName, username, email, password, code, expiresAt }
    });

    // Send verification code via email
    const transporter = createEmailTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'BoilerMap Email Verification Code',
      text: `Your verification code is: ${code}\nThis code expires in 5 minutes.`
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Verification code sent to email.' });
  } catch (err: unknown) {
    console.error('Signup error:', err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : 'Internal server error' });
  }
});

// Verify email with code
router.post('/verify', async (req: Request, res: Response) => {
  const { email, code } = req.body;

  try {
    const pending = await prisma.pendingUserVerification.findUnique({ where: { email } });

    if (!pending) {
      return res.status(400).json({ error: 'No pending verification found.' });
    }

    if (pending.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (pending.expiresAt < new Date()) {
      // Code expired
      await prisma.pendingUserVerification.delete({ where: { email } });
      return res.status(400).json({ error: 'Verification code expired.' });
    }

    // Insert into Users table
    await prisma.user.create({
      data: {
        firstName: pending.firstName,
        lastName: pending.lastName,
        username: pending.username,
        email: pending.email,
        password: pending.password
      }
    });

    // Remove pending record
    await prisma.pendingUserVerification.delete({ where: { email } });

    res.json({ message: 'Verification successful.' });
  } catch (err: unknown) {
    console.error('Verify error:', err);
    res.status(500).json({ error: (err instanceof Error) ? err.message : 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,  // Plain text password field
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Direct string comparison (NO HASHING)
    if (password !== user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set in environment variables");
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      }
    });

  } catch (error: unknown) {
    console.error('Login error:', error);
    res.status(500).json({ error: (error instanceof Error) ? error.message : 'Internal server error' });
  }
});

// Register (alternative signup)
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, username, firstName, lastName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create user with plain text password (NO HASHING)
    const user = await prisma.user.create({
      data: {
        email,
        password,  // Storing plain text password
        username,
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        username: true
      }
    });

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set in environment variables");
    }

    // Create JWT token for immediate login
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, user });

  } catch (error: unknown) {
    console.error('Registration error:', error);
    res.status(500).json({ error: (error instanceof Error) ? error.message : 'Internal server error' });
  }
});

// Logout
router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

// Verify token
router.get('/verify', authenticateToken, (req: Request, res: Response) => {
  const userId = req.userId;
  if (userId === undefined) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  res.json({ valid: true, userId: userId });
});

export default router;
