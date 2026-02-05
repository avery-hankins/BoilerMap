import { describe, it, expect, beforeEach, mock } from 'bun:test';
import request from 'supertest';
import express from 'express';

// Mock Prisma Client
const mPrismaClient = {
  event: {
    findMany: mock(() => Promise.resolve([])),
    findUnique: mock(() => Promise.resolve(null)),
    create: mock(() => Promise.resolve({})),
    createMany: mock(() => Promise.resolve({ count: 0 })),
    update: mock(() => Promise.resolve({})),
  },
  rSVP: {
    findUnique: mock(() => Promise.resolve(null)),
    findMany: mock(() => Promise.resolve([])),
    create: mock(() => Promise.resolve({})),
    update: mock(() => Promise.resolve({})),
    delete: mock(() => Promise.resolve({})),
  },
  club: {
    findUnique: mock(() => Promise.resolve(null)),
  },
  room: {
    findUnique: mock(() => Promise.resolve(null)),
  },
  booking: {
    findUnique: mock(() => Promise.resolve(null)),
  },
  clubAdmin: {
    findUnique: mock(() => Promise.resolve(null)),
  },
  clubMembership: {
    findUnique: mock(() => Promise.resolve(null)),
  },
  likesEvents: {
    count: mock(() => Promise.resolve(0)),
    findUnique: mock(() => Promise.resolve(null)),
    create: mock(() => Promise.resolve({})),
    delete: mock(() => Promise.resolve({})),
  },
  eventTags: {
    createMany: mock(() => Promise.resolve({ count: 0 })),
  },
  tag: {
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

mock.module('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.userId = 1;
    next();
  },
}));

mock.module('../../config/multer', () => ({
  upload: {
    single: () => (req: any, res: any, next: any) => next(),
  },
}));

// Import routes AFTER mocks
import eventRoutes from '../../routes/events';

const app = express();
app.use(express.json());
app.use('/api/events', eventRoutes);

const prisma = mPrismaClient;

describe('Event Routes', () => {
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

  describe('GET /api/events', () => {
    it('should return upcoming events', async () => {
      const mockEvents = [
        {
          id: 1,
          description: 'Test Event 1',
          startTime: new Date('2025-12-01'),
          endTime: new Date('2025-12-01'),
          club: { id: 1, name: 'Test Club' },
          room: { buildingCode: 'LWSN', roomNum: '1142' },
          booking: { description: 'Test booking', expectedAttendance: 50 },
        },
      ];
      mPrismaClient.event.findMany.mockResolvedValue(mockEvents);

      const response = await request(app).get('/api/events');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].description).toBe('Test Event 1');
    });
  });

  describe('GET /api/events/:id', () => {
    it('should return event by ID', async () => {
      const mockEvent = {
        id: 1,
        description: 'Test Event',
        startTime: new Date('2025-12-01'),
        endTime: new Date('2025-12-01'),
        club: { id: 1, name: 'Test Club' },
        room: { buildingCode: 'LWSN', roomNum: '1142' },
        booking: { description: 'Test booking', expectedAttendance: 50 },
        _count: { rsvps: 10 },
      };
      mPrismaClient.event.findUnique.mockResolvedValue(mockEvent);

      const response = await request(app).get('/api/events/1');

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Test Event');
    });

    it('should return 404 if event not found', async () => {
      mPrismaClient.event.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/events/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Event not found');
    });
  });

  describe('POST /api/events/:id/like', () => {
    it('should like an event', async () => {
      mPrismaClient.likesEvents.create.mockResolvedValue({
        userId: 1,
        eventId: 1,
      });

      const response = await request(app).post('/api/events/1/like');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Event liked successfully');
    });

    it('should return 400 if already liked', async () => {
      mPrismaClient.likesEvents.create.mockRejectedValue({
        code: 'P2002',
      });

      const response = await request(app).post('/api/events/1/like');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Already liked');
    });
  });

  describe('GET /api/events/:eventId/likes', () => {
    it('should return like count and user like status', async () => {
      mPrismaClient.likesEvents.count.mockResolvedValue(5);
      mPrismaClient.likesEvents.findUnique.mockResolvedValue({
        userId: 1,
        eventId: 1,
      });

      const response = await request(app).get('/api/events/1/likes');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(5);
      expect(response.body.likedByUser).toBe(true);
    });
  });
});
