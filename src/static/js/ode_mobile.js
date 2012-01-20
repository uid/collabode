/* Constants */
var cardw;
var cardh;

/* Global container objects */
var queue;
var cardTray;
var details;

/* Global communication channel */
var collab;

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
  
  // XXX this is an example
  /*$("#details").click(function() {
    console.log("sending MOBILE_C2S");
    collab.sendExtendedMessage({ type: "MOBILE_C2S", foo: 42 });
    return false;
  });*/
  
  // Initialize the mobile application
  init();
  // XXX: This is for testing and prototype purposes only;
  // comment out otherwise
  startRandomEvents();
});

/***************************************
 * Message boxes
 */
var NOT_IMPLEMENTED = "Not implemented";

/***************************************
 * Definitions of what to do upon receipt of server-to-client 
 * messages
 */
function setExtendedMessages() {
  // XXX: this one is an example
  collab.setOnExtendedMessage("MOBILE_S2C", function(msg) {
    console.log("received MOBILE_S2C", msg);
  });
  // Request for a card to be added to the help queue
  collab.setOnExtendedMessage("ADD_TO_QUEUE", _addToQueue);
  // Request for student information
  collab.setOnExtendedMessage("STUDENT_DETAILS", _showStudentDetails);
}

function _addToQueue(msg) {
  queue.add(msg.cardId);
}

function _showStudentDetails(msg) {
  queue.highlightCard(msg.cardId);
  details.display(msg);
}

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
  	//encodeURIComponent($(this).attr('data-username'));
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
  
  //TODO: Replace with stored card sizes; this is a temporary workaround
  cardw = $('.card').width();
  cardh = $('.card').height();
  
  initCards();
  initFilters();
  
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