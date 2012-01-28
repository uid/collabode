function StudentPanel() {
  this.id = "#student-details-panel";
  this.obj = $(this.id);
  this.cardInfo = null;
  this.data = null;
  
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
    // Set the user's information and photo
    this.obj.find("#username").text(user.username);
    this.obj.find("#photo").attr('src', user.photo);
    
    // Create figures
    _updateRunCount(this.obj, user.runCount);
    //_logRuns(this.obj, this.data);
    _plotRuns(this.data.runLog);
    this.updateTimer = setTimeout(this.show, 500, this.cardInfo);
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
    // TODO: also unhighlight the card in the card tray
    queue.unhighlightSelectedCard();
    return this;
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

function _updateRunCount(obj, count) {
  obj.find("#stat-runcount").html(count);
}

function _logRuns(obj, data) {
  var latestRunsDiv = obj.find("#latestRuns").empty();
  for (var i in data.runLog) {
    latestRunsDiv.append("<p>" + data.runLog[i].runTimeString + "</p>");
  }
}

function _plotRuns(runLog) {
  var data = [];
  for (var i in runLog) {
    data.push([Number(runLog[i].runTime), 1]);
  }
  $("#graph-runCount").width($("#card-tray").innerWidth() - 50);
  $.plot($("#graph-runCount"), [{
    data: data,
    points: { show: true }
  }], {
    xaxis: {
      mode: "time",
      timeformat: "%h:%M%p",
      twelveHourClock: "true"
    },
    yaxis: { show: false }
  });
}

function requestStudentDetails(cardInfo) {
  var request = cardInfo;
  request.type = "REQUEST_STUDENT_DETAILS";
  collab.sendExtendedMessage(request);
  return false;
}
