var cardw;
var cardh;

$(document).ready(function() {
  var ace = {
    setProperty: function() {},
    setBaseAttributedText: function() {},
    setUserChangeNotificationCallback: function() {},
    setRequestCodeCompletion: function() {},
    displaySelection: function() {}
  }
  
  var user = {
    userId: clientVars.userId,
    name: clientVars.userName
    // ip, colorId, userAgent
  };
  
  var collab = getCollabClient(ace,
                               clientVars.collab_client_vars,
                               user,
                               { });
  
  // XXX debug
  collab.setOnChannelStateChange(function(state, info) {
    if (state == "CONNECTED") {
      console.log("connected");
    } else if (state == "DISCONNECTED") {
      console.log("disconnected");
    } else {
      console.log("connecting");
    }
  });
  
  setExtendedMessages(collab);
  
  // XXX this is an example
  /*$("#details").click(function() {
    console.log("sending MOBILE_C2S");
    collab.sendExtendedMessage({ type: "MOBILE_C2S", foo: 42 });
    return false;
  });*/
  
  //TODO: Replace with stored card sizes; this is a temporary workaround
  cardw = $('.card').width();
  cardh = $('.card').height();
  
  // Initialize the mobile application
  init();
  // XXX: This is for testing and prototype purposes only!
  startRandomEvents(collab);
});

/***************************************
 * Message boxes
 */
var NOT_IMPLEMENTED = "Not implemented";

/***************************************
 * Server-to-client message definitions
 */
function setExtendedMessages(collab) {
  // XXX: this one is an example
  collab.setOnExtendedMessage("MOBILE_S2C", function(msg) {
    console.log("received MOBILE_S2C", msg);
  });
  // Request for a card to be added to the help queue
  collab.setOnExtendedMessage("ADD_TO_QUEUE", _addToQueue);
}

function _addToQueue(msg) {
  // Only add the card to the queue if it isn't already queued
  if (!$('#{0}q'.format(msg.cardId)).length) {
    attachQuestionBadge(msg.cardId);
    var cardCopy = $('#' + msg.cardId).clone()
      .attr('id', msg.cardId+'q')
      .removeClass('card')
      .addClass('qcard')
      .css("width", cardw)
      .css("height", cardh)
      .css("position", "relative")
      .css("top", 0)
      .css("left", 0)
      .fadeTo(200, 1.0)
      .click(function() {
        removeQuestionBadge(msg.cardId);
        $(this).fadeOut(200).remove();
      });
    $('#queue-tray').append(cardCopy);
  }
}

/*************************
 * Card helper functions
 * ---------------------
 * Card IDs are assumed to be in the form 'card-#-username'
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

function resetCards() {
  $('.card')
		.width(cardw) // TODO: don't hardcode this
		.height(cardh); // TODO: don't hardcode this
  var cards = $('.card');
  $('div#card-tray').children().detach();
  cards.appendTo('div#card-tray');
  cards.show();
}

function isFilterApplied() {
  $('a.filter').each(function() {
    if ($('#'+this.id).hasClass('applied')) {
      return true;
    }
  });
  return false;
}

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
 * Initialization methods
 */
function initCards() {
  // reassign ids to each card
  $('.card').each( function(i) {
  	assignCardId($(this), i);
  })
  // handle clicks
  .dblclick( function() {
    // TODO: open up an individual page
    //window.location.href = 'student.php?id=' + 
  	//encodeURIComponent($(this).attr('username'));
  });

  // make each card draggable
  $('.card').draggable({
  	containment: 'window',
  	stack: '.card'
  });
  /*.touch({
    animate: false,
    sticky: false,
    dragx: true,
    dragy: true,
    rotate: false,
    resort: true,
    scale: false
    });*/
}

var appliedFilter = false; // TODO: make this null or the applied filter, not a boolean
function initFilters() {
  // Assign behavior to fade out cards that don't match the selected filter.
  // For cards, 'selected' and 'hidden' are complementary class names that
  // make it easier to select them with JQuery
  $('a.filter').click(function() {
  	// Clear 'selected' attribute from filter buttons
  	$(this).siblings().removeClass('selected');

  	// If a filter has been 'applied' (i.e. the user has clicked 'View details'),
  	// then clear everything but the cards
  	// TODO: This needs to be more well-engineered
  	if (appliedFilter) {
      // Clear whatever filter may be applied
      $('a.filter').removeClass('applied');
      appliedFilter = false;
      resetCards();
  	}
  
  	// Reset card attributes
  	$('.card')
      .draggable("option", "disabled", false)
      .addClass('selected')
      .removeClass('hidden')
      .css('clear', 'none')
      .fadeTo(200, 1.0);

  	// Reevaluate the filter if the filter isn't the currently selected one,
  	// otherwise just clear the selected filter
  	if (!$(this).hasClass('selected')) {
      $(this).addClass('selected');
  
      // TODO: REPLACE
      // Randomly pick some number of cards to be filtered
      randomNumCards = Math.floor(Math.random()*5) + 30;
      for (i = 0; i < randomNumCards; i++) {
    		randomId = Math.floor(Math.random()*30);
    
    		// Fade out this card if it does not match the filter
    		$('#'+getCardId(randomId))
  		    .removeClass('selected')
  		    .addClass('hidden')
  		    .fadeTo(300, 0.3);
	    }
  	} else {
  	    $(this).removeClass('selected');
  	}
  });

  // TODO: Temporary: disable the 'View details' buttons for unimplemented filter types
  /*$('a.filter.unimplemented').click(function() {
    $('#details').button('disable');
  });*/

  // Assign specific behaviors for each filter when the "View details"
  // button is clicked
  $('#details').click(function() {
  	// Figure out which filter is selected.
  	// TODO: This only allows one filter to be selected at a time.
  	// Consider saving which filter is selected to just reference it.
  	if ($('#filter-tests').hasClass('selected')) {
	    if (!($('#filter-tests').hasClass('applied'))) {
    		// Apply the right classes
    		$('#filter-tests').addClass('applied');
    		appliedFilter = true;
    		
    		// Recalculate card properties and wrap with test grids
    		height = $(window).height() / ($('.card.selected').length + 2); // TODO: don't hardcode this!!
    		scale = cardh/height; 
    		width = cardw/scale;
  		
    		$('.card')
  		    .css('display', 'visible')
  		    .draggable("option", "disabled", true);
    		$('.card.hidden').hide();
    		$('.card.selected')
  		    .height(height)
  		    .width(width)
  		    .wrap('<div class="test-progress-div"/>');
    		
    		// TODO: replace with code sent from the server
    		var testProgressBar = '<div class="test-progress-grid"><table><tr>';
    		for (var i = 0; i < 10; i++) {
  		    testProgressBar += '<td>' + (i+1) + '</td>';
    		}
    		testProgressBar += '</tr></table></div>'
  
    		$('.test-progress-div')
  		    .append(testProgressBar)
  		    .height(height)
    	    .css('clear', 'both')
  		    .children().height(height - 4); // TODO: don't hardcode
    		$('.test-progress-div table tr').each( function(i) {
  		    $(this).children().each( function(j) {
      			if (j < 2) {
    			    $(this).css('background-color', '#33CC33');
      			}
  		    });
    		});
      } else {
      	$('#filter-tests').removeClass('applied');//.click();
      	appliedFilter = false;
      	resetCards();
      }
  	} else {
  	  $("#debugbar").html(NOT_IMPLEMENTED).fadeIn(400);
  	  setTimeout('$("#debugbar").fadeOut(400)', 2000);
  	    // If an action hasn't been defined for a filter, do nothing
  	}
  });	
}

function initHelpQueue() {
  // Help queue tray
  $('#queue-tray')
    .height($("#content").height() - $("#header").height())
    // Set the width relative to the cards
    .width($('.card').width() + 16)
    .css("top", $("#header").height());
  
  var queueTrayWidth = $('#queue-tray').outerWidth();
  
  // Card tray
  // Takes up the rest of the space that the queue tray doesn't
  $('#card-tray').width(parseInt($('#queue-tray').css('left')) == 0
      ? $(window).width() - $('#queue-tray').outerWidth()
      : $(window).width()
  );
  
  // 'Help Queue' button
  $('#queue-toggle').click( function() {
    var $buttonText = $(this).find(".ui-btn-text");
    $buttonText.text( 
        $buttonText.text() == 'Show Queue' 
          ? 'Hide Queue' 
          : 'Show Queue' 
        );
    var $queue = $('#queue-tray');
    $queue.animate({ 
      left: parseInt($queue.css('left')) == 0 
        ? -queueTrayWidth
        : 0
    });
    // Modify the card tray width and scale the card
    // sizes within it to preserve layout IF THERE IS NO
    // FILTER APPLIED
    var oldWidth = $('#card-tray').width();
    var newWidth = (parseInt($queue.css('left')) == 0)
        ? $(window).width()
        : $(window).width() - queueTrayWidth;
    $('#card-tray').animate({
      width: newWidth
    });
    
    //console.log("is filter applied?", isFilterApplied());
    if (!(isFilterApplied())) {
      var scale = oldWidth/newWidth;
      $('.card').animate({
        /*width: Math.max(cardw, $('.card').width()/scale), //TODO: if you do this too many times it shrinks, why??
        height: Math.max(cardh, $('.card').height()/scale)*/
        width: $('.card').width()/scale, //TODO: if you do this too many times it shrinks, why??
        height: $('.card').height()/scale
      });
    }
  });
}

var fixgeometry = function() {
  /* Some orientation changes leave the scroll position at something
   * that isn't 0,0. This is annoying for user experience. */
  scroll(0, 0);
  
  /* Calculate the geometry that our content area should take */
  var header = $(".header:visible");
  var footer = $(".footer:visible");
  var content = $(".content:visible");
  var viewport_height = $(window).height();
  
  var content_height = viewport_height - header.outerHeight() - footer.outerHeight();
  
  /* Trim margin/border/padding height */
  content_height -= (content.outerHeight() - content.height());
  content.height(content_height);
}; /* fixgeometry */


// MAIN INIT FUNCTION
function init() {

  $(document).bind("mobileinit", function(){
    $.mobile.touchOverflowEnabled = true;
  });

  /*$(document).ready(function() {
    $(window).bind("orientationchange resize pageshow", fixgeometry);
  });*/
  
  initCards();
  initFilters();
  initHelpQueue();
  
  $('#debugbar').fadeOut(200);

  $('#reload').click(function() {
    // TODO: Make this an ajax call instead of reloading the whole page
    location.reload();
    //resetCards();
  });
}


function initStudentPage() {
  w = $(window).width()/35;
  h = w*1.3;
  $('#homeIcon').css('width', w)
  	.css('height', h)
  	.css('margin', 0)
  	.click( function(){
	    window.location.href = 'index.php';
  	})
  $('.card').css('width', w)
  	.css('height', h)
  	.css('margin', 0)
  	/*.each( function() {
  	    if ($(this).attr('id') == 'card-9') {
  		// What was I going to do here? o.O Maybe do something different if
  		// the current card is selected
  	    }
  	})*/
  	.find('.nametag').hide();

  //initCards();
  // assign ids to each card
  i = 0;
  $('.card').each( function() {
  	assignCardId($(this), i);
  	$(this).addClass('thumb');
  	i++;
  })
	// handle clicks
	.click( function() {
    // open up an individual page
    /*$("#studentPageContent")
  	.load("student.php?id=" + encodeURIComponent($(this).attr('id')));*/
    window.location.href = 'student.php?id=' + 
  	encodeURIComponent($(this).attr('username'));
	});
}


// Set some random events for testing the ui
function startRandomEvents(collab) {
  setInterval(function() {
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
  }, 5000);
}
