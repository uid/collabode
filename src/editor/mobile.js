import("helpers");
import("utils.*");

import("sqlbase.sqlobj");

import("collab.collab_server");

jimport("collabode.mobile.Application");

jimport("java.lang.System");

function onStartup() {
  collab_server.setExtendedHandler("REQUEST_ADD_TO_QUEUE", _onAddToQueue);
  collab_server.setExtendedHandler("REQUEST_STUDENT_DETAILS", _onRequestStudentDetails);
}

/**************************
 * Message handlers
 */
function _onAddToQueue(padId, userId, connectionId, msg) {
  collab_server.sendConnectionExtendedMessage(connectionId, {
    type: "ADD_TO_QUEUE",
    cardId: msg.cardId,
    username: msg.username
  });
}

function _onRequestStudentDetails(padId, userId, connectionId, msg) {
  // Collect student details and send a reply
  var user = sqlobj.selectSingle("MBL_USERS", {
    username: msg.username
  });
  var userRunLog = sqlobj.selectMulti("MBL_RUNLOG", {userId: userId});
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
      lastActiveDate: new Date()
    });
  if (numUpdated != 1) {
    sqlobj.insert("MBL_USERS", {
      userId: userId,
      username: username,
      photo: Application.getUserPhoto(username),
      lastActiveDate: new Date()
    });
  }
}

/**
 * Update the runs-based statistics
 */
function updateRunStats(userId) {
  var userObj = sqlobj.selectSingle("MBL_USERS", {userId: userId});
  System.out.println("userObj runcount: " + userObj.runCount);
  // Increment the run count
  sqlobj.update("MBL_USERS", { userId: userId }, {
    runCount: userObj.runCount + 1
  });
  // Log the run timestamp
  sqlobj.insert("MBL_RUNLOG", { 
    userId: userId,
    runTime: new Date().toString()
  });
}
