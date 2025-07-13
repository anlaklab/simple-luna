import { z } from "zod";
// 🎯 Presentations Controller - Simplified for Deployment
// Basic CRUD operations for presentations

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { PresentationService } from '../services/presentation.service.simple';

const presentationService = new PresentationService();

export const createPresentation = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Creating new presentation');
    
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
      return;
    }

    const result = await presentationService.createPresentation(req.body, req.file);
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Create presentation error:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to create presentation'
    });
  }
};

export const getPresentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    logger.info(`Getting presentation: ${id}`);
    
    const result = await presentationService.getPresentation(id);
    
    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Presentation not found'
      });
      return;
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get presentation error:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to get presentation'
    });
  }
};

export const getPresentations = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Getting presentations list');
    
    const result = await presentationService.getPresentations(req.query);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get presentations error:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to get presentations'
    });
  }
};

export const updatePresentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    logger.info(`Updating presentation: ${id}`);
    
    const result = await presentationService.updatePresentation(id, req.body);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Update presentation error:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to update presentation'
    });
  }
};

export const deletePresentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    logger.info(`Deleting presentation: ${id}`);
    
    await presentationService.deletePresentation(id);
    
    res.json({
      success: true,
      message: 'Presentation deleted successfully'
    });
  } catch (error) {
    logger.error('Delete presentation error:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete presentation'
    });
  }
}; 