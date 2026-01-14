import locationService from '../services/locationService.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Update driver location
 */
export const updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, heading, speed } = req.body;
    const driverId = req.user.userId;

    // Validate coordinates
    if (!latitude || !longitude) {
      throw new AppError('Latitude and longitude are required', 400);
    }

    if (latitude < -90 || latitude > 90) {
      throw new AppError('Invalid latitude', 400);
    }

    if (longitude < -180 || longitude > 180) {
      throw new AppError('Invalid longitude', 400);
    }

    // Update location
    const location = await locationService.updateDriverLocation(
      driverId,
      parseFloat(latitude),
      parseFloat(longitude),
      heading !== undefined ? parseFloat(heading) : null,
      speed !== undefined ? parseFloat(speed) : null
    );

    // Emit location update via Socket.io
    if (req.app.get('io')) {
      req.app.get('io').emit(`driver:${driverId}:location`, location);
    }

    res.status(200).json({
      success: true,
      data: { location },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get driver's current location
 */
export const getDriverLocation = async (req, res, next) => {
  try {
    const { driverId } = req.params;

    const location = await locationService.getDriverLocation(driverId);

    if (!location) {
      throw new AppError('Driver location not found', 404);
    }

    res.status(200).json({
      success: true,
      data: { location },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find nearby drivers
 */
export const findNearbyDrivers = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 10, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      throw new AppError('Latitude and longitude are required', 400);
    }

    const drivers = await locationService.findNearbyDrivers(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius),
      parseInt(limit, 10)
    );

    res.status(200).json({
      success: true,
      data: {
        drivers,
        count: drivers.length,
        searchRadius: parseFloat(radius),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Track rescue journey
 */
export const trackJourney = async (req, res, next) => {
  try {
    const { rescueId } = req.params;
    const userId = req.user.userId;

    // Get journey data
    const journeyData = await locationService.trackRescueJourney(rescueId, userId);

    if (!journeyData) {
      throw new AppError('Journey tracking not available', 404);
    }

    res.status(200).json({
      success: true,
      data: journeyData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get journey history
 */
export const getJourneyHistory = async (req, res, next) => {
  try {
    const { rescueId } = req.params;

    const history = await locationService.getJourneyHistory(rescueId);

    res.status(200).json({
      success: true,
      data: {
        rescueId,
        waypoints: history,
        count: history.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate ETA
 */
export const calculateETA = async (req, res, next) => {
  try {
    const { fromLat, fromLng, toLat, toLng } = req.query;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      throw new AppError('All coordinates are required', 400);
    }

    const eta = await locationService.calculateETA(
      { latitude: parseFloat(fromLat), longitude: parseFloat(fromLng) },
      { latitude: parseFloat(toLat), longitude: parseFloat(toLng) }
    );

    res.status(200).json({
      success: true,
      data: eta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Batch update locations (for mobile apps sending buffered updates)
 */
export const batchUpdateLocations = async (req, res, next) => {
  try {
    const { locations } = req.body;
    const driverId = req.user.userId;

    if (!Array.isArray(locations) || locations.length === 0) {
      throw new AppError('Locations array is required', 400);
    }

    // Add driver ID to each update
    const updates = locations.map((loc) => ({
      driverId,
      ...loc,
    }));

    const result = await locationService.batchUpdateLocations(updates);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
