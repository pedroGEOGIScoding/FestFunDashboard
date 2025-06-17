package com.pedro.apps.events;

import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.ScanEnhancedRequest;

import java.util.List;
import java.util.stream.Collectors;

@Repository
public class EventRecordRepositoryImpl implements EventRecordRepository {
  
  private final DynamoDbEnhancedClient enhancedClient;
  private final String tableName = "TestingEvent_050";
  
  public EventRecordRepositoryImpl(DynamoDbEnhancedClient enhancedClient) {
    this.enhancedClient = enhancedClient;
  }
  
  @Override
  public <T> T get(String partitionKey, String sortKey, Class<T> clazz) {
    DynamoDbTable<T> table = enhancedClient.table(tableName, TableSchema.fromBean(clazz));
    Key key = Key.builder()
        .partitionValue(partitionKey)
        .sortValue(sortKey)
        .build();
    return table.getItem(key);
  }
  
  @Override
  public <T> List<T> listByPartitionKey(String partitionKey, Class<T> clazz) {
    DynamoDbTable<T> table = enhancedClient.table(tableName, TableSchema.fromBean(clazz));
    QueryConditional queryConditional = QueryConditional.keyEqualTo(k -> k.partitionValue(partitionKey));
	List<T> items = new java.util.ArrayList<>();
	table.query(queryConditional).items().forEach(items::add);
	return items;
  }
  
  @Override
  public <T> List<T> listByPartitionKeyAndSortKey(String partitionKey, String sortKey, Class<T> clazz) {
    DynamoDbTable<T> table = enhancedClient.table(tableName, TableSchema.fromBean(clazz));
    QueryConditional queryConditional = QueryConditional.keyEqualTo(Key.builder()
        .partitionValue(partitionKey)
        .sortValue(sortKey)
        .build());
    return table.query(queryConditional)
        .items()
        .stream()
        .collect(Collectors.toList());
  }
  
  @Override
  public <T> List<T> listBySortKey(String sortKey, Class<T> clazz) {
    DynamoDbTable<T> table = enhancedClient.table(tableName, TableSchema.fromBean(clazz));
    // DynamoDB doesn't support querying by sort key alone, so we need to scan and filter
    return table.scan()
        .items()
        .stream()
        .filter(item -> {
            try {
                // This assumes there's a method in the class to get the sort key value
                // Adjust according to your actual bean structure
                return sortKey.equals(item.getClass().getMethod("getSortKey").invoke(item));
            } catch (Exception e) {
                return false;
            }
        })
        .collect(Collectors.toList());
  }
  
  @Override
  public <T> List<T> listAll(Class<T> clazz) {
    DynamoDbTable<T> table = enhancedClient.table(tableName, TableSchema.fromBean(clazz));
    return table.scan()
        .items()
        .stream()
        .collect(Collectors.toList());
  }
}