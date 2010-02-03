$(document).ready(function() {
  var ace = new Ace2Editor();
  ace.init("editorcontainer", "", function() {
    $("#editorloadingbox").hide();
    ace.focus();
  });
  
  var pad = {
      
    onResize: function() {
      $("#editorcontainerbox").height($(window).height() - $("#editorcontainerbox").offset().top - 60);
      ace.adjustSize();
    },
    
    onCollabAction: function(action) {
      if (action == "commitPerformed") {
        $("#syncstatussyncing").css('display', 'block');
        $("#syncstatusdone").css('display', 'none');
      } else if (action == "newlyIdle") {
        $("#syncstatussyncing").css('display', 'none');
        $("#syncstatusdone").css('display', 'block').fadeOut(1000);
      }
    }
    
  };
  
  $(window).bind('resize', pad.onResize);
  pad.onResize();
  setInterval(function() { pad.onResize(); }, 5000); // XXX just in case?
  
  var user = {
    userId: clientVars.userId,
    name: clientVars.userName,
    // ip, colorId, userAgent
  };
  
  var collab = getCollabClient(ace,
                               clientVars.collab_client_vars,
                               user,
                               { });
    
  collab.setOnInternalAction(pad.onCollabAction);
});