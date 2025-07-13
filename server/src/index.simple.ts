import { z } from "zod";
// 🚀 Luna Server - Simplified Entry Point
// Basic Express server for development and testing

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './utils/logger';

// Import simplified routes
import presentationsRoutes from './routes/presentations.routes.simple';
import conversionRoutes from './routes/conversion.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Create temp directories
import { mkdirSync } from 'fs';
try {
  mkdirSync('temp/uploads', { recursive: true });
  mkdirSync('temp/aspose', { recursive: true });
  mkdirSync('temp/conversions', { recursive: true });
  mkdirSync('logs', { recursive: true });
} catch (error) {
  // Directories might already exist
}

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'Luna Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/v1/presentations', presentationsRoutes);
app.use('/api/v1/conversion', conversionRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Luna Server started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/api/v1/health`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app; 