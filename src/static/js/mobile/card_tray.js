/*****************
 * Implementation of the mobile instructor UI tray that
 * makes up the working area for card layouts and filter UI.
 * 
 * This tray is always visible. Cards may be shuffled around 
 * on this tray into user-defined arrangements, or by the 
 * filters to fit the context of filter-appropriate graphs, 
 * tables, etc.
 */
function CardTray() {
  /* Object attributes*/
  this.id = "#card-tray";
  this.obj = $(this.id);
  
  this.selectedFilter = null;
  this.isFilterApplied = false;
  
  /* Initialization code */
  //Take up the rest of the space that the queue tray doesn't
  this.obj.width(parseInt(queue.obj.css('left')) == 0
      ? $(window).width() - queue.width
      : $(window).width()
  );
  
  initCards();
  
  /* Object functions */
  this.isFilterSelected = function() {
    return (this.selectedFilter == null);
  }
  
  this.selectFilter = function(filterId) {
    // TODO
  }
  
  this.applyFilter = function(filterId) {
    this.isFilterApplied = true;
  }
  
  this.resize = function() {
    // Modify the card tray width and scale the card
    // sizes within it to preserve layout
    var oldWidth = $('#card-tray').width();
    var newWidth = (parseInt(queue.obj.css('left')) == 0)
        ? $(window).width()
        : $(window).width() - queue.width;
    $('#card-tray').animate({
      width: newWidth
    })
    
    var scale = oldWidth/newWidth;
    $('.card').animate({
      //width: Math.max(cardw, $('.card').width()/scale), //TODO: if you do this too many times it shrinks, why??
      //height: Math.max(cardh, $('.card').height()/scale)
      width: $('.card').width()/scale, // TODO: if you do this too many times it shrinks, why??
      height: $('.card').height()/scale
    });
  }
}

function initCards() {
  // reassign ids to each card
  $('.card').each( function(i) {
    assignCardId($(this), i);
  })
  // handle clicks
  .click( function() {
    // TODO: open up an individual page
    details.show({
      cardId: $(this).attr('id'),
      username: $(this).attr('data-username')
    });
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

function resetCards() {
  $('.card')
    .width(cardw)
    .height(cardh);
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