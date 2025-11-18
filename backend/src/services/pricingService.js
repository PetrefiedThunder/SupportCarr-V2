import { RescueRequest, DriverProfile, PromoCode } from '../models/index.js';
import config from '../config/index.js';
import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';

class PricingService {
  /**
   * Calculate rescue price
   */
  async calculateRescuePrice(pickupLocation, dropoffLocation, options = {}) {
    const { promoCode, scheduledFor, urgentRequest } = options;

    // Calculate distance (simplified - in production use Google Maps Distance Matrix)
    const distance = this.calculateDistance(
      pickupLocation.coordinates,
      dropoffLocation.coordinates
    );

    // Base price
    let basePrice = config.business.baseRescuePrice;

    // Distance price
    const distancePrice = distance * config.business.pricePerKm;

    // Subtotal before multipliers
    let subtotal = basePrice + distancePrice;

    // Surge multiplier
    const surgeMultiplier = await this.getSurgeMultiplier(pickupLocation.coordinates);

    // Time-based pricing (night/weekend premium)
    const timeMultiplier = this.getTimeMultiplier(scheduledFor || new Date());

    // Urgent request premium
    const urgentMultiplier = urgentRequest ? 1.5 : 1.0;

    // Apply multipliers
    subtotal = subtotal * surgeMultiplier * timeMultiplier * urgentMultiplier;

    // Apply promo code
    let discount = 0;
    if (promoCode) {
      const promo = await PromoCode.findByCode(promoCode);
      if (promo && promo.isValid()) {
        discount = promo.calculateDiscount(subtotal);
      }
    }

    // Calculate platform fee
    const platformFee = (subtotal - discount) * (config.stripe.platformFeePercent / 100);

    // Calculate total
    const total = subtotal - discount;

    // Calculate driver payout
    const driverPayout = total - platformFee;

    return {
      basePrice,
      distancePrice,
      distance,
      surgeMultiplier,
      timeMultiplier,
      urgentMultiplier,
      subtotal,
      discount,
      promoCode: promoCode || null,
      platformFee,
      total,
      driverPayout,
      breakdown: {
        base: basePrice,
        distance: distancePrice,
        surge: subtotal * (surgeMultiplier - 1),
        timePremium: subtotal * (timeMultiplier - 1),
        urgentPremium: subtotal * (urgentMultiplier - 1),
      },
    };
  }

  /**
   * Calculate distance between two points (Haversine formula)
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
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal
  }

  toRad(degrees) {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Get surge multiplier for location
   */
  async getSurgeMultiplier(coordinates) {
    if (!config.business.surgePricingEnabled) {
      return 1.0;
    }

    try {
      // Get surge data from cache
      const surgeKey = `surge:${this.getLocationGrid(coordinates)}`;
      const surgeData = await redisClient.get(surgeKey);

      if (surgeData && surgeData.multiplier) {
        return surgeData.multiplier;
      }

      // Calculate surge based on demand/supply
      const surgeMultiplier = await this.calculateSurge(coordinates);

      // Cache for 5 minutes
      await redisClient.set(surgeKey, { multiplier: surgeMultiplier }, 300);

      return surgeMultiplier;
    } catch (error) {
      logger.error('Failed to get surge multiplier:', error);
      return 1.0; // Default to no surge on error
    }
  }

  /**
   * Calculate surge based on demand/supply ratio
   */
  async calculateSurge(coordinates) {
    const [longitude, latitude] = coordinates;
    const radiusKm = 10; // 10km radius

    // Count active rescues in area
    const activeRescues = await RescueRequest.countDocuments({
      'pickupLocation.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusKm * 1000,
        },
      },
      status: { $in: ['pending', 'accepted', 'driver_enroute'] },
    });

    // Count available drivers in area
    const availableDrivers = await DriverProfile.countDocuments({
      isAvailable: true,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusKm * 1000,
        },
      },
    });

    // Calculate demand/supply ratio
    const demandSupplyRatio = availableDrivers > 0 ? activeRescues / availableDrivers : 3;

    // Convert ratio to surge multiplier (1.0 - 3.0)
    let surgeMultiplier = 1.0;

    if (demandSupplyRatio > 2) {
      surgeMultiplier = 3.0; // Maximum surge
    } else if (demandSupplyRatio > 1.5) {
      surgeMultiplier = 2.5;
    } else if (demandSupplyRatio > 1) {
      surgeMultiplier = 2.0;
    } else if (demandSupplyRatio > 0.7) {
      surgeMultiplier = 1.5;
    } else if (demandSupplyRatio > 0.4) {
      surgeMultiplier = 1.25;
    }

    logger.info('Surge calculated', {
      coordinates,
      activeRescues,
      availableDrivers,
      demandSupplyRatio,
      surgeMultiplier,
    });

    return surgeMultiplier;
  }

  /**
   * Get location grid cell (for caching surge data)
   */
  getLocationGrid(coordinates, gridSize = 0.1) {
    const [lon, lat] = coordinates;
    const gridLon = Math.floor(lon / gridSize) * gridSize;
    const gridLat = Math.floor(lat / gridSize) * gridSize;
    return `${gridLat},${gridLon}`;
  }

  /**
   * Get time-based multiplier
   */
  getTimeMultiplier(date) {
    const hour = date.getHours();
    const day = date.getDay();

    // Night hours (10 PM - 6 AM) - 1.5x
    if (hour >= 22 || hour < 6) {
      return 1.5;
    }

    // Weekend - 1.2x
    if (day === 0 || day === 6) {
      return 1.2;
    }

    // Peak hours (7-9 AM, 5-7 PM) - 1.3x
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return 1.3;
    }

    return 1.0;
  }

  /**
   * Estimate arrival time
   */
  async estimateArrivalTime(driverLocation, pickupLocation) {
    const distance = this.calculateDistance(
      driverLocation.coordinates,
      pickupLocation.coordinates
    );

    // Assume average speed of 40 km/h in city
    const estimatedMinutes = Math.ceil((distance / 40) * 60);

    return {
      distance,
      estimatedMinutes,
      estimatedArrival: new Date(Date.now() + estimatedMinutes * 60 * 1000),
    };
  }

  /**
   * Apply promo code to rescue
   */
  async applyPromoCode(rescueId, promoCode, userId) {
    const rescue = await RescueRequest.findById(rescueId);
    if (!rescue) {
      throw new Error('Rescue not found');
    }

    const promo = await PromoCode.findByCode(promoCode);
    if (!promo) {
      throw new Error('Invalid promo code');
    }

    if (!promo.canUserUse(userId)) {
      throw new Error('Promo code cannot be used');
    }

    const discount = promo.calculateDiscount(rescue.pricing.subtotal);

    // Update rescue pricing
    rescue.pricing.discount = discount;
    rescue.pricing.total = rescue.pricing.subtotal - discount;
    rescue.pricing.driverPayout = rescue.pricing.total - rescue.pricing.platformFee;

    await rescue.save();

    // Mark promo as used
    await promo.use(userId, rescueId, discount);

    return { rescue, discount };
  }
}

export default new PricingService();
