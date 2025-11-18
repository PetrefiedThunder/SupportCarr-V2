import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

import config from './config/index.js';
import database from './config/database.js';
import logger from './utils/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { createApolloServer } from './graphql/index.js';
import metricsService from './services/metricsService.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import rescueRoutes from './routes/rescue.js';
import driverRoutes from './routes/driver.js';
import paymentRoutes from './routes/payment.js';
import notificationRoutes from './routes/notification.js';
import adminRoutes from './routes/admin.js';
import locationRoutes from './routes/location.js';
import analyticsRoutes from './routes/analytics.js';
import metricsRoutes from './routes/metrics.js';

// Import socket handlers
import { registerLocationHandlers } from './sockets/locationHandlers.js';

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new SocketServer(server, {
  cors: {
    origin: config.cors.origin,
    credentials: true,
  },
});

// Initialize Sentry
if (config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      new ProfilingIntegration(),
    ],
    tracesSampleRate: config.env === 'production' ? 0.1 : 1.0,
    profilesSampleRate: config.env === 'production' ? 0.1 : 1.0,
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression
app.use(compression());

// Security
app.use(mongoSanitize());
app.use(hpp());

// Logging
if (config.env !== 'test') {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Rate limiting
app.use('/api/', generalLimiter);

// Prometheus metrics tracking
app.use(metricsService.trackHttpRequest());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    const dbState = database.connection?.connection?.readyState;
    const dbHealthy = dbState === 1;

    if (!dbHealthy) {
      return res.status(503).json({
        success: false,
        status: 'not ready',
        reason: 'Database not connected',
      });
    }

    res.status(200).json({
      success: true,
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'not ready',
      error: error.message,
    });
  }
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/rescues', rescueRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/location', locationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Metrics endpoint (outside /api/v1 for Prometheus)
app.use('/metrics', metricsRoutes);

// API documentation
app.get('/api-docs', (req, res) => {
  res.json({
    message: 'SupportCarr API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
  });
});

// Sentry error handler (must be before other error handlers)
if (config.sentry.dsn) {
  app.use(Sentry.Handlers.errorHandler());
}

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Socket.io connection handler
io.on('connection', (socket) => {
  logger.info('Socket client connected', { socketId: socket.id });

  socket.on('authenticate', async (token) => {
    try {
      const { verifyAccessToken } = await import('./utils/jwt.js');
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.userId;
      socket.join(`user:${decoded.userId}`);
      logger.info('Socket authenticated', { userId: decoded.userId });
      socket.emit('authenticated', { userId: decoded.userId });
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      socket.emit('unauthorized', { message: 'Authentication failed' });
      socket.disconnect();
    }
  });

  socket.on('track_rescue', (rescueId) => {
    socket.join(`rescue:${rescueId}`);
    logger.info('Socket joined rescue tracking', { rescueId });
  });

  // Register location tracking handlers
  registerLocationHandlers(io, socket);

  socket.on('disconnect', () => {
    logger.info('Socket client disconnected', { socketId: socket.id });
  });
});

// Make io accessible to routes
app.set('io', io);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await database.connect();
    logger.info('Database connected successfully');

    // Initialize Apollo GraphQL Server
    const apolloServer = createApolloServer();
    await apolloServer.start();
    apolloServer.applyMiddleware({ app, path: '/graphql' });
    logger.info('GraphQL server initialized at /graphql');

    // Start server
    const PORT = config.port;
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.env} mode`);
      logger.info(`API documentation available at http://localhost:${PORT}/api-docs`);
      logger.info(`GraphQL playground available at http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close database connection
      await database.disconnect();
      logger.info('Database disconnected');

      // Close Redis connection
      const redisClient = (await import('./config/redis.js')).default;
      await redisClient.disconnect();
      logger.info('Redis disconnected');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection:', { reason, promise });
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app, server, io };
export default app;
