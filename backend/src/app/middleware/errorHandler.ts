import { Request, Response, NextFunction } from 'express';
import { logger } from '@infrastructure/observability/logger/Logger';
import { ValidationError } from './validation';
import { AuthenticationError, AuthorizationError } from './auth';
import { DomainError } from '@domain/shared/errors/DomainError';

/**
 * Error Response Interface
 */
interface IErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
  requestId?: string;
}

/**
 * Global Error Handler Middleware
 *
 * Handles all errors and returns consistent error responses
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Log error
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
  });

  // Default error response
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown = undefined;

  // Handle specific error types
  if (error instanceof ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = error.errors;
  } else if (error instanceof AuthenticationError) {
    statusCode = 401;
    code = 'AUTHENTICATION_ERROR';
    message = error.message;
  } else if (error instanceof AuthorizationError) {
    statusCode = 403;
    code = 'AUTHORIZATION_ERROR';
    message = error.message;
  } else if (error instanceof DomainError) {
    statusCode = 400;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if ((error as any).statusCode) {
    statusCode = (error as any).statusCode;
    message = error.message;
  }

  // Build error response
  const errorResponse: IErrorResponse = {
    error: {
      code,
      message,
      details,
    },
    requestId: (req as any).id,
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Not Found Handler
 *
 * Handles 404 errors for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
