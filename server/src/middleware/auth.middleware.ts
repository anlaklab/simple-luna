import { z } from "zod";
// 🔒 Authentication Middleware
// Simplified auth for development

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  // For development, skip authentication
  // TODO: Implement real JWT/Firebase Auth
  logger.debug('Authentication middleware - development mode (skipping)');
  next();
};

// Alias for compatibility with routes
export const auth = authenticate;

export const authorize = async (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // For development, skip authorization
    // TODO: Implement role-based authorization
    logger.debug('Authorization middleware - development mode (skipping)');
    next();
  };
}; 