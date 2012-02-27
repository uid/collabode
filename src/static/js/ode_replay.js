$(document).ready(function() {
  
  var ace = new Ace2Editor();
  ace.init("editorcontainer", "", function() {
    $("#editorloadingbox").hide();
  });
  ace.setProperty("showslinenumbers", false);
  ace.setProperty("autoscroll", true);
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
  
  // does something need to be done here?
  collab.setOnExtendedMessage("REPLAY", function(msg) {
    console.log("replay");
  });
  
  // ask to initiate the replay!
  collab.sendExtendedMessage({ type: "REPLAY" });
  
});
