import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { socket } from '../../services/socketService';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN';

const NearbyDriversMap = ({ userLocation, onDriverSelect, searchRadius = 5 }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const userMarker = useRef(null);
  const driverMarkers = useRef({});

  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    const center = userLocation
      ? [userLocation.longitude, userLocation.latitude]
      : [-122.4194, 37.7749];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);

      // Add circle to show search radius
      map.current.addSource('search-radius', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: center,
          },
        },
      });

      map.current.addLayer({
        id: 'search-radius-fill',
        type: 'circle',
        source: 'search-radius',
        paint: {
          'circle-radius': {
            stops: [
              [0, 0],
              [20, metersToPixels(searchRadius * 1000, center[1], 20)],
            ],
            base: 2,
          },
          'circle-color': '#3b82f6',
          'circle-opacity': 0.1,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#3b82f6',
          'circle-stroke-opacity': 0.3,
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

  // Add user marker
  useEffect(() => {
    if (!mapLoaded || !map.current || !userLocation) return;

    if (!userMarker.current) {
      const el = document.createElement('div');
      el.className = 'user-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#3b82f6';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';

      userMarker.current = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 15 }).setHTML(
            '<div class="p-2"><p class="font-semibold">Your Location</p></div>'
          )
        )
        .addTo(map.current);

      map.current.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 13,
        duration: 1000,
      });
    }
  }, [mapLoaded, userLocation]);

  // Update driver markers
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    // Remove old markers
    Object.values(driverMarkers.current).forEach((marker) => marker.remove());
    driverMarkers.current = {};

    // Add new markers
    drivers.forEach((driver) => {
      const el = document.createElement('div');
      el.className = 'driver-marker-pin';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div class="relative">
          <div class="w-10 h-10 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
            </svg>
          </div>
          ${driver.distance ? `<div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-semibold shadow whitespace-nowrap">${driver.distance.toFixed(1)} km</div>` : ''}
        </div>
      `;

      el.addEventListener('click', () => {
        setSelectedDriver(driver);
        if (onDriverSelect) {
          onDriverSelect(driver);
        }
      });

      const coordinates = driver.currentLocation?.coordinates ||
        [driver.currentLocation?.longitude, driver.currentLocation?.latitude];

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat(coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-3">
              <p class="font-semibold text-gray-900">${driver.userId?.firstName || 'Driver'}</p>
              <div class="mt-2 space-y-1">
                <p class="text-sm text-gray-600">
                  <span class="font-medium">Rating:</span> ${driver.rating?.average?.toFixed(1) || 'N/A'} ⭐
                </p>
                <p class="text-sm text-gray-600">
                  <span class="font-medium">Distance:</span> ${driver.distance?.toFixed(1) || 'N/A'} km
                </p>
                <p class="text-sm text-gray-600">
                  <span class="font-medium">Vehicle:</span> ${driver.vehicle?.type || 'N/A'}
                </p>
              </div>
              <button class="mt-3 w-full bg-blue-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-600">
                Request This Driver
              </button>
            </div>
          `)
        )
        .addTo(map.current);

      driverMarkers.current[driver._id || driver.userId._id] = marker;
    });

    // Fit map to show all drivers
    if (drivers.length > 0 && userLocation) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([userLocation.longitude, userLocation.latitude]);

      drivers.forEach((driver) => {
        const coords = driver.currentLocation?.coordinates ||
          [driver.currentLocation?.longitude, driver.currentLocation?.latitude];
        if (coords) {
          bounds.extend(coords);
        }
      });

      map.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 100, right: 100 },
        maxZoom: 14,
      });
    }
  }, [mapLoaded, drivers, userLocation, onDriverSelect]);

  // Search for nearby drivers
  useEffect(() => {
    if (!userLocation) return;

    const searchNearby = () => {
      socket.emit('location:nearby:search', {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius: searchRadius,
      });
    };

    const handleNearbyResult = (data) => {
      setDrivers(data.drivers || []);
    };

    socket.on('location:nearby:result', handleNearbyResult);

    // Initial search
    searchNearby();

    // Refresh every 10 seconds
    const interval = setInterval(searchNearby, 10000);

    return () => {
      socket.off('location:nearby:result', handleNearbyResult);
      clearInterval(interval);
    };
  }, [userLocation, searchRadius]);

  // Helper function to convert meters to pixels at given latitude
  const metersToPixels = (meters, latitude, zoom) => {
    const earthCircumference = 40075017;
    const latitudeRadians = latitude * (Math.PI / 180);
    return (meters / earthCircumference) * Math.pow(2, zoom + 8) / Math.cos(latitudeRadians);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />

      {/* Driver count overlay */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <p className="text-sm text-gray-500">Available Drivers</p>
        <p className="text-3xl font-bold text-gray-900">{drivers.length}</p>
        <p className="text-xs text-gray-400">within {searchRadius} km</p>
      </div>

      {/* Refresh button */}
      <button
        onClick={() => {
          if (userLocation) {
            socket.emit('location:nearby:search', {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              radius: searchRadius,
            });
          }
        }}
        className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      {/* Selected driver card */}
      {selectedDriver && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 max-w-sm w-full mx-4">
          <div className="flex items-start space-x-3">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900">
                {selectedDriver.userId?.firstName || 'Driver'}
              </h3>
              <div className="mt-1 space-y-1">
                <p className="text-sm text-gray-600">
                  ⭐ {selectedDriver.rating?.average?.toFixed(1) || 'N/A'} ({selectedDriver.rating?.count || 0} ratings)
                </p>
                <p className="text-sm text-gray-600">
                  📍 {selectedDriver.distance?.toFixed(1) || 'N/A'} km away
                </p>
                <p className="text-sm text-gray-600">
                  🚗 {selectedDriver.vehicle?.type || 'Vehicle'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => onDriverSelect && onDriverSelect(selectedDriver)}
            className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition"
          >
            Request This Driver
          </button>
        </div>
      )}
    </div>
  );
};

export default NearbyDriversMap;
