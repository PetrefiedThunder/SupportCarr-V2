import { Worker } from 'bullmq';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { RescueRequest, User, DriverProfile, PaymentRecord } from '../models/index.js';

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
};

/**
 * Analytics Worker
 */
export const analyticsWorker = new Worker(
  'analytics',
  async (job) => {
    logger.info('Processing analytics job', {
      jobId: job.id,
      type: job.name,
    });

    try {
      switch (job.name) {
        case 'daily-aggregation':
          return await processDailyAggregation();

        case 'driver-stats-update':
          return await updateDriverStats(job.data);

        case 'rider-stats-update':
          return await updateRiderStats(job.data);

        case 'platform-metrics':
          return await calculatePlatformMetrics(job.data);

        default:
          logger.warn('Unknown analytics job type', { type: job.name });
      }

      return { success: true };
    } catch (error) {
      logger.error('Analytics job failed:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

/**
 * Process daily aggregation
 */
async function processDailyAggregation() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Aggregate rescue stats
  const rescueStats = await RescueRequest.aggregate([
    {
      $match: {
        createdAt: { $gte: today, $lt: tomorrow },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: {
          $sum: '$pricing.total',
        },
        avgPrice: {
          $avg: '$pricing.total',
        },
      },
    },
  ]);

  // Aggregate payment stats
  const paymentStats = await PaymentRecord.getTotalRevenue(today, tomorrow);

  // Store results in cache for fast retrieval
  const redisClient = (await import('../config/redis.js')).default;
  await redisClient.set(
    `analytics:daily:${today.toISOString().split('T')[0]}`,
    {
      rescueStats,
      paymentStats,
      generatedAt: new Date(),
    },
    86400 // 24 hours
  );

  logger.info('Daily aggregation completed', {
    date: today.toISOString().split('T')[0],
    rescueCount: rescueStats.reduce((sum, stat) => sum + stat.count, 0),
  });

  return { rescueStats, paymentStats };
}

/**
 * Update driver stats
 */
async function updateDriverStats(data) {
  const { driverId } = data;

  const driver = await DriverProfile.findOne({ userId: driverId });
  if (!driver) {
    throw new Error('Driver not found');
  }

  // Calculate stats
  const rescues = await RescueRequest.find({
    driverId,
    status: 'completed',
  });

  const totalRescues = rescues.length;
  const totalEarnings = rescues.reduce((sum, r) => sum + (r.pricing?.driverPayout || 0), 0);

  const cancelledRescues = await RescueRequest.countDocuments({
    driverId,
    status: { $regex: /^cancelled/ },
  });

  const totalRequests = await RescueRequest.countDocuments({ driverId });
  const completionRate = totalRequests > 0 ? (totalRescues / totalRequests) * 100 : 0;
  const cancellationRate = totalRequests > 0 ? (cancelledRescues / totalRequests) * 100 : 0;

  // Calculate average response time
  const responseTimes = rescues
    .filter((r) => r.acceptedAt && r.createdAt)
    .map((r) => (r.acceptedAt - r.createdAt) / 1000 / 60); // minutes

  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

  // Update driver profile
  driver.stats = {
    totalRescues,
    totalUtilityTasks: driver.stats?.totalUtilityTasks || 0,
    completionRate,
    cancellationRate,
    averageResponseTime: Math.round(avgResponseTime),
    totalEarnings,
  };

  await driver.save();

  logger.info('Driver stats updated', {
    driverId,
    totalRescues,
    totalEarnings,
  });

  return { success: true, stats: driver.stats };
}

/**
 * Update rider stats
 */
async function updateRiderStats(data) {
  const { riderId } = data;

  const rescues = await RescueRequest.find({
    riderId,
    status: 'completed',
  });

  const totalRescues = rescues.length;
  const totalSpent = rescues.reduce((sum, r) => sum + (r.pricing?.total || 0), 0);

  logger.info('Rider stats updated', {
    riderId,
    totalRescues,
    totalSpent,
  });

  return { success: true, totalRescues, totalSpent };
}

/**
 * Calculate platform metrics
 */
async function calculatePlatformMetrics(data) {
  const { startDate, endDate } = data;

  const metrics = {
    totalRescues: await RescueRequest.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    }),
    completedRescues: await RescueRequest.countDocuments({
      status: 'completed',
      createdAt: { $gte: startDate, $lte: endDate },
    }),
    activeDrivers: await DriverProfile.countDocuments({
      isAvailable: true,
    }),
    totalRevenue: await PaymentRecord.getTotalRevenue(startDate, endDate),
  };

  logger.info('Platform metrics calculated', metrics);

  return metrics;
}

// Worker event handlers
analyticsWorker.on('completed', (job) => {
  logger.info('Analytics job completed', {
    jobId: job.id,
    name: job.name,
  });
});

analyticsWorker.on('failed', (job, err) => {
  logger.error('Analytics job failed', {
    jobId: job.id,
    name: job.name,
    error: err.message,
  });
});

export default analyticsWorker;
