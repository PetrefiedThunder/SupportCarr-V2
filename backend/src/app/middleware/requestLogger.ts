import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@infrastructure/observability/logger/Logger';

/**
 * Request Logger Middleware
 *
 * Logs all incoming requests and responses with timing information
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate request ID
  const requestId = uuidv4();
  (req as any).id = requestId;

  // Start timer
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;

    logger.info('Outgoing response', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
    });

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Correlation ID Middleware
 *
 * Adds correlation ID to response headers
 */
export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req as any).id || uuidv4();
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Correlation-ID', requestId);
  next();
}
