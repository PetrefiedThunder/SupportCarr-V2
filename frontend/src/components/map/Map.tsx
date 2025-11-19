import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapStore } from '@/store/mapStore';
import { Spinner } from '@/components/ui';

// Set Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

/**
 * Map Props
 */
export interface MapProps {
  /**
   * Initial center coordinates [longitude, latitude]
   */
  initialCenter?: [number, number];

  /**
   * Initial zoom level
   */
  initialZoom?: number;

  /**
   * Map height (CSS value)
   */
  height?: string;

  /**
   * Whether to show navigation controls
   */
  showControls?: boolean;

  /**
   * Custom className for styling
   */
  className?: string;
}

/**
 * Map Component
 *
 * Mapbox GL JS integration with Zustand state management
 */
export const Map: React.FC<MapProps> = ({
  initialCenter = [-122.4194, 37.7749], // San Francisco
  initialZoom = 12,
  height = '500px',
  showControls = true,
  className = '',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const { viewState, markers, setMap } = useMapStore();

  /**
   * Initialize map on mount
   */
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!mapboxgl.accessToken) {
      console.error('Mapbox access token is not set');
      setHasError(true);
      return;
    }

    try {
      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: initialCenter,
        zoom: initialZoom,
      });

      // Add navigation controls
      if (showControls) {
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      }

      // Add geolocate control
      const geolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      });

      map.current.addControl(geolocateControl, 'top-right');

      // Handle map load
      map.current.on('load', () => {
        setIsLoaded(true);
        if (map.current) {
          setMap(map.current);
        }
      });

      // Handle errors
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setHasError(true);
      });
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setHasError(true);
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      markersRef.current.clear();
    };
  }, [initialCenter, initialZoom, showControls, setMap]);

  /**
   * Update map view when viewState changes
   */
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    map.current.flyTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      essential: true,
    });
  }, [viewState, isLoaded]);

  /**
   * Update markers when they change
   */
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Remove markers that no longer exist
    markersRef.current.forEach((marker, id) => {
      if (!markers.find((m) => m.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    markers.forEach((markerData) => {
      const existingMarker = markersRef.current.get(markerData.id);

      if (existingMarker) {
        // Update position
        existingMarker.setLngLat([
          markerData.position.longitude,
          markerData.position.latitude,
        ]);
      } else {
        // Create new marker
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.innerHTML = markerData.icon || '📍';
        el.style.fontSize = '24px';

        const marker = new mapboxgl.Marker({
          element: el,
          color: markerData.color || '#3b82f6',
        })
          .setLngLat([markerData.position.longitude, markerData.position.latitude])
          .setPopup(
            markerData.popup
              ? new mapboxgl.Popup({ offset: 25 }).setHTML(markerData.popup)
              : undefined,
          )
          .addTo(map.current!);

        markersRef.current.set(markerData.id, marker);
      }
    });
  }, [markers, isLoaded]);

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <p className="text-gray-600">
            Map failed to load. Please check your Mapbox token.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div ref={mapContainer} className="h-full w-full rounded-lg" />

      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <Spinner size="lg" label="Loading map..." />
        </div>
      )}
    </div>
  );
};

Map.displayName = 'Map';
