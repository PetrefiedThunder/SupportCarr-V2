import 'module-alias/register';
import dotenv from 'dotenv';
import { startServer } from './app/server';
import { logger } from '@infrastructure/observability/logger/Logger';

// Load environment variables
dotenv.config();

/**
 * Application Entry Point
 */
async function bootstrap(): Promise<void> {
  try {
    logger.info('Starting SupportCarr API...');

    // TODO: Initialize database connection
    // await connectDatabase();

    // TODO: Initialize Redis connection
    // await connectRedis();

    // Start HTTP server
    const port = parseInt(process.env.PORT || '3000', 10);
    startServer(port);
  } catch (error) {
    logger.error('Failed to start application', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

// Bootstrap application
bootstrap();
