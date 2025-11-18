import { DriverProfile, RescueRequest } from '../models/index.js';
import logger from '../utils/logger.js';
import redisClient from '../config/redis.js';

/**
 * Location Tracking Service
 * Manages real-time driver location updates and geospatial queries
 */
class LocationService {
  /**
   * Update driver location
   */
  async updateDriverLocation(driverId, latitude, longitude, heading = null, speed = null) {
    try {
      const location = {
        type: 'Point',
        coordinates: [longitude, latitude],
      };

      // Update driver profile
      const driver = await DriverProfile.findOneAndUpdate(
        { userId: driverId },
        {
          currentLocation: location,
          lastLocationUpdate: new Date(),
          ...(heading !== null && { heading }),
          ...(speed !== null && { speed }),
        },
        { new: true }
      );

      if (!driver) {
        throw new Error('Driver profile not found');
      }

      // Cache location in Redis for ultra-fast lookups
      const cacheKey = `driver:location:${driverId}`;
      await redisClient.set(
        cacheKey,
        JSON.stringify({
          latitude,
          longitude,
          heading,
          speed,
          timestamp: Date.now(),
        }),
        300 // 5 minute TTL
      );

      // Add to geospatial index in Redis
      await redisClient.geoAdd('drivers:locations', {
        longitude,
        latitude,
        member: driverId.toString(),
      });

      logger.debug('Driver location updated', {
        driverId,
        latitude,
        longitude,
      });

      return {
        location: { latitude, longitude },
        heading,
        speed,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to update driver location:', error);
      throw error;
    }
  }

  /**
   * Get driver location from cache or database
   */
  async getDriverLocation(driverId) {
    try {
      // Try cache first
      const cacheKey = `driver:location:${driverId}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Fall back to database
      const driver = await DriverProfile.findOne({ userId: driverId });
      if (!driver || !driver.currentLocation) {
        return null;
      }

      return {
        latitude: driver.currentLocation.coordinates[1],
        longitude: driver.currentLocation.coordinates[0],
        timestamp: driver.lastLocationUpdate,
      };
    } catch (error) {
      logger.error('Failed to get driver location:', error);
      return null;
    }
  }

  /**
   * Find nearby drivers using Redis geospatial index
   */
  async findNearbyDrivers(latitude, longitude, radiusKm = 10, limit = 20) {
    try {
      // Query Redis geo index
      const nearbyDrivers = await redisClient.geoSearch(
        'drivers:locations',
        { longitude, latitude },
        { radius: radiusKm, unit: 'km' },
        { WITHDIST: true, COUNT: limit }
      );

      if (!nearbyDrivers || nearbyDrivers.length === 0) {
        return [];
      }

      // Get full driver details
      const driverIds = nearbyDrivers.map((d) => d.member);
      const drivers = await DriverProfile.find({
        userId: { $in: driverIds },
        availability: 'available',
        isOnline: true,
      }).populate('userId', 'firstName lastName phoneNumber');

      // Attach distance information
      const driversWithDistance = drivers.map((driver) => {
        const geoData = nearbyDrivers.find((nd) => nd.member === driver.userId.toString());
        return {
          ...driver.toObject(),
          distance: geoData ? parseFloat(geoData.distance) : null,
        };
      });

      // Sort by distance
      driversWithDistance.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

      logger.info('Found nearby drivers', {
        count: driversWithDistance.length,
        latitude,
        longitude,
        radiusKm,
      });

      return driversWithDistance;
    } catch (error) {
      logger.error('Failed to find nearby drivers:', error);
      // Fallback to MongoDB geospatial query
      return this.findNearbyDriversMongoDB(latitude, longitude, radiusKm, limit);
    }
  }

  /**
   * Fallback MongoDB geospatial query
   */
  async findNearbyDriversMongoDB(latitude, longitude, radiusKm = 10, limit = 20) {
    try {
      const drivers = await DriverProfile.find({
        availability: 'available',
        isOnline: true,
        currentLocation: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusKm * 1000, // Convert to meters
          },
        },
      })
        .limit(limit)
        .populate('userId', 'firstName lastName phoneNumber');

      return drivers;
    } catch (error) {
      logger.error('MongoDB geospatial query failed:', error);
      return [];
    }
  }

  /**
   * Calculate ETA for driver to reach pickup location
   */
  async calculateETA(driverLocation, pickupLocation) {
    try {
      const distance = this.calculateDistance(
        driverLocation.coordinates || [driverLocation.longitude, driverLocation.latitude],
        pickupLocation.coordinates || [pickupLocation.longitude, pickupLocation.latitude]
      );

      // Average urban speed with traffic
      const avgSpeed = 35; // km/h
      const etaMinutes = Math.round((distance / avgSpeed) * 60);

      // Add buffer for traffic and stops
      const bufferedETA = Math.round(etaMinutes * 1.2);

      return {
        distance: Math.round(distance * 10) / 10,
        etaMinutes: bufferedETA,
        etaText: this.formatETA(bufferedETA),
      };
    } catch (error) {
      logger.error('Failed to calculate ETA:', error);
      return {
        distance: 0,
        etaMinutes: 0,
        etaText: 'Unknown',
      };
    }
  }

  /**
   * Track rescue journey with waypoints
   */
  async trackRescueJourney(rescueId, driverId) {
    try {
      const rescue = await RescueRequest.findById(rescueId);
      if (!rescue) {
        throw new Error('Rescue not found');
      }

      const driverLocation = await this.getDriverLocation(driverId);
      if (!driverLocation) {
        return null;
      }

      // Determine current leg of journey
      let targetLocation;
      let journeyStatus;

      if (rescue.status === 'driver_enroute' || rescue.status === 'accepted') {
        targetLocation = rescue.pickupLocation.location;
        journeyStatus = 'to_pickup';
      } else if (rescue.status === 'in_progress') {
        targetLocation = rescue.dropoffLocation.location;
        journeyStatus = 'to_dropoff';
      } else {
        return null;
      }

      const eta = await this.calculateETA(
        {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
        },
        {
          latitude: targetLocation.coordinates[1],
          longitude: targetLocation.coordinates[0],
        }
      );

      // Store waypoint
      const waypoint = {
        timestamp: new Date(),
        location: {
          type: 'Point',
          coordinates: [driverLocation.longitude, driverLocation.latitude],
        },
        heading: driverLocation.heading,
        speed: driverLocation.speed,
      };

      // Cache journey data
      const journeyKey = `journey:${rescueId}`;
      await redisClient.rPush(journeyKey, JSON.stringify(waypoint));
      await redisClient.expire(journeyKey, 7200); // 2 hour TTL

      return {
        rescueId,
        driverLocation,
        targetLocation: {
          latitude: targetLocation.coordinates[1],
          longitude: targetLocation.coordinates[0],
        },
        journeyStatus,
        eta,
      };
    } catch (error) {
      logger.error('Failed to track rescue journey:', error);
      return null;
    }
  }

  /**
   * Get journey history
   */
  async getJourneyHistory(rescueId) {
    try {
      const journeyKey = `journey:${rescueId}`;
      const waypoints = await redisClient.lRange(journeyKey, 0, -1);

      return waypoints.map((wp) => JSON.parse(wp));
    } catch (error) {
      logger.error('Failed to get journey history:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(coords1, coords2) {
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;

    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Format ETA as human-readable string
   */
  formatETA(minutes) {
    if (minutes < 1) return 'Less than 1 min';
    if (minutes === 1) return '1 min';
    if (minutes < 60) return `${minutes} mins`;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} mins`;
  }

  /**
   * Batch update driver locations (for high-frequency updates)
   */
  async batchUpdateLocations(updates) {
    try {
      const operations = [];

      for (const update of updates) {
        const { driverId, latitude, longitude, heading, speed } = update;

        operations.push({
          updateOne: {
            filter: { userId: driverId },
            update: {
              $set: {
                currentLocation: {
                  type: 'Point',
                  coordinates: [longitude, latitude],
                },
                lastLocationUpdate: new Date(),
                ...(heading !== null && { heading }),
                ...(speed !== null && { speed }),
              },
            },
          },
        });

        // Cache each location
        const cacheKey = `driver:location:${driverId}`;
        await redisClient.set(
          cacheKey,
          JSON.stringify({ latitude, longitude, heading, speed, timestamp: Date.now() }),
          300
        );

        // Update geo index
        await redisClient.geoAdd('drivers:locations', {
          longitude,
          latitude,
          member: driverId.toString(),
        });
      }

      if (operations.length > 0) {
        await DriverProfile.bulkWrite(operations);
      }

      logger.info('Batch location update completed', { count: updates.length });

      return { success: true, updated: updates.length };
    } catch (error) {
      logger.error('Batch location update failed:', error);
      throw error;
    }
  }

  /**
   * Clean up stale driver locations
   */
  async cleanupStaleLocations(maxAgeMinutes = 15) {
    try {
      const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

      const result = await DriverProfile.updateMany(
        {
          lastLocationUpdate: { $lt: cutoffTime },
          isOnline: true,
        },
        {
          $set: { isOnline: false },
        }
      );

      logger.info('Cleaned up stale locations', {
        updated: result.modifiedCount,
        maxAgeMinutes,
      });

      return result.modifiedCount;
    } catch (error) {
      logger.error('Failed to cleanup stale locations:', error);
      return 0;
    }
  }
}

export default new LocationService();
