import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { JWTService } from '@infrastructure/security/jwt/JWTService';
import { logger } from '@infrastructure/observability/logger/Logger';
import { requestLogger, correlationId } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { AuthController } from './controllers/AuthController';
import { createAuthRoutes } from './routes/auth.routes';

/**
 * Create Express Application
 *
 * Factory function to create and configure Express app with all middleware and routes
 */
export function createApp(): Express {
  const app = express();

  // ===========================
  // Security Middleware
  // ===========================

  // Helmet - Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // CORS configuration
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID', 'X-Correlation-ID'],
    }),
  );

  // ===========================
  // Common Middleware
  // ===========================

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression
  app.use(compression());

  // Request logging and correlation IDs
  app.use(requestLogger);
  app.use(correlationId);

  // ===========================
  // Health Check
  // ===========================

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  app.get('/health/ready', (req, res) => {
    // TODO: Check database connection, Redis, etc.
    res.status(200).json({
      status: 'ready',
      checks: {
        database: 'ok',
        redis: 'ok',
      },
    });
  });

  // ===========================
  // API Routes
  // ===========================

  // Initialize services
  const jwtService = new JWTService(
    process.env.JWT_SECRET || 'dev-secret-key',
    process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  );

  // Initialize controllers
  const authController = new AuthController(jwtService);

  // Mount routes
  app.use('/api/v1/auth', createAuthRoutes(authController));

  // TODO: Add more routes
  // app.use('/api/v1/rescues', createRescueRoutes(...));
  // app.use('/api/v1/drivers', createDriverRoutes(...));
  // app.use('/api/v1/payments', createPaymentRoutes(...));

  // ===========================
  // Error Handling
  // ===========================

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}

/**
 * Start HTTP Server
 */
export function startServer(port: number = 3000): void {
  const app = createApp();

  const server = app.listen(port, () => {
    logger.info(`🚀 SupportCarr API server started`, {
      port,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}
