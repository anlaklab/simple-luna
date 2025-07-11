/**
 * Global Test Setup
 * Configures mocks and test environment for Luna Server tests
 */

import type { Config } from 'jest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.API_VERSION = 'v1';
process.env.PORT = '3001';
process.env.ASPOSE_LICENSE_PATH = '/app/lib/Aspose.Slides.lic';

// Extend global with test constants
declare global {
  var TEST_CONSTANTS: any;
}

// Mock Firebase Admin (avoid real Firebase connections in tests)
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  firestore: jest.fn(() => ({
    collection: jest.fn(),
    doc: jest.fn(),
    batch: jest.fn(),
  })),
  storage: jest.fn(() => ({
    bucket: jest.fn(),
  })),
}));

// Mock OpenAI (avoid real API calls in tests)
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Mock AI response for testing',
              },
            },
          ],
        }),
      },
    },
  })),
}));

// Mock Aspose.Slides library (avoid loading heavy native library in tests)
jest.mock('../lib/aspose.slides.js', () => ({
  Presentation: jest.fn().mockImplementation(() => ({
    getSlides: jest.fn(() => ({
      getCount: jest.fn(() => 5),
      get_Item: jest.fn((index: number) => ({
        getShapes: jest.fn(() => ({
          getCount: jest.fn(() => 3),
          get_Item: jest.fn(() => ({
            getShapeType: jest.fn(() => 1), // AutoShape
            getName: jest.fn(() => 'Test Shape'),
            getX: jest.fn(() => 100),
            getY: jest.fn(() => 100),
            getWidth: jest.fn(() => 200),
            getHeight: jest.fn(() => 50),
          })),
        })),
        getBackground: jest.fn(() => ({
          getType: jest.fn(() => 1),
        })),
        getSlideSize: jest.fn(() => ({
          getSize: jest.fn(() => ({ width: 1920, height: 1080 })),
        })),
      })),
    })),
    save: jest.fn(),
    dispose: jest.fn(),
  })),
  AutoShape: 1,
  ShapeType: {
    AutoShape: 1,
    Chart: 3,
    Table: 4,
    Picture: 5,
    Video: 6,
    Audio: 7,
  },
  LoadFormat: {
    Auto: 0,
    Ppt: 1,
    Pptx: 2,
  },
  SaveFormat: {
    Png: 2,
    Jpeg: 3,
    Pdf: 4,
  },
}));

// Mock Winston logger (avoid log noise in tests)
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
  },
}));

// Mock file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
  stat: jest.fn(),
  access: jest.fn(),
}));

// Mock multer for file uploads
jest.mock('multer', () => {
  const multer = {
    single: jest.fn(() => (req: any, res: any, next: any) => {
      req.file = {
        filename: 'test.pptx',
        originalname: 'test.pptx',
        path: '/tmp/test.pptx',
        size: 1024,
        mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };
      next();
    }),
    memoryStorage: jest.fn(),
  };
  return jest.fn(() => multer);
});

// Global test constants
global.TEST_CONSTANTS = {
  MOCK_PRESENTATION_DATA: {
    metadata: {
      title: 'Test Presentation',
      author: 'Test Author',
      slideCount: 5,
      createdAt: new Date(),
    },
    slides: [
      {
        slideIndex: 0,
        shapes: [
          {
            shapeIndex: 0,
            type: 'textBox',
            text: 'Test slide content',
            geometry: { x: 100, y: 100, width: 200, height: 50 },
          },
        ],
      },
    ],
  },
  MOCK_FILE_UPLOAD: {
    filename: 'test.pptx',
    originalname: 'test.pptx',
    path: '/tmp/test.pptx',
    size: 1024,
    mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
}; 