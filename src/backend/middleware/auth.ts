import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

interface JwtPayload extends jwt.JwtPayload {
  userId: number;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    req.userId = decoded.userId;  // Attach verified userId to request
    next();
  } catch (error: unknown) {
    console.error('Token verification failed:', (error instanceof Error) ? error.message : 'Unknown error');
    return res.status(403).json({ error: 'Invalid token' });
  }
};
