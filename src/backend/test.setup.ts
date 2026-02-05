import { mock } from 'bun:test';
import path from 'path';

// Set NODE_ENV to test for all test runs
process.env.NODE_ENV = 'test';

// Mock environment variables - use test values, not real ones
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'test-password';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'; // Fake DB URL

// Global PrismaClient mock - set up before any modules are loaded
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

export const globalPrismaClient = {
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

// Mock dotenv to prevent loading real .env file
mock.module('dotenv/config', () => ({}));
mock.module('dotenv', () => ({
  config: mock(() => {}),
}));

// Mock @prisma/client globally
mock.module('@prisma/client', () => ({
  PrismaClient: function() {
    return globalPrismaClient;
  },
}));

// Mock the database config globally - this intercepts imports from routes
mock.module('./config/database', () => ({
  default: globalPrismaClient,
}));

// Also mock with different relative paths that tests might use
mock.module('../config/database', () => ({
  default: globalPrismaClient,
}));

mock.module('../../config/database', () => ({
  default: globalPrismaClient,
}));

// Mock the auth middleware globally for route tests
mock.module('./middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.userId = 1; // Mock authenticated user
    next();
  },
}));

// Mock email config globally
mock.module('./config/email', () => ({
  createEmailTransporter: mock(() => ({
    sendMail: mock(() => Promise.resolve({ messageId: 'test-message-id' })),
  })),
}));

// Mock multer config globally
mock.module('./config/multer', () => ({
  upload: {
    single: () => (req: any, res: any, next: any) => next(),
  },
}));

// Suppress console output during tests for cleaner test output
global.console = {
  ...console,
  log: mock(() => {}),
  error: mock(() => {}),
  warn: mock(() => {}),
  info: mock(() => {}),
  // Keep debug in case it's needed for debugging tests
};
