//$(init);

/*************************
 * Card helper functions
 * ---------------------
 * Card IDs are assumed to be in the form 'card-#-username'
 * 
 */
var CARD_ID_PREFIX = 'card-'

function assignCardId(card, i) {
    //card.attr('id', "{0}{1}-{2}".format(CARD_ID_PREFIX, i, card.attr('username')));
    card.attr('id', "{0}{1}".format(CARD_ID_PREFIX, i));
}
function getCardNum(cardId) {
    //return cardId.substring(CARD_ID_PREFIX.length, cardId.length);
    return cardId.substring(CARD_ID_PREFIX.length, cardId.lastIndexOf('-'));
}
function getCardUsername(cardId) {
    return cardId.substring(cardId.lastIndexOf('-')+1, cardId.length);
}
function getCardId(num) {
    return CARD_ID_PREFIX + num;
}

/************************
 * Random util functions that should be moved out
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
    i = 0;
    $('.card').each( function() {
	assignCardId($(this), i);
	i++;
    })
	// handle clicks
	.dblclick( function() {
	    // open up an individual page
	    window.location.href = 'student.php?id=' + 
		encodeURIComponent($(this).attr('username'));
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

function resetCards() {
    $('.card')
	.width(75) // TODO: don't hardcode this
	.height(100); // TODO: don't hardcode this
    var cards = $('.card');
    $('div#content').children().detach();
    cards.appendTo('div#content');
    cards.show();
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
    

    // TODO: Replace with stored card sizes; this is a temporary workaround
    var cardw;
    var cardh;
    $(document).ready(function() {
	cardw = $('.card').width();
	cardh = $('.card').height();
    });

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
	    // Do nothing
	    // TODO: display a flag "Not yet implemented"?
	}
    });	

    // Toggle element for hiding faded elements from view
    $('#flip-b').slider();
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
	.dblclick( function(){
	    window.location.href = 'index.php';
	});
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

$(document).ready(function() {
	init();
});