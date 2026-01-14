import { RescueRequest, DriverProfile, PaymentRecord } from '../models/index.js';
import logger from '../utils/logger.js';
import redisClient from '../config/redis.js';

/**
 * Machine Learning Service
 * Handles demand prediction, fraud detection, and route optimization
 */
class MLService {
  /**
   * Predict demand for next hour by location
   */
  async predictDemand(latitude, longitude, datetime = new Date()) {
    try {
      const cacheKey = `ml:demand:${latitude.toFixed(2)}:${longitude.toFixed(2)}:${datetime.getHours()}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return cached;
      }

      // Get historical data for this location and time
      const historicalData = await this.getHistoricalDemand(latitude, longitude, datetime);

      // Simple time-series prediction using moving average
      const prediction = this.calculateMovingAverage(historicalData);

      // Apply seasonal adjustments
      const adjusted = this.applySeasonalAdjustments(prediction, datetime);

      // Cache for 15 minutes
      await redisClient.set(cacheKey, adjusted, 900);

      logger.info('Demand predicted', {
        location: { latitude, longitude },
        predicted: adjusted.predictedRescues,
      });

      return adjusted;
    } catch (error) {
      logger.error('Demand prediction failed:', error);
      return { predictedRescues: 5, confidence: 0 }; // Safe default
    }
  }

  /**
   * Get historical demand data
   */
  async getHistoricalDemand(latitude, longitude, datetime) {
    const dayOfWeek = datetime.getDay();
    const hour = datetime.getHours();

    // Get data for same day/hour over past 8 weeks
    const data = [];
    for (let i = 0; i < 8; i++) {
      const targetDate = new Date(datetime);
      targetDate.setDate(targetDate.getDate() - (7 * i));
      targetDate.setHours(hour, 0, 0, 0);

      const nextHour = new Date(targetDate);
      nextHour.setHours(hour + 1);

      const count = await RescueRequest.countDocuments({
        'pickupLocation.location': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: 5000, // 5km radius
          },
        },
        createdAt: {
          $gte: targetDate,
          $lt: nextHour,
        },
      });

      data.push({ date: targetDate, count });
    }

    return data;
  }

  /**
   * Calculate moving average
   */
  calculateMovingAverage(data) {
    if (data.length === 0) {
      return { predictedRescues: 5, confidence: 0 };
    }

    // Weighted moving average (more recent data has higher weight)
    let totalWeighted = 0;
    let totalWeight = 0;

    data.forEach((point, index) => {
      const weight = index + 1; // More recent = higher weight
      totalWeighted += point.count * weight;
      totalWeight += weight;
    });

    const predicted = totalWeighted / totalWeight;

    // Calculate confidence based on data variance
    const mean = data.reduce((sum, p) => sum + p.count, 0) / data.length;
    const variance = data.reduce((sum, p) => sum + Math.pow(p.count - mean, 2), 0) / data.length;
    const confidence = Math.max(0, Math.min(1, 1 - (variance / (mean + 1))));

    return {
      predictedRescues: Math.round(predicted),
      confidence,
      historicalAverage: Math.round(mean),
    };
  }

  /**
   * Apply seasonal adjustments
   */
  applySeasonalAdjustments(prediction, datetime) {
    let adjusted = { ...prediction };
    const hour = datetime.getHours();
    const dayOfWeek = datetime.getDay();

    // Peak hours multiplier
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      adjusted.predictedRescues = Math.round(adjusted.predictedRescues * 1.5);
      adjusted.peakHourAdjustment = 1.5;
    }

    // Weekend multiplier
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      adjusted.predictedRescues = Math.round(adjusted.predictedRescues * 1.3);
      adjusted.weekendAdjustment = 1.3;
    }

    // Night hours reduction
    if (hour >= 22 || hour <= 6) {
      adjusted.predictedRescues = Math.round(adjusted.predictedRescues * 0.7);
      adjusted.nightAdjustment = 0.7;
    }

    return adjusted;
  }

  /**
   * Detect potentially fraudulent rescue requests
   */
  async detectFraud(rescueRequest, userId) {
    try {
      const signals = [];
      let fraudScore = 0;

      // Check 1: Multiple requests in short time
      const recentRequests = await RescueRequest.countDocuments({
        riderId: userId,
        createdAt: { $gte: new Date(Date.now() - 3600000) }, // Last hour
      });

      if (recentRequests > 3) {
        fraudScore += 30;
        signals.push('multiple_requests_hour');
      }

      // Check 2: Unusual distance
      const distance = this.calculateDistance(
        rescueRequest.pickupLocation.location.coordinates,
        rescueRequest.dropoffLocation.location.coordinates
      );

      if (distance > 100) {
        fraudScore += 40;
        signals.push('unusual_distance');
      }

      // Check 3: New user with high-value request
      const userAge = Date.now() - new Date(rescueRequest.riderId.createdAt).getTime();
      const isNewUser = userAge < 24 * 3600000; // Less than 24 hours

      if (isNewUser && rescueRequest.pricing.total > 100) {
        fraudScore += 25;
        signals.push('new_user_high_value');
      }

      // Check 4: Pattern of cancellations
      const cancelledCount = await RescueRequest.countDocuments({
        riderId: userId,
        status: { $regex: /^cancelled/ },
      });

      const totalCount = await RescueRequest.countDocuments({ riderId: userId });

      if (totalCount > 5 && cancelledCount / totalCount > 0.5) {
        fraudScore += 35;
        signals.push('high_cancellation_rate');
      }

      // Check 5: Velocity check (rapid account creation + requests)
      if (isNewUser && recentRequests > 1) {
        fraudScore += 20;
        signals.push('velocity_abuse');
      }

      const result = {
        fraudScore,
        signals,
        recommendation: this.getFraudRecommendation(fraudScore),
        timestamp: new Date(),
      };

      logger.info('Fraud detection completed', {
        rescueId: rescueRequest._id,
        fraudScore,
        signals,
      });

      return result;
    } catch (error) {
      logger.error('Fraud detection failed:', error);
      return { fraudScore: 0, signals: [], recommendation: 'allow' };
    }
  }

  /**
   * Get fraud recommendation
   */
  getFraudRecommendation(score) {
    if (score >= 80) return 'block';
    if (score >= 50) return 'review';
    if (score >= 30) return 'monitor';
    return 'allow';
  }

  /**
   * Calculate distance between coordinates
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
   * Optimize route for driver
   */
  async optimizeRoute(pickupLocation, dropoffLocation, trafficData = null) {
    try {
      // In production, integrate with Google Maps Directions API or Mapbox
      // For now, we'll use a simplified heuristic

      const directDistance = this.calculateDistance(
        pickupLocation.coordinates,
        dropoffLocation.coordinates
      );

      // Estimate time based on distance and assumed speed
      const avgSpeed = 40; // km/h
      const baseTime = (directDistance / avgSpeed) * 60; // minutes

      // Add traffic multiplier
      const trafficMultiplier = this.getTrafficMultiplier(new Date());
      const estimatedTime = Math.round(baseTime * trafficMultiplier);

      return {
        distance: Math.round(directDistance * 10) / 10,
        estimatedTime,
        trafficMultiplier,
        route: {
          start: pickupLocation,
          end: dropoffLocation,
          waypoints: [], // Would be populated by routing service
        },
        alternativeRoutes: [], // Would be populated by routing service
      };
    } catch (error) {
      logger.error('Route optimization failed:', error);
      return null;
    }
  }

  /**
   * Get traffic multiplier based on time
   */
  getTrafficMultiplier(datetime) {
    const hour = datetime.getHours();
    const dayOfWeek = datetime.getDay();

    // Rush hour
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return dayOfWeek >= 1 && dayOfWeek <= 5 ? 1.5 : 1.2;
    }

    // Weekend traffic
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 1.1;
    }

    // Off-peak
    return 1.0;
  }

  /**
   * Recommend drivers based on ML scoring
   */
  async recommendDrivers(rescueRequest, availableDrivers) {
    try {
      const scoredDrivers = await Promise.all(
        availableDrivers.map(async (driver) => {
          const score = await this.scoreDriver(driver, rescueRequest);
          return { driver, score };
        })
      );

      // Sort by score descending
      scoredDrivers.sort((a, b) => b.score - a.score);

      logger.info('Drivers recommended', {
        rescueId: rescueRequest._id,
        topDriverScore: scoredDrivers[0]?.score,
      });

      return scoredDrivers.map((sd) => sd.driver);
    } catch (error) {
      logger.error('Driver recommendation failed:', error);
      return availableDrivers; // Return unsorted on error
    }
  }

  /**
   * Score driver for a rescue
   */
  async scoreDriver(driver, rescueRequest) {
    let score = 0;

    // Factor 1: Distance (closer is better) - 40 points
    const distance = this.calculateDistance(
      driver.currentLocation.coordinates,
      rescueRequest.pickupLocation.location.coordinates
    );
    score += Math.max(0, 40 - distance * 2);

    // Factor 2: Rating - 30 points
    score += (driver.rating.average / 5) * 30;

    // Factor 3: Completion rate - 20 points
    score += (driver.stats.completionRate / 100) * 20;

    // Factor 4: Experience (total rescues) - 10 points
    const experienceScore = Math.min(10, (driver.stats.totalRescues / 100) * 10);
    score += experienceScore;

    // Bonus: Low response time
    if (driver.stats.averageResponseTime < 5) {
      score += 5;
    }

    return Math.round(score);
  }

  /**
   * Predict customer lifetime value (CLV)
   */
  async predictCLV(userId) {
    try {
      // Get user's rescue history
      const rescues = await RescueRequest.find({ riderId: userId, status: 'completed' });

      if (rescues.length === 0) {
        return { clv: 0, confidence: 0, segment: 'new' };
      }

      // Calculate metrics
      const totalSpent = rescues.reduce((sum, r) => sum + r.pricing.total, 0);
      const avgOrderValue = totalSpent / rescues.length;
      const daysSinceFirst = (Date.now() - rescues[0].createdAt) / (1000 * 60 * 60 * 24);
      const frequency = rescues.length / Math.max(1, daysSinceFirst / 30); // Rescues per month

      // Simple CLV prediction: AOV * frequency * 12 months * retention
      const retention = 0.7; // 70% retention assumption
      const clv = avgOrderValue * frequency * 12 * retention;

      // Segment user
      let segment = 'low';
      if (clv > 1000) segment = 'high';
      else if (clv > 500) segment = 'medium';

      return {
        clv: Math.round(clv),
        avgOrderValue: Math.round(avgOrderValue),
        frequency: Math.round(frequency * 10) / 10,
        segment,
        confidence: Math.min(1, rescues.length / 10),
      };
    } catch (error) {
      logger.error('CLV prediction failed:', error);
      return { clv: 0, confidence: 0, segment: 'unknown' };
    }
  }
}

export default new MLService();
