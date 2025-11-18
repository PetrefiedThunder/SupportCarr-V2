import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { socket } from '../../services/socketService';

// Set your Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN';

const LiveTracking = ({ rescueId, driverId, pickupLocation, dropoffLocation, onETAUpdate }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const driverMarker = useRef(null);
  const pickupMarker = useRef(null);
  const dropoffMarker = useRef(null);
  const routeLine = useRef(null);

  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setETA] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Already initialized

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: pickupLocation ? [pickupLocation.longitude, pickupLocation.latitude] : [-122.4194, 37.7749],
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);

      // Add route line source
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [],
          },
        },
      });

      // Add route line layer
      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-opacity': 0.75,
        },
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add markers when map loads
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    // Pickup marker
    if (pickupLocation && !pickupMarker.current) {
      const el = document.createElement('div');
      el.className = 'pickup-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.backgroundImage = 'url(/markers/pickup.png)';
      el.style.backgroundSize = 'contain';
      el.style.cursor = 'pointer';

      pickupMarker.current = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([pickupLocation.longitude, pickupLocation.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <p class="font-semibold">Pickup Location</p>
              <p class="text-sm text-gray-600">${pickupLocation.address || 'Pickup point'}</p>
            </div>`
          )
        )
        .addTo(map.current);
    }

    // Dropoff marker
    if (dropoffLocation && !dropoffMarker.current) {
      const el = document.createElement('div');
      el.className = 'dropoff-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.backgroundImage = 'url(/markers/dropoff.png)';
      el.style.backgroundSize = 'contain';

      dropoffMarker.current = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([dropoffLocation.longitude, dropoffLocation.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <p class="font-semibold">Dropoff Location</p>
              <p class="text-sm text-gray-600">${dropoffLocation.address || 'Dropoff point'}</p>
            </div>`
          )
        )
        .addTo(map.current);
    }

    // Fit bounds to show all markers
    if (pickupLocation && dropoffLocation) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([pickupLocation.longitude, pickupLocation.latitude]);
      bounds.extend([dropoffLocation.longitude, dropoffLocation.latitude]);

      map.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 100, right: 100 },
        maxZoom: 14,
      });
    }
  }, [mapLoaded, pickupLocation, dropoffLocation]);

  // Update driver marker
  useEffect(() => {
    if (!mapLoaded || !map.current || !driverLocation) return;

    if (!driverMarker.current) {
      // Create driver marker element
      const el = document.createElement('div');
      el.className = 'driver-marker';
      el.style.width = '50px';
      el.style.height = '50px';
      el.style.backgroundImage = 'url(/markers/driver.png)';
      el.style.backgroundSize = 'contain';
      el.style.transition = 'all 0.5s ease-out';

      driverMarker.current = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
        rotationAlignment: 'map',
      })
        .setLngLat([driverLocation.longitude, driverLocation.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <p class="font-semibold">Driver</p>
              <p class="text-sm text-gray-600">En route to you</p>
            </div>`
          )
        )
        .addTo(map.current);
    } else {
      // Update existing marker with smooth transition
      driverMarker.current.setLngLat([driverLocation.longitude, driverLocation.latitude]);

      // Rotate marker based on heading
      if (driverLocation.heading !== null && driverLocation.heading !== undefined) {
        const el = driverMarker.current.getElement();
        el.style.transform = `rotate(${driverLocation.heading}deg)`;
      }
    }

    // Update route line
    if (pickupLocation) {
      updateRouteLine([driverLocation.longitude, driverLocation.latitude], [pickupLocation.longitude, pickupLocation.latitude]);
    }
  }, [driverLocation, mapLoaded, pickupLocation]);

  // Update route line on map
  const updateRouteLine = (from, to) => {
    if (!map.current || !mapLoaded) return;

    // Simple straight line (in production, use Mapbox Directions API)
    const routeData = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [from, to],
      },
    };

    map.current.getSource('route').setData(routeData);
  };

  // Subscribe to driver location updates via Socket.io
  useEffect(() => {
    if (!driverId) return;

    const handleLocationUpdate = (data) => {
      if (data.driverId === driverId) {
        setDriverLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          speed: data.speed,
          timestamp: new Date(data.timestamp),
        });
      }
    };

    const handleJourneyData = (data) => {
      if (data.rescueId === rescueId) {
        if (data.driverLocation) {
          setDriverLocation({
            latitude: data.driverLocation.latitude,
            longitude: data.driverLocation.longitude,
            heading: data.driverLocation.heading,
            speed: data.driverLocation.speed,
          });
        }

        if (data.eta) {
          setETA(data.eta);
          if (onETAUpdate) {
            onETAUpdate(data.eta);
          }
        }
      }
    };

    const handleETAUpdate = (data) => {
      if (data.rescueId === rescueId) {
        setETA(data);
        if (onETAUpdate) {
          onETAUpdate(data);
        }
      }
    };

    // Subscribe to real-time updates
    socket.on('driver:location:updated', handleLocationUpdate);
    socket.on('journey:data', handleJourneyData);
    socket.on('journey:eta:updated', handleETAUpdate);

    // Subscribe to tracking
    socket.emit('rider:track:subscribe', { driverId, rescueId });

    // Request initial journey data
    socket.emit('journey:request', { rescueId });

    return () => {
      socket.off('driver:location:updated', handleLocationUpdate);
      socket.off('journey:data', handleJourneyData);
      socket.off('journey:eta:updated', handleETAUpdate);
      socket.emit('rider:track:unsubscribe', { driverId });
    };
  }, [driverId, rescueId, onETAUpdate]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />

      {/* ETA Overlay */}
      {eta && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Driver arriving in</p>
              <p className="text-2xl font-bold text-gray-900">{eta.etaText}</p>
              <p className="text-xs text-gray-400">{eta.distance} km away</p>
            </div>
          </div>
        </div>
      )}

      {/* Live indicator */}
      {driverLocation && (
        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-2 shadow-lg">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <span>LIVE</span>
        </div>
      )}

      {/* Driver info card */}
      {driverLocation && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Your driver is on the way</p>
            <p className="text-sm text-gray-500">
              {driverLocation.speed ? `Moving at ${Math.round(driverLocation.speed)} km/h` : 'Location updating...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTracking;
