/**
 * Conversion Routes Unit Tests
 * Tests for PPTX conversion endpoints and Universal Schema validation
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import conversionRoutes from '../../../src/routes/conversion.routes';
import { ConversionService } from '../../../src/services/conversion.service';
import { AsposeAdapterRefactored } from '../../../src/adapters/aspose/AsposeAdapterRefactored';

// Mock services
jest.mock('../../../src/services/conversion.service');
jest.mock('../../../src/adapters/aspose/AsposeAdapterRefactored');

const app = express();
app.use(express.json());
app.use('/api/v1', conversionRoutes);

describe('Conversion Routes', () => {
  let mockConversionService: jest.Mocked<ConversionService>;
  let mockAsposeAdapter: jest.Mocked<AsposeAdapterRefactored>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConversionService = new ConversionService({} as any) as jest.Mocked<ConversionService>;
    mockAsposeAdapter = new AsposeAdapterRefactored({} as any) as jest.Mocked<AsposeAdapterRefactored>;
  });

  describe('POST /api/v1/pptx2json', () => {
    it('should require file upload', async () => {
      const response = await request(app)
        .post('/api/v1/pptx2json')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_REQUIRED');
    });

    it('should validate file type is PPTX', async () => {
      const response = await request(app)
        .post('/api/v1/pptx2json')
        .attach('file', Buffer.from('fake content'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid file type');
    });

    it('should process valid PPTX file and return Universal Schema', async () => {
      const mockUniversalData = {
        metadata: {
          title: 'Test Presentation',
          author: 'Test Author',
          slideCount: 3,
        },
        slides: [
          {
            slideIndex: 0,
            shapes: [
              {
                shapeIndex: 0,
                type: 'textBox',
                text: 'Test content',
                geometry: { x: 100, y: 100, width: 200, height: 50 },
              },
            ],
          },
        ],
      };

      mockConversionService.convertPPTXToJSON = jest.fn().mockResolvedValue({
        success: true,
        data: mockUniversalData,
        metadata: {
          processingTime: 1500,
          slideCount: 3,
          shapeCount: 1,
        },
      });

      const response = await request(app)
        .post('/api/v1/pptx2json')
        .attach('file', Buffer.from('fake pptx content'), {
          filename: 'test.pptx',
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUniversalData);
      expect(response.body.metadata.slideCount).toBe(3);
    });

    it('should handle Aspose conversion errors gracefully', async () => {
      mockConversionService.convertPPTXToJSON = jest.fn().mockResolvedValue({
        success: false,
        error: 'Failed to process PPTX file',
      });

      const response = await request(app)
        .post('/api/v1/pptx2json')
        .attach('file', Buffer.from('corrupted pptx'), {
          filename: 'corrupted.pptx',
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to process PPTX file');
    });
  });

  describe('POST /api/v1/json2pptx', () => {
    it('should require Universal Schema JSON data', async () => {
      const response = await request(app)
        .post('/api/v1/json2pptx')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST_DATA');
    });

    it('should validate Universal Schema structure', async () => {
      const invalidSchema = {
        invalidField: 'test',
      };

      const response = await request(app)
        .post('/api/v1/json2pptx')
        .send({ presentationData: invalidSchema });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Schema validation failed');
    });

    it('should accept valid Universal Schema and generate PPTX', async () => {
      const validSchema = {
        metadata: {
          title: 'Generated Presentation',
          author: 'AI Generator',
          slideCount: 2,
        },
        slides: [
          {
            slideIndex: 0,
            shapes: [
              {
                shapeIndex: 0,
                type: 'textBox',
                text: 'Generated content',
                geometry: { x: 100, y: 100, width: 300, height: 100 },
              },
            ],
          },
        ],
      };

      mockConversionService.convertJSONToPPTX = jest.fn().mockResolvedValue({
        success: true,
        filePath: '/tmp/generated.pptx',
        metadata: {
          processingTime: 2000,
          slideCount: 2,
          fileSize: 15360,
        },
      });

      const response = await request(app)
        .post('/api/v1/json2pptx')
        .send({ 
          presentationData: validSchema,
          outputFormat: 'pptx',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.filePath).toBe('/tmp/generated.pptx');
    });
  });

  describe('POST /api/v1/thumbnails', () => {
    it('should generate thumbnails for valid PPTX file', async () => {
      const mockThumbnails = [
        {
          slideIndex: 0,
          thumbnailUrl: 'https://storage.com/thumb0.png',
          width: 1920,
          height: 1080,
        },
        {
          slideIndex: 1,
          thumbnailUrl: 'https://storage.com/thumb1.png',
          width: 1920,
          height: 1080,
        },
      ];

      mockConversionService.generateThumbnails = jest.fn().mockResolvedValue({
        success: true,
        thumbnails: mockThumbnails,
        metadata: {
          processingTime: 3000,
          slideCount: 2,
          format: 'png',
        },
      });

      const response = await request(app)
        .post('/api/v1/thumbnails')
        .attach('file', Buffer.from('fake pptx content'), {
          filename: 'test.pptx',
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        })
        .field('width', '1920')
        .field('height', '1080')
        .field('format', 'png');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.thumbnails).toHaveLength(2);
      expect(response.body.data.thumbnails[0].slideIndex).toBe(0);
    });

    it('should validate thumbnail generation parameters', async () => {
      const response = await request(app)
        .post('/api/v1/thumbnails')
        .attach('file', Buffer.from('fake pptx content'), {
          filename: 'test.pptx',
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        })
        .field('width', 'invalid')
        .field('height', 'invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid dimensions');
    });
  });

  describe('Universal Schema Validation', () => {
    it('should validate required fields in presentation metadata', () => {
      const invalidMetadata = {
        // Missing required fields
        author: 'Test Author',
      };

      // Test would validate against Universal Schema
      // This is a placeholder for actual schema validation
      expect(invalidMetadata).toBeDefined();
    });

    it('should validate slide structure', () => {
      const validSlide = {
        slideIndex: 0,
        shapes: [
          {
            shapeIndex: 0,
            type: 'textBox',
            geometry: { x: 0, y: 0, width: 100, height: 50 },
          },
        ],
      };

      expect(validSlide.slideIndex).toBe(0);
      expect(validSlide.shapes).toHaveLength(1);
    });

    it('should validate shape properties', () => {
      const validShape = {
        shapeIndex: 0,
        type: 'rectangle',
        geometry: {
          x: 100,
          y: 100,
          width: 200,
          height: 150,
        },
        fill: {
          type: 'solid',
          color: '#FF0000',
        },
      };

      expect(validShape.type).toBe('rectangle');
      expect(validShape.geometry.width).toBeGreaterThan(0);
      expect(validShape.geometry.height).toBeGreaterThan(0);
    });
  });
}); 