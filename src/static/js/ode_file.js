$(document).ready(function() {
  var ace = new Ace2Editor();
  ace.init("editorcontainer", "", function() {
    $("#editorloadingbox").hide();
    ace.focus();
    
    if (clientVars.scrollToLineNo) {
      ace.scrollToLineNo(clientVars.scrollToLineNo);
    }
  });
  ace.setProperty('stylenamespace', clientVars.userId);
  
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
  window.ode_comet = collab;
  
  var testor = new Testor(collab);
  
  var orgImportsWidget = makeOrgImportsWidget($, ace, function(selection) {
    collab.sendExtendedMessage({ type: "ORGIMPORTS_RESOLVED" , choices: selection});
  });
  
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
      setTimeout(function() {
        collab.sendExtendedMessage({ type: "ANNOTATIONS_REQUEST" });
        collab.sendExtendedMessage({ type: "TESTS_REQUEST", action: "state" });
      }, 0);
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
  collab.setOnExtendedMessage("CODECOMPLETE_PROPOSALS", function(msg) {
    ace.showCodeCompletionProposals(msg.offset, msg.proposals);
  });
  collab.setOnExtendedMessage("ANNOTATIONS", function(msg) {
    if (clientVars.userId == msg.userId) {
      ace.setAnnotations(msg.annotationType, msg.annotations);
    }
  });
  collab.setOnExtendedMessage("TEST_RESULT", function(msg) {
    testor.updateTest(msg.test, msg.result);
  });
  collab.setOnExtendedMessage("ORGIMPORTS_PROMPT", function(msg) {
    orgImportsWidget.handleOrgImportsResolve(msg.suggestion);
  });
  collab.setOnExtendedMessage("RENAME_REDIRECT", function(msg) {
    window.location = msg.data;
  })
  
  ace.addKeyHandler(function(event, char, cb, cmdKey) {
    if (( ! cb.specialHandled) && cmdKey && char == "s" &&
        (event.metaKey || event.ctrlKey)) {
      // cmd-S ("sync")
      event.preventDefault();
      if (collab.getChannelState() != "CONNECTED") {
        $("#syncstatuswarning").css('display', 'block');
        $("#syncstatuswarning").delay(2000).fadeOut(1000);
      }
      cb.specialHandled = true; 
    }
  });
  
  ace.addKeyHandler(function(event, char, cb, cmdKey) {
    if (( ! cb.specialHandled) && cmdKey && char == "f" &&
        (event.metaKey || event.ctrlKey) && event.shiftKey) {
      // shift-cmd-F (code formatting)
      event.preventDefault();
      collab.sendExtendedMessage({ type: "FORMAT_REQUEST" });
      cb.specialHandled = true;
    }
  });
  
  ace.addKeyHandler(function(event, char, cb, cmdKey) {
    if (( ! cb.specialHandled) && cmdKey && char == "o" &&
        (event.metaKey || event.ctrlKey) && event.shiftKey) {
      // shift-cmd-o (code formatting)
      event.preventDefault();
      collab.sendExtendedMessage({ type: "ORGIMPORTS_REQUEST" });
      cb.specialHandled = true;
    }
  });

  $("#format").click(function() {
    collab.sendExtendedMessage({ type: "FORMAT_REQUEST" });
    return false;
  });
  $("#orgimports").click(function() {
    collab.sendExtendedMessage({ type: "ORGIMPORTS_REQUEST" });
    return false;
  });
  $("#runtests").click(function() {
    collab.sendExtendedMessage({ type: "TESTS_RUN_REQUEST" });
    return false;
  });
});
