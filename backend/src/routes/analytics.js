import express from 'express';
import {
  getDashboardMetrics,
  getRescueTrends,
  getRevenueAnalytics,
  getDriverLeaderboard,
  getGeographicHeatmap,
  getPeakHoursAnalysis,
  getUserGrowthMetrics,
  getIssueTypeDistribution,
  getRatingDistribution,
  getActivityFeed,
  getDriverUtilization,
  getComprehensiveReport,
  exportAnalytics,
} from '../controllers/analyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { query } from 'express-validator';
import { validate } from '../middleware/validators.js';

const router = express.Router();

// All analytics routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin', 'support'));

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get real-time dashboard metrics
 * @access  Private (Admin/Support)
 */
router.get('/dashboard', getDashboardMetrics);

/**
 * @route   GET /api/v1/analytics/trends/rescues
 * @desc    Get rescue trends over time
 * @access  Private (Admin/Support)
 */
router.get(
  '/trends/rescues',
  [query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be 1-365')],
  validate,
  getRescueTrends
);

/**
 * @route   GET /api/v1/analytics/trends/revenue
 * @desc    Get revenue analytics over time
 * @access  Private (Admin/Support)
 */
router.get(
  '/trends/revenue',
  [query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be 1-365')],
  validate,
  getRevenueAnalytics
);

/**
 * @route   GET /api/v1/analytics/drivers/leaderboard
 * @desc    Get driver performance leaderboard
 * @access  Private (Admin/Support)
 */
router.get(
  '/drivers/leaderboard',
  [query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')],
  validate,
  getDriverLeaderboard
);

/**
 * @route   GET /api/v1/analytics/drivers/utilization
 * @desc    Get driver utilization metrics
 * @access  Private (Admin/Support)
 */
router.get('/drivers/utilization', getDriverUtilization);

/**
 * @route   GET /api/v1/analytics/geographic/heatmap
 * @desc    Get geographic heatmap data
 * @access  Private (Admin/Support)
 */
router.get('/geographic/heatmap', getGeographicHeatmap);

/**
 * @route   GET /api/v1/analytics/insights/peak-hours
 * @desc    Get peak hours analysis
 * @access  Private (Admin/Support)
 */
router.get('/insights/peak-hours', getPeakHoursAnalysis);

/**
 * @route   GET /api/v1/analytics/insights/issues
 * @desc    Get issue type distribution
 * @access  Private (Admin/Support)
 */
router.get('/insights/issues', getIssueTypeDistribution);

/**
 * @route   GET /api/v1/analytics/insights/ratings
 * @desc    Get rating distribution
 * @access  Private (Admin/Support)
 */
router.get('/insights/ratings', getRatingDistribution);

/**
 * @route   GET /api/v1/analytics/users/growth
 * @desc    Get user growth metrics
 * @access  Private (Admin/Support)
 */
router.get(
  '/users/growth',
  [query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be 1-365')],
  validate,
  getUserGrowthMetrics
);

/**
 * @route   GET /api/v1/analytics/activity
 * @desc    Get real-time activity feed
 * @access  Private (Admin/Support)
 */
router.get(
  '/activity',
  [query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')],
  validate,
  getActivityFeed
);

/**
 * @route   GET /api/v1/analytics/report
 * @desc    Get comprehensive analytics report
 * @access  Private (Admin/Support)
 */
router.get(
  '/report',
  [query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be 1-365')],
  validate,
  getComprehensiveReport
);

/**
 * @route   GET /api/v1/analytics/export
 * @desc    Export analytics data
 * @access  Private (Admin/Support)
 */
router.get(
  '/export',
  [
    query('format').optional().isIn(['csv', 'json']).withMessage('Format must be csv or json'),
    query('type').optional().isIn(['rescues', 'revenue', 'drivers', 'comprehensive']).withMessage('Invalid type'),
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be 1-365'),
  ],
  validate,
  exportAnalytics
);

export default router;
