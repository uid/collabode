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
}

function _onAddToQueue(padId, userId, connectionId, msg) {
  collab_server.sendConnectionExtendedMessage(connectionId, {
    type: "ADD_TO_QUEUE",
    cardId: msg.cardId,
    username: msg.username
  });
}

function taskAddToQueue() {
  // TODO?
}