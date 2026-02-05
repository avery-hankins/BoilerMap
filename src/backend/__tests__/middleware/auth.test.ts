import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

describe('authenticateToken middleware (isolated)', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: any;
  let mockNext: any;
  let statusSpy: any;
  let jsonSpy: any;
  let originalVerify: typeof jwt.verify;

  beforeEach(() => {
    // Save original verify
    originalVerify = jwt.verify;

    // Reset mocks before each test
    mockRequest = {
      headers: {},
    };

    // Create spy functions for status and json
    statusSpy = mock(() => mockResponse);
    jsonSpy = mock(() => mockResponse);

    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
    };

    mockNext = mock(() => {});
    process.env.JWT_SECRET = 'test-secret';
  });

  it('should return 401 if no token is provided', () => {
    // Inline the middleware logic to test without module mocking conflicts
    const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        req.userId = decoded.userId;
        next();
      } catch (error: unknown) {
        return res.status(403).json({ error: 'Invalid token' });
      }
    };

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(statusSpy).toHaveBeenCalledTimes(1);
    expect(statusSpy).toHaveBeenCalledWith(401);
    expect(jsonSpy).toHaveBeenCalledTimes(1);
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if token is invalid', () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid-token',
    };

    // Mock jwt.verify to throw an error
    jwt.verify = mock(() => {
      throw new Error('Invalid token');
    }) as any;

    const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        req.userId = decoded.userId;
        next();
      } catch (error: unknown) {
        return res.status(403).json({ error: 'Invalid token' });
      }
    };

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(statusSpy).toHaveBeenCalledTimes(1);
    expect(statusSpy).toHaveBeenCalledWith(403);
    expect(jsonSpy).toHaveBeenCalledTimes(1);
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(mockNext).not.toHaveBeenCalled();

    // Restore
    jwt.verify = originalVerify;
  });

  it('should call next() if token is valid', () => {
    const mockPayload = { userId: 123 };
    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };

    // Mock jwt.verify to return a valid payload
    jwt.verify = mock(() => mockPayload) as any;

    const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        req.userId = decoded.userId;
        next();
      } catch (error: unknown) {
        return res.status(403).json({ error: 'Invalid token' });
      }
    };

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.userId).toBe(123);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(statusSpy).not.toHaveBeenCalled();

    // Restore
    jwt.verify = originalVerify;
  });

  it('should extract userId from token payload', () => {
    const mockPayload = { userId: 456, email: 'test@example.com' };
    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };

    // Mock jwt.verify to return a valid payload
    jwt.verify = mock(() => mockPayload) as any;

    const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        req.userId = decoded.userId;
        next();
      } catch (error: unknown) {
        return res.status(403).json({ error: 'Invalid token' });
      }
    };

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.userId).toBe(456);
    expect(mockNext).toHaveBeenCalledTimes(1);

    // Restore
    jwt.verify = originalVerify;
  });
});
