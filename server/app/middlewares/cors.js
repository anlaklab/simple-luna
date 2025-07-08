/**
 * Enhanced CORS Configuration Middleware
 * 
 * Handles Cross-Origin Resource Sharing with enhanced support for:
 * - Large file uploads (multi-GB)
 * - Swagger UI integration
 * - Premium tier file handling
 * - Development and production environments
 */

const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      // Local development
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      
      // Swagger UI origins
      'http://localhost:3000/api/v1/docs',
      'http://127.0.0.1:3000/api/v1/docs',
      
      // Production domains
      /^https:\/\/.*\.anlaklab\.com$/,
      /^http:\/\/.*\.anlaklab\.com$/,
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.netlify\.app$/,
      
      // Common development patterns
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^https?:\/\/.*\.ngrok\.io$/,
      /^https?:\/\/.*\.tunnelmole\.net$/,
      
      // Corporate networks (common internal IPs)
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/,
    ];
    
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS: Blocked origin: ${origin}`);
      // In development, allow all origins for easier testing
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
        console.log(`🔓 CORS: Allowing ${origin} in development mode`);
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  
  // Enhanced methods for all operations
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  
  // Enhanced headers for large file uploads and premium tiers
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Request-ID',
    'X-Luna-Tier',           // Custom header for tier selection
    'X-Upload-Type',         // Custom header for upload type
    'X-File-Size',           // Custom header for file size info
    'Content-Length',        // Important for large file uploads
    'Transfer-Encoding',     // For chunked uploads
    'Range',                 // For resumable uploads (future)
    'Content-Range',         // For resumable uploads (future)
    'X-Requested-File-Type', // Custom header for file type
    'User-Agent',            // Allow user agent
    'Referer',               // Allow referer
    'Accept-Encoding',       // Allow encoding headers
    'Accept-Language',       // Allow language headers
  ],
  
  // Enhanced exposed headers for client access
  exposedHeaders: [
    'X-Request-ID',
    'X-Luna-Tier',
    'X-Upload-Status',
    'X-File-Size',
    'X-Processing-Time',
    'Content-Length',
    'Content-Range',
    'X-Total-Count',         // For pagination
    'X-Rate-Limit-Remaining', // For rate limiting (future)
  ],
  
  // Extended max age for preflight caching (24 hours)
  maxAge: 86400,
  
  // Allow preflight to continue to other middleware
  preflightContinue: false,
  
  // Provide a successful response for preflight requests
  optionsSuccessStatus: 200,
};

// Custom middleware to handle additional CORS requirements
const enhancedCors = (req, res, next) => {
  // Apply CORS
  cors(corsOptions)(req, res, (err) => {
    if (err) {
      console.error('❌ CORS Error:', err.message);
      return res.status(403).json({
        success: false,
        error: {
          type: 'cors_error',
          code: 'ORIGIN_NOT_ALLOWED',
          message: 'Origin not allowed by CORS policy',
          origin: req.headers.origin,
          allowedOrigins: 'Contact administrator for access'
        }
      });
    }
    
    // Add custom headers for Luna API
    res.header('X-Luna-API', 'v1.0');
    res.header('X-Powered-By', 'Luna Server');
    
    // Enhanced headers for large file support
    if (req.method === 'POST' && req.path.includes('/upload')) {
      res.header('Access-Control-Max-Age', '86400');
      res.header('X-Upload-Support', 'multi-tier');
      res.header('X-Max-File-Size', 'tier-dependent');
    }
    
    // Log CORS success for debugging
    if (req.headers.origin) {
      console.log(`✅ CORS: Allowed origin: ${req.headers.origin}`);
    }
    
    next();
  });
};

module.exports = enhancedCors; 