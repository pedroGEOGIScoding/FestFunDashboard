package com.pedro.apps.events;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;

@DynamoDbBean
public class EventRecord {
  
  private String eventId; //This is the partition key
  private String operation; //This is the sort key
  private Data data;
  
  @DynamoDbPartitionKey
  public String getEventId() {
	return eventId;
  }
  public void setEventId(String eventId) {
	this.eventId = eventId;
  }
  
  @DynamoDbSortKey
  public String getOperation() {
	return operation;
  }
  public void setOperation(String operation) {
	this.operation = operation;
  }
  
  @DynamoDbAttribute("data")
  public Data getData() {
	return data;
  }
  public void setData(Data data) {
	this.data = data;
  }
  
  @DynamoDbBean
  public static class Data {
	private String bwId;
	private String currentZone;
	private Boolean preAssigned;
	private Long timestamp;
	private Integer totalBWIdQty;
	private String type;
	private double lat;
	private double lon;
	
	@DynamoDbAttribute("bwId")
	public String getBwId() {
	  return bwId;
	}
	public void setBwId(String bwId) {
	  this.bwId = bwId;
	}
	
	@DynamoDbAttribute("currentZone")
	public String getCurrentZone() {
	  return currentZone;
	}
	public void setCurrentZone(String currentZone) {
	  this.currentZone = currentZone;
	}
	
	@DynamoDbAttribute("preAssigned")
	public Boolean getPreAssigned() { return preAssigned;}
	public void setPreAssigned(Boolean preAssigned) {
	  this.preAssigned = preAssigned;
	}
	
	@DynamoDbAttribute("timestamp")
	public Long getTimestamp() {
	  return timestamp;
	}
	public void setTimestamp(Long timestamp) {
	  this.timestamp = timestamp;
	}
	
	@DynamoDbAttribute("totalBWIdQty")
	public Integer getTotalBWIdQty() {
	  return totalBWIdQty;
	}
	public void setTotalBWIdQty(Integer totalBWIdQty) {
	  this.totalBWIdQty = totalBWIdQty;
	}
	
	@DynamoDbAttribute("type")
	public String getType() {
	  return type;
	}
	public void setType(String type) {
	  this.type = type;
	}
	
	@DynamoDbAttribute("lat")
	public double getLat() { return lat; }
	public void setLat(double lat) { this.lat = lat; }
	
	@DynamoDbAttribute("lon")
	public double getLon() { return lon; }
	public void setLon(double lon) { this.lon = lon; }
  }
  
  //Constructors
  public EventRecord(String eventId) {
	this.eventId = eventId;
  }
  
  public EventRecord() {
  }
  
  public EventRecord(String eventId, String operation, Data data) {
	this.eventId = eventId;
	this.operation = operation;
	this.data = data;
  }
  
  @Override
  public String toString() {
	return "EventRecord{" +
		"eventId='" + eventId + '\'' +
		", operation='" + operation + '\'' +
		", data=" + data +
		'}';
  }
}