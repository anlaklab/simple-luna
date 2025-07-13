import { z } from "zod";
import { Router } from 'express';
import { DebugController } from '../controllers/debug.controller';

const router = Router();
const debugController = new DebugController();

/**
 * Debug Routes - Internal System Monitoring
 * ⚠️  SECURITY: These routes should be protected in production
 * 🎯 PURPOSE: System monitoring, debugging, performance metrics
 */

// System Metrics
router.get('/metrics', debugController.getSystemMetrics.bind(debugController));

// Service Health
router.get('/services', debugController.getServiceStatus.bind(debugController));

// Active Sessions
router.get('/sessions', debugController.getActiveSessions.bind(debugController));

// Conversion Jobs
router.get('/jobs', debugController.getConversionJobs.bind(debugController));

// Recent Logs
router.get('/logs', debugController.getRecentLogs.bind(debugController));

// Complete Debug Data (all in one)
router.get('/all', debugController.getDebugData.bind(debugController));

// Health Check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.version
  });
});

export default router; 