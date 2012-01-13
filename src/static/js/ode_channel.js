$(document).ready(function() {
  var ace = {
    setProperty: function() {},
    setBaseAttributedText: function() {},
    setUserChangeNotificationCallback: function() {},
    setRequestCodeCompletion: function() {},
    displaySelection: function() {}
  }
  
  var user = {
    userId: clientVars.userId,
    name: clientVars.userName
    // ip, colorId, userAgent
  };
  
  var collab = getCollabClient(ace,
                               clientVars.collab_client_vars,
                               user,
                               { });
  
  // XXX debug
  collab.setOnChannelStateChange(function(state, info) {
    if (state == "CONNECTED") {
      console.log("connected");
    } else if (state == "DISCONNECTED") {
      console.log("disconnected");
    } else {
      console.log("connecting");
    }
  });
  
  // XXX debug
  collab.setOnExtendedMessage("SERVER_TO_CLIENT_MSG", function(msg) {
    console.log("received SERVER_TO_CLIENT_MSG", msg);
  });
  
  // XXX debug
  $("#footerbar").click(function() {
    console.log("sending CLIENT_TO_SERVER_MSG");
    collab.sendExtendedMessage({ type: "CLIENT_TO_SERVER_MSG", foo: 42 });
    return false;
  });
});
