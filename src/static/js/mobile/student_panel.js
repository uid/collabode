function StudentPanel() {
  this.id = "#student-details-panel";
  this.obj = $(this.id);
  this.cardInfo = null;
  this.data = null;
  
  this.stream = EventStream(this);
  this.runPlot = PlotRenderer(this);
  
  var pollContinuously = false;
  
  this.getEventStream = function() {
    return this.stream;
  }
    
  this.updateTimer = null;
  this.show = function(cardInfo) {
    // This function only makes the request for the student data,
    // which is processed by the server and sent back via the
    // this.display() function.
    if (cardInfo != null) {
      this.cardInfo = cardInfo;
    }
    this.data = requestStudentDetails(this.cardInfo);
  }
  
  this.display = function() {
    var user = this.data.user;
    
    // Toggle off any buttons that may show as active
    // TODO: make this better
    $('a.filter').removeClass('ui-btn-active');
    
    // Set the user's information and photo
    this.obj.find("#username").text(user.username);
    this.obj.find("#photo").attr('src', user.photo);
    
    // Bind scroll events to the stream.
    // XXX: This is hardcoded.  Should be fixed =/
    //$("#student-details-panel-left").width($("#photo").width());
    $("#student-details-panel-left").width(300);

    // Update the event stream
    this.stream.updateStream(user.username);
    
    // Create figures
    _updateRunCount(this.obj, user.runCount);
    //_updateExceptionsList(this.obj, this.data.runLog);
    //_logRuns(this.obj, this.data);
    this.runPlot.update(this.data.runLog);
    
    // Poll continuously for updates (otherwise updates will be seen
    // on refresh)
    if (pollContinuously) {      
      this.updateTimer = setTimeout(this.show, 500, this.cardInfo);
    }
    
    // Show the panel
    this.obj.fadeIn(200);
    return this;
  }
  
  this.hide = function() {
    
    // Stop polling for updates
    clearTimeout(this.updateTimer);
    
    // Fade out the panel
    this.obj.fadeOut(200);
    
    // Unhighlight the card in the queue
    cardTray.unhighlightSelectedCard(); // XXX: is this necessary if we never actually see it?
    queue.unhighlightSelectedCard();
    
    // TODO: don't hard-code this, figure out which layout was active last
    $('#page-layout').addClass('ui-btn-active');
    return this;
  }
  
  this.showSimilarExceptions = function(msg) {
    this.stream.showUsersWithSimilarExceptions(msg);
  }
  
  this.obj.find('#student-details-button-close')
    .click( function() {
      //removeQuestionBadge(/* TODO: get selected card from queue, convert to card id, and unbadge-ify it */);
      details.hide();
    });
  
  this.obj.find('#student-details-button-remove')
    .click( function() {
      queue.remove(queue.getSelectedCard().attr('id'));
      details.hide();
    });
  
  return this;
}

/*=======================
 * Functions to create various types of graphs and tables
 * for the student details panel
 */
function _updateRunCount(obj, count) {
  obj.find("#stat-runcount").html(count);
}

function _updateExceptionsList(obj, runLog) {
  var exceptionsDiv = obj.find("#console-errors");
  _sizeToPanelWidth(exceptionsDiv);
  exceptionsDiv.empty();
  for (var i in runLog) {
    if (runLog[i].runException != null) {
      exceptionsDiv.append("<p class='exception'>" + runLog[i].runException + "</p>");
    }
  }
  $('p.exception').click(function() {
    //requestSimilarExceptions($(this).text());
  });
}

function _logRuns(obj, data) {
  var latestRunsDiv = obj.find("#latestRuns").empty();
  for (var i in data.runLog) {
    latestRunsDiv.append('<p>' + data.runLog[i].runTimeString + '</p>');
  }
}

function _sizeToPanelWidth(obj) {
  //obj.width(obj.parent().innerWidth());
  obj.width(300);
}

/*=======================
 * Functions to request other information
 */
function requestStudentDetails(cardInfo) {
  var request = cardInfo;
  request.type = "REQUEST_STUDENT_DETAILS";
  collab.sendExtendedMessage(request);
  return false;
}

function requestSimilarExceptions(streamEventId, exception) {
  collab.sendExtendedMessage({
      type: "REQUEST_EXCEPTION_TYPE",
      streamEventId: streamEventId,
      exceptionType: exception
  });
  return false;
}
