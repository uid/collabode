
$(document).ready(function() {
  window.ode_comet = getCometClient({
    userId: clientVars.userId,
    name: clientVars.userName
  });
});

/*
 * See collab_client.js.
 */

$(window).bind("load", function() {
  getCometClient.windowLoaded = true;
});

function getCometClient(initialUserInfo) {
  var socket;
  
  var callbacks = {
    onChannelStateChange: function() {},
    onExtendedMessage: {}
  };
  
  $(window).bind("unload", function() {
    if (socket) {
      socket.onclosed = function() {};
      socket.onhiccup = function() {};
      socket.disconnect(true);
    }
  });
  if ($.browser.mozilla) {
    $(window).bind("keydown", function(evt) { if (evt.which == 27) { evt.preventDefault() } });
  }
  
  function setUpSocket() {
    var socketId = String(Math.floor(Math.random()*1e12));
    socket = new WebSocket(socketId);
    socket.onmessage = handleMessageFromServer;
    socket.onclosed = function() {
      callbacks.onChannelStateChange("DISCONNECTED");
    };
    socket.onopen = function() {
      callbacks.onChannelStateChange("CONNECTED");
      sendMessage({ type:"CLIENT_READY", roomType:'nopad', roomName:'nopad/'+socketId, data: {
        userInfo: initialUserInfo
      } });
    };
    socket.connect();
  }
  function setUpSocketWhenWindowLoaded() {
    if (getCometClient.windowLoaded) {
      setUpSocket();
    } else {
      setTimeout(setUpSocketWhenWindowLoaded, 200);
    }
  }
  setTimeout(setUpSocketWhenWindowLoaded, 0);
  
  function sendMessage(msg) {
    socket.postMessage(JSON.stringify({ type: "COLLABROOM", data: msg }));
  }
  
  function handleMessageFromServer(evt) {
    if ( ! socket) { return; }
    if ( ! evt.data) { return; }
    var wrapper = JSON.parse(evt.data);
    if (wrapper.type != "COLLABROOM") { return; }
    var msg = wrapper.data;
    if (msg.type == "EXTENDED_MESSAGE") {
      if (callbacks.onExtendedMessage[msg.payload.type]) {
        callbacks.onExtendedMessage[msg.payload.type](msg.payload);
      }
    }
  }
  
  function sendExtendedMessage(msg) {
    sendMessage({ type: "EXTENDED_MESSAGE", payload: msg });
  }
  
  return {
    setOnChannelStateChange: function(cb) { callbacks.onChannelStateChange = cb; },
    setOnExtendedMessage: function(type, cb) { callbacks.onExtendedMessage[type] = cb; },
    sendExtendedMessage: sendExtendedMessage
  };
}
