import { Queue } from 'bullmq';
import redisClient from '../config/redis.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// Create Redis connection for BullMQ
const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
};

/**
 * Notification Queue
 * Processes notification sending (push, SMS, email)
 */
export const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

/**
 * Payment Queue
 * Processes payment-related tasks (charges, payouts, refunds)
 */
export const paymentQueue = new Queue('payments', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: 1000,
    removeOnFail: false, // Keep failed payment jobs
  },
});

/**
 * Analytics Queue
 * Processes analytics aggregation and reporting
 */
export const analyticsQueue = new Queue('analytics', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

/**
 * Rescue Queue
 * Processes rescue-related background tasks
 */
export const rescueQueue = new Queue('rescues', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 500,
    removeOnFail: 500,
  },
});

/**
 * Email Queue
 * Processes email sending
 */
export const emailQueue = new Queue('emails', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

/**
 * Add notification job
 */
export const addNotificationJob = async (type, data, options = {}) => {
  try {
    const job = await notificationQueue.add(type, data, {
      priority: options.priority || 10,
      delay: options.delay || 0,
      ...options,
    });

    logger.info('Notification job added', {
      jobId: job.id,
      type,
    });

    return job;
  } catch (error) {
    logger.error('Failed to add notification job:', error);
    throw error;
  }
};

/**
 * Add payment job
 */
export const addPaymentJob = async (type, data, options = {}) => {
  try {
    const job = await paymentQueue.add(type, data, {
      priority: options.priority || 5,
      ...options,
    });

    logger.info('Payment job added', {
      jobId: job.id,
      type,
    });

    return job;
  } catch (error) {
    logger.error('Failed to add payment job:', error);
    throw error;
  }
};

/**
 * Add analytics job
 */
export const addAnalyticsJob = async (type, data, options = {}) => {
  try {
    const job = await analyticsQueue.add(type, data, {
      priority: options.priority || 20,
      ...options,
    });

    logger.info('Analytics job added', {
      jobId: job.id,
      type,
    });

    return job;
  } catch (error) {
    logger.error('Failed to add analytics job:', error);
    throw error;
  }
};

/**
 * Add rescue job
 */
export const addRescueJob = async (type, data, options = {}) => {
  try {
    const job = await rescueQueue.add(type, data, {
      priority: options.priority || 1,
      ...options,
    });

    logger.info('Rescue job added', {
      jobId: job.id,
      type,
    });

    return job;
  } catch (error) {
    logger.error('Failed to add rescue job:', error);
    throw error;
  }
};

/**
 * Add email job
 */
export const addEmailJob = async (type, data, options = {}) => {
  try {
    const job = await emailQueue.add(type, data, {
      priority: options.priority || 15,
      ...options,
    });

    logger.info('Email job added', {
      jobId: job.id,
      type,
    });

    return job;
  } catch (error) {
    logger.error('Failed to add email job:', error);
    throw error;
  }
};

/**
 * Schedule recurring analytics jobs
 */
export const scheduleRecurringJobs = async () => {
  try {
    // Daily analytics aggregation at midnight
    await analyticsQueue.add(
      'daily-aggregation',
      {},
      {
        repeat: {
          pattern: '0 0 * * *', // Every day at midnight
        },
      }
    );

    // Hourly surge pricing calculation
    await rescueQueue.add(
      'calculate-surge',
      {},
      {
        repeat: {
          pattern: '0 * * * *', // Every hour
        },
      }
    );

    // Weekly driver payout processing
    await paymentQueue.add(
      'weekly-payouts',
      {},
      {
        repeat: {
          pattern: '0 9 * * 1', // Every Monday at 9 AM
        },
      }
    );

    logger.info('Recurring jobs scheduled');
  } catch (error) {
    logger.error('Failed to schedule recurring jobs:', error);
  }
};

export default {
  notificationQueue,
  paymentQueue,
  analyticsQueue,
  rescueQueue,
  emailQueue,
  addNotificationJob,
  addPaymentJob,
  addAnalyticsJob,
  addRescueJob,
  addEmailJob,
  scheduleRecurringJobs,
};
