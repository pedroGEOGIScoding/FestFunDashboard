import { ViewConfig } from '@vaadin/hilla-file-router/types.js';
import { useNavigate } from 'react-router';
import { useEffect, useState } from "react";
import { Grid } from '@vaadin/react-components';
import { GridColumn } from '@vaadin/react-components';
import { Button } from '@vaadin/react-components';
import { TextField } from '@vaadin/react-components';
import { Notification } from '@vaadin/react-components';
import { EventRecordEndpoint } from 'Frontend/generated/endpoints.js';

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

export default function DashboardView() {
  const navigate = useNavigate();
  const [eventRecords, setEventRecords] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterEventId, setFilterEventId] = useState('EVENT_050');
  const [filterOperation, setFilterOperation] = useState('');

  // Function to load all event records
  const fetchAllEvents = async () => {
    try {
      setLoading(true);
      const response = await EventRecordEndpoint.getEventsByEventId(filterEventId);
      const allEvents = response?.filter((event): event is EventRecord => !!event) || [];
      setEventRecords(allEvents);
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
      Notification.show(`Loaded ${events.length} events for Event ID: ${filterEventId}`, { position: 'bottom-center', duration: 3000 });
    } catch (error) {
      console.error('Error fetching events by Event ID:', error);
      Notification.show('Error loading events', { position: 'bottom-center', theme: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Function to load events by Operation
  const loadEventsByOperation = async () => {
    if (!filterOperation) {
      Notification.show('Please enter an Operation', { position: 'bottom-center', theme: 'warning' });
      return;
    }
    
    try {
      setLoading(true);
      const response = await EventRecordEndpoint.getEventsByOperation(filterOperation);
      const events = response?.filter((event): event is EventRecord => !!event) || [];
      setEventRecords(events);
      Notification.show(`Loaded ${events.length} events for Operation: ${filterOperation}`, { position: 'bottom-center', duration: 3000 });
    } catch (error) {
      console.error('Error fetching events by Operation:', error);
      Notification.show('Error loading events', { position: 'bottom-center', theme: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Function to load events by both Event ID and Operation
  const loadEventsByEventIdAndOperation = async () => {
    if (!filterEventId || !filterOperation) {
      Notification.show('Please enter both Event ID and Operation', { position: 'bottom-center', theme: 'warning' });
      return;
    }
    
    try {
      setLoading(true);
      const response = await EventRecordEndpoint.getEventsByEventIdAndOperation(filterEventId, filterOperation);
      const events = response?.filter((event): event is EventRecord => !!event) || [];
      setEventRecords(events);
      Notification.show(`Loaded ${events.length} events for Event ID: ${filterEventId} and Operation: ${filterOperation}`, 
        { position: 'bottom-center', duration: 3000 });
    } catch (error) {
      console.error('Error fetching events by Event ID and Operation:', error);
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
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-4">DynamoDB Event Records</h2>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <TextField
            label="Event ID"
            value={filterEventId}
            onChange={(e) => setFilterEventId(e.target.value)}
          />
          
          <TextField
            label="Operation"
            value={filterOperation}
            onChange={(e) => setFilterOperation(e.target.value)}
          />
          
          <div className="flex items-end gap-2">
            <Button theme="primary" onClick={fetchAllEvents}>
              Load All
            </Button>
            
            <Button theme="secondary" onClick={loadEventsByEventId}>
              Filter by Event ID
            </Button>
            
            <Button theme="secondary" onClick={loadEventsByOperation}>
              Filter by Operation
            </Button>
            
            <Button theme="secondary" onClick={loadEventsByEventIdAndOperation}>
              Filter by Both
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-4">Loading events...</div>
      ) : (
        <Grid
          items={eventRecords}
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