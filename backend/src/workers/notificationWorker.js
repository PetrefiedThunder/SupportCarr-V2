import { Worker } from 'bullmq';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import notificationService from '../services/notificationService.js';
import twilioService from '../services/twilioService.js';
import { User } from '../models/index.js';

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
};

/**
 * Notification Worker
 */
export const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const { type, data } = job;

    logger.info('Processing notification job', {
      jobId: job.id,
      type: job.name,
    });

    try {
      switch (job.name) {
        case 'send-push':
          await processPushNotification(data);
          break;

        case 'send-sms':
          await processSMSNotification(data);
          break;

        case 'send-email':
          await processEmailNotification(data);
          break;

        case 'rescue-assigned':
          await notifyRescueAssigned(data);
          break;

        case 'rescue-status-update':
          await notifyRescueStatus(data);
          break;

        default:
          logger.warn('Unknown notification job type', { type: job.name });
      }

      return { success: true };
    } catch (error) {
      logger.error('Notification job failed:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

/**
 * Process push notification
 */
async function processPushNotification(data) {
  const { userId, title, body, notificationData } = data;

  // Implementation would integrate with FCM/APNs
  logger.info('Push notification sent', { userId, title });
}

/**
 * Process SMS notification
 */
async function processSMSNotification(data) {
  const { phoneNumber, message } = data;

  await twilioService.sendSMS(phoneNumber, message);
  logger.info('SMS sent', { phoneNumber });
}

/**
 * Process email notification
 */
async function processEmailNotification(data) {
  const { to, subject, html } = data;

  // Implementation would use NodeMailer or email service
  logger.info('Email sent', { to, subject });
}

/**
 * Notify rescue assigned
 */
async function notifyRescueAssigned(data) {
  const { rescueId, riderId, driverId } = data;

  // Send notifications to both rider and driver
  await notificationService.send(
    riderId,
    'rescue_assigned',
    'Driver Assigned!',
    'A driver has accepted your rescue request',
    { rescueId }
  );

  await notificationService.send(
    driverId,
    'rescue_accepted',
    'Rescue Accepted',
    'You have accepted a rescue request',
    { rescueId }
  );
}

/**
 * Notify rescue status update
 */
async function notifyRescueStatus(data) {
  const { rescueId, userId, status, message } = data;

  await notificationService.send(
    userId,
    'rescue_status_update',
    'Rescue Update',
    message,
    { rescueId, status }
  );
}

// Worker event handlers
notificationWorker.on('completed', (job) => {
  logger.info('Notification job completed', {
    jobId: job.id,
    name: job.name,
  });
});

notificationWorker.on('failed', (job, err) => {
  logger.error('Notification job failed', {
    jobId: job.id,
    name: job.name,
    error: err.message,
  });
});

export default notificationWorker;
