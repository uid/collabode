$(document).ready(function() {
  var ace = new Ace2Editor();
  ace.init("editorcontainer", "", function() {
    $("#editorloadingbox").hide();
    ace.focus();
  });
  
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
  
  collab.setOnInternalAction(function(action) {
    if (action == "commitPerformed") {
      $("#syncstatussyncing").css('display', 'block');
      //$("#syncstatusdone").css('display', 'none');
    } else if (action == "newlyIdle") {
      $("#syncstatussyncing").fadeOut(1000);
      //$("#syncstatussyncing").css('display', 'none');
      //$("#syncstatusdone").css('display', 'block').fadeOut(1000);
    }
  });
  collab.setOnChannelStateChange(function(state, info) {
    if (state == "CONNECTED") {
      $("#connstatusconnecting").css('display', 'none');
      $("#connstatusdisconnected").css('display', 'none');
    } else if (state == "DISCONNECTED") {
      $("#connstatusconnecting").css('display', 'none');
      $("#connstatusdisconnected").css('display', 'block');
    } else {
      $("#connstatusconnecting").css('display', 'block');
    }
  });
});
