function QueueStatusWidget(parent) {
  var widgetId = "#queue-status";
  var msgId = widgetId + "-msg";
  var helpButtonId = "#student-details-button-help";
  var resolveButtonId = "#student-details-button-remove";
  var $widget = $(widgetId);
  var $widgetMsg = $(msgId);
  var $helpButton = $(helpButtonId);
  var $resolveButton = $(resolveButtonId);
  var $parent = parent;
  
  /*=====================
   * Initialization code
   */
  function markHelping() {
    collab.sendExtendedMessage({
      type: "REQUEST_QUEUE_HELPING",
      username: $parent.data.user.username
    });    
  }
  $helpButton
    .bind("tap", markHelping)
    .click(markHelping);
  /*$resolveButton.click(function() {
    collab.sendExtendedMessage({
      type: "REQUEST_LEAVE_QUEUE",
      username: $parent.data.user.username);
    }
  }); // Done in parent*/
  
  /*=====================
   * Helper functions
   */
  
  
  /*===================
   * Public functions
   */
  this.updateQStatus = function(status) {    
    switch (status) {
    case 0:
      $widgetMsg.text("Not on the queue");
      $helpButton.hide();
      $resolveButton.hide();
      break;
    case 1:
      $widgetMsg.text("On the queue");
      $helpButton.show();
      $resolveButton.hide();
      break;
    case 2:
      $widgetMsg.text("Being helped");
      $helpButton.hide();
      $resolveButton.show();
      break;
    }
  }
  
  return this;
}