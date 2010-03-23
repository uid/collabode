$(document).ready(function() {
  var ace = new Ace2Editor();
  ace.init("editorcontainer", "", function() {
    $("#editorloadingbox").hide();
    ace.focus();
  });
  
  var pad = {
      
    onResize: function() {
      $(".autoresized").height($(window).height() - $("#editorcontainerbox").offset().top - 60);
      ace.adjustSize();
    },
    
    onCollabAction: function(action) {
      if (action == "commitPerformed") {
        $("#syncstatussyncing").css('display', 'block');
        //$("#syncstatusdone").css('display', 'none');
      } else if (action == "newlyIdle") {
        $("#syncstatussyncing").fadeOut(1000);
        //$("#syncstatussyncing").css('display', 'none');
        //$("#syncstatusdone").css('display', 'block').fadeOut(1000);
      }
    },
    
    onChannelStateChange: function(state, info) {
      if (state == "CONNECTED") {
        $("#connstatusconnecting").css('display', 'none');
        $("#connstatusdisconnected").css('display', 'none');
      } else if (state == "DISCONNECTED") {
        $("#connstatusdisconnected").css('display', 'block');
      } else {
        $("#connstatusconnecting").css('display', 'block'); // XXX can this happen?
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
  
  var testor = new Testor();
  
  var collab = getCollabClient(ace,
                               clientVars.collab_client_vars,
                               user,
                               { },
                               testor);
    
  collab.setOnInternalAction(pad.onCollabAction);
  collab.setOnChannelStateChange(pad.onChannelStateChange);
});