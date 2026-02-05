import { describe, it, expect, beforeEach, mock } from 'bun:test';
import request from 'supertest';
import express from 'express';

// Mock Prisma Client
const mPrismaClient = {
  club: {
    findUnique: mock(() => Promise.resolve(null)),
  },
  clubMembership: {
    findMany: mock(() => Promise.resolve([])),
  },
  user: {
    findMany: mock(() => Promise.resolve([])),
  },
  event: {
    findUnique: mock(() => Promise.resolve(null)),
  },
  rSVP: {
    findMany: mock(() => Promise.resolve([])),
  },
};

mock.module('@prisma/client', () => ({
  PrismaClient: mock(() => mPrismaClient),
}));

// Mock the database config to return our mocked prisma client
mock.module('../../config/database', () => ({
  default: mPrismaClient,
}));

mock.module('../../config/email', () => ({
  createEmailTransporter: mock(() => ({
    sendMail: mock(() => Promise.resolve({
      messageId: 'test-message-id',
      accepted: ['test@example.com'],
      rejected: [],
    })),
  })),
}));

mock.module('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.userId = 1;
    next();
  },
}));

// Import routes AFTER mocks
import emailRoutes from '../../routes/emails';

const app = express();
app.use(express.json());
app.use('/api', emailRoutes);

const prisma = mPrismaClient;

describe('Email Routes', () => {
  beforeEach(() => {
    // Reset all mocks
    Object.values(mPrismaClient).forEach((model: any) => {
      Object.values(model).forEach((fn: any) => {
        if (fn && typeof fn.mockReset === 'function') {
          fn.mockReset();
        }
      });
    });
  });

  describe('POST /api/email', () => {
    it('should send email successfully', async () => {
      const response = await request(app)
        .post('/api/email')
        .send({
          email: 'recipient@purdue.edu',
          subject: 'Test Subject',
          body: 'Test body',
          userEmail: 'sender@purdue.edu',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Email sent successfully');
    });
  });

  describe('POST /api/email-club', () => {
    it('should return 404 if club not found', async () => {
      mPrismaClient.club.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/email-club')
        .send({
          clubID: 999,
          subject: 'Test',
          body: 'Test body',
          userEmail: 'sender@purdue.edu',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Club not found');
    });

    it('should send email to all club members', async () => {
      mPrismaClient.club.findUnique.mockResolvedValue({
        id: 1,
        name: 'Test Club',
      });
      mPrismaClient.clubMembership.findMany.mockResolvedValue([
        { userId: 1 },
        { userId: 2 },
      ]);
      mPrismaClient.user.findMany.mockResolvedValue([
        { id: 1, email: 'user1@purdue.edu' },
        { id: 2, email: 'user2@purdue.edu' },
      ]);

      const response = await request(app)
        .post('/api/email-club')
        .send({
          clubID: 1,
          subject: 'Test Subject',
          body: 'Test body',
          userEmail: 'sender@purdue.edu',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Email sent successfully');
    });
  });

  describe('POST /api/email-everyone', () => {
    it('should send email to all users', async () => {
      mPrismaClient.user.findMany.mockResolvedValue([
        { id: 1, email: 'user1@purdue.edu' },
        { id: 2, email: 'user2@purdue.edu' },
      ]);

      const response = await request(app)
        .post('/api/email-everyone')
        .send({
          subject: 'Test Subject',
          body: 'Test body',
          userEmail: 'sender@purdue.edu',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Email sent successfully');
    });
  });

  describe('POST /api/email-event', () => {
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/email-event')
        .send({
          eventId: 1,
          subject: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields: eventId, subject, body');
    });
  });
});
