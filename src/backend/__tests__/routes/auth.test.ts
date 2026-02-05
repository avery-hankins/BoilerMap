import { describe, it, expect, beforeEach, mock } from 'bun:test';
import request from 'supertest';
import express from 'express';

// Mock Prisma Client - must be defined before any imports that use it
const mPrismaClient = {
  user: {
    findUnique: mock(() => Promise.resolve(null)),
    create: mock(() => Promise.resolve({})),
  },
  passwordResetToken: {
    create: mock(() => Promise.resolve({})),
    findUnique: mock(() => Promise.resolve(null)),
    delete: mock(() => Promise.resolve({})),
  },
  pendingUserVerification: {
    findUnique: mock(() => Promise.resolve(null)),
    deleteMany: mock(() => Promise.resolve({ count: 0 })),
    create: mock(() => Promise.resolve({})),
    delete: mock(() => Promise.resolve({})),
  },
};

mock.module('@prisma/client', () => ({
  PrismaClient: mock(() => mPrismaClient),
}));

// Mock the database config to return our mocked prisma client
mock.module('../../config/database', () => ({
  default: mPrismaClient,
}));

// Mock email transporter
mock.module('../../config/email', () => ({
  createEmailTransporter: mock(() => ({
    sendMail: mock(() => Promise.resolve({ messageId: 'test-message-id' })),
  })),
}));

// Mock JWT
mock.module('jsonwebtoken', () => ({
  default: {
    sign: mock(() => 'mock-jwt-token'),
    verify: mock(() => ({ userId: 1 })),
  },
  sign: mock(() => 'mock-jwt-token'),
  verify: mock(() => ({ userId: 1 })),
}));

// Import routes AFTER mocks are set up
import authRoutes from '../../routes/auth';

const app = express();
app.use(express.json());
app.use('/api', authRoutes);

const prisma = mPrismaClient;

describe('Auth Routes', () => {
  beforeEach(() => {
    // Reset all mocks
    Object.values(mPrismaClient).forEach((model: any) => {
      Object.values(model).forEach((fn: any) => {
        if (fn && typeof fn.mockReset === 'function') {
          fn.mockReset();
        }
      });
    });
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('POST /api/login', () => {
    it('should return 400 if email or password is missing', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ email: 'test@purdue.edu' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password required');
    });

    it('should return 401 if user does not exist', async () => {
      mPrismaClient.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/login')
        .send({ email: 'nonexistent@purdue.edu', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return 401 if password is incorrect', async () => {
      mPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@purdue.edu',
        password: 'correctpassword',
      });

      const response = await request(app)
        .post('/api/login')
        .send({ email: 'test@purdue.edu', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return token on successful login', async () => {
      mPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@purdue.edu',
        password: 'password123',
      });

      const response = await request(app)
        .post('/api/login')
        .send({ email: 'test@purdue.edu', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.user).toEqual({
        id: 1,
        email: 'test@purdue.edu',
      });
    });
  });

  describe('POST /api/signup', () => {
    it('should return 400 if email does not end with @purdue.edu', async () => {
      const response = await request(app)
        .post('/api/signup')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
          email: 'test@gmail.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email must end with @purdue.edu');
    });

    it('should return 409 if email is already registered', async () => {
      mPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'existing@purdue.edu',
      });

      const response = await request(app)
        .post('/api/signup')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
          email: 'existing@purdue.edu',
          password: 'password123',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already registered');
    });
  });

  describe('POST /api/register', () => {
    it('should return 400 if email or password is missing', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({ email: 'test@purdue.edu' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password required');
    });

    it('should create user and return token on successful registration', async () => {
      mPrismaClient.user.findUnique.mockResolvedValue(null);
      mPrismaClient.user.create.mockResolvedValue({
        id: 1,
        email: 'newuser@purdue.edu',
        username: 'newuser',
      });

      const response = await request(app)
        .post('/api/register')
        .send({
          email: 'newuser@purdue.edu',
          password: 'password123',
          username: 'newuser',
          firstName: 'New',
          lastName: 'User',
        });

      expect(response.status).toBe(201);
      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.user.email).toBe('newuser@purdue.edu');
    });
  });
});
