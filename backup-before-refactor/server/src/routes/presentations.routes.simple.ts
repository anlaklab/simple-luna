// 🛣️ Presentations Routes - Simplified for Deployment
// Basic CRUD routes for presentations

import { Router } from 'express';
import multer from 'multer';
import {
  createPresentation,
  getPresentation,
  getPresentations,
  updatePresentation,
  deletePresentation
} from '../controllers/presentations.controller.simple';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'temp/uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      cb(null, true);
    } else {
      cb(new Error('Only PPTX files are allowed'));
    }
  }
});

// Routes
router.get('/', getPresentations);
router.get('/:id', getPresentation);
router.post('/', upload.single('file'), createPresentation);
router.put('/:id', updatePresentation);
router.delete('/:id', deletePresentation);

export default router; 