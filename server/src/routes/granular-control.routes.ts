/**
 * @fileoverview Granular Control Routes - Individual Slide & Shape Operations
 * 
 * Provides precise control over individual slides and shapes for surgical transformations.
 * Enables real-time editing, preview generation, and granular rendering control.
 * 
 * Key Features:
 * - Individual slide extraction and manipulation
 * - Shape-level operations and rendering
 * - Raw rendering capabilities from JSON
 * - Real-time preview generation
 * - Surgical transformations
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { handleAsyncErrors } from '../middleware/error.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { granularControlController } from '../controllers/granular-control.controller';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const SlideParamsSchema = z.object({
  presentationId: z.string().min(1),
  slideIndex: z.coerce.number().min(0)
});

const ShapeParamsSchema = z.object({
  presentationId: z.string().min(1),
  slideIndex: z.coerce.number().min(0),
  shapeId: z.string().min(1)
});

const RenderSlideSchema = z.object({
  slideData: z.object({
    slideId: z.number().min(1),
    shapes: z.array(z.any()).optional(),
    background: z.any().optional(),
    notes: z.string().optional()
  }),
  renderOptions: z.object({
    format: z.enum(['json', 'pptx', 'png', 'svg']).default('json'),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    quality: z.enum(['low', 'medium', 'high']).default('medium')
  }).optional()
});

const RenderShapeSchema = z.object({
  shapeData: z.object({
    shapeType: z.string(),
    geometry: z.any(),
    fillFormat: z.any().optional(),
    lineFormat: z.any().optional(),
    textFrame: z.any().optional()
  }),
  renderOptions: z.object({
    format: z.enum(['json', 'svg', 'png']).default('json'),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    backgroundColor: z.string().optional()
  }).optional()
});

// =============================================================================
// GRANULAR CONTROL ROUTES FACTORY
// =============================================================================

export function createGranularControlRoutes(): Router {
  const router = Router();

  // =============================================================================
  // INDIVIDUAL SLIDE OPERATIONS
  // =============================================================================

  /**
   * @swagger
   * /presentations/{presentationId}/slides/{slideIndex}:
   *   get:
   *     tags:
   *       - Granular Control
   *     summary: Get individual slide data
   *     description: |
   *       Extract and return detailed Universal Schema data for a specific slide.
   *       This endpoint provides granular access to slide content, shapes, formatting,
   *       and metadata without processing the entire presentation.
   *     parameters:
   *       - in: path
   *         name: presentationId
   *         required: true
   *         schema:
   *           type: string
   *         description: Presentation identifier
   *         example: 'pres_123abc'
   *       - in: path
   *         name: slideIndex
   *         required: true
   *         schema:
   *           type: integer
   *           minimum: 0
   *         description: Zero-based slide index
   *         example: 2
   *       - in: query
   *         name: includeShapes
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include shape data in response
   *       - in: query
   *         name: includeNotes
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include slide notes
   *       - in: query
   *         name: includeBackground
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include background formatting
   *     responses:
   *       200:
   *         description: Slide data retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     slide:
   *                       type: object
   *                       properties:
   *                         slideId:
   *                           type: number
   *                           example: 3
   *                         name:
   *                           type: string
   *                           example: "Executive Summary"
   *                         slideType:
   *                           type: string
   *                           example: "Slide"
   *                         shapes:
   *                           type: array
   *                           description: Array of shape objects
   *                           items:
   *                             type: object
   *                         background:
   *                           type: object
   *                           description: Background formatting
   *                         notes:
   *                           type: string
   *                           description: Slide notes
   *                         animations:
   *                           type: array
   *                           description: Slide animations
   *                         transition:
   *                           type: object
   *                           description: Slide transition
   *                     metadata:
   *                       type: object
   *                       properties:
   *                         extractedAt:
   *                           type: string
   *                           format: date-time
   *                         shapeCount:
   *                           type: number
   *                         hasNotes:
   *                           type: boolean
   *                         processingTimeMs:
   *                           type: number
   *                 meta:
   *                   $ref: '#/components/schemas/SuccessMeta'
   *       404:
   *         description: Presentation or slide not found
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   */
  router.get(
    '/presentations/:presentationId/slides/:slideIndex',
    validateRequest(SlideParamsSchema),
    handleAsyncErrors(granularControlController.getSlide.bind(granularControlController))
  );

  /**
   * @swagger
   * /presentations/{presentationId}/slides/{slideIndex}/shapes/{shapeId}:
   *   get:
   *     tags:
   *       - Granular Control
   *     summary: Get individual shape data
   *     description: |
   *       Extract detailed Universal Schema data for a specific shape within a slide.
   *       Provides complete shape information including geometry, formatting, text content,
   *       and type-specific properties.
   *     parameters:
   *       - in: path
   *         name: presentationId
   *         required: true
   *         schema:
   *           type: string
   *         description: Presentation identifier
   *       - in: path
   *         name: slideIndex
   *         required: true
   *         schema:
   *           type: integer
   *           minimum: 0
   *         description: Zero-based slide index
   *       - in: path
   *         name: shapeId
   *         required: true
   *         schema:
   *           type: string
   *         description: Shape identifier
   *         example: 'shape_text_01'
   *       - in: query
   *         name: includeFormatting
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include formatting details
   *       - in: query
   *         name: includeText
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include text content
   *     responses:
   *       200:
   *         description: Shape data retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     shape:
   *                       type: object
   *                       properties:
   *                         shapeType:
   *                           type: string
   *                           example: "Rectangle"
   *                         name:
   *                           type: string
   *                         geometry:
   *                           type: object
   *                         fillFormat:
   *                           type: object
   *                         lineFormat:
   *                           type: object
   *                         textFrame:
   *                           type: object
   *       404:
   *         description: Shape not found
   */
  router.get(
    '/presentations/:presentationId/slides/:slideIndex/shapes/:shapeId',
    validateRequest(ShapeParamsSchema),
    handleAsyncErrors(granularControlController.getShape.bind(granularControlController))
  );

  // =============================================================================
  // RAW RENDERING ENDPOINTS
  // =============================================================================

  /**
   * @swagger
   * /render/slide:
   *   post:
   *     tags:
   *       - Granular Control
   *     summary: Render slide from Universal Schema JSON
   *     description: |
   *       Render a slide directly from Universal Schema JSON data without requiring
   *       a full presentation. Supports multiple output formats including PPTX, PNG, SVG.
   *       Perfect for real-time preview generation and testing transformations.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RenderSlideRequest'
   *           examples:
   *             basic:
   *               summary: Basic slide rendering
   *               value:
   *                 slideData:
   *                   slideId: 1
   *                   shapes:
   *                     - shapeType: "Rectangle"
   *                       geometry: { x: 100, y: 100, width: 400, height: 100 }
   *                       textFrame:
   *                         text: "Hello World"
   *                 renderOptions:
   *                   format: "png"
   *                   width: 1920
   *                   height: 1080
   *                   quality: "high"
   *             preview:
   *               summary: Generate preview image
   *               value:
   *                 slideData:
   *                   slideId: 1
   *                   shapes: []
   *                   background:
   *                     type: "solid"
   *                     color: "#ffffff"
   *                 renderOptions:
   *                   format: "png"
   *                   width: 800
   *                   height: 600
   *     responses:
   *       200:
   *         description: Slide rendered successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     renderedSlide:
   *                       type: string
   *                       description: Base64 encoded result or download URL
   *                     format:
   *                       type: string
   *                     dimensions:
   *                       type: object
   *                       properties:
   *                         width:
   *                           type: number
   *                         height:
   *                           type: number
   *                     renderingStats:
   *                       type: object
   *                       properties:
   *                         processingTimeMs:
   *                           type: number
   *                         shapesRendered:
   *                           type: number
   *                         memoryUsedMB:
   *                           type: number
   */
  router.post(
    '/render/slide',
    validateRequest(RenderSlideSchema),
    handleAsyncErrors(granularControlController.renderSlide.bind(granularControlController))
  );

  /**
   * @swagger
   * /render/shape:
   *   post:
   *     tags:
   *       - Granular Control
   *     summary: Render individual shape from Universal Schema JSON
   *     description: |
   *       Render a single shape directly from Universal Schema JSON data.
   *       Useful for shape preview, testing transformations, and generating
   *       shape-specific assets. Supports SVG and PNG output formats.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RenderShapeRequest'
   *           examples:
   *             textBox:
   *               summary: Render text box
   *               value:
   *                 shapeData:
   *                   shapeType: "Rectangle"
   *                   geometry: { x: 0, y: 0, width: 300, height: 100 }
   *                   fillFormat: { type: "solid", color: "#4CAF50" }
   *                   textFrame:
   *                     text: "Sample Text"
   *                     fontSize: 24
   *                 renderOptions:
   *                   format: "svg"
   *                   backgroundColor: "#ffffff"
   *             chart:
   *               summary: Render chart shape
   *               value:
   *                 shapeData:
   *                   shapeType: "Chart"
   *                   geometry: { x: 0, y: 0, width: 500, height: 300 }
   *                   chartProperties:
   *                     type: "column"
   *                     data: []
   *                 renderOptions:
   *                   format: "png"
   *                   width: 500
   *                   height: 300
   *     responses:
   *       200:
   *         description: Shape rendered successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     renderedShape:
   *                       type: string
   *                       description: Base64 encoded result or SVG markup
   *                     format:
   *                       type: string
   *                     bounds:
   *                       type: object
   *                       properties:
   *                         x: { type: number }
   *                         y: { type: number }
   *                         width: { type: number }
   *                         height: { type: number }
   */
  router.post(
    '/render/shape',
    validateRequest(RenderShapeSchema),
    handleAsyncErrors(granularControlController.renderShape.bind(granularControlController))
  );

  // =============================================================================
  // TRANSFORMATION ENDPOINTS
  // =============================================================================

  /**
   * @swagger
   * /transform/slide:
   *   post:
   *     tags:
   *       - Granular Control
   *     summary: Apply transformations to slide data
   *     description: |
   *       Apply specific transformations to slide data without affecting the full presentation.
   *       Supports operations like translate, resize, recolor, and custom transformations.
   *       Returns transformed Universal Schema data.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               slideData:
   *                 type: object
   *                 description: Original slide data
   *               transformations:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     type:
   *                       type: string
   *                       enum: [translate, resize, recolor, rotate, scale]
   *                     parameters:
   *                       type: object
   *                       description: Transformation-specific parameters
   *               preserveAspectRatio:
   *                 type: boolean
   *                 default: true
   *     responses:
   *       200:
   *         description: Slide transformed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     transformedSlide:
   *                       type: object
   *                       description: Transformed slide data
   *                     appliedTransformations:
   *                       type: array
   *                       description: List of applied transformations
   */
  router.post(
    '/transform/slide',
    handleAsyncErrors(granularControlController.transformSlide.bind(granularControlController))
  );

  return router;
}

// =============================================================================
// EXPORT
// =============================================================================

export default createGranularControlRoutes; 

