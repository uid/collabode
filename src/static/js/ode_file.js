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
  
  var testor = new Testor();
  
  var collab = getCollabClient(ace,
                               clientVars.collab_client_vars,
                               user,
                               { },
                               testor);
  
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
      setTimeout(function() { collab.sendExtendedMessage({ type: "TESTS_REQUEST", action: "state" }); }, 0);
    } else if (state == "DISCONNECTED") {
      $("#connstatusconnecting").css('display', 'none');
      $("#connstatusdisconnected").css('display', 'block');
    } else {
      $("#connstatusconnecting").css('display', 'block');
    }
  });
  
  collab.setOnExtendedMessage("APPLY_CHANGESET_AS_USER", function(msg) {
    ace.applyChangesetAsUser(msg.changeset);
  });
  collab.setOnExtendedMessage("ORGIMPORTS_PROMPT", function(msg) {
    // XXX present the UI, then eventually send the message with choices
    alert("ORGIMPORTS_PROMPT"); // XXX
    collab.sendExtendedMessage({ type: "ORGIMPORTS_RESOLVED" }); // XXX
  });
  
  $("#format").click(function() {
    collab.sendExtendedMessage({ type: "FORMAT_REQUEST" });
    return false;
  });
  $("#orgimports").click(function() {
    collab.sendExtendedMessage({ type: "ORGIMPORTS_REQUEST" });
    return false;
  });
});
