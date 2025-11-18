import express from 'express';
import {
  updateLocation,
  getDriverLocation,
  findNearbyDrivers,
  trackJourney,
  getJourneyHistory,
  calculateETA,
  batchUpdateLocations,
} from '../controllers/locationController.js';
import { authenticate } from '../middleware/auth.js';
import { body, query, param } from 'express-validator';
import { validate } from '../middleware/validators.js';

const router = express.Router();

/**
 * @route   POST /api/v1/location/update
 * @desc    Update driver's current location
 * @access  Private (Driver only)
 */
router.post(
  '/update',
  authenticate,
  [
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
    body('heading').optional().isFloat({ min: 0, max: 360 }).withMessage('Heading must be 0-360'),
    body('speed').optional().isFloat({ min: 0 }).withMessage('Speed must be positive'),
  ],
  validate,
  updateLocation
);

/**
 * @route   POST /api/v1/location/batch
 * @desc    Batch update driver locations
 * @access  Private (Driver only)
 */
router.post(
  '/batch',
  authenticate,
  [body('locations').isArray({ min: 1 }).withMessage('Locations array required')],
  validate,
  batchUpdateLocations
);

/**
 * @route   GET /api/v1/location/driver/:driverId
 * @desc    Get driver's current location
 * @access  Private
 */
router.get(
  '/driver/:driverId',
  authenticate,
  [param('driverId').isMongoId().withMessage('Valid driver ID required')],
  validate,
  getDriverLocation
);

/**
 * @route   GET /api/v1/location/nearby
 * @desc    Find nearby available drivers
 * @access  Private
 */
router.get(
  '/nearby',
  authenticate,
  [
    query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
    query('radius').optional().isFloat({ min: 1, max: 100 }).withMessage('Radius must be 1-100 km'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
  ],
  validate,
  findNearbyDrivers
);

/**
 * @route   GET /api/v1/location/journey/:rescueId
 * @desc    Track rescue journey in real-time
 * @access  Private
 */
router.get(
  '/journey/:rescueId',
  authenticate,
  [param('rescueId').isMongoId().withMessage('Valid rescue ID required')],
  validate,
  trackJourney
);

/**
 * @route   GET /api/v1/location/history/:rescueId
 * @desc    Get journey waypoint history
 * @access  Private
 */
router.get(
  '/history/:rescueId',
  authenticate,
  [param('rescueId').isMongoId().withMessage('Valid rescue ID required')],
  validate,
  getJourneyHistory
);

/**
 * @route   GET /api/v1/location/eta
 * @desc    Calculate ETA between two points
 * @access  Private
 */
router.get(
  '/eta',
  authenticate,
  [
    query('fromLat').isFloat({ min: -90, max: 90 }).withMessage('Valid from latitude required'),
    query('fromLng').isFloat({ min: -180, max: 180 }).withMessage('Valid from longitude required'),
    query('toLat').isFloat({ min: -90, max: 90 }).withMessage('Valid to latitude required'),
    query('toLng').isFloat({ min: -180, max: 180 }).withMessage('Valid to longitude required'),
  ],
  validate,
  calculateETA
);

export default router;
