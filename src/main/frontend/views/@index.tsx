import { ViewConfig } from '@vaadin/hilla-file-router/types.js';
import { useNavigate } from 'react-router';
import { useEffect, useState } from "react";
import { Grid } from '@vaadin/react-components';
import { GridColumn } from '@vaadin/react-components';
import { Button } from '@vaadin/react-components';
import { TextField } from '@vaadin/react-components';
import { Notification } from '@vaadin/react-components';
import { EventRecordEndpoint } from 'Frontend/generated/endpoints.js';
import { Card } from '@vaadin/react-components';
import { ProgressBar } from '@vaadin/react-components';
import { Select } from '@vaadin/react-components';

export const config: ViewConfig = {
  menu: { order: 0, icon: 'line-awesome/svg/stopwatch-solid.svg' },
  title: 'Dashboard Event',
};

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

export default function DashboardView() {
  const navigate = useNavigate();
  const [eventRecords, setEventRecords] = useState<EventRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterEventId, setFilterEventId] = useState('EVENT_050');
  const [filterBwId, setFilterBwId] = useState('');
  const [bwIdStats, setBwIdStats] = useState<BwIdStats[]>([]);
  const [totalBwIds, setTotalBwIds] = useState(0);
  const [displayMode, setDisplayMode] = useState<'top5' | 'all'>('top5');

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
  };

  // Function to load all event records
  const fetchAllEvents = async () => {
    try {
      setLoading(true);
      const response = await EventRecordEndpoint.getEventsByEventId(filterEventId);
      const allEvents = response?.filter((event): event is EventRecord => !!event) || [];
      setEventRecords(allEvents);
      setFilteredRecords(allEvents);
      processBwIdStats(allEvents);
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
      setFilteredRecords(events);
      processBwIdStats(events);
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
      Notification.show('Please enter a Band Wrist ID', { position: 'bottom-center', theme: 'warning' });
      return;
    }
    
    // Filter the already loaded events by bwId
    const filtered = eventRecords.filter(record => 
      record.data?.bwId && record.data.bwId.includes(filterBwId)
    );
    
    setFilteredRecords(filtered);
    processBwIdStats(filtered);
    Notification.show(`Found ${filtered.length} events with Band Wrist ID containing: ${filterBwId}`, 
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
        setFilteredRecords(filtered);
        processBwIdStats(filtered);
        Notification.show(
          `Found ${filtered.length} events for Event ID: ${filterEventId} with Band Wrist ID containing: ${filterBwId}`, 
          { position: 'bottom-center', duration: 3000 }
        );
      } else {
        setFilteredRecords(events);
        processBwIdStats(events);
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
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">Band Wrist ID Dashboard</h2>
              <div className="bg-primary-50 text-primary border border-primary-100 rounded-md px-3 py-1 text-sm">
                <span className="font-semibold">{filteredRecords.length}</span> records retrieved
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>Total Unique BW IDs: <span className="font-bold">{totalBwIds}</span></div>
              <Select
                label="Display"
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value as 'top5' | 'all')}
                items={[
                  { label: 'Top 5', value: 'top5' },
                  { label: 'All', value: 'all' }
                ]}
              />
            </div>
          </div>

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
        </div>
      </Card>

      <div className="mb-4">
        <h2 className="text-xl font-bold mb-4">DynamoDB Event Records</h2>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <TextField
            label="Insert Event ID"
            value={filterEventId}
            onChange={(e) => setFilterEventId(e.target.value)} style={{width: '180px'}}
          />
          
          <div style={{ width: '20px' }}></div> {/* Spacer element for additional separation */}
          
          <TextField
            label="Insert Band Wrist ID"
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
      </div>

      {loading ? (
        <div className="flex justify-center p-4">Loading events...</div>
      ) : (
        <Grid
          items={filteredRecords}
          className="h-full"
          theme="row-stripes"
          allRowsVisible
        >
          <GridColumn path="eventId" header="Event ID" autoWidth />
          <GridColumn path="operation" header="Operation" autoWidth />
          <GridColumn path="data.bwId" header="BW ID" autoWidth />
          <GridColumn path="data.currentZone" header="Current Zone" autoWidth />
          <GridColumn path="data.preAssigned" header="Pre-Assigned" autoWidth />
          <GridColumn 
            header="Timestamp"
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
  );
}