import { RescueRequest, DriverProfile, RiderProfile, User, PaymentRecord, Rating } from '../models/index.js';
import logger from '../utils/logger.js';
import redisClient from '../config/redis.js';

/**
 * Analytics Service
 * Provides comprehensive platform metrics and insights
 */
class AnalyticsService {
  /**
   * Get real-time dashboard metrics
   */
  async getDashboardMetrics() {
    try {
      const cacheKey = 'analytics:dashboard:metrics';
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const [
        totalRescues,
        activeRescues,
        completedToday,
        totalDrivers,
        onlineDrivers,
        totalRiders,
        totalRevenue,
        avgRating,
      ] = await Promise.all([
        RescueRequest.countDocuments(),
        RescueRequest.countDocuments({ status: { $in: ['pending', 'accepted', 'driver_enroute', 'in_progress'] } }),
        this.getCompletedRescuesToday(),
        DriverProfile.countDocuments(),
        DriverProfile.countDocuments({ isOnline: true }),
        RiderProfile.countDocuments(),
        this.getTotalRevenue(),
        this.getAverageRating(),
      ]);

      const metrics = {
        rescues: {
          total: totalRescues,
          active: activeRescues,
          completedToday,
          completionRate: totalRescues > 0 ? ((await RescueRequest.countDocuments({ status: 'completed' })) / totalRescues * 100).toFixed(1) : 0,
        },
        drivers: {
          total: totalDrivers,
          online: onlineDrivers,
          activeRate: totalDrivers > 0 ? ((onlineDrivers / totalDrivers) * 100).toFixed(1) : 0,
        },
        riders: {
          total: totalRiders,
        },
        revenue: {
          total: totalRevenue,
          today: await this.getRevenueToday(),
        },
        rating: {
          average: avgRating,
        },
        timestamp: new Date(),
      };

      // Cache for 1 minute
      await redisClient.set(cacheKey, JSON.stringify(metrics), 60);

      return metrics;
    } catch (error) {
      logger.error('Failed to get dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Get rescues completed today
   */
  async getCompletedRescuesToday() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return RescueRequest.countDocuments({
      status: 'completed',
      completedAt: { $gte: startOfDay },
    });
  }

  /**
   * Get total revenue
   */
  async getTotalRevenue() {
    const result = await PaymentRecord.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return result[0]?.total || 0;
  }

  /**
   * Get revenue for today
   */
  async getRevenueToday() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await PaymentRecord.aggregate([
      { $match: { status: 'succeeded', createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return result[0]?.total || 0;
  }

  /**
   * Get average platform rating
   */
  async getAverageRating() {
    const result = await Rating.aggregate([
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]);

    return result[0]?.avg?.toFixed(2) || 0;
  }

  /**
   * Get rescue trends over time
   */
  async getRescueTrends(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trends = await RescueRequest.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $regexMatch: { input: '$status', regex: /^cancelled/ } }, 1, 0] },
            },
            revenue: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$pricing.total', 0] },
            },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
        },
        {
          $project: {
            _id: 0,
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day',
              },
            },
            total: 1,
            completed: 1,
            cancelled: 1,
            revenue: 1,
          },
        },
      ]);

      return trends;
    } catch (error) {
      logger.error('Failed to get rescue trends:', error);
      return [];
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const analytics = await PaymentRecord.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: 'succeeded',
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            revenue: { $sum: '$amount' },
            transactions: { $sum: 1 },
            avgTransaction: { $avg: '$amount' },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
        },
        {
          $project: {
            _id: 0,
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day',
              },
            },
            revenue: 1,
            transactions: 1,
            avgTransaction: 1,
          },
        },
      ]);

      return analytics;
    } catch (error) {
      logger.error('Failed to get revenue analytics:', error);
      return [];
    }
  }

  /**
   * Get driver performance leaderboard
   */
  async getDriverLeaderboard(limit = 10) {
    try {
      const drivers = await DriverProfile.find()
        .populate('userId', 'firstName lastName profilePicture')
        .sort({ 'rating.average': -1, 'stats.totalRescues': -1 })
        .limit(limit)
        .lean();

      return drivers.map((driver, index) => ({
        rank: index + 1,
        driverId: driver.userId._id,
        name: `${driver.userId.firstName} ${driver.userId.lastName}`,
        profilePicture: driver.userId.profilePicture,
        rating: driver.rating.average,
        totalRescues: driver.stats.totalRescues,
        completionRate: driver.stats.completionRate,
        totalEarnings: driver.stats.totalEarnings,
        averageResponseTime: driver.stats.averageResponseTime,
      }));
    } catch (error) {
      logger.error('Failed to get driver leaderboard:', error);
      return [];
    }
  }

  /**
   * Get geographic heatmap data
   */
  async getGeographicHeatmap() {
    try {
      const heatmapData = await RescueRequest.aggregate([
        {
          $match: {
            status: 'completed',
          },
        },
        {
          $group: {
            _id: {
              lat: { $round: [{ $arrayElemAt: ['$pickupLocation.location.coordinates', 1] }, 2] },
              lng: { $round: [{ $arrayElemAt: ['$pickupLocation.location.coordinates', 0] }, 2] },
            },
            count: { $sum: 1 },
            avgRevenue: { $avg: '$pricing.total' },
          },
        },
        {
          $project: {
            _id: 0,
            latitude: '$_id.lat',
            longitude: '$_id.lng',
            count: 1,
            avgRevenue: 1,
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 500,
        },
      ]);

      return heatmapData;
    } catch (error) {
      logger.error('Failed to get geographic heatmap:', error);
      return [];
    }
  }

  /**
   * Get peak hours analysis
   */
  async getPeakHoursAnalysis() {
    try {
      const analysis = await RescueRequest.aggregate([
        {
          $match: {
            status: 'completed',
          },
        },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 },
            avgRevenue: { $avg: '$pricing.total' },
            avgDuration: { $avg: { $subtract: ['$completedAt', '$createdAt'] } },
          },
        },
        {
          $sort: { _id: 1 },
        },
        {
          $project: {
            _id: 0,
            hour: '$_id',
            count: 1,
            avgRevenue: 1,
            avgDuration: { $divide: ['$avgDuration', 60000] }, // Convert to minutes
          },
        },
      ]);

      return analysis;
    } catch (error) {
      logger.error('Failed to get peak hours analysis:', error);
      return [];
    }
  }

  /**
   * Get user growth metrics
   */
  async getUserGrowthMetrics(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const growth = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
              role: '$role',
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
        },
        {
          $group: {
            _id: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day',
            },
            riders: {
              $sum: { $cond: [{ $eq: ['$_id.role', 'rider'] }, '$count', 0] },
            },
            drivers: {
              $sum: { $cond: [{ $eq: ['$_id.role', 'driver'] }, '$count', 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day',
              },
            },
            riders: 1,
            drivers: 1,
          },
        },
        {
          $sort: { date: 1 },
        },
      ]);

      return growth;
    } catch (error) {
      logger.error('Failed to get user growth metrics:', error);
      return [];
    }
  }

  /**
   * Get issue type distribution
   */
  async getIssueTypeDistribution() {
    try {
      const distribution = await RescueRequest.aggregate([
        {
          $group: {
            _id: '$issue.type',
            count: { $sum: 1 },
            avgRevenue: { $avg: '$pricing.total' },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $project: {
            _id: 0,
            issueType: '$_id',
            count: 1,
            avgRevenue: 1,
          },
        },
      ]);

      return distribution;
    } catch (error) {
      logger.error('Failed to get issue type distribution:', error);
      return [];
    }
  }

  /**
   * Get rating distribution
   */
  async getRatingDistribution() {
    try {
      const distribution = await Rating.aggregate([
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
        {
          $project: {
            _id: 0,
            rating: '$_id',
            count: 1,
          },
        },
      ]);

      return distribution;
    } catch (error) {
      logger.error('Failed to get rating distribution:', error);
      return [];
    }
  }

  /**
   * Get real-time activity feed
   */
  async getActivityFeed(limit = 20) {
    try {
      const recentRescues = await RescueRequest.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('riderId', 'firstName lastName')
        .populate('driverId', 'firstName lastName')
        .select('status createdAt pickupLocation.address pricing.total')
        .lean();

      return recentRescues.map((rescue) => ({
        id: rescue._id,
        type: 'rescue',
        status: rescue.status,
        rider: rescue.riderId ? `${rescue.riderId.firstName} ${rescue.riderId.lastName}` : 'Unknown',
        driver: rescue.driverId ? `${rescue.driverId.firstName} ${rescue.driverId.lastName}` : 'Not assigned',
        location: rescue.pickupLocation.address,
        amount: rescue.pricing.total,
        timestamp: rescue.createdAt,
      }));
    } catch (error) {
      logger.error('Failed to get activity feed:', error);
      return [];
    }
  }

  /**
   * Get driver utilization metrics
   */
  async getDriverUtilization() {
    try {
      const drivers = await DriverProfile.find().select('stats userId').populate('userId', 'firstName lastName');

      const utilization = drivers.map((driver) => {
        const activeHours = driver.stats.totalActiveHours || 1;
        const rescuesPerHour = driver.stats.totalRescues / activeHours;
        const earningsPerHour = driver.stats.totalEarnings / activeHours;

        return {
          driverId: driver.userId._id,
          name: `${driver.userId.firstName} ${driver.userId.lastName}`,
          totalRescues: driver.stats.totalRescues,
          activeHours: Math.round(activeHours),
          rescuesPerHour: rescuesPerHour.toFixed(2),
          earningsPerHour: earningsPerHour.toFixed(2),
          utilization: Math.min(100, (rescuesPerHour / 2) * 100).toFixed(1), // Assuming 2 rescues/hour is 100% utilization
        };
      });

      return utilization.sort((a, b) => b.utilization - a.utilization);
    } catch (error) {
      logger.error('Failed to get driver utilization:', error);
      return [];
    }
  }

  /**
   * Get comprehensive analytics report
   */
  async getComprehensiveReport(days = 30) {
    try {
      const [
        dashboardMetrics,
        rescueTrends,
        revenueAnalytics,
        driverLeaderboard,
        peakHours,
        userGrowth,
        issueDistribution,
        ratingDistribution,
      ] = await Promise.all([
        this.getDashboardMetrics(),
        this.getRescueTrends(days),
        this.getRevenueAnalytics(days),
        this.getDriverLeaderboard(10),
        this.getPeakHoursAnalysis(),
        this.getUserGrowthMetrics(days),
        this.getIssueTypeDistribution(),
        this.getRatingDistribution(),
      ]);

      return {
        summary: dashboardMetrics,
        trends: {
          rescues: rescueTrends,
          revenue: revenueAnalytics,
          userGrowth,
        },
        insights: {
          peakHours,
          issueDistribution,
          ratingDistribution,
        },
        leaderboard: driverLeaderboard,
        period: {
          days,
          startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          endDate: new Date(),
        },
      };
    } catch (error) {
      logger.error('Failed to generate comprehensive report:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();
