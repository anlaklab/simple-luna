/**
 * Firebase Session Schema for Luna AI Chat Conversations
 * 
 * Collection: 'chat_sessions'
 * Document ID: Auto-generated unique session ID
 */

const SessionSchema = {
  // Session metadata
  sessionId: "string", // Unique session identifier
  title: "string", // Session title (auto-generated from first message or user-defined)
  
  // User and session info
  userId: "string|null", // User ID if authenticated, null for anonymous
  userAgent: "string", // Browser/device info for analytics
  ipAddress: "string|null", // For analytics and security (hashed)
  
  // Conversation data
  messages: [
    {
      messageId: "string", // Unique message ID
      role: "string", // "user", "assistant", "system"
      content: "string", // Message content
      timestamp: "timestamp", // Firestore timestamp
      metadata: {
        promptTokens: "number|null", // For AI messages
        completionTokens: "number|null", // For AI messages
        model: "string|null", // AI model used
        temperature: "number|null", // AI generation settings
        processingTimeMs: "number|null", // Response time
        validationResult: "object|null", // Schema validation results if applicable
      }
    }
  ],
  
  // Session metadata
  createdAt: "timestamp", // When session was created
  updatedAt: "timestamp", // Last message timestamp
  lastActiveAt: "timestamp", // Last user interaction
  
  // Session state
  status: "string", // "active", "archived", "deleted"
  isBookmarked: "boolean", // User can bookmark important sessions
  tags: ["string"], // User-defined tags for organization
  
  // Session statistics
  messageCount: "number", // Total messages in conversation
  userMessageCount: "number", // Messages from user
  assistantMessageCount: "number", // Messages from assistant
  totalTokensUsed: "number", // Total tokens consumed
  
  // Generated content tracking
  generatedPresentations: [
    {
      presentationId: "string", // Reference to presentation in presentation_json_data
      generatedAt: "timestamp",
      title: "string",
      description: "string",
      slideCount: "number"
    }
  ],
  
  // Session settings
  settings: {
    aiModel: "string", // Default: "gpt-4"
    temperature: "number", // Default: 0.7
    maxTokens: "number", // Default: 2000
    systemPrompt: "string|null", // Custom system prompt
    autoSave: "boolean", // Default: true
    notifications: "boolean" // Default: false
  }
};

/**
 * Default session settings
 */
const DefaultSessionSettings = {
  aiModel: "gpt-4",
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: null,
  autoSave: true,
  notifications: false
};

/**
 * Session validation rules
 */
const SessionValidation = {
  title: {
    required: false,
    minLength: 1,
    maxLength: 200,
    default: () => `Chat Session ${new Date().toLocaleString()}`
  },
  
  messages: {
    required: true,
    minItems: 0,
    maxItems: 1000 // Prevent excessive memory usage
  },
  
  status: {
    required: true,
    enum: ["active", "archived", "deleted"],
    default: "active"
  },
  
  tags: {
    required: false,
    maxItems: 10,
    itemMaxLength: 50
  }
};

/**
 * Firestore indexes needed for optimal performance
 */
const RequiredIndexes = [
  // For user session queries
  {
    collection: "chat_sessions",
    fields: [
      { fieldPath: "userId", order: "ASCENDING" },
      { fieldPath: "lastActiveAt", order: "DESCENDING" }
    ]
  },
  
  // For active sessions
  {
    collection: "chat_sessions", 
    fields: [
      { fieldPath: "status", order: "ASCENDING" },
      { fieldPath: "updatedAt", order: "DESCENDING" }
    ]
  },
  
  // For bookmarked sessions
  {
    collection: "chat_sessions",
    fields: [
      { fieldPath: "userId", order: "ASCENDING" },
      { fieldPath: "isBookmarked", order: "ASCENDING" },
      { fieldPath: "updatedAt", order: "DESCENDING" }
    ]
  },
  
  // For tag-based queries
  {
    collection: "chat_sessions",
    fields: [
      { fieldPath: "userId", order: "ASCENDING" },
      { fieldPath: "tags", order: "ASCENDING" },
      { fieldPath: "lastActiveAt", order: "DESCENDING" }
    ]
  }
];

/**
 * Helper functions for session management
 */
const SessionHelpers = {
  /**
   * Generate session title from first user message
   */
  generateTitle(firstUserMessage) {
    if (!firstUserMessage) {
      return `Chat Session ${new Date().toLocaleString()}`;
    }
    
    // Take first 50 characters and clean up
    const title = firstUserMessage
      .substring(0, 50)
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return title || `Chat Session ${new Date().toLocaleString()}`;
  },
  
  /**
   * Calculate total tokens from messages
   */
  calculateTotalTokens(messages) {
    return messages.reduce((total, message) => {
      const promptTokens = message.metadata?.promptTokens || 0;
      const completionTokens = message.metadata?.completionTokens || 0;
      return total + promptTokens + completionTokens;
    }, 0);
  },
  
  /**
   * Clean old sessions (for maintenance)
   */
  getCleanupCriteria() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return {
      // Delete sessions older than 30 days that are not bookmarked
      deleteConditions: {
        status: "active",
        isBookmarked: false,
        lastActiveAt: { "<": thirtyDaysAgo }
      },
      
      // Archive sessions older than 7 days
      archiveConditions: {
        status: "active", 
        isBookmarked: false,
        lastActiveAt: { "<": new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    };
  },
  
  /**
   * Sanitize user input for session data
   */
  sanitizeMessage(content) {
    // Remove potential XSS and clean up
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim()
      .substring(0, 10000); // Max message length
  }
};

module.exports = {
  SessionSchema,
  DefaultSessionSettings,
  SessionValidation,
  RequiredIndexes,
  SessionHelpers
}; 