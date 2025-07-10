/**
 * Conversation Routes - AI chat endpoints for presentations
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { logger } from '../utils/logger';
import { handleAsyncErrors } from '../middleware/error.middleware';
import { AsposeAdapterRefactored } from '../adapters/aspose/AsposeAdapterRefactored';
import { OpenAIAdapter } from '../adapters/openai.adapter';
import { JobsService } from '../services/jobs.service';

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

const asposeAdapter = new AsposeAdapterRefactored({});

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
 * @swagger
 * /conversation:
 *   post:
 *     tags:
 *       - AI Features
 *     summary: Start AI dialogue about a presentation
 *     description: |
 *       Initiate an AI-powered conversation with optional presentation context.
 *       This endpoint supports multiple conversation modes (chat, research, command),
 *       streaming responses, and can analyze uploaded PPTX files to provide
 *       contextual responses about the presentation content.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Optional PPTX file for conversation context
 *               message:
 *                 type: string
 *                 description: The message or question to ask the AI
 *                 example: "Can you summarize this presentation and suggest improvements?"
 *               conversationHistory:
 *                 type: string
 *                 description: JSON array of previous conversation turns for context
 *                 example: '[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi! How can I help?"}]'
 *               mode:
 *                 type: string
 *                 enum: [chat, research, command]
 *                 default: chat
 *                 description: |
 *                   Conversation mode:
 *                   - chat: Conversational, friendly responses
 *                   - research: Detailed, analytical responses with citations
 *                   - command: Structured, actionable command execution
 *               streaming:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to stream the response in real-time
 *               context:
 *                 type: string
 *                 description: JSON object with additional context or instructions
 *                 example: '{"instructions":"Focus on accessibility issues","targetAudience":"executives"}'
 *             required:
 *               - message
 *           examples:
 *             basic_chat:
 *               summary: Basic chat conversation
 *               value:
 *                 message: "What makes a good presentation?"
 *                 mode: "chat"
 *                 streaming: false
 *             presentation_analysis:
 *               summary: Analyze uploaded presentation
 *               value:
 *                 file: (binary)
 *                 message: "Can you analyze this presentation and suggest improvements?"
 *                 mode: "research"
 *                 streaming: false
 *             streaming_conversation:
 *               summary: Streaming conversation with context
 *               value:
 *                 message: "Help me improve the structure of my quarterly review presentation"
 *                 mode: "command"
 *                 streaming: true
 *                 conversationHistory: '[{"role":"user","content":"I need help with my presentation"},{"role":"assistant","content":"I\'d be happy to help! What specific aspects would you like to work on?"}]'
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         schema:
 *           type: string
 *         description: User identifier for tracking conversations
 *         example: 'user_123'
 *     responses:
 *       200:
 *         description: Conversation response (standard mode)
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
 *                     conversation:
 *                       type: object
 *                       properties:
 *                         response:
 *                           type: string
 *                           description: AI assistant response
 *                           example: "Based on your presentation, I notice several strengths and areas for improvement..."
 *                         mode:
 *                           type: string
 *                           enum: [chat, research, command]
 *                           example: "research"
 *                         streaming:
 *                           type: boolean
 *                           example: false
 *                         hasContext:
 *                           type: boolean
 *                           description: Whether presentation context was available
 *                           example: true
 *                         usage:
 *                           type: object
 *                           properties:
 *                             prompt_tokens:
 *                               type: number
 *                               description: Tokens used in prompt
 *                             completion_tokens:
 *                               type: number
 *                               description: Tokens used in completion
 *                             total_tokens:
 *                               type: number
 *                               description: Total tokens used
 *                     jobId:
 *                       type: string
 *                       description: Job identifier for tracking
 *                       example: 'job_conversation_abc123'
 *                 meta:
 *                   $ref: '#/components/schemas/SuccessMeta'
 *           text/event-stream:
 *             description: Streaming response (when streaming=true)
 *             schema:
 *               type: string
 *               description: |
 *                 Server-Sent Events stream with the following event types:
 *                 - content: Partial AI response content
 *                 - complete: Conversation completion notification
 *                 - error: Error notification
 *             examples:
 *               content_chunk:
 *                 summary: Content chunk during streaming
 *                 value: 'data: {"type":"content","content":"Based on your presentation","requestId":"req_123","timestamp":"2024-01-15T10:30:00.000Z"}\n\n'
 *               completion:
 *                 summary: Stream completion event
 *                 value: 'data: {"type":"complete","requestId":"req_123","jobId":"job_123","processingTimeMs":2500,"timestamp":"2024-01-15T10:30:00.000Z"}\n\n'
 *               error_event:
 *                 summary: Error during streaming
 *                 value: 'data: {"type":"error","error":"Connection timeout","requestId":"req_123","timestamp":"2024-01-15T10:30:00.000Z"}\n\n'
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_message:
 *                 summary: Missing required message
 *                 value:
 *                   success: false
 *                   error:
 *                     type: "validation_error"
 *                     code: "MESSAGE_REQUIRED"
 *                     message: "Message is required for conversation"
 *                   meta:
 *                     timestamp: "2024-01-15T10:30:00.000Z"
 *                     requestId: "req_123"
 *                     processingTimeMs: 50
 *       413:
 *         $ref: '#/components/responses/FileTooLarge'
 *       503:
 *         description: OpenAI service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               service_unavailable:
 *                 summary: OpenAI not configured
 *                 value:
 *                   success: false
 *                   error:
 *                     type: "service_unavailable"
 *                     code: "OPENAI_NOT_CONFIGURED"
 *                     message: "OpenAI service is not configured"
 *                   meta:
 *                     timestamp: "2024-01-15T10:30:00.000Z"
 *                     requestId: "req_123"
 *                     processingTimeMs: 25
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
          presentationContext = generatePresentationContext(presentation);
          
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
    const systemPrompt = buildConversationSystemPrompt(mode, presentationContext, context);
    const userPrompt = buildUserPrompt(message, conversationHistory, mode);

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