// 🔒 Authentication Middleware
// Simplified auth for development

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // For development, skip authentication
  // TODO: Implement real JWT/Firebase Auth
  logger.debug('Authentication middleware - development mode (skipping)');
  next();
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // For development, skip authorization
    // TODO: Implement role-based authorization
    logger.debug('Authorization middleware - development mode (skipping)');
    next();
  };
}; 