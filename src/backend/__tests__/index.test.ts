import { describe, it, expect, beforeEach, mock } from 'bun:test';
import request from "supertest";

// Mock the Prisma client with all necessary methods
const createMockModel = () => ({
  findMany: mock(() => Promise.resolve([])),
  findUnique: mock(() => Promise.resolve(null)),
  findFirst: mock(() => Promise.resolve(null)),
  create: mock(() => Promise.resolve({})),
  update: mock(() => Promise.resolve({})),
  delete: mock(() => Promise.resolve({})),
  deleteMany: mock(() => Promise.resolve({ count: 0 })),
  upsert: mock(() => Promise.resolve({})),
  count: mock(() => Promise.resolve(0)),
  createMany: mock(() => Promise.resolve({ count: 0 })),
});

const mPrismaClient = {
  user: createMockModel(),
  club: createMockModel(),
  event: createMockModel(),
  booking: createMockModel(),
  room: createMockModel(),
  tag: createMockModel(),
  clubMembership: createMockModel(),
  clubAdmin: createMockModel(),
  rSVP: createMockModel(),
  likesEvents: createMockModel(),
  eventTags: createMockModel(),
  passwordResetToken: createMockModel(),
  pendingUserVerification: createMockModel(),
};

mock.module('@prisma/client', () => ({
  PrismaClient: mock(() => mPrismaClient),
}));

// Mock the database config to return our mocked prisma client
mock.module('../config/database', () => ({
  default: mPrismaClient,
}));

// Mock the middleware to avoid authentication issues
mock.module('../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.userId = 1; // Mock authenticated user
    next();
  },
}));

// Mock the email config
mock.module('../config/email', () => ({
  createEmailTransporter: mock(() => ({
    sendMail: mock(() => Promise.resolve({ messageId: 'test-message-id' })),
  })),
}));

// Mock multer config
mock.module('../config/multer', () => ({
  upload: {
    single: () => (req: any, res: any, next: any) => next(),
  },
}));

import app from "../index"; // imports our app
import { PrismaClient } from "@prisma/client";

const prisma = mPrismaClient;

describe('Backend Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    Object.values(mPrismaClient).forEach((model: any) => {
      Object.values(model).forEach((fn: any) => {
        if (fn && typeof fn.mockReset === 'function') {
          fn.mockReset();
          // Restore default implementations
          if (fn.getMockName && fn.getMockName().includes('findMany')) {
            fn.mockResolvedValue([]);
          }
        }
      });
    });
  });

  describe('GET /api/message', () => {
    it('should return a message from the backend', async () => {
      const response = await request(app).get('/api/message');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: 'Hello from the backend!' });
    });
  });

  describe('GET /api/tags', () => {
    it('should return tags from the misc routes', async () => {
      const mockTags = [
        { id: 1, name: 'Technology' },
        { id: 2, name: 'Sports' },
      ];
      mPrismaClient.tag.findMany.mockResolvedValue(mockTags);

      const response = await request(app).get('/api/tags');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockTags);
    });
  });

  describe('GET /api/buildings', () => {
    it('should fetch buildings from Purdue.io API', async () => {
      // Mock the global fetch function
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: async () => ({
          value: [
            { ShortCode: 'LWSN', Name: 'Lawson Computer Science Building' },
            { ShortCode: 'MATH', Name: 'Mathematics Building' },
          ]
        })
      })) as any;

      const response = await request(app).get('/api/buildings');
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });
});
