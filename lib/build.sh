#!/bin/bash

export JAVA_HOME="/System/Library/Frameworks/JavaVM.framework/Versions/1.6/Home"
export SCALA_HOME="/Users/maxg/Source/scala-2.7.7.final"
export JAVA="$JAVA_HOME/bin/java"
export SCALA="$SCALA_HOME/bin/scala"
export PATH="$JAVA_HOME/bin:$SCALA_HOME/bin:$PATH"
export MYSQL_CONNECTOR_JAR="/Users/maxg/Source/etherpad/mysql-connector-java-5.1.8-bin.jar"

bin/rebuildjar.sh
