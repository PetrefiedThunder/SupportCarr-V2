import notificationWorker from './notificationWorker.js';
import paymentWorker from './paymentWorker.js';
import analyticsWorker from './analyticsWorker.js';
import { scheduleRecurringJobs } from '../queues/index.js';
import logger from '../utils/logger.js';

/**
 * Start all workers
 */
async function startWorkers() {
  try {
    logger.info('Starting BullMQ workers...');

    // Schedule recurring jobs
    await scheduleRecurringJobs();

    logger.info('All workers started successfully');
    logger.info('Workers running:', {
      notification: notificationWorker.isRunning(),
      payment: paymentWorker.isRunning(),
      analytics: analyticsWorker.isRunning(),
    });
  } catch (error) {
    logger.error('Failed to start workers:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  logger.info('Shutting down workers...');

  try {
    await Promise.all([
      notificationWorker.close(),
      paymentWorker.close(),
      analyticsWorker.close(),
    ]);

    logger.info('All workers shut down successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during worker shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start workers if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startWorkers();
}

export { startWorkers, shutdown };
export default {
  notificationWorker,
  paymentWorker,
  analyticsWorker,
  startWorkers,
  shutdown,
};
