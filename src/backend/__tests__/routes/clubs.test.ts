import { describe, it, expect, beforeEach, mock } from 'bun:test';
import request from 'supertest';
import express from 'express';

// Mock Prisma Client
const mPrismaClient = {
  club: {
    create: mock(() => Promise.resolve({})),
    findMany: mock(() => Promise.resolve([])),
    findUnique: mock(() => Promise.resolve(null)),
    update: mock(() => Promise.resolve({})),
  },
  clubMembership: {
    findUnique: mock(() => Promise.resolve(null)),
    upsert: mock(() => Promise.resolve({})),
    update: mock(() => Promise.resolve({})),
  },
  clubAdmin: {
    findUnique: mock(() => Promise.resolve(null)),
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

// Import routes AFTER mocks
import clubRoutes from '../../routes/clubs';

const app = express();
app.use(express.json());
app.use('/api/clubs', clubRoutes);

const prisma = mPrismaClient;

describe('Club Routes', () => {
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

  describe('POST /api/clubs', () => {
    it('should create a new club', async () => {
      const mockClub = {
        id: 1,
        name: 'Test Club',
        description: 'A test club',
        authId: 'auth123',
      };
      mPrismaClient.club.create.mockResolvedValue(mockClub);

      const response = await request(app)
        .post('/api/clubs')
        .send({
          name: 'Test Club',
          description: 'A test club',
          authId: 'auth123',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Test Club');
    });
  });

  describe('GET /api/clubs', () => {
    it('should return all clubs', async () => {
      const mockClubs = [
        {
          id: 1,
          name: 'Club A',
          description: 'Description A',
          email: 'cluba@purdue.edu',
          _count: { memberships: 10, events: 5 },
        },
        {
          id: 2,
          name: 'Club B',
          description: 'Description B',
          email: 'clubb@purdue.edu',
          _count: { memberships: 15, events: 8 },
        },
      ];
      mPrismaClient.club.findMany.mockResolvedValue(mockClubs);

      const response = await request(app).get('/api/clubs');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Club A');
    });
  });

  describe('GET /api/clubs/:id', () => {
    it('should return club by ID with members and events', async () => {
      const mockClub = {
        id: 1,
        name: 'Test Club',
        description: 'Test description',
        memberships: [],
        admins: [],
        events: [],
      };
      mPrismaClient.club.findUnique.mockResolvedValue(mockClub);

      const response = await request(app).get('/api/clubs/1');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Test Club');
      expect(response.body.members).toBeDefined();
    });

    it('should return 404 if club not found', async () => {
      mPrismaClient.club.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/clubs/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Club not found');
    });
  });

  describe('PUT /api/clubs/:id', () => {
    it('should update club information', async () => {
      const mockUpdatedClub = {
        id: 1,
        name: 'Updated Club Name',
        description: 'Updated description',
        email: 'updated@purdue.edu',
      };
      mPrismaClient.club.update.mockResolvedValue(mockUpdatedClub);

      const response = await request(app)
        .put('/api/clubs/1')
        .send({
          name: 'Updated Club Name',
          description: 'Updated description',
          email: 'updated@purdue.edu',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Club Name');
    });
  });
});
