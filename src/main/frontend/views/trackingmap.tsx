import { ViewConfig } from '@vaadin/hilla-file-router/types.js';
import React, { useState, useEffect } from 'react';

export const config: ViewConfig = {
  menu: { order: 1, icon: 'line-awesome/svg/map-marked-alt-solid.svg' },
  title: 'Tracking Map',
};

const TrackingmapView: React.FC = function () {
  const [mapStatus, setMapStatus] = useState('Initializing...');

  useEffect(() => {
    // Add a debug message to the UI
    setMapStatus('Loading Leaflet...');

    // Load Leaflet CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    // Create a debug helper that will add messages to the UI
    const debug = (message: string) => {
      console.log(`Map debug: ${message}`);
      setMapStatus(prev => `${prev}\n${message}`);
    };

    // Delay initialization to ensure DOM is ready
    const initTimer = setTimeout(() => {
      debug('DOM should be ready, proceeding with map init');
      
      // Load Leaflet JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        debug('Leaflet JS loaded');
        initMap();
      };
      script.onerror = () => {
        debug('Failed to load Leaflet JS');
      };
      document.head.appendChild(script);
    }, 1000);

    const initMap = () => {
      debug('Initializing map');
      const mapContainer = document.getElementById('map-container');
      
      if (!mapContainer) {
        debug('Error: Map container not found');
        return;
      }
      
      debug(`Map container dimensions: ${mapContainer.clientWidth}x${mapContainer.clientHeight}`);
      
      try {
        // @ts-ignore
        const L = window.L;
        if (!L) {
          debug('Error: Leaflet not found on window object');
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
        
        debug('Map object created');
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        debug('Tile layer added');
        
        // Force resize after a delay
        setTimeout(() => {
          debug('Forcing map resize');
          map.invalidateSize(true);
        }, 1000);
      } catch (error) {
        debug(`Error initializing map: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    return () => {
      clearTimeout(initTimer);
      // Clean up CSS link
      document.head.removeChild(cssLink);
    };
  }, []);

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
      {/* Debug status panel - minimized to maximize map space */}
      <div style={{ 
        padding: '5px', 
        backgroundColor: '#f0f0f0', 
        border: '1px solid #ccc',
        whiteSpace: 'pre-line',
        maxHeight: '100px',
        overflowY: 'auto',
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        opacity: 0.8,
        fontSize: '12px'
      }}>
        {mapStatus}
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