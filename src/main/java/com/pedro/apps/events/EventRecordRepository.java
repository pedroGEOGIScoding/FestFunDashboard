package com.pedro.apps.events;

import java.util.List;

public interface EventRecordRepository {
  
  <T> T get(String partitionKey, String sortKey, Class<T> clazz);
  <T> T getAllOperations(String partitionKey, Class<T> clazz);
  <T> List<T> listByPartitionKey(String partitionKey, Class<T> clazz);
  <T> List<T> listByPartitionKeyAndSortKey(String partitionKey, String sortKey, Class<T> clazz);
  <T> List<T> listBySortKey(String sortKey, Class<T> clazz);
  <T> List<T> listAll(Class<T> clazz);
}