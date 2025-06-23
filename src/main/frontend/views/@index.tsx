import { ViewConfig } from '@vaadin/hilla-file-router/types.js';
import { useNavigate } from 'react-router';
import { useEffect, useState } from "react";
import { Grid } from '@vaadin/react-components';
import { GridColumn } from '@vaadin/react-components';
import { TextField } from '@vaadin/react-components';
import { Button } from '@vaadin/react-components';
import { Notification } from '@vaadin/react-components';
import { Card } from '@vaadin/react-components';
import { ComboBox } from '@vaadin/react-components';
import { Select } from '@vaadin/react-components';
import { ProgressBar } from '@vaadin/react-components';
import { HorizontalLayout } from '@vaadin/react-components';
import '@vaadin/vaadin-lumo-styles/all-imports';
import { EventRecordEndpoint } from 'Frontend/generated/endpoints.js';

// Define the EventRecord type to match the Java model with optional fields
interface Data {
  bwId?: string;
  currentZone?: string;
  preAssigned?: boolean;
  timestamp?: number;
  totalBWIdQty?: number;
  type?: string;
  lat: number;
  lon: number;
}

interface EventRecord {
  eventId?: string;
  operation?: string;
  data?: Data;
}

// Interface for the BW ID statistics
interface BwIdStats {
  id: string;
  count: number;
  percentage: number;
}

// Interface for zone time tracking
interface ZoneTimeStats {
  zoneName: string;
  totalTimeMs: number;
  visits: number;
  averageTimeMs: number;
}

export default function DashboardView() {
  const navigate = useNavigate();
  const [eventRecords, setEventRecords] = useState<EventRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<EventRecord[]>([]);
  const [filterEventId, setFilterEventId] = useState<string>('EVENT_050');
  const [filterBwId, setFilterBwId] = useState<string>('');
  const [filterOperation, setFilterOperation] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [bwIdStats, setBwIdStats] = useState<BwIdStats[]>([]);
  const [totalBwIds, setTotalBwIds] = useState<number>(0);
  const [displayMode, setDisplayMode] = useState<'top5' | 'all'>('top5');
  const [zoneTimeStats, setZoneTimeStats] = useState<ZoneTimeStats[]>([]);
  const [overallZoneTimeStats, setOverallZoneTimeStats] = useState<ZoneTimeStats[]>([]);
  const [selectedBwId, setSelectedBwId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Process event records to get bwId statistics
  const processBwIdStats = (records: EventRecord[]) => {
    // Count occurrences of each bwId
    const bwIdCounts = new Map<string, number>();
    
    records.forEach(record => {
      if (record.data?.bwId) {
        // Extract the actual bwId part (before the #)
        const bwIdParts = record.data.bwId.split('#');
        const actualId = bwIdParts[0];
        
        const currentCount = bwIdCounts.get(actualId) || 0;
        bwIdCounts.set(actualId, currentCount + 1);
      }
    });
    
    // Convert map to array of stats objects
    const totalRecords = records.length;
    const statsArray: BwIdStats[] = Array.from(bwIdCounts.entries()).map(([id, count]) => ({
      id,
      count,
      percentage: totalRecords > 0 ? (count / totalRecords) * 100 : 0
    }));
    
    // Sort by count (descending)
    statsArray.sort((a, b) => b.count - a.count);
    
    setBwIdStats(statsArray);
    setTotalBwIds(bwIdCounts.size);
    
    // Calculate overall zone time statistics for all records
    calculateOverallZoneTimeStats(records);
  };

  // Calculate zone time statistics for a specific bwId
  const calculateZoneTimeStats = (records: EventRecord[], bwId: string) => {
    if (!bwId || records.length === 0) {
      setZoneTimeStats([]);
      return;
    }
    
    // Filter records for the specific bwId
    const selectedBwIdRecords = records.filter(record => 
      record.data?.bwId && record.data.bwId.split('#')[0] === bwId
    );
    
    if (selectedBwIdRecords.length === 0) {
      setZoneTimeStats([]);
      return;
    }
    
    // Sort records by timestamp to process them in chronological order
    const sortedRecords = [...selectedBwIdRecords].sort((a, b) => 
      (a.data?.timestamp || 0) - (b.data?.timestamp || 0)
    );
    
    // Group by zone
    const zoneGroups = new Map<string, { entries: EventRecord[], totalTime: number, visits: number }>();
    
    // Known zone types
    const knownZones = ['zone#00#VENUE', 'zone#01#BACKSTAGE', 'zone#01#01#BACKSTAGE#STAGE'];
    knownZones.forEach(zone => {
      zoneGroups.set(zone, { entries: [], totalTime: 0, visits: 0 });
    });
    
    // Count zone visits by looking at each record
    sortedRecords.forEach(record => {
      const currentZone = record.data?.currentZone;
      if (!currentZone) return;
      
      // Make sure we have an entry for this zone
      if (!zoneGroups.has(currentZone)) {
        zoneGroups.set(currentZone, { entries: [], totalTime: 0, visits: 0 });
      }
      
      // Add record to the zone's entries and count it as a visit
      const zoneInfo = zoneGroups.get(currentZone);
      if (zoneInfo) {
        zoneInfo.entries.push(record);
        zoneInfo.visits += 1;
      }
    });
    
    // Calculate time spent in each zone
    let lastZone: string | undefined = undefined;
    let lastTimestamp: number | undefined = undefined;
    
    // Process records to calculate time spent in each zone
    sortedRecords.forEach(record => {
      const currentZone = record.data?.currentZone;
      const currentTimestamp = record.data?.timestamp;
      
      if (!currentZone || !currentTimestamp) return;
      
      // If we had a previous record in a different zone, calculate time difference
      if (lastZone && lastTimestamp && lastZone !== currentZone) {
        const previousZoneInfo = zoneGroups.get(lastZone);
        if (previousZoneInfo) {
          const timeDiff = currentTimestamp - lastTimestamp;
          previousZoneInfo.totalTime += timeDiff;
        }
      }
      
      lastZone = currentZone;
      lastTimestamp = currentTimestamp;
    });
    
    // Convert map to array of zone time stats
    const stats: ZoneTimeStats[] = Array.from(zoneGroups.entries())
      .filter(([_, info]) => info.visits > 0) // Only include zones that were visited
      .map(([zoneName, info]) => ({
        zoneName,
        totalTimeMs: info.totalTime,
        visits: info.visits,
        averageTimeMs: info.visits > 0 ? info.totalTime / info.visits : 0
      }));
    
    // Verify the total count matches
    const totalVisits = stats.reduce((sum, zone) => sum + zone.visits, 0);
    console.log(`Total records: ${sortedRecords.length}, Sum of visits: ${totalVisits}`);
    
    setZoneTimeStats(stats);
    setSelectedBwId(bwId);
  };

  // Calculate overall zone time statistics for all records
  const calculateOverallZoneTimeStats = (records: EventRecord[]) => {
    if (!records || records.length === 0) {
      setOverallZoneTimeStats([]);
      return;
    }
    
    // Sort records by timestamp to process them in chronological order
    const sortedRecords = [...records].sort((a, b) => 
      (a.data?.timestamp || 0) - (b.data?.timestamp || 0)
    );
    
    // Group by zone
    const zoneGroups = new Map<string, { entries: EventRecord[], totalTime: number, visits: number }>();
    
    // Known zone types
    const knownZones = ['zone#00#VENUE', 'zone#01#BACKSTAGE', 'zone#01#01#BACKSTAGE#STAGE'];
    knownZones.forEach(zone => {
      zoneGroups.set(zone, { entries: [], totalTime: 0, visits: 0 });
    });
    
    // Group records by bwId to process each person's journey separately
    const bwIdGroups = new Map<string, EventRecord[]>();
    
    // First, group records by bwId
    sortedRecords.forEach(record => {
      if (!record.data?.bwId) return;
      
      const bwId = record.data.bwId.split('#')[0]; // Extract the actual bwId
      
      if (!bwIdGroups.has(bwId)) {
        bwIdGroups.set(bwId, []);
      }
      
      bwIdGroups.get(bwId)?.push(record);
    });
    
    // For each bwId, process their journey and calculate zone times
    bwIdGroups.forEach((personRecords, _) => {
      // Sort this person's records by timestamp
      personRecords.sort((a, b) => (a.data?.timestamp || 0) - (b.data?.timestamp || 0));
      
      let lastZone: string | undefined = undefined;
      let lastTimestamp: number | undefined = undefined;
      
      // Process records to calculate time spent in each zone
      personRecords.forEach(record => {
        const currentZone = record.data?.currentZone;
        const currentTimestamp = record.data?.timestamp;
        
        if (!currentZone || !currentTimestamp) return;
        
        // Make sure we have an entry for this zone
        if (!zoneGroups.has(currentZone)) {
          zoneGroups.set(currentZone, { entries: [], totalTime: 0, visits: 0 });
        }
        
        // Add record to the zone's entries and count it as a visit
        const zoneInfo = zoneGroups.get(currentZone);
        if (zoneInfo) {
          zoneInfo.entries.push(record);
          zoneInfo.visits += 1;
        }
        
        // If we had a previous record in a different zone, calculate time difference
        if (lastZone && lastTimestamp && lastZone !== currentZone) {
          const previousZoneInfo = zoneGroups.get(lastZone);
          if (previousZoneInfo) {
            const timeDiff = currentTimestamp - lastTimestamp;
            previousZoneInfo.totalTime += timeDiff;
          }
        }
        
        lastZone = currentZone;
        lastTimestamp = currentTimestamp;
      });
    });
    
    // Convert map to array of zone time stats
    const stats: ZoneTimeStats[] = Array.from(zoneGroups.entries())
      .filter(([_, info]) => info.visits > 0) // Only include zones that were visited
      .map(([zoneName, info]) => ({
        zoneName,
        totalTimeMs: info.totalTime,
        visits: info.visits,
        averageTimeMs: info.visits > 0 ? info.totalTime / info.visits : 0
      }));
    
    setOverallZoneTimeStats(stats);
  };

  // Function to sort records by timestamp
  const sortRecordsByTimestamp = (records: EventRecord[]) => {
    const sortedRecords = [...records];
    sortedRecords.sort((a, b) => {
      const timestampA = a.data?.timestamp || 0;
      const timestampB = b.data?.timestamp || 0;
      
      return sortOrder === 'asc' 
        ? timestampA - timestampB  // Ascending: oldest to newest
        : timestampB - timestampA; // Descending: newest to oldest
    });
    
    return sortedRecords;
  };

  // Toggle sorting order and re-sort records
  const toggleSortOrder = () => {
    const newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newSortOrder);
    setFilteredRecords(sortRecordsByTimestamp([...filteredRecords]));
    
    // Show notification about the sort order change
    Notification.show(`Events sorted by timestamp: ${newSortOrder === 'asc' ? 'oldest to newest' : 'newest to oldest'}`, 
      { position: 'bottom-center', duration: 2000 });
  };

  // Format time in milliseconds to a readable format (minutes and seconds)
  const formatTimeMs = (ms: number) => {
    if (ms === 0) return '0s';
    
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes === 0) {
      return `${seconds}s`;
    }
    
    return `${minutes}m ${seconds}s`;
  };

  // Function to load all event records
  const fetchAllEvents = async () => {
    try {
      setLoading(true);
      const response = await EventRecordEndpoint.getEventsByEventId(filterEventId);
      const allEvents = response?.filter((event): event is EventRecord => !!event) || [];
      setEventRecords(allEvents);
      const sortedEvents = sortRecordsByTimestamp(allEvents);
      setFilteredRecords(sortedEvents);
      processBwIdStats(allEvents);
      calculateOverallZoneTimeStats(allEvents);
      Notification.show('Events loaded successfully', { position: 'bottom-center', duration: 3000 });
    } catch (error) {
      console.error('Error fetching event records:', error);
      Notification.show('Error loading events', { position: 'bottom-center', theme: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Function to load events by Event ID
  const loadEventsByEventId = async () => {
    if (!filterEventId) {
      Notification.show('Please enter an Event ID', { position: 'bottom-center', theme: 'warning' });
      return;
    }
    
    try {
      setLoading(true);
      const response = await EventRecordEndpoint.getEventsByEventId(filterEventId);
      const events = response?.filter((event): event is EventRecord => !!event) || [];
      setEventRecords(events);
      const sortedEvents = sortRecordsByTimestamp(events);
      setFilteredRecords(sortedEvents);
      processBwIdStats(events);
      calculateOverallZoneTimeStats(events);
      Notification.show(`Loaded ${events.length} events for Event ID: ${filterEventId}`, { position: 'bottom-center', duration: 3000 });
    } catch (error) {
      console.error('Error fetching events by Event ID:', error);
      Notification.show('Error loading events', { position: 'bottom-center', theme: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Function to filter events by bwId
  const filterEventsByBwId = () => {
    if (!filterBwId) {
      Notification.show('Please enter a Wristband ID', { position: 'bottom-center', theme: 'warning' });
      return;
    }
    
    // Filter the already loaded events by bwId
    const filtered = eventRecords.filter(record => 
      record.data?.bwId && record.data.bwId.includes(filterBwId)
    );
    
    const sortedFiltered = sortRecordsByTimestamp(filtered);
    setFilteredRecords(sortedFiltered);
    processBwIdStats(filtered);
    calculateZoneTimeStats(eventRecords, filterBwId);
    calculateOverallZoneTimeStats(filtered);
    Notification.show(`Found ${filtered.length} events with Wristband ID containing: ${filterBwId}`,
      { position: 'bottom-center', duration: 3000 });
  };

  // Function to load events by both Event ID and bwId
  const loadEventsByEventIdAndFilterBwId = async () => {
    if (!filterEventId) {
      Notification.show('Please enter an Event ID', { position: 'bottom-center', theme: 'warning' });
      return;
    }
    
    try {
      setLoading(true);
      const response = await EventRecordEndpoint.getEventsByEventId(filterEventId);
      const events = response?.filter((event): event is EventRecord => !!event) || [];
      
      // Apply bwId filter if provided
      if (filterBwId) {
        const filtered = events.filter(record => 
          record.data?.bwId && record.data.bwId.includes(filterBwId)
        );
        const sortedFiltered = sortRecordsByTimestamp(filtered);
        setFilteredRecords(sortedFiltered);
        processBwIdStats(filtered);
        calculateZoneTimeStats(events, filterBwId);
        calculateOverallZoneTimeStats(filtered);
        Notification.show(
          `Found ${filtered.length} events for Event ID: ${filterEventId} with Wristband ID containing: ${filterBwId}`,
          { position: 'bottom-center', duration: 3000 }
        );
      } else {
        const sortedEvents = sortRecordsByTimestamp(events);
        setFilteredRecords(sortedEvents);
        processBwIdStats(events);
        setZoneTimeStats([]);
        calculateOverallZoneTimeStats(events);
        Notification.show(`Loaded ${events.length} events for Event ID: ${filterEventId}`, 
          { position: 'bottom-center', duration: 3000 });
      }
      
      setEventRecords(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      Notification.show('Error loading events', { position: 'bottom-center', theme: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Format timestamp to human-readable date
  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString();
  };
  
  // Load events when component mounts
  useEffect(() => {
    loadEventsByEventId(); // Load events for EVENT_050 by default
  }, []);

  return (
    <div className="p-4">
      {/* BwId Dashboard */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="grid grid-cols-3 items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold">Wristband Operations Dashboard</h2>
            </div>
            
            <div className="flex items-center justify-center p-m">
              <div className="bg-gray-100 text-gray-700 rounded-md text-sm pt-0 pr-m pb-0 pl-m gap-y-m gap-x-l">
                Operations recorded: <span className="font-semibold">{filteredRecords.length}</span>
              </div>
              
              <div className="mx-24 h-8 border-l-4 border-gray-300" style={{minWidth: '17px'}}></div>
              
              <div className="bg-gray-100 text-gray-700 rounded-md px-3 py-1 text-sm gap-y-m gap-x-xl">
                Total Unique Wristbands: <span className="font-bold">{totalBwIds}</span>
              </div>
            </div>
            
            <div className="flex justify-end">
              <div className="bg-gray-50 text-gray-700 rounded-md px-3 py-1">
                <Select
                  className="min-w-[80px]"
                  value={displayMode}
                  onChange={(e) => setDisplayMode(e.target.value as 'top5' | 'all')}
                  items={[
                    { label: 'Top 5', value: 'top5' },
                    { label: 'All', value: 'all' }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Zone Time Stats for selected bwId */}
          {zoneTimeStats.length > 0 && (
            <div className="mb-6 bg-secondary-50 p-4 rounded-lg border border-secondary-100">
              <div className="text-lg font-semibold mb-2">
                Average Time in Zones for BW ID: <span className="text-secondary">{selectedBwId}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {zoneTimeStats.map((zoneStat, index) => (
                  <div key={index} className="bg-white p-3 rounded shadow-sm border border-gray-200">
                    <div className="font-medium text-secondary mb-1">{zoneStat.zoneName}</div>
                    <div className="grid grid-cols-2 text-sm">
                      <div>Visits:</div>
                      <div className="font-medium">{zoneStat.visits}</div>
                      <div>Avg. Time:</div> 
                      <div className="font-medium">{formatTimeMs(zoneStat.averageTimeMs)}</div>
                      <div>Total Time:</div>
                      <div className="font-medium">{formatTimeMs(zoneStat.totalTimeMs)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {(displayMode === 'top5' ? bwIdStats.slice(0, 5) : bwIdStats).map((stat, index) => (
              <div key={index} className="mb-2">
                <div className="flex justify-between mb-1">
                  <span className="font-medium" title={stat.id}>{stat.id}</span>
                  <span>{stat.count} ({stat.percentage.toFixed(1)}%)</span>
                </div>
                <ProgressBar value={stat.percentage / 100} />
              </div>
            ))}
            
            {bwIdStats.length === 0 && (
              <div className="text-center py-4">No data available. Load events to see statistics.</div>
            )}
          </div>
          
          {/* Overall Zone Time Stats */}
          {overallZoneTimeStats.length > 0 && (
            <div className="mt-6 bg-gray-100 p-4 rounded-lg border border-gray-200">
              <div className="text-lg font-semibold mb-2">
                Overall Average Time in Zones (All Records)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {overallZoneTimeStats.map((zoneStat, index) => (
                  <div key={index} className="bg-white p-3 rounded shadow-sm border border-gray-200">
                    <div className="font-medium text-primary mb-1">{zoneStat.zoneName}</div>
                    <div className="grid grid-cols-2 text-sm">
                      <div>Visits:</div>
                      <div className="font-medium">{zoneStat.visits}</div>
                      <div>Avg. Time:</div> 
                      <div className="font-medium">{formatTimeMs(zoneStat.averageTimeMs)}</div>
                      <div>Total Time:</div>
                      <div className="font-medium">{formatTimeMs(zoneStat.totalTimeMs)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">DynamoDB Event Records</h2>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <TextField
            label="Insert Event ID"
            value={filterEventId}
            onChange={(e) => setFilterEventId(e.target.value)} style={{width: '180px'}}
          />
          
          <div style={{ width: '20px' }}></div> {/* Spacer element for additional separation */}
          
          <TextField
            label="Insert Wristband ID"
            value={filterBwId}
            onChange={(e) => setFilterBwId(e.target.value)}
            placeholder="Enter bwId to filter" style={{width: '220px'}}
          />
          
          <div className="flex items-end gap-2">
            <Button theme="primary" onClick={fetchAllEvents}>
              Load All
            </Button>
            
            <Button theme="secondary" onClick={loadEventsByEventId}>
              Filter by Event ID
            </Button>
            
            <Button theme="secondary" onClick={filterEventsByBwId}>
              Filter by bwId
            </Button>
            
            <Button theme="secondary" onClick={loadEventsByEventIdAndFilterBwId}>
              Filter by Both
            </Button>
          </div>
        </div>
      
        {loading && (
          <div className="text-center py-8">Loading events...</div>
        )}
        
        {!loading && filteredRecords.length === 0 && (
          <div className="text-center py-8">No events found. Adjust your filters or load events.</div>
        )}
        
        {!loading && filteredRecords.length > 0 && (
          <Grid
            className="mt-4"
            all-rows-visible
            theme="row-stripes"
            items={filteredRecords}
          >
            <GridColumn path="eventId" header="Event ID" autoWidth />
            <GridColumn path="operation" header="Operation" autoWidth />
            <GridColumn path="data.bwId" header="BW ID" autoWidth />
            <GridColumn path="data.currentZone" header="Current Zone" autoWidth />
            <GridColumn path="data.preAssigned" header="Pre-Assigned" autoWidth />
            <GridColumn 
              header={
                <div className="flex items-center cursor-pointer" onClick={toggleSortOrder}>
                  <span>Timestamp</span>
                  <span 
                    title={sortOrder === 'asc' ? 'Sort by timestamp (Newest to Oldest)' : 'Sort by timestamp (Oldest to Newest)'} 
                    style={{ 
                      color: 'red', 
                      fontWeight: 'bold', 
                      fontSize: '26px', 
                      marginLeft: '8px',
                      display: 'inline-block'
                    }}
                  >
                    {sortOrder === 'asc' ? '↓' : '↑'}
                  </span>
                </div>
              }
              autoWidth
              renderer={({ item }) => formatTimestamp(item.data?.timestamp)}
            />
            <GridColumn path="data.totalBWIdQty" header="Total BWID Quantity" autoWidth />
            <GridColumn path="data.type" header="Type" autoWidth />
            <GridColumn path="data.lat" header="Latitude" autoWidth />
            <GridColumn path="data.lon" header="Longitude" autoWidth />
          </Grid>
        )}
      </div>
    </div>
  );
}

export const config: ViewConfig = {
  menu: { order: 0, icon: 'line-awesome/svg/chart-bar-solid.svg' },
  title: 'Wristband Dashboard'
};