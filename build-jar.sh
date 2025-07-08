#!/bin/bash

# Set Java 21 as JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

# Clean and build the project with production profile
./mvnw clean package -Pproduction

echo "Build completed. JAR file is located in the target directory."
