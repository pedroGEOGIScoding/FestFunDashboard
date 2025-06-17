package com.pedro.apps.events;

import com.vaadin.flow.server.auth.AnonymousAllowed;
import com.vaadin.hilla.Endpoint;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

@Endpoint
@AnonymousAllowed
public class EventRecordEndpoint {
  
  private final EventRecordRepository eventRecordRepository;
  
  @Autowired
  public EventRecordEndpoint(EventRecordRepository eventRecordRepository) {
	this.eventRecordRepository = eventRecordRepository;
  }
  
  public EventRecord getEvent(String eventId, String operation) {
    return eventRecordRepository.get(eventId, operation, EventRecord.class);
  }
  
  public List<EventRecord> getAllEvents() {
    return eventRecordRepository.listAll(EventRecord.class);
  }
  
  public List<EventRecord> getEventsByEventId(String eventId) {
    return eventRecordRepository.listByPartitionKey(eventId, EventRecord.class);
  }
  
  public List<EventRecord> getEventsByOperation(String operation) {
    return eventRecordRepository.listBySortKey(operation, EventRecord.class);
  }
  
  public List<EventRecord> getEventsByEventIdAndOperation(String eventId, String operation) {
    return eventRecordRepository.listByPartitionKeyAndSortKey(eventId, operation, EventRecord.class);
  }
}