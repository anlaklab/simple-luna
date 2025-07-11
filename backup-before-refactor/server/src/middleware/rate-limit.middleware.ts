// ⚡ Rate Limiting Middleware
// Simple rate limiting for API endpoints

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Simple in-memory rate limiting (for development)
const requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

export const rateLimit = (windowMs: number = 15 * 60 * 1000, max: number = 100) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'anonymous';
    const now = Date.now();
    
    const current = requestCounts.get(clientId);
    
    if (!current || now > current.resetTime) {
      requestCounts.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }
    
    if (current.count >= max) {
      logger.warn(`Rate limit exceeded for client: ${clientId}`);
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.'
      });
      return;
    }
    
    current.count++;
    next();
  };
}; 