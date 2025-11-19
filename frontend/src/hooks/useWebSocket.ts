import { useEffect, useCallback } from 'react';
import { wsClient } from '@/lib/websocket';
import { useRescueStore } from '@/store/rescueStore';
import { useDriverStore } from '@/store/driverStore';
import { useUIStore } from '@/store/uiStore';
import type {
  RescueStatusUpdateEvent,
  DriverLocationUpdateEvent,
  RescueRequest,
} from '@/types';

/**
 * WebSocket Hook for Riders
 *
 * Subscribes to rescue-related WebSocket events
 */
export function useRescueWebSocket(rescueId?: string) {
  const updateRescueStatus = useRescueStore((state) => state.updateRescueStatus);
  const updateDriverLocation = useRescueStore((state) => state.updateDriverLocation);
  const showToast = useUIStore((state) => state.showToast);

  useEffect(() => {
    if (!rescueId) return;

    // Join rescue room
    wsClient.joinRoom(`rescue:${rescueId}`);

    // Subscribe to rescue status updates
    const unsubscribeStatus = wsClient.on<RescueStatusUpdateEvent>(
      'rescue:status_update',
      (data) => {
        if (data.rescueId === rescueId) {
          // Update rescue status in store
          // Note: This requires fetching the full rescue object
          // In a real implementation, the event should contain the full rescue
          showToast({
            type: 'info',
            message: `Rescue status updated to: ${data.status}`,
          });
        }
      },
    );

    // Subscribe to driver location updates
    const unsubscribeLocation = wsClient.on<DriverLocationUpdateEvent>(
      'driver:location_update',
      (data) => {
        if (data.rescueId === rescueId) {
          updateDriverLocation({
            latitude: data.location.coordinates[1],
            longitude: data.location.coordinates[0],
          });
        }
      },
    );

    // Subscribe to driver assigned
    const unsubscribeAssigned = wsClient.on('rescue:driver_assigned', (data: unknown) => {
      showToast({
        type: 'success',
        message: 'A driver has been assigned to your rescue!',
      });
    });

    // Subscribe to rescue completed
    const unsubscribeCompleted = wsClient.on('rescue:completed', (data: unknown) => {
      showToast({
        type: 'success',
        message: 'Your rescue has been completed!',
      });
    });

    // Cleanup
    return () => {
      wsClient.leaveRoom(`rescue:${rescueId}`);
      unsubscribeStatus();
      unsubscribeLocation();
      unsubscribeAssigned();
      unsubscribeCompleted();
    };
  }, [rescueId, updateRescueStatus, updateDriverLocation, showToast]);
}

/**
 * WebSocket Hook for Drivers
 *
 * Subscribes to driver-related WebSocket events
 */
export function useDriverWebSocket(driverId?: string) {
  const fetchAvailableRescues = useDriverStore((state) => state.fetchAvailableRescues);
  const showToast = useUIStore((state) => state.showToast);

  useEffect(() => {
    if (!driverId) return;

    // Join driver room
    wsClient.joinRoom(`driver:${driverId}`);

    // Subscribe to new rescue requests
    const unsubscribeNewRescue = wsClient.on('rescue:new_nearby', (data: unknown) => {
      showToast({
        type: 'info',
        message: 'New rescue request nearby!',
      });

      // Refresh available rescues
      fetchAvailableRescues();
    });

    // Subscribe to rescue matched (assigned to this driver)
    const unsubscribeMatched = wsClient.on('rescue:matched', (data: unknown) => {
      showToast({
        type: 'success',
        message: 'You have been matched with a rescue request!',
        duration: 10000,
      });
    });

    // Cleanup
    return () => {
      wsClient.leaveRoom(`driver:${driverId}`);
      unsubscribeNewRescue();
      unsubscribeMatched();
    };
  }, [driverId, fetchAvailableRescues, showToast]);
}

/**
 * WebSocket Connection Hook
 *
 * Manages WebSocket connection lifecycle
 */
export function useWebSocketConnection() {
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect to WebSocket
      wsClient.connect();

      // Join user room for personal notifications
      wsClient.joinRoom(`user:${user._id}`);

      return () => {
        // Leave user room
        wsClient.leaveRoom(`user:${user._id}`);

        // Disconnect from WebSocket
        wsClient.disconnect();
      };
    }
  }, [isAuthenticated, user]);

  const isConnected = wsClient.isConnected();

  return { isConnected };
}

// Import useAuthStore
import { useAuthStore } from '@/store/authStore';
