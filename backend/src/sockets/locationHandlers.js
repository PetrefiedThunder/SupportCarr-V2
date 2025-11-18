import locationService from '../services/locationService.js';
import logger from '../utils/logger.js';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Socket.io handlers for real-time location tracking
 */
export const registerLocationHandlers = (io, socket) => {
  /**
   * Driver joins their location room
   */
  socket.on('driver:location:subscribe', async (data) => {
    try {
      const { driverId } = data;

      if (!driverId || driverId !== socket.userId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      const room = `driver:${driverId}:location`;
      socket.join(room);

      logger.debug('Driver subscribed to location updates', { driverId, socketId: socket.id });

      socket.emit('driver:location:subscribed', { room });
    } catch (error) {
      logger.error('Failed to subscribe to driver location:', error);
      socket.emit('error', { message: 'Failed to subscribe to location updates' });
    }
  });

  /**
   * Real-time location update from driver
   */
  socket.on('driver:location:update', async (data) => {
    try {
      const { latitude, longitude, heading, speed } = data;
      const driverId = socket.userId;

      if (!driverId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Validate data
      if (!latitude || !longitude) {
        socket.emit('error', { message: 'Invalid location data' });
        return;
      }

      // Update location
      const location = await locationService.updateDriverLocation(
        driverId,
        parseFloat(latitude),
        parseFloat(longitude),
        heading !== undefined ? parseFloat(heading) : null,
        speed !== undefined ? parseFloat(speed) : null
      );

      // Broadcast to all subscribers (active rescue riders)
      io.to(`driver:${driverId}:tracking`).emit('driver:location:updated', {
        driverId,
        ...location,
      });

      // Acknowledge to driver
      socket.emit('driver:location:acknowledged', {
        timestamp: location.timestamp,
      });
    } catch (error) {
      logger.error('Failed to update driver location via socket:', error);
      socket.emit('error', { message: 'Failed to update location' });
    }
  });

  /**
   * Rider subscribes to track specific driver
   */
  socket.on('rider:track:subscribe', async (data) => {
    try {
      const { driverId, rescueId } = data;
      const riderId = socket.userId;

      if (!riderId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // TODO: Verify rider has active rescue with this driver

      const room = `driver:${driverId}:tracking`;
      socket.join(room);

      // Send current location immediately
      const currentLocation = await locationService.getDriverLocation(driverId);
      if (currentLocation) {
        socket.emit('driver:location:updated', {
          driverId,
          ...currentLocation,
        });
      }

      // Send journey data if available
      if (rescueId) {
        const journeyData = await locationService.trackRescueJourney(rescueId, driverId);
        if (journeyData) {
          socket.emit('journey:data', journeyData);
        }
      }

      logger.debug('Rider subscribed to driver tracking', {
        riderId,
        driverId,
        rescueId,
        socketId: socket.id,
      });

      socket.emit('rider:track:subscribed', { driverId, room });
    } catch (error) {
      logger.error('Failed to subscribe to driver tracking:', error);
      socket.emit('error', { message: 'Failed to track driver' });
    }
  });

  /**
   * Unsubscribe from driver tracking
   */
  socket.on('rider:track:unsubscribe', (data) => {
    try {
      const { driverId } = data;
      const room = `driver:${driverId}:tracking`;

      socket.leave(room);

      logger.debug('Rider unsubscribed from driver tracking', {
        userId: socket.userId,
        driverId,
        socketId: socket.id,
      });

      socket.emit('rider:track:unsubscribed', { driverId });
    } catch (error) {
      logger.error('Failed to unsubscribe from driver tracking:', error);
    }
  });

  /**
   * Request journey update
   */
  socket.on('journey:request', async (data) => {
    try {
      const { rescueId } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const journeyData = await locationService.trackRescueJourney(rescueId, userId);

      if (journeyData) {
        socket.emit('journey:data', journeyData);
      } else {
        socket.emit('journey:unavailable', { rescueId });
      }
    } catch (error) {
      logger.error('Failed to get journey data:', error);
      socket.emit('error', { message: 'Failed to get journey data' });
    }
  });

  /**
   * Nearby drivers search (real-time)
   */
  socket.on('location:nearby:search', async (data) => {
    try {
      const { latitude, longitude, radius = 10 } = data;

      if (!latitude || !longitude) {
        socket.emit('error', { message: 'Invalid coordinates' });
        return;
      }

      const drivers = await locationService.findNearbyDrivers(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(radius)
      );

      socket.emit('location:nearby:result', {
        drivers: drivers.map((d) => ({
          driverId: d.userId._id,
          name: `${d.userId.firstName} ${d.userId.lastName}`,
          distance: d.distance,
          rating: d.rating.average,
          vehicleType: d.vehicle?.type,
        })),
        count: drivers.length,
      });
    } catch (error) {
      logger.error('Failed to search nearby drivers:', error);
      socket.emit('error', { message: 'Failed to search nearby drivers' });
    }
  });

  /**
   * Handle disconnect
   */
  socket.on('disconnect', () => {
    logger.debug('Location socket disconnected', {
      userId: socket.userId,
      socketId: socket.id,
    });
  });
};

/**
 * Emit location update to rescue participants
 */
export const emitRescueLocationUpdate = (io, rescueId, driverId, location) => {
  try {
    io.to(`rescue:${rescueId}`).emit('driver:location:updated', {
      rescueId,
      driverId,
      ...location,
    });

    logger.debug('Emitted rescue location update', { rescueId, driverId });
  } catch (error) {
    logger.error('Failed to emit rescue location update:', error);
  }
};

/**
 * Broadcast ETA updates
 */
export const broadcastETAUpdate = (io, rescueId, eta) => {
  try {
    io.to(`rescue:${rescueId}`).emit('journey:eta:updated', {
      rescueId,
      ...eta,
    });

    logger.debug('Broadcasted ETA update', { rescueId, eta: eta.etaMinutes });
  } catch (error) {
    logger.error('Failed to broadcast ETA update:', error);
  }
};
