$(document).ready(function() {
  
  var ace = new Ace2Editor();
  ace.init("editorcontainer", "", function() {
    $("#editorloadingbox").hide();
  });
  ace.setProperty("showslinenumbers", false);
  ace.setEditable(false);
  
  Layout.onResize = ace.adjustSize;
  
  var user = {
    userId: clientVars.userId,
    name: clientVars.userName
    // ip, colorId, userAgent
  };
  
  var collab = getCollabClient(ace,
                               clientVars.collab_client_vars,
                               user,
                               { });
  
  function onChannelStateChange(state, info) {
    if (state == "CONNECTED") {
      $("#connstatusconnecting").css('display', 'none');
      $("#connstatusdisconnected").css('display', 'none');
      setTimeout(function() { collab.sendExtendedMessage({ type: "RUN_REQUEST", action: "state" }); }, 0);
    } else if (state == "DISCONNECTED") {
      $("#connstatusconnecting").css('display', 'none');
      $("#connstatusdisconnected").css('display', 'block');
    } else {
      $("#connstatusconnecting").css('display', 'block');
    }
  }
  
  collab.setOnChannelStateChange(onChannelStateChange);
  collab.setOnExtendedMessage("RUN_STATE_CHANGE", function(msg) {
    switch(msg.state) {
    case 'launched':
      $("#launch").hide();
      $("#terminate").show();
      $("#runstatus").html("Running");
      break;
    case 'terminated':
      $("#terminate").hide();
      $("#launch").show();
      $("#runstatus").html("");
      break;
    }
  });
  $("#launch").click(function() {
    collab.sendExtendedMessage({ type: "RUN_REQUEST", action: 'launch' });
    return false;
  });
  $("#terminate").click(function() {
    collab.sendExtendedMessage({ type: "RUN_REQUEST", action: 'terminate' });
    return false;
  });
});
