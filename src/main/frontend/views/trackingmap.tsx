import { ViewConfig } from '@vaadin/hilla-file-router/types.js';
import React, { useState, useEffect, useRef } from 'react';
import { EventRecordEndpoint } from 'Frontend/generated/endpoints.js';

export const config: ViewConfig = {
  menu: { order: 1, icon: 'line-awesome/svg/map-marked-alt-solid.svg' },
  title: 'Tracking Map',
};

// Define basemap options
const basemapOptions = [
  { id: 'osm', name: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
  { id: 'satellite', name: 'Satellite (ESRI)', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' },
  { id: 'googlesat', name: 'Google Satellite Hybrid', url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', attribution: 'Map data &copy; Google' }
];

const TrackingmapView: React.FC = function () {
  const [latitude, setLatitude] = useState('41.368918');
  const [longitude, setLongitude] = useState('2.147618');
  const [selectedBasemap, setSelectedBasemap] = useState('osm');
  const [markerCount, setMarkerCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<any>(null);
  const basemapLayersRef = useRef<{[key: string]: any}>({});
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Load Leaflet CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    // Delay initialization to ensure DOM is ready
    const initTimer = setTimeout(() => {
      // Load Leaflet JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        initMap();
      };
      document.head.appendChild(script);
    }, 1000);

    const initMap = () => {
      const mapContainer = document.getElementById('map-container');
      
      if (!mapContainer) {
        console.error('Map container not found');
        return;
      }
      
      try {
        // @ts-ignore
        const L = window.L;
        if (!L) {
          console.error('Leaflet not found on window object');
          return;
        }
        
        // Explicitly set container size - make it fill the available space
        mapContainer.style.height = '100%';
        mapContainer.style.width = '100%';
        mapContainer.style.zIndex = '0';
        mapContainer.style.position = 'relative';
        
        // Initialize map with specified options
        const map = L.map('map-container', {
          center: [41.368918, 2.147618],
          zoom: 20,
          zoomControl: true,
          attributionControl: true,
          fadeAnimation: false, // Disable animations for troubleshooting
          zoomAnimation: false  // Disable animations for troubleshooting
        });
        
        // Store map reference for use outside this function
        mapRef.current = map;
        
        console.log('Map object created');
        
        // Create basemap layers
        basemapOptions.forEach(option => {
          const layer = L.tileLayer(option.url, {
            attribution: option.attribution
          });
          basemapLayersRef.current[option.id] = layer;
          
          // Add the default layer to the map
          if (option.id === selectedBasemap) {
            layer.addTo(map);
            console.log(`Added default basemap: ${option.name}`);
          }
        });
        
        // Load markers after map initialization
        loadMapMarkers();
        
        // Force resize after a delay
        setTimeout(() => {
          console.log('Forcing map resize');
          map.invalidateSize(true);
        }, 1000);
      } catch (error) {
        console.error(`Error initializing map: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    return () => {
      clearTimeout(initTimer);
      // Clean up CSS link
      const link = document.head.querySelector('link[href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"]');
      if (link) document.head.removeChild(link);
      
      // Clean up the script
      const scriptElem = document.head.querySelector('script[src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"]');
      if (scriptElem) document.head.removeChild(scriptElem);
    };
  }, []);

  // Effect to handle basemap changes
  useEffect(() => {
    if (!mapRef.current || !basemapLayersRef.current) return;
    
    try {
      // Remove all basemap layers
      Object.values(basemapLayersRef.current).forEach(layer => {
        if (mapRef.current.hasLayer(layer)) {
          mapRef.current.removeLayer(layer);
        }
      });
      
      // Add selected basemap
      const selectedLayer = basemapLayersRef.current[selectedBasemap];
      if (selectedLayer) {
        selectedLayer.addTo(mapRef.current);
      }
    } catch (error) {
      console.error(`Error changing basemap: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [selectedBasemap]);

  // Function to load markers onto the map
  const loadMapMarkers = async () => {
    if (!mapRef.current) {
      console.error('Map not initialized');
      return;
    }
    
    try {
      setLoading(true);
      
      // Clear existing markers
      if (markersRef.current && markersRef.current.length > 0) {
        markersRef.current.forEach(marker => {
          if (mapRef.current && marker) {
            mapRef.current.removeLayer(marker);
          }
        });
        markersRef.current = [];
      }
      
      // Fetch events data
      const response = await EventRecordEndpoint.getEventsByEventId('EVENT_050');
      const events = response ? response.filter(event => !!event) : [];
      console.log(`Loaded ${events.length} events for mapping`);
      
      if (!events || events.length === 0) {
        setLoading(false);
        setMarkerCount(0);
        return;
      }
      
      // @ts-ignore
      const L = window.L;
      if (!L) {
        console.error('Leaflet not found on window object');
        setLoading(false);
        return;
      }
      
      const markers = [];
      const bounds = L.latLngBounds([]);
      
      // Create markers for each event
      for (const event of events) {
        if (event && event.data && event.data.lat && event.data.lon) {
          const lat = event.data.lat;
          const lng = event.data.lon;
          
          // Create popup content with event details
          const popupContent = `
            <div>
              <h3>Event: ${event.eventId || 'Unknown'}</h3>
              <p>Operation: ${event.operation || 'Unknown'}</p>
              <p>BW ID: ${event.data?.bwId || 'N/A'}</p>
              <p>Zone: ${event.data?.currentZone || 'N/A'}</p>
              <p>Type: ${event.data?.type || 'N/A'}</p>
              <p>Timestamp: ${event.data?.timestamp ? new Date(event.data.timestamp).toLocaleString() : 'N/A'}</p>
              <p>Coordinates: [${lat}, ${lng}]</p>
            </div>
          `;
          
          // Create and add the marker
          const marker = L.marker([lat, lng])
            .bindPopup(popupContent)
            .addTo(mapRef.current);
          
          markers.push(marker);
          bounds.extend([lat, lng]);
        }
      }
      
      markersRef.current = markers;
      setMarkerCount(markers.length);
      
      // Fit map to show all markers if we have any
      if (markers.length > 0) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (error) {
      console.error('Error loading markers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRelocate = () => {
    if (!mapRef.current) {
      console.error('Map not initialized');
      return;
    }

    try {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        console.error('Invalid coordinates');
        return;
      }
      
      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.error('Coordinates out of range');
        return;
      }
      
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    } catch (error) {
      console.error(`Error relocating map: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleBasemapChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBasemap(e.target.value);
  };

  return (
    <div style={{ 
      padding: '0', 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      width: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      {/* Coordinates input control panel */}
      <div style={{
        position: 'absolute',
        bottom: '120px', 
        left: '60px', 
        zIndex: 1000,
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <label htmlFor="latitude" style={{ fontSize: '12px' }}>Lat:</label>
          <input
            id="latitude"
            type="number"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            style={{
              width: '100px',
              padding: '4px',
              fontSize: '12px',
              border: '1px solid #ccc'
            }}
            step="0.000001"
            min="-90"
            max="90"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <label htmlFor="longitude" style={{ fontSize: '12px' }}>Lng:</label>
          <input
            id="longitude"
            type="number"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            style={{
              width: '100px',
              padding: '4px',
              fontSize: '12px',
              border: '1px solid #ccc'
            }}
            step="0.000001"
            min="-180"
            max="180"
          />
        </div>
        <button
          onClick={handleRelocate}
          style={{
            padding: '4px 8px',
            backgroundColor: '#0078FF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Go to Location
        </button>

        {/* Basemap selection dropdown */}
        <div style={{ marginTop: '5px' }}>
          <label htmlFor="basemap-select" style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>
            Basemap:
          </label>
          <select
            id="basemap-select"
            value={selectedBasemap}
            onChange={handleBasemapChange}
            style={{
              width: '100%',
              padding: '4px',
              fontSize: '12px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              backgroundColor: 'white'
            }}
          >
            {basemapOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Refresh markers button */}
        <button
          onClick={loadMapMarkers}
          style={{
            marginTop: '5px',
            padding: '4px 8px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Refresh Markers
        </button>
        
        {/* Display marker count */}
        <div style={{ 
          marginTop: '5px', 
          fontSize: '11px', 
          textAlign: 'center',
          padding: '3px',
          backgroundColor: '#f8f9fa',
          borderRadius: '3px'
        }}>
          {loading ? 'Loading...' : `${markerCount} points shown`}
        </div>
      </div>
      
      {/* Map container with full viewport dimensions */}
      <div 
        id="map-container" 
        style={{ 
          height: '100%', 
          width: '100%', 
          border: '1px solid #ccc',
          position: 'relative',
          zIndex: 0,
          flex: 1
        }}
      ></div>
    </div>
  );
};

export default TrackingmapView;