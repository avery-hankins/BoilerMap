import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import request from 'supertest';
import express from 'express';

// Mock fetch globally
const mockFetch = spyOn(globalThis, 'fetch');

const mPrismaClient = {
  booking: {
    findMany: mock(() => Promise.resolve([])),
    create: mock(() => Promise.resolve({})),
    update: mock(() => Promise.resolve({})),
  },
  club: {
    findUnique: mock(() => Promise.resolve(null)),
  },
  room: {
    upsert: mock(() => Promise.resolve({})),
  },
  user: {
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

mock.module('../../config/email', () => ({
  createEmailTransporter: mock(() => ({
    sendMail: mock(() => Promise.resolve({ messageId: 'test-message-id' })),
  })),
}));

// Import routes AFTER mocks
import bookingRoutes from '../../routes/bookings';

const app = express();
app.use(express.json());
app.use('/api', bookingRoutes);

const prisma = mPrismaClient;

describe('Booking Routes', () => {
  beforeEach(() => {
    // Reset all mocks
    Object.values(mPrismaClient).forEach((model: any) => {
      Object.values(model).forEach((fn: any) => {
        if (fn && typeof fn.mockReset === 'function') {
          fn.mockReset();
        }
      });
    });
    mockFetch.mockReset();
  });

  describe('GET /api/room-booking-requests', () => {
    it('should return all booking requests', async () => {
      const mockBookings = [
        {
          id: 1,
          expectedAttendance: 50,
          startTime: new Date(),
          endTime: new Date(),
          description: 'Test booking',
          approvalStatus: 'PENDING',
          club: { id: 1, name: 'Test Club' },
          room: { id: 1, buildingCode: 'LWSN', roomNum: '1142' },
          user: { id: 1, email: 'test@purdue.edu' },
        },
      ];
      mPrismaClient.booking.findMany.mockResolvedValue(mockBookings);

      const response = await request(app).get('/api/room-booking-requests');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].approvalStatus).toBe('PENDING');
    });
  });

  describe('POST /api/room-booking-requests', () => {
    it('should return 400 if date or time is missing', async () => {
      const response = await request(app)
        .post('/api/room-booking-requests')
        .send({ clubId: 1, attendees: 50 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Date and time are required');
    });

    it('should create a new booking request', async () => {
      // Mock the Purdue API fetch call
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          value: [{
            Building: { ShortCode: 'KRAN' },
            Number: 'G020',
            Capacity: 100,
          }],
        }),
      } as Response);

      mPrismaClient.club.findUnique.mockResolvedValue({
        id: 1,
        name: 'Test Club',
      });
      mPrismaClient.room.upsert.mockResolvedValue({
        id: 1,
        buildingCode: 'KRAN',
        roomNum: 'G020',
      });
      mPrismaClient.booking.create.mockResolvedValue({
        id: 1,
        expectedAttendance: 50,
        startTime: new Date(),
        endTime: new Date(),
        description: 'Test event',
        approvalStatus: 'PENDING',
      });
      mPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@purdue.edu',
      });

      const response = await request(app)
        .post('/api/room-booking-requests')
        .send({
          clubId: 1,
          eventName: 'Test Event',
          attendees: 50,
          date: '2025-12-01',
          time: '10:00',
          additionalInfo: 'Test info',
          roomId: 1,
          userId: 1,
        });

      expect(response.status).toBe(201);
      expect(response.body.room_booking_request_id).toBe(1);
    });
  });

  describe('PUT /api/room-booking-requests/:id/approve', () => {
    it('should approve a booking request', async () => {
      mPrismaClient.booking.update.mockResolvedValue({
        id: 1,
        approvalStatus: 'PRIMARY_APPROVED',
        userId: 1,
      });
      mPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@purdue.edu',
      });

      const response = await request(app).put('/api/room-booking-requests/1/approve');

      expect(response.status).toBe(200);
      expect(response.body.approvalStatus).toBe('PRIMARY_APPROVED');
    });
  });

  describe('PUT /api/room-booking-requests/:id/deny', () => {
    it('should deny a booking request', async () => {
      mPrismaClient.booking.update.mockResolvedValue({
        id: 1,
        approvalStatus: 'DENIED',
        userId: 1,
      });
      mPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@purdue.edu',
      });

      const response = await request(app).put('/api/room-booking-requests/1/deny');

      expect(response.status).toBe(200);
      expect(response.body.approvalStatus).toBe('DENIED');
    });
  });
});
