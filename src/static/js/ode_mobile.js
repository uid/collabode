/* Constants */
var cardw;
var cardh;

/* Global container objects */
var queue;
var cardTray;
var details;
var classSummary;
var consoleDiffs;

var myConnectionId;

/* Global communication channel */
var collab;

$(window).bind("orientationchange"), function(e) {
  alert(jQuery.event.special.orientationchange.orientation());
}

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
  
  collab = getCollabClient(ace,
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
  
  setExtendedMessages();
  
  // Request for this collab server's connection ID so that we have 
  // it to communicate with the main connection
  setTimeout(function() {    
    collab.sendExtendedMessage({ 
      type: "REQUEST_CONNECTION_ID"
    });
  }, 5000); // allow some time for the socket to finish connecting
  
  // Initialize the mobile application
  init();
  // XXX: This is for testing and prototype purposes only;
  // comment out otherwise
  //startRandomEvents();
});

$(window).load(function() {
  // Remove the page cover when the page is fully done loading
  $('#loading-page').fadeOut(200);
  setTimeout(function() {
    $('#loading-page').remove(); 
  }, 210);
});

/***************************************
 * Messages
 */
var NOT_IMPLEMENTED = "Not implemented";

/***************************************
 * Definitions of what to do upon receipt of server-to-client 
 * messages.  Right now (?) this function sets all messages sent 
 * to the mobile application and passes the information to each
 * subsection of the app.
 */
function setExtendedMessages() {
  // HACK: Respond to request for this collab's connectionId
  collab.setOnExtendedMessage("COLLAB_CONNECTION_ID", _onConnectionId);
  // Request for a card to be added to the help queue
  collab.setOnExtendedMessage("ADD_TO_QUEUE", _addToQueue);
  collab.setOnExtendedMessage("JOIN_QUEUE", _joinQueue);
  collab.setOnExtendedMessage("LEAVE_QUEUE", _leaveQueue);
  // Request for student information
  collab.setOnExtendedMessage("STUDENT_DETAILS", _showStudentDetails);
  //Request for class summary information
  collab.setOnExtendedMessage("CLASS_SUMMARY", _updateClassSummary);
  // Login of a new user
  //collab.setOnExtendedMessage("USER_JOINED", _userJoined);
  collab.setOnExtendedMessage("FILTERBY_EXCEPTION_TYPE", _showFilterByExceptionType);
  // For console output view
  collab.setOnExtendedMessage("SESSION_START_END_TIMES", _onStartEndTimes);
  collab.setOnExtendedMessage("CONSOLE_OUTPUTS", _onConsoleOutputs);
}

// XXX: myConnectionId is not currently used, but it's used in mobile.js
// so I'm saving it here for now just in case.
function _onConnectionId(msg) {
  myConnectionId = msg.connectionId;
}

// Deprecated: used by the prototype
function _addToQueue(msg) {
  queue.add(msg.cardId);
}
function _joinQueue(msg) {
  queue.add($('.card[data-username="' + msg.username + '"]').attr("id"));
}
function _leaveQueue(msg) {
  queue.remove(msg.cardId);
}

function _showStudentDetails(msg) {
  queue.highlightCard(msg.cardId);
  details.data = msg;
  details.display();
}

function _updateClassSummary(msg) {
  classSummary.data = msg;
  classSummary.display();
}

function _userJoined(msg) {
  cardTray.addNewCard(msg);
}

function _showFilterByExceptionType(msg) {
  details.showSimilarExceptions(msg);
}

function _onStartEndTimes(msg) {
  consoleDiffs.dataStartTime = msg.startTime;
  consoleDiffs.dataEndTime = msg.endTime;
}

function _onConsoleOutputs(msg) {
  consoleDiffs.data = msg.data;
  consoleDiffs.display();
}

/************************
 * Initialization methods
 */
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
  		    .fadeTo(200, 0.3);
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
  		    //.width($('#card-tray').width())
    	    .css('clear', 'both')
  		    .children().height(height - 4); // TODO: don't hardcode
    		//$('.test-progress-grid').width($('#card-tray').width() - $('.card').width());
    		$('.test-progress-div table tr').each( function(i) {
  		    $(this).children().each( function(j) {
      			if (j < 2) {
    			    $(this).css('background-color', '#33CC33');
      			}
  		    });
    		});
      } else {
      	$('#filter-tests').removeClass('applied');
      	appliedFilter = false;
      	resetCards();
      }
  	} else {
  	  // If an action hasn't been defined for a filter, do nothing
  	  $("#debugbar").html(NOT_IMPLEMENTED).fadeIn(400);
  	  setTimeout('$("#debugbar").fadeOut(400)', 2000);
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
  
  queue = new QueueTray();
  cardTray = new CardTray();
  details = new StudentPanel().hide();
  classSummary = new ClassSummary().hide();
  consoleDiffs = new ConsoleDiffs().hide();
  
//  var pageMap = {
//      "#page-classsummary": classSummary//,
////      "#page-consoleDiffs": consoleDiffs
//  }
  
  
//  for (var pageId in pageMap) {
//    $(pageId).click(function() {
//      pageMap[pageId].show();
//    });
//  }
  
  //TODO: Replace with stored card sizes; this is a temporary workaround
  cardw = $('.card').width();
  cardh = $('.card').height();
  
  // TODO: reenable? Recode?
  //initFilters();
  
  $('a.filter').click(function() {    
    /*$(this).siblings().each(function() {
      $(this).removeClass('ui-btn-active');
    });*/
    $('a.filter').removeClass('ui-btn-active');
    $(this).addClass('ui-btn-active');
    classSummary.hide();
    consoleDiffs.hide();
    details.hide();
  })
  
//  $('#page-classsummary').click(function() {
//    classSummary.show();
//  });
  $('#page-consolediffs').click(function() {
    consoleDiffs.show();
  });
  
  $('#queue-toggle').click( handleQueueToggle ); // 'Help Queue' button
  
  $('#debugbar').hide();
}

/******************
 * Event handlers
 */
function handleQueueToggle() {
  var $buttonText = $(this).find(".ui-btn-text");
  $buttonText.text( 
      $buttonText.text() == 'Show Queue' 
        ? 'Hide Queue' 
        : 'Show Queue' 
      );
  queue.show();
  cardTray.resize();
}