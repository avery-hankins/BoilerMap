import { describe, it, expect, beforeEach, mock } from 'bun:test';
import request from 'supertest';
import express from 'express';

// Mock Prisma Client
const mPrismaClient = {
  user: {
    findMany: mock(() => Promise.resolve([])),
    findUnique: mock(() => Promise.resolve(null)),
    update: mock(() => Promise.resolve({})),
  },
  clubMembership: {
    findMany: mock(() => Promise.resolve([])),
    findUnique: mock(() => Promise.resolve(null)),
    deleteMany: mock(() => Promise.resolve({ count: 0 })),
  },
  clubAdmin: {
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
    req.userId = 1; // Mock authenticated user
    next();
  },
}));

// Import routes AFTER mocks
import userRoutes from '../../routes/users';

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

const prisma = mPrismaClient;

describe('User Routes', () => {
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

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const mockUsers = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@purdue.edu',
          username: 'johndoe',
          bio: null,
          fullWebsiteAdmin: null,
          adminClubs: []
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@purdue.edu',
          username: 'janesmith',
          bio: null,
          fullWebsiteAdmin: null,
          adminClubs: [{ authId: 1 }]
        },
      ];
      mPrismaClient.user.findMany.mockResolvedValue(mockUsers);

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].id).toBe(1);
      expect(response.body[0].role).toBe('student');
      expect(response.body[1].id).toBe(2);
      expect(response.body[1].role).toBe('club_leader');
      expect(prisma.user.findMany).toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      mPrismaClient.user.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@purdue.edu',
        bio: 'Test bio',
      };
      mPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app).get('/api/users/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUser);
    });

    it('should return 404 if user not found', async () => {
      mPrismaClient.user.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/users/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('PUT /api/users/:id/bio', () => {
    it('should update user bio', async () => {
      const mockUser = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Updated bio',
      };
      mPrismaClient.user.update.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/users/1/bio')
        .send({ bio: 'Updated bio', requestingUserId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.user.bio).toBe('Updated bio');
    });

    it('should return 403 if user tries to update another user bio', async () => {
      const response = await request(app)
        .put('/api/users/2/bio')
        .send({ bio: 'Hacked bio', requestingUserId: 1 });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You can only update your own bio');
    });
  });
});
