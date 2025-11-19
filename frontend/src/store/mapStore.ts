import { create } from 'zustand';
import type { GeoPoint } from '@/types';

/**
 * Map View State
 */
export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

/**
 * Map Marker
 */
export interface MapMarker {
  id: string;
  type: 'rider' | 'driver' | 'pickup' | 'dropoff';
  position: GeoPoint;
  label?: string;
}

/**
 * Map Store State
 */
interface MapState {
  // State
  viewState: MapViewState;
  markers: MapMarker[];
  route: GeoPoint[] | null;
  center: GeoPoint | null;
  isFollowingDriver: boolean;

  // Actions
  setViewState: (viewState: Partial<MapViewState>) => void;
  setCenter: (position: GeoPoint, zoom?: number) => void;
  addMarker: (marker: MapMarker) => void;
  removeMarker: (id: string) => void;
  updateMarkerPosition: (id: string, position: GeoPoint) => void;
  clearMarkers: () => void;
  setRoute: (route: GeoPoint[] | null) => void;
  setFollowDriver: (follow: boolean) => void;
  fitBounds: (points: GeoPoint[]) => void;
}

/**
 * Calculate center point from multiple coordinates
 */
function calculateCenter(points: GeoPoint[]): GeoPoint {
  if (points.length === 0) {
    return { type: 'Point', coordinates: [0, 0] };
  }

  const sum = points.reduce(
    (acc, point) => ({
      lng: acc.lng + point.coordinates[0],
      lat: acc.lat + point.coordinates[1],
    }),
    { lng: 0, lat: 0 },
  );

  return {
    type: 'Point',
    coordinates: [sum.lng / points.length, sum.lat / points.length],
  };
}

/**
 * Calculate appropriate zoom level based on distance
 */
function calculateZoom(distance: number): number {
  // distance in miles
  if (distance < 1) return 14;
  if (distance < 5) return 12;
  if (distance < 10) return 11;
  if (distance < 20) return 10;
  return 9;
}

/**
 * Haversine distance calculation
 */
function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 3959; // Earth's radius in miles
  const lat1 = (point1.coordinates[1] * Math.PI) / 180;
  const lat2 = (point2.coordinates[1] * Math.PI) / 180;
  const deltaLat = ((point2.coordinates[1] - point1.coordinates[1]) * Math.PI) / 180;
  const deltaLon = ((point2.coordinates[0] - point1.coordinates[0]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Map Store
 *
 * Manages map state, markers, and routes
 */
export const useMapStore = create<MapState>((set, get) => ({
  // Initial state (San Francisco)
  viewState: {
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 12,
  },
  markers: [],
  route: null,
  center: null,
  isFollowingDriver: false,

  /**
   * Set map view state
   */
  setViewState: (viewState) => {
    set((state) => ({
      viewState: { ...state.viewState, ...viewState },
    }));
  },

  /**
   * Set map center
   */
  setCenter: (position, zoom) => {
    set({
      center: position,
      viewState: {
        longitude: position.coordinates[0],
        latitude: position.coordinates[1],
        zoom: zoom ?? get().viewState.zoom,
      },
    });
  },

  /**
   * Add marker
   */
  addMarker: (marker) => {
    set((state) => ({
      markers: [...state.markers.filter((m) => m.id !== marker.id), marker],
    }));
  },

  /**
   * Remove marker
   */
  removeMarker: (id) => {
    set((state) => ({
      markers: state.markers.filter((m) => m.id !== id),
    }));
  },

  /**
   * Update marker position
   */
  updateMarkerPosition: (id, position) => {
    set((state) => ({
      markers: state.markers.map((m) => (m.id === id ? { ...m, position } : m)),
    }));

    // If following driver, update view state
    const marker = get().markers.find((m) => m.id === id);
    if (marker?.type === 'driver' && get().isFollowingDriver) {
      set({
        viewState: {
          ...get().viewState,
          longitude: position.coordinates[0],
          latitude: position.coordinates[1],
        },
      });
    }
  },

  /**
   * Clear all markers
   */
  clearMarkers: () => {
    set({ markers: [] });
  },

  /**
   * Set route
   */
  setRoute: (route) => {
    set({ route });
  },

  /**
   * Toggle driver following
   */
  setFollowDriver: (follow) => {
    set({ isFollowingDriver: follow });

    if (follow) {
      const driverMarker = get().markers.find((m) => m.type === 'driver');
      if (driverMarker) {
        set({
          viewState: {
            ...get().viewState,
            longitude: driverMarker.position.coordinates[0],
            latitude: driverMarker.position.coordinates[1],
          },
        });
      }
    }
  },

  /**
   * Fit map bounds to include all points
   */
  fitBounds: (points) => {
    if (points.length === 0) return;

    if (points.length === 1) {
      set({
        viewState: {
          longitude: points[0].coordinates[0],
          latitude: points[0].coordinates[1],
          zoom: 14,
        },
      });
      return;
    }

    // Calculate center
    const center = calculateCenter(points);

    // Calculate max distance from center
    const maxDistance = Math.max(
      ...points.map((point) => calculateDistance(center, point)),
    );

    // Calculate appropriate zoom
    const zoom = calculateZoom(maxDistance * 2);

    set({
      viewState: {
        longitude: center.coordinates[0],
        latitude: center.coordinates[1],
        zoom,
      },
    });
  },
}));

/**
 * Selectors
 */
export const useMapViewState = () => useMapStore((state) => state.viewState);
export const useMapMarkers = () => useMapStore((state) => state.markers);
export const useMapRoute = () => useMapStore((state) => state.route);
