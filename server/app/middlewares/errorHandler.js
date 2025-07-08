/**
 * Error Handler Middleware
 * 
 * Global error handling for the application
 */

const errorHandler = (err, req, res, next) => {
  console.error('💥 Error:', err);
  
  // Default error
  let error = {
    success: false,
    error: {
      type: 'server_error',
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.error = {
      type: 'validation_error',
      code: 'VALIDATION_FAILED',
      message: err.message,
    };
    return res.status(400).json(error);
  }

  if (err.name === 'CastError') {
    error.error = {
      type: 'validation_error',
      code: 'INVALID_ID',
      message: 'Invalid ID format',
    };
    return res.status(400).json(error);
  }

  if (err.code === 11000) {
    error.error = {
      type: 'validation_error',
      code: 'DUPLICATE_ENTRY',
      message: 'Duplicate entry found',
    };
    return res.status(409).json(error);
  }

  // Firebase errors
  if (err.code && err.code.startsWith('auth/')) {
    error.error = {
      type: 'authentication_error',
      code: 'FIREBASE_AUTH_ERROR',
      message: 'Authentication failed',
    };
    return res.status(401).json(error);
  }

  // Default 500 error
  res.status(500).json(error);
};

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      type: 'not_found',
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  });
};

module.exports = {
  errorHandler,
  notFound
}; 