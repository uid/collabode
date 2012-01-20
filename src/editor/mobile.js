import("collab.collab_server");

jimport("collabode.mobile.Application");

jimport("java.lang.System");

function onStartup() {
  collab_server.setExtendedHandler("MOBILE_C2S", function(padId, userId, connectionId, msg) {
    collab_server.sendConnectionExtendedMessage(connectionId, {
  	  type: "MOBILE_S2C",
  	  bar: msg.foo
  	});
  });
  collab_server.setExtendedHandler("REQUEST_ADD_TO_QUEUE", _onAddToQueue);
  collab_server.setExtendedHandler("REQUEST_STUDENT_DETAILS", _onRequestStudentDetails);
}

function _onAddToQueue(padId, userId, connectionId, msg) {
  collab_server.sendConnectionExtendedMessage(connectionId, {
    type: "ADD_TO_QUEUE",
    cardId: msg.cardId,
    username: msg.username
  });
}

function _onRequestStudentDetails(padId, userId, connectionId, msg) {
  // Collect student details and send a reply
  var reply = msg;
  reply.type = "STUDENT_DETAILS";
  collab_server.sendConnectionExtendedMessage(connectionId, reply);
}
