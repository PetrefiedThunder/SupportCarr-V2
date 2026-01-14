import analyticsService from '../services/analyticsService.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Get dashboard metrics
 */
export const getDashboardMetrics = async (req, res, next) => {
  try {
    const metrics = await analyticsService.getDashboardMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get rescue trends
 */
export const getRescueTrends = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const trends = await analyticsService.getRescueTrends(parseInt(days, 10));

    res.status(200).json({
      success: true,
      data: {
        trends,
        period: { days: parseInt(days, 10) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get revenue analytics
 */
export const getRevenueAnalytics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const analytics = await analyticsService.getRevenueAnalytics(parseInt(days, 10));

    res.status(200).json({
      success: true,
      data: {
        analytics,
        period: { days: parseInt(days, 10) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get driver leaderboard
 */
export const getDriverLeaderboard = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const leaderboard = await analyticsService.getDriverLeaderboard(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: { leaderboard },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get geographic heatmap
 */
export const getGeographicHeatmap = async (req, res, next) => {
  try {
    const heatmap = await analyticsService.getGeographicHeatmap();

    res.status(200).json({
      success: true,
      data: { heatmap },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get peak hours analysis
 */
export const getPeakHoursAnalysis = async (req, res, next) => {
  try {
    const analysis = await analyticsService.getPeakHoursAnalysis();

    res.status(200).json({
      success: true,
      data: { analysis },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user growth metrics
 */
export const getUserGrowthMetrics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const growth = await analyticsService.getUserGrowthMetrics(parseInt(days, 10));

    res.status(200).json({
      success: true,
      data: {
        growth,
        period: { days: parseInt(days, 10) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get issue type distribution
 */
export const getIssueTypeDistribution = async (req, res, next) => {
  try {
    const distribution = await analyticsService.getIssueTypeDistribution();

    res.status(200).json({
      success: true,
      data: { distribution },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get rating distribution
 */
export const getRatingDistribution = async (req, res, next) => {
  try {
    const distribution = await analyticsService.getRatingDistribution();

    res.status(200).json({
      success: true,
      data: { distribution },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get activity feed
 */
export const getActivityFeed = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const feed = await analyticsService.getActivityFeed(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: { feed },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get driver utilization
 */
export const getDriverUtilization = async (req, res, next) => {
  try {
    const utilization = await analyticsService.getDriverUtilization();

    res.status(200).json({
      success: true,
      data: { utilization },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get comprehensive report
 */
export const getComprehensiveReport = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const report = await analyticsService.getComprehensiveReport(parseInt(days, 10));

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export analytics data (CSV/PDF)
 */
export const exportAnalytics = async (req, res, next) => {
  try {
    const { format = 'csv', type, days = 30 } = req.query;

    let data;

    switch (type) {
      case 'rescues':
        data = await analyticsService.getRescueTrends(parseInt(days, 10));
        break;
      case 'revenue':
        data = await analyticsService.getRevenueAnalytics(parseInt(days, 10));
        break;
      case 'drivers':
        data = await analyticsService.getDriverLeaderboard(100);
        break;
      default:
        data = await analyticsService.getComprehensiveReport(parseInt(days, 10));
    }

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // Return JSON for client-side PDF generation
      res.status(200).json({
        success: true,
        data,
        meta: { format, type, days },
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: Convert data to CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  const flatData = Array.isArray(data) ? data : [data];
  const headers = Object.keys(flatData[0]);
  const csvRows = [];

  // Header row
  csvRows.push(headers.join(','));

  // Data rows
  for (const row of flatData) {
    const values = headers.map((header) => {
      const value = row[header];
      const escaped = ('' + value).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}
