/**
 * Conversation Routes - AI dialogue and streaming LLM interactions
 * 
 * Handles conversational AI, document research, and streaming responses
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { OpenAIAdapter } from '../adapters/openai.adapter';
import { AsposeAdapter } from '../adapters/aspose.adapter';
import { JobsService } from '../services/jobs.service';
import { logger } from '../utils/logger';
import { handleAsyncErrors } from '../middleware/error.middleware';

// =============================================================================
// ROUTER SETUP
// =============================================================================

const router = Router();

// =============================================================================
// MULTER CONFIGURATION
// =============================================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB default
  },
});

// =============================================================================
// SERVICES INITIALIZATION
// =============================================================================

const openaiConfig = process.env.OPENAI_API_KEY ? {
  apiKey: process.env.OPENAI_API_KEY,
  organizationId: process.env.OPENAI_ORGANIZATION_ID,
  defaultModel: 'gpt-4-turbo-preview',
} : undefined;

const openaiAdapter = openaiConfig ? new OpenAIAdapter(openaiConfig) : undefined;

    // Configure adapters for presentation processing
    const asposeConfig = {
      licenseFilePath: process.env.ASPOSE_LICENSE_PATH || './Aspose.Slides.Product.Family.lic',
    };

const asposeAdapter = new AsposeAdapter(asposeConfig);

const firebaseConfig = process.env.FIREBASE_PROJECT_ID ? {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
  
} : undefined;

const jobsService = new JobsService({ firebaseConfig });

// =============================================================================
// CONVERSATION ENDPOINTS
// =============================================================================

/**
 * POST /conversation - Start AI dialogue about a presentation
 * 
 * @route POST /conversation
 * @desc Initiate conversational AI interaction with presentation context
 * @access Public
 * @param {File} [file] - Optional PPTX file for context
 * @param {Object} conversation - Conversation parameters
 * @returns {Object} Streaming or standard AI response
 */
router.post('/conversation', upload.single('file'), handleAsyncErrors(async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}`;

  try {
    if (!openaiAdapter) {
      res.status(503).json({
        success: false,
        error: {
          type: 'service_unavailable',
          code: 'OPENAI_NOT_CONFIGURED',
          message: 'OpenAI service is not configured',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    const {
      message,
      conversationHistory = [],
      mode = 'chat', // 'chat', 'research', 'command'
      streaming = false,
      context = {},
    } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'MESSAGE_REQUIRED',
          message: 'Message is required for conversation',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    const userId = req.headers['x-user-id'] as string;

    // Create job for tracking
    const job = await jobsService.createJob({
      type: 'conversation',
      userId,
      inputFileId: req.file ? 'uploaded_file' : undefined,
      metadata: {
        mode,
        streaming,
        messageLength: message.length,
        hasFile: !!req.file,
      },
    });

    // Update job status to processing
    await jobsService.updateJob(job.id, { status: 'processing', progress: 25 });

    let presentationContext = '';

    // Process file if provided
    if (req.file) {
      logger.info('Processing uploaded file for conversation context', {
        requestId,
        filename: req.file.originalname,
        size: req.file.size,
      });

      // Save file temporarily
      const fs = require('fs/promises');
      const path = require('path');
      const tempDir = './temp/conversations';
      await fs.mkdir(tempDir, { recursive: true });
      
      const tempFilePath = path.join(tempDir, `${requestId}_${req.file.originalname}`);
      await fs.writeFile(tempFilePath, req.file.buffer);

      try {
        // Convert PPTX to JSON for context
        const conversionResult = await asposeAdapter.convertPptxToJson(tempFilePath, {
          includeAssets: false,
          includeMetadata: true,
          includeAnimations: false,
          includeComments: true,
        });

        if (conversionResult.success && conversionResult.data) {
          const presentation = conversionResult.data;
          presentationContext = this.generatePresentationContext(presentation);
          
          await jobsService.updateJob(job.id, { progress: 50 });
        }

        // Clean up temp file
        await fs.unlink(tempFilePath).catch(() => {});
      } catch (error) {
        logger.error('Failed to process file for conversation', { error, requestId });
        // Continue without file context
      }
    }

    // Build conversation prompt based on mode
    const systemPrompt = this.buildConversationSystemPrompt(mode, presentationContext, context);
    const userPrompt = this.buildUserPrompt(message, conversationHistory, mode);

    await jobsService.updateJob(job.id, { progress: 75 });

    if (streaming) {
      // Handle streaming response
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      try {
        const stream = await openaiAdapter.createChatCompletionStream({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          model: 'gpt-4-turbo-preview',
          temperature: mode === 'research' ? 0.3 : 0.7,
          max_tokens: 2000,
        });

        let fullResponse = '';
        
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            const data = JSON.stringify({
              type: 'content',
              content,
              requestId,
              timestamp: new Date().toISOString(),
            });
            res.write(`data: ${data}\n\n`);
          }
        }

        // Send completion event
        const completionData = JSON.stringify({
          type: 'complete',
          requestId,
          jobId: job.id,
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
        res.write(`data: ${completionData}\n\n`);

        // Complete job
        await jobsService.completeJob(job.id, {
          success: true,
          data: { response: fullResponse, mode, streaming: true },
        });

        res.end();
      } catch (error) {
        const errorData = JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Streaming failed',
          requestId,
          timestamp: new Date().toISOString(),
        });
        res.write(`data: ${errorData}\n\n`);
        res.end();

        await jobsService.completeJob(job.id, {
          success: false,
          error: error instanceof Error ? error.message : 'Streaming failed',
        });
      }
    } else {
      // Handle standard response
      try {
        const response = await openaiAdapter.createChatCompletion({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          model: 'gpt-4-turbo-preview',
          temperature: mode === 'research' ? 0.3 : 0.7,
          max_tokens: 2000,
        });

        const content = response.choices[0]?.message?.content || '';
        const processingTime = Date.now() - startTime;

        // Complete job
        await jobsService.completeJob(job.id, {
          success: true,
          data: { response: content, mode, streaming: false },
        });

        const result = {
          success: true,
          data: {
            conversation: {
              response: content,
              mode,
              streaming: false,
              hasContext: !!presentationContext,
              usage: response.usage,
            },
            jobId: job.id,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTimeMs: processingTime,
            version: '1.0',
          },
        };

        logger.info('Conversation completed successfully', {
          requestId,
          jobId: job.id,
          mode,
          responseLength: content.length,
          processingTimeMs: processingTime,
        });

        res.status(200).json(result);
      } catch (error) {
        const processingTime = Date.now() - startTime;

        await jobsService.completeJob(job.id, {
          success: false,
          error: error instanceof Error ? error.message : 'Conversation failed',
        });

        logger.error('Conversation failed', { error, requestId, processingTimeMs: processingTime });

        res.status(500).json({
          success: false,
          error: {
            type: 'conversation_error',
            code: 'CONVERSATION_FAILED',
            message: error instanceof Error ? error.message : 'Conversation failed',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTimeMs: processingTime,
          },
        });
      }
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Conversation endpoint error', { error, requestId, processingTimeMs: processingTime });

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'CONVERSATION_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: processingTime,
        },
      });
    }
  }
}));

// =============================================================================
// HELPER METHODS
// =============================================================================

/**
 * Generate presentation context for AI conversation
 */
function generatePresentationContext(presentation: any): string {
  const slides = presentation.slides || [];
  const metadata = presentation.metadata || {};
  
  let context = `# Presentation Context\n\n`;
  context += `**Title:** ${presentation.documentProperties?.title || 'Untitled'}\n`;
  context += `**Author:** ${presentation.documentProperties?.author || 'Unknown'}\n`;
  context += `**Slides:** ${metadata.slideCount || slides.length}\n`;
  context += `**Shapes:** ${metadata.shapeCount || 0}\n\n`;
  
  context += `## Slide Contents:\n\n`;
  
  slides.forEach((slide: any, index: number) => {
    context += `### Slide ${index + 1}: ${slide.name || `Slide ${index + 1}`}\n`;
    
    const textShapes = slide.shapes?.filter((s: any) => s.text?.content) || [];
    if (textShapes.length > 0) {
      textShapes.forEach((shape: any) => {
        context += `- ${shape.text.content.trim()}\n`;
      });
    }
    
    context += `\n`;
  });
  
  return context;
}

/**
 * Build system prompt based on conversation mode
 */
function buildConversationSystemPrompt(mode: string, presentationContext: string, context: any): string {
  let systemPrompt = '';
  
  switch (mode) {
    case 'research':
      systemPrompt = `You are a research assistant specialized in presentation analysis and content research. You provide thorough, well-researched responses with citations and detailed explanations. Focus on accuracy and depth.`;
      break;
    
    case 'command':
      systemPrompt = `You are a presentation assistant that can execute specific commands like "summarize", "generate slide", "detect errors", "improve design", etc. Respond with structured, actionable results.`;
      break;
    
    case 'chat':
    default:
      systemPrompt = `You are a helpful assistant specialized in presentations and document analysis. You provide clear, conversational responses while being informative and engaging.`;
      break;
  }
  
  if (presentationContext) {
    systemPrompt += `\n\nYou have access to the following presentation context:\n\n${presentationContext}`;
  }
  
  if (context.instructions) {
    systemPrompt += `\n\nAdditional instructions: ${context.instructions}`;
  }
  
  return systemPrompt;
}

/**
 * Build user prompt with conversation history
 */
function buildUserPrompt(message: string, conversationHistory: any[], mode: string): string {
  let prompt = '';
  
  if (conversationHistory.length > 0) {
    prompt += `## Previous Conversation:\n\n`;
    conversationHistory.slice(-5).forEach((turn: any) => {
      prompt += `**${turn.role}:** ${turn.content}\n\n`;
    });
  }
  
  prompt += `## Current ${mode === 'command' ? 'Command' : 'Message'}:\n\n${message}`;
  
  return prompt;
}

export default router; 