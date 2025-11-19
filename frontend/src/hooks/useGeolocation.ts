import { useState, useEffect, useCallback } from 'react';
import type { GeoPoint } from '@/types';

/**
 * Geolocation State
 */
interface GeolocationState {
  position: GeoPoint | null;
  error: GeolocationPositionError | null;
  isLoading: boolean;
}

/**
 * Geolocation Options
 */
interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

/**
 * Geolocation Hook
 *
 * Get current user location
 */
export function useGeolocation(options: GeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watch = false,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: true,
  });

  const [watchId, setWatchId] = useState<number | null>(null);

  /**
   * Success callback
   */
  const onSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      position: {
        type: 'Point',
        coordinates: [position.coords.longitude, position.coords.latitude],
      },
      error: null,
      isLoading: false,
    });
  }, []);

  /**
   * Error callback
   */
  const onError = useCallback((error: GeolocationPositionError) => {
    setState({
      position: null,
      error,
      isLoading: false,
    });
  }, []);

  /**
   * Request location
   */
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({
        position: null,
        error: {
          code: 0,
          message: 'Geolocation is not supported by your browser',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError,
        isLoading: false,
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    };

    if (watch) {
      const id = navigator.geolocation.watchPosition(onSuccess, onError, geoOptions);
      setWatchId(id);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, geoOptions);
    }
  }, [enableHighAccuracy, timeout, maximumAge, watch, onSuccess, onError]);

  /**
   * Clear watch
   */
  const clearWatch = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  /**
   * Start tracking on mount
   */
  useEffect(() => {
    requestLocation();

    return () => {
      clearWatch();
    };
  }, [requestLocation, clearWatch]);

  return {
    position: state.position,
    error: state.error,
    isLoading: state.isLoading,
    requestLocation,
    clearWatch,
  };
}
