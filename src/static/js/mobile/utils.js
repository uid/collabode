/************************
 * Miscellaneous util functions
 */
// Format string implementation
String.prototype.format = function() {
  var args = arguments;
  return this.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined'
      ? args[number]
      : match
      ;
  });
};

/************************
 * Message-passing functions
 */

/*************************
 * Card helper functions
 * ---------------------
 * Card IDs are assumed to be in the form 'card-#'
 * 
 */
var CARD_ID_PREFIX = 'card-'

function assignCardId(card, i) {
  card.attr('id', "{0}{1}".format(CARD_ID_PREFIX, i));
}

function getCardNum(cardId) {
  return cardId.substring(CARD_ID_PREFIX.length, cardId.lastIndexOf('-'));
}

function getCardUsername(cardId) {
  return cardId.substring(cardId.lastIndexOf('-')+1, cardId.length);
}

function getCardId(num) {
  return CARD_ID_PREFIX + num;
}

function attachQuestionBadge(cardId) {
  var cardBadge = $('#' + cardId).find('div.badge');
  if (!(cardBadge.has('img').length)) {
    cardBadge.append('<img src="static/img/mobile/question-orange.png">');
  }
}

function removeQuestionBadge(cardId) {
  $('#' + cardId).find('div.badge img').remove();
}

/************************
 * Testing and debugging functions
 */
//Set some random events for testing the ui
function startRandomEvents() {
  var numCards = -1; // set to -1 to add infinitely
  var queueAdder = setInterval(function() {
    // Randomly choose an ID to ask a question
    randomId = Math.floor(Math.random()*30);
    var cardId = getCardId(randomId);
    //attachQuestionBadge(cardId);
    collab.sendExtendedMessage({ 
      type: "REQUEST_ADD_TO_QUEUE", 
      cardId: cardId,
      username: $('#'+cardId).attr('username')
    });
    
    // Randomly choose an ID to remove a question from, if it has one
    randomId = Math.floor(Math.random()*30);
    if ($("#" + getCardId(randomId)).find("div.badge").has("img").length) {
      removeQuestionBadge(getCardId(randomId));
    }
    if (numCards != -1) {      
      numCards--;
      if (numCards == 0) {
        clearInterval(queueAdder);
      }
    }
  }, 5000);
}
