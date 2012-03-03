import("helpers");
import("utils.*");

import("sqlbase.sqlobj");

import("collab.collab_server");

jimport("collabode.mobile.Application");

jimport("java.lang.System");

var connectionIds = {};

var NOT_QUEUED = 0;
var QUEUED = 1;
var HELPED = 2;

function onStartup() {
  collab_server.setExtendedHandler("REQUEST_CONNECTION_ID", _onRequestConnectionId);
  collab_server.setExtendedHandler("REQUEST_ADD_TO_QUEUE", _onAddToQueue); // Deprecated
  collab_server.setExtendedHandler("REQUEST_QUEUE_HELPING", _onQueueHelping);
  collab_server.setExtendedHandler("REQUEST_LEAVE_QUEUE", _onLeaveQueue);
  collab_server.setExtendedHandler("REQUEST_STUDENT_DETAILS", _onRequestStudentDetails);
  collab_server.setExtendedHandler("REQUEST_EXCEPTION_TYPE", _onRequestExceptions);
}

/**************************
 * Message handlers
 */
function _onRequestConnectionId(padId, userId, connectionId, msg) {
  connectionIds[connectionId] = true;
  collab_server.sendConnectionExtendedMessage(connectionId, {
    type: "COLLAB_CONNECTION_ID",
    connectionId: connectionId
  });
}

// Deprecated
function _onAddToQueue(padId, userId, connectionId, msg) {
  collab_server.sendConnectionExtendedMessage(connectionId, {
    type: "ADD_TO_QUEUE",
    cardId: msg.cardId,
    username: msg.username
  });
}

function _onQueueHelping(padId, userId, connectionId, msg) {
  // Mark queue status in the db
  sqlobj.update("MBL_USERS", { userId: userId }, {
    queueStatus: HELPED
  });
}

function _onLeaveQueue(padId, userId, connectionId, msg) {
  // Mark queue status in the db
  sqlobj.update("MBL_USERS", { userId: userId }, {
    queueStatus: NOT_QUEUED
  });
  
  // Alert all clients
  for (var connectionId in connectionIds) {
    collab_server.sendConnectionExtendedMessage(connectionId, {
      type: "LEAVE_QUEUE",
      cardId: msg.cardId
    });
  }
}

function _onRequestStudentDetails(padId, userId, connectionId, msg) {
  // Collect student details and send a reply
  var user = sqlobj.selectSingle("MBL_USERS", {
    username: msg.username
  });
  var userRunLog = sqlobj.selectMulti("MBL_RUNLOG", {username: msg.username});
  var reply = {
      type: "STUDENT_DETAILS",
      cardId: msg.cardId,
      user: sqlobj.selectSingle("MBL_USERS", {
        username: msg.username
      }),
      runLog: userRunLog
  };
  //reply.user.runLog = userRunLog;
  collab_server.sendConnectionExtendedMessage(connectionId, reply);
}

/**
 * Respond to a client request for a list of distinct users who have
 * encountered a particular exception type. 
 * @param padId
 * @param userId
 * @param connectionId
 * @param msg
 */
function _onRequestExceptions(padId, userId, connectionId, msg) {
  var exceptionEntries = sqlobj.selectMulti("MBL_RUNLOG", {
    runException: msg.exceptionType
  });
  
  // Identify a unique list of users by searching through all logs that 
  // match this exception and creating a list of distinct elements
  // XXX: The Array object be sent over the collab channel (?)
  var userSet = new Array();
  var userList = [];
  for (var i in exceptionEntries) {
    //System.out.println(exceptionEntries[i].username + " " + exceptionEntries[i].runException);
    var username = exceptionEntries[i].username;
    if (userSet[username] == null) {
      userSet[username] = 1;
      userList.push(username);
    }
  }
  
  // Generate the server-to-client reply
  var reply = {
      type: "FILTERBY_EXCEPTION_TYPE",
      streamEventId: msg.streamEventId,
      exceptionType: msg.exceptionType,
      users: userList
  }
  collab_server.sendConnectionExtendedMessage(connectionId, reply);
}

/**************************
 * DB operations
 */

/**
 * Update the db entry for this user if they have 
 * logged in before, or else insert them if they are new.
 */
// XXX: This also checks for a photo each time, in case the
// photo was added later... do we want to do this here?
function doMobileLogin(userId, username) {
  var numUpdated = sqlobj.update("MBL_USERS", { 
      userId: userId,
      username: username
    }, { 
      photo: Application.getUserPhoto(username),
      lastActiveDate: new Date
    });
  if (numUpdated != 1) {
    sqlobj.insert("MBL_USERS", {
      userId: userId,
      username: username,
      photo: Application.getUserPhoto(username),
      lastActiveDate: new Date
    });
    //connectionId: 285223463783
    /*collab_server.sendConnectionExtendedMessage("does it really matter", {
      type: "USER_JOINED",
      user: sqlobj.selectSingle("MBL_USERS", {userId: userId, username: username})
    });*/
  }
}

/**
 * Update the runs-based statistics
 */
function updateRunStats(padId, userId) {
  var userObj = sqlobj.selectSingle("MBL_USERS", {userId: userId});
  // Increment the run count
  sqlobj.update("MBL_USERS", { userId: userId }, {
    runCount: userObj.runCount + 1
  });
  // Log the run timestamp
  var date = new Date();
  sqlobj.insert("MBL_RUNLOG", {
    padId: padId,
    userId: userId,
    username: userObj.username,
    runTime: '' + (Number(date.getTime())-18000000), // convert to EST
    runTimeString: date.toString()
  });
}

/**
 * Identify whether an exception is being written to the console
 */
function interceptException(padId, text) {  
  var javaLangIndex = text.indexOf("java.lang.");
  var exceptionIndex = text.indexOf("Exception", javaLangIndex);
  var exception = null;

  if (javaLangIndex >= 0 && exceptionIndex > javaLangIndex) {
    exception = text.substring(javaLangIndex, 
        exceptionIndex + "Exception".length);
  } 
  
  if (exception != null) {
    // Find the latest run log entry and update it.
    // TODO: Is there a better way to do this?
    var runLog = sqlobj.selectMulti("MBL_RUNLOG", { padId: padId }, {
      //orderBy: "-runException",
      //limit: 1
    });
    sqlobj.update("MBL_RUNLOG", { id: runLog[runLog.length-1].id }, {
      runException: exception
    });
  }
}

/**
 * Add a user to the help queue
 */
function addToHelpQueue(username) {
  // Mark queue status in the db
  sqlobj.update("MBL_USERS", { username: username }, {
    queueStatus: QUEUED
  });
  
  // Alert all clients
  for (var connectionId in connectionIds) {
    collab_server.sendConnectionExtendedMessage(connectionId, {
      type: "JOIN_QUEUE",
      username: username
    });
  }
}
