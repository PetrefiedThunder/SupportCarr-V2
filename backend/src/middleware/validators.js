import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from './errorHandler.js';

/**
 * Handle validation results
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = {};
    errors.array().forEach((error) => {
      formattedErrors[error.path] = error.msg;
    });
    throw new ValidationError(formattedErrors);
  }

  next();
};

/**
 * Auth validators
 */
export const signupValidation = [
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone()
    .withMessage('Invalid phone number'),
  body('password')
    .trim()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('email').optional().trim().isEmail().withMessage('Invalid email address'),
  body('firstName').optional().trim().isLength({ max: 50 }).withMessage('First name too long'),
  body('lastName').optional().trim().isLength({ max: 50 }).withMessage('Last name too long'),
  validate,
];

export const signinValidation = [
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone()
    .withMessage('Invalid phone number'),
  body('password').trim().notEmpty().withMessage('Password is required'),
  validate,
];

export const verifyPhoneValidation = [
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone()
    .withMessage('Invalid phone number'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Verification code is required')
    .isLength({ min: 4, max: 6 })
    .withMessage('Invalid verification code'),
  validate,
];

/**
 * Rescue request validators
 */
export const createRescueValidation = [
  body('pickupLocation.address')
    .trim()
    .notEmpty()
    .withMessage('Pickup address is required'),
  body('pickupLocation.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid pickup latitude'),
  body('pickupLocation.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid pickup longitude'),
  body('dropoffLocation.address')
    .trim()
    .notEmpty()
    .withMessage('Dropoff address is required'),
  body('dropoffLocation.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid dropoff latitude'),
  body('dropoffLocation.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid dropoff longitude'),
  body('issue.type')
    .isIn(['flat_tire', 'dead_battery', 'mechanical_failure', 'accident', 'other', 'utility_task'])
    .withMessage('Invalid issue type'),
  body('issue.description').optional().trim().isLength({ max: 500 }),
  body('ebike.make').optional().trim(),
  body('ebike.model').optional().trim(),
  body('ebike.color').optional().trim(),
  validate,
];

export const updateRescueStatusValidation = [
  param('id').isMongoId().withMessage('Invalid rescue request ID'),
  body('status')
    .isIn([
      'pending',
      'accepted',
      'driver_enroute',
      'driver_arrived',
      'in_progress',
      'completed',
      'cancelled_by_rider',
      'cancelled_by_driver',
      'cancelled_by_system',
      'failed',
    ])
    .withMessage('Invalid status'),
  body('notes').optional().trim().isLength({ max: 500 }),
  validate,
];

export const rateRescueValidation = [
  param('id').isMongoId().withMessage('Invalid rescue request ID'),
  body('score').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().trim().isLength({ max: 1000 }),
  body('tags').optional().isArray(),
  validate,
];

/**
 * Driver profile validators
 */
export const createDriverProfileValidation = [
  body('licenseNumber').trim().notEmpty().withMessage('License number is required'),
  body('licenseState')
    .trim()
    .notEmpty()
    .withMessage('License state is required')
    .isLength({ min: 2, max: 2 })
    .withMessage('License state must be 2 characters'),
  body('licenseExpiryDate').isISO8601().withMessage('Invalid license expiry date'),
  body('vehicleDetails.make').trim().notEmpty().withMessage('Vehicle make is required'),
  body('vehicleDetails.model').trim().notEmpty().withMessage('Vehicle model is required'),
  body('vehicleDetails.year')
    .isInt({ min: 1990, max: new Date().getFullYear() + 1 })
    .withMessage('Invalid vehicle year'),
  body('vehicleDetails.licensePlate').trim().notEmpty().withMessage('License plate is required'),
  body('vehicleDetails.licensePlateState')
    .trim()
    .notEmpty()
    .isLength({ min: 2, max: 2 })
    .withMessage('License plate state must be 2 characters'),
  validate,
];

export const updateLocationValidation = [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  validate,
];

/**
 * Payment validators
 */
export const createPaymentValidation = [
  body('rescueRequestId').isMongoId().withMessage('Invalid rescue request ID'),
  body('paymentMethodId').optional().trim().notEmpty().withMessage('Payment method ID is required'),
  body('tip').optional().isFloat({ min: 0 }).withMessage('Invalid tip amount'),
  validate,
];

/**
 * Generic validators
 */
export const mongoIdValidation = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  validate,
];

export const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate,
];

export default {
  validate,
  signupValidation,
  signinValidation,
  verifyPhoneValidation,
  createRescueValidation,
  updateRescueStatusValidation,
  rateRescueValidation,
  createDriverProfileValidation,
  updateLocationValidation,
  createPaymentValidation,
  mongoIdValidation,
  paginationValidation,
};
