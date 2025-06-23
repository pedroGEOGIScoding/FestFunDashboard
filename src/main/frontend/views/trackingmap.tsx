import { ViewConfig } from '@vaadin/hilla-file-router/types.js';
import React, { useState, useEffect, useRef } from 'react';
import { EventRecordEndpoint } from 'Frontend/generated/endpoints.js';
import 'leaflet/dist/leaflet.css';

// Extend the Leaflet types to include our custom properties
declare global {
  interface Window {
    L: any;
  }
  
  namespace L {
    interface MarkerOptions {
      bwId?: string;
      sequenceNumber?: number;
    }

    interface Marker {
      getElement(): HTMLElement;
    }
  }
}

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
  const [uniqueBwIds, setUniqueBwIds] = useState<string[]>([]);
  const [bwIdColorMap, setBwIdColorMap] = useState<{[key: string]: string}>({});
  const [selectedBwId, setSelectedBwId] = useState<string>('');
  const [filteredMarkerCount, setFilteredMarkerCount] = useState(0);
  const mapRef = useRef<any>(null);
  const basemapLayersRef = useRef<{[key: string]: any}>({});
  const markersRef = useRef<L.Marker[]>([]);

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
      const mapContainer = document.getElementById('map');
      
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
        const map = L.map('map', {
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

  const getColorFromBwId = (bwId: string) => {
    const actualId = bwId.split('#')[0];
    
    if (bwIdColorMap[actualId]) {
      return bwIdColorMap[actualId];
    }
    
    let hash = 0;
    for (let i = 0; i < actualId.length; i++) {
      hash = actualId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const r = ((hash & 0xFF) % 200) + 40;
    const g = (((hash >> 8) & 0xFF) % 200) + 40;
    const b = (((hash >> 16) & 0xFF) % 200) + 40;
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Function to create a custom marker icon with the specific color and sequence number
  const createColoredMarkerIcon = (color: string, sequenceNumber: number, L: any) => {
    return L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 4px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: white;
      ">${sequenceNumber}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  };

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
      
      const L = window.L;
      if (!L) {
        console.error('Leaflet not found on window object');
        setLoading(false);
        return;
      }
      
      // Group events by bwId
      const eventsByBwId = new Map<string, Array<{event: any, timestamp: number}>>();
      
      // First pass: group events by bwId
      events.forEach(event => {
        if (event?.data?.bwId && event?.data?.timestamp) {
          const actualId = event.data.bwId.split('#')[0];
          const timestamp = Number(event.data.timestamp);
          
          if (!eventsByBwId.has(actualId)) {
            eventsByBwId.set(actualId, []);
          }
          
          eventsByBwId.get(actualId)?.push({ event, timestamp });
        }
      });
      
      // Second pass: sort each group by timestamp
      eventsByBwId.forEach((eventGroup, bwId) => {
        eventGroup.sort((a, b) => a.timestamp - b.timestamp);
      });
      
      const markers: L.Marker[] = [];
      const bounds = L.latLngBounds([]);
      
      const uniqueBwIdSet = new Set<string>();
      const newColorMap: {[key: string]: string} = {};
      
      // Extract unique bwIds
      Array.from(eventsByBwId.keys()).forEach(bwId => {
        uniqueBwIdSet.add(bwId);
      });
      
      // Convert set to array for state
      const uniqueIds = Array.from(uniqueBwIdSet);
      
      // Generate colors for each unique bwId
      uniqueIds.forEach(bwId => {
        newColorMap[bwId] = getColorFromBwId(bwId);
      });
      
      // Update state with unique IDs and colors
      setUniqueBwIds(uniqueIds);
      setBwIdColorMap(newColorMap);
      
      // Create markers for each event with sequence numbers
      eventsByBwId.forEach((eventGroup, bwId) => {
        const color = newColorMap[bwId] || '#3388ff';
        
        eventGroup.forEach((item, index) => {
          const event = item.event;
          if (event?.data?.lat && event?.data?.lon) {
            const lat = event.data.lat;
            const lng = event.data.lon;
            
            // Create a custom marker icon with the color and sequence number
            const markerIcon = createColoredMarkerIcon(color, index, L);
            
            // Create popup content with event details and highlight the bwId color
            const popupContent = `
              <div>
                <h3>Event: ${event.eventId || 'Unknown'}</h3>
                <p>Operation: ${event.operation || 'Unknown'}</p>
                <p>BW ID: <span style="color: ${color}; font-weight: bold;">${event.data?.bwId || 'N/A'}</span></p>
                <p>Zone: ${event.data?.currentZone || 'N/A'}</p>
                <p>Type: ${event.data?.type || 'N/A'}</p>
                <p>Timestamp: ${event.data?.timestamp ? new Date(event.data.timestamp).toLocaleString() : 'N/A'}</p>
                <p>Coordinates: [${lat}, ${lng}]</p>
                <p>Sequence: <strong>${index}</strong> (of ${eventGroup.length - 1})</p>
              </div>
            `;
            
            // Create and add the marker with custom icon and store bwId in options for filtering
            const marker = L.marker([lat, lng], { 
              icon: markerIcon,
              bwId: event.data.bwId,
              sequenceNumber: index
            })
              .bindPopup(popupContent)
              .addTo(mapRef.current);
            
            markers.push(marker);
            bounds.extend([lat, lng]);
          }
        });
      });
      
      markersRef.current = markers;
      setMarkerCount(markers.length);
      setFilteredMarkerCount(markers.length);
      
      // Apply filter if there's a selected bwId
      if (selectedBwId) {
        filterMarkersByBwId(selectedBwId);
      }
      
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

  const handleBwIdSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBwId(e.target.value);
    filterMarkersByBwId(e.target.value);
  };

  // Function to filter markers by selected bwId
  const filterMarkersByBwId = (bwId: string) => {
    if (!mapRef.current || !markersRef.current) return;
    
    try {
      const L = window.L;
      let visibleCount = 0;
      
      // If empty selection (show all), make all markers visible
      if (!bwId) {
        markersRef.current.forEach(marker => {
          if (marker) {
            marker.getElement().style.display = '';
            visibleCount++;
          }
        });
        setFilteredMarkerCount(visibleCount);
        return;
      }
      
      // Otherwise, show only markers for the selected bwId
      markersRef.current.forEach(marker => {
        if (marker && marker.options && marker.options.bwId) {
          const markerBwId = marker.options.bwId.split('#')[0];
          const isMatch = markerBwId === bwId;
          
          marker.getElement().style.display = isMatch ? '' : 'none';
          if (isMatch) visibleCount++;
        }
      });
      
      setFilteredMarkerCount(visibleCount);
      
      // Find center point of visible markers to adjust view
      if (visibleCount > 0) {
        const visibleMarkers = markersRef.current.filter(marker => 
          marker && marker.options && marker.options.bwId && 
          marker.options.bwId.split('#')[0] === bwId
        );
        
        if (visibleMarkers.length > 0) {
          const bounds = L.latLngBounds([]);
          visibleMarkers.forEach(marker => {
            bounds.extend(marker.getLatLng());
          });
          
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    } catch (error) {
      console.error('Error filtering markers:', error);
    }
  };

  return (
    <div style={{ 
      padding: '0', 
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      <div id="map" style={{ height: '100%', width: '100%', position: 'relative' }}>
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
          
          <div style={{ marginTop: '5px' }}>
            <label htmlFor="bwid-select" style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>
              Filter by BW ID:
            </label>
            <select
              id="bwid-select"
              value={selectedBwId}
              onChange={handleBwIdSelection}
              style={{
                width: '100%',
                padding: '4px',
                fontSize: '12px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                backgroundColor: 'white'
              }}
            >
              <option value="">Show All</option>
              {uniqueBwIds.map(bwId => (
                <option key={bwId} value={bwId} style={{color: bwIdColorMap[bwId]}}>
                  {bwId}
                </option>
              ))}
            </select>
          </div>
          
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
          
          <div style={{ 
            marginTop: '5px', 
            fontSize: '11px', 
            textAlign: 'center',
            padding: '3px',
            backgroundColor: '#f8f9fa',
            borderRadius: '3px'
          }}>
            {loading ? 'Loading...' : 
              selectedBwId ? 
                `${filteredMarkerCount} of ${markerCount} points shown • ${uniqueBwIds.length} unique BW IDs` :
                `${markerCount} points shown • ${uniqueBwIds.length} unique BW IDs`
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingmapView;