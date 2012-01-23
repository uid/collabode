function StudentPanel() {
  this.id = "#student-details-panel";
  this.obj = $(this.id);
  
  this.show = function(cardInfo) {
    // This function only makes the request for the student data,
    // which is processed by the server and sent back via the
    // this.display(data) function.
    this.data = requestStudentDetails(cardInfo);
  }
  
  this.display = function(data) {
    var user = $.parseJSON(data.user);
    console.log("user", user);
    // Set the user's information and photo
    this.obj.find("#username").text(user.username);
    this.obj.find("#photo").attr('src', user.photo);
    
    this.obj.find("#stat-runcount").html(user.stats.runCount);
    //this.obj.find("#latestRuns").append(user.stats.runLog[user.stats.runLog.length-1]);

    // Create any necessary figures
    //createPlot(this.data);
    // Show the panel
    this.obj.fadeIn(200);
    return this;
  }
  
  this.hide = function() {
    this.obj.fadeOut(200);
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
      console.log("selected card", queue.getSelectedCard());
      queue.remove(queue.getSelectedCard().attr('id'));
      details.hide();
    });
  
  return this;
}

function retrieveSampleData() {
  var d1 = [];
  for (var i = 0; i < 14; i += 0.5)
      d1.push([i, Math.sin(i)]);

  var d2 = [[0, 3], [4, 8], [8, 5], [9, 13]];

  var d3 = [];
  for (var i = 0; i < 14; i += 0.5)
      d3.push([i, Math.cos(i)]);

  var d4 = [];
  for (var i = 0; i < 14; i += 0.1)
      d4.push([i, Math.sqrt(i * 10)]);
  
  var d5 = [];
  for (var i = 0; i < 14; i += 0.5)
      d5.push([i, Math.sqrt(i)]);

  var d6 = [];
  for (var i = 0; i < 14; i += 0.5 + Math.random())
      d6.push([i, Math.sqrt(2*i + Math.sin(i) + 5)]);
  
  return {d1: d1, d2: d2, d3: d3, d4: d4, d5: d5, d6: d6};
}

function createSamplePlot(data) {
  $.plot($("#placeholder"), [
      {
          data: data.d1,
          lines: { show: true, fill: true }
      },
      {
          data: data.d2,
          bars: { show: true }
      },
      {
          data: data.d3,
          points: { show: true }
      },
      {
          data: data.d4,
          lines: { show: true }
      },
      {
          data: data.d5,
          lines: { show: true },
          points: { show: true }
      },
      {
          data: data.d6,
          lines: { show: true, steps: true }
      }
  ]);
}

function requestStudentDetails(cardInfo) {
  var request = cardInfo;
  request.type = "REQUEST_STUDENT_DETAILS";
  console.log("request", request);
  collab.sendExtendedMessage(request);
  return false;
}

function createPlot(data) {
  // TODO
}