import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Custom API Error class
 */
export class APIError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends APIError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

/**
 * Validation Error
 */
export class ValidationError extends APIError {
  constructor(errors) {
    super('Validation failed', 400, errors);
  }
}

/**
 * Unauthorized Error
 */
export class UnauthorizedError extends APIError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Forbidden Error
 */
export class ForbiddenError extends APIError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends APIError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends APIError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

/**
 * Handle Mongoose Validation Errors
 */
const handleMongooseValidationError = (err) => {
  const errors = {};

  Object.keys(err.errors).forEach((key) => {
    errors[key] = err.errors[key].message;
  });

  return new ValidationError(errors);
};

/**
 * Handle Mongoose Duplicate Key Errors
 */
const handleMongoDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyPattern)[0];
  return new ConflictError(`${field} already exists`);
};

/**
 * Handle Mongoose Cast Errors
 */
const handleMongoCastError = (err) => {
  return new APIError(`Invalid ${err.path}: ${err.value}`, 400);
};

/**
 * Handle JWT Errors
 */
const handleJWTError = () => {
  return new UnauthorizedError('Invalid token');
};

/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = () => {
  return new UnauthorizedError('Token expired');
};

/**
 * Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.userId,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    error = handleMongooseValidationError(err);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    error = handleMongoDuplicateKeyError(err);
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    error = handleMongoCastError(err);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(error.errors && { errors: error.errors }),
    ...(config.env === 'development' && { stack: error.stack }),
  });
};

/**
 * Not Found Handler
 */
export const notFound = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Async Handler - Wraps async route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;
