/*****************
 * Implementation of the mobile instructor UI tray that
 * contains the help queue, and related functions.
 */
function QueueTray() {
  /* Object attributes */
  this.id = "#queue-tray";
  this.obj = $(this.id);
  
  this.width = 0;
  this.visible = true;
  
  this.qcardw = 75;
  this.qcardh = 100;
  
  /* Initialization code */
  this.obj
    .height($("#content").height() - $("#header").height())
    // Set the width relative to the cards
    .width(this.qcardw + 16)
    .css("top", $("#header").height());

  this.width = this.obj.outerWidth();
  
  /* Object functions */
  this.show = function() {
    this.obj.animate({ 
      left: parseInt(this.obj.css('left')) == 0 
        ? -this.width
        : 0
    });
    this.visible = !(this.visible);
  }
  
  this.add = function(cardId) {
    // Create a data object for event handlers
    var cardData = { 
        cardId: cardId,
        username: $('#'+cardId).attr("data-username")
        };
    
    // Only add the card to the queue if it isn't already queued
    if (!$(qCardId(cardId)).length) {
      attachQuestionBadge(cardId);
      var cardCopy = $('#' + cardId).clone()
        .attr('id', cardId+'q')
        .removeClass('card')
        .addClass('qcard')
        .css("width", this.qcardw)
        .css("height", this.qcardh)
        .css("position", "relative")
        .css("top", 0)
        .css("left", 0)
        .fadeTo(200, 1.0)
        .click( cardData, _showStudentInfo );
        //.mousemove( cardData, _removeCard );
      this.obj.append(cardCopy);
    }
  }
  
  this.remove = function(cardId) {
    console.log("removing", cardId);
    removeQuestionBadge(cardId);
    $('#'+cardId).fadeOut(200).remove();
  }
  
  this.unhighlightSelectedCard = function() {
    $('.qcard.selected')
      .removeClass('selected')
      .css('-mox-box-shadow', 'none')
      .css('-webkit-box-shadow', 'none')
      .css('box-shadow', 'none');
  }
  
  this.highlightCard = function(cardId) {
    this.unhighlightSelectedCard();
    $("#"+cardId)
      .addClass('selected')
      .css('-mox-box-shadow', '0px 0px 20px #FFCC33')
      .css('-webkit-box-shadow', '0px 0px 20px #FFCC33')
      .css('box-shadow', '0px 0px 20px #FFCC33');
  }
  
  this.getSelectedCard = function() {
    return this.obj.find('.qcard.selected');
  }
}

function qCardId(cardId) {
  return "#{0}q".format(cardId);
}

function _showStudentInfo(e) {
  details.show({
    cardId: $(this).attr('id'),
    username: $(this).attr('data-username')
  });
}

function _removeCard(e) {
  removeQuestionBadge(e.data.cardId);
  $(this).fadeOut(200).remove();
}