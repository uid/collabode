var fileid;
var variants = ['overlay', 'diffs'];

$(window).load(function() {
  // Remove the page cover when the page is fully done loading
  $('#loading-page').fadeOut(200);
  setTimeout(function() {
    $('#loading-page').remove(); 
  }, 210);
});

//// Helper functions
function $allGlobsCards() {
  return $('.globs-card');
}

function $selectedGlobsCards() {
  return $('.globs-card.' + fileid);
}

///////// Main function
$(document).ready(function() {
  
  var v = 0;
  $('#variant-toggle').click(function() {
    $(this).html(variants[v % variants.length]);
    initialize(++v % variants.length);
  });
  $('#variant-toggle').click();
  
});

function initialize(v) {
  var variant = variants[v];
  console.log("initializing v: " + v);
  if (variant == 'overlay') {
    $('#globs-box-diffs').hide();
    $('#globs-box').show();
    initOverlay();    
  } else if (variant == 'diffs') {
    $('#globs-box').hide();
    $('#globs-box-diffs').show();
    initDiffs();
  }

  // choose the first file to show
  $('#globs-filechooser ul li').first().click();
}

////////// Diff variant
function initDiffs() {
  $allGlobsCards().hide();
  
//assign filechooser properties
  $('#globs-filechooser ul li').click(function() {
    fileid = $(this).attr("id");
    $('#globs-box-diffs').empty();
    $('#globs-filechooser ul li').css('background-color', '#EEE');
    $(this).css('background-color', '#FEFEFE');
    generateDiffs();
    //console.log("selected: " + fileid);
  });
}

function generateDiffs() {
  var differ = new diff_match_patch();
  
  // the first item is the one with most occurrences.
  // diff all following against it.
  var $proto = $selectedGlobsCards().first();
  $('#globs-box-diffs').append(
      $('<div id="proto" class="globs-diff"/>')
        .append(occurrences($proto.attr("count"), $proto.attr("authors")))
        .append($.trim($proto.text()))
  );
  
  $selectedGlobsCards().each(function() {
    if ($(this).text() == $proto.text()) {
      return;
    }
    var diffs = differ.diff_main($.trim($proto.text()), $.trim($(this).text()));
    differ.diff_cleanupSemantic(diffs);
    var html = differ.diff_myPrettyHtml(diffs);
    // only show <del> tags if:
    // - the text isn't blank
    // - no <ins> tags are found
    if ($.trim($(this).text()) != "" && html.indexOf("<ins") == -1) {
      html = html.replace(" display: none;", "");
    }
    $('#globs-box-diffs').append(
        $('<div class="globs-diff"/>')
          .append(occurrences($(this).attr("count"), $(this).attr("authors")))
          .append(html)
    );
  });
}

function occurrences(count, authors) {
  var o = $('<div/>')
    .append('<p class="globs-diff-count">Occurrences: <b>' + count + '</b></p>')
    .css('position', 'relative');
  var authorsbox = $('<div class="authors-container"/>')
    .append( $('<div class="authors-list"/>').append(authors.split(',').join(', ')) );
  authorsbox
    .css('position', 'absolute')
    .css('top', 35/*o.outerHeight()*/)
    .css('right', 0)
    .hide();
  o.append(authorsbox);
  o.click(function() {
    $(this).find('.authors-container').slideToggle(200);
  });
  return o;
}

diff_match_patch.prototype.diff_myPrettyHtml = function(diffs) {
  var html = [];
  var pattern_amp = /&/g;
  var pattern_lt = /</g;
  var pattern_gt = />/g;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];    // Operation (insert, delete, equal)
    var data = diffs[x][1];  // Text of change.
    var text = data.replace(pattern_amp, '&amp;').replace(pattern_lt, '&lt;');
    switch (op) {
      case DIFF_INSERT:
        html[x] = '<ins style="background:#FFCC33;">' + text + '</ins>';
        break;
      case DIFF_DELETE:
        html[x] = '<del style="background:#FFCC33; display: none;">' + text + '</del>';
        break;
      case DIFF_EQUAL:
        html[x] = '<span>' + text + '</span>';
        break;
    }
  }
  return html.join('');
};


///////// Overlay variant
function initOverlay() {
  //assign filechooser properties
  $('#globs-filechooser ul li').click(function() {
    fileid = $(this).attr("id");
    $allGlobsCards().hide();
    $selectedGlobsCards().show();
    $('#globs-filechooser ul li').css('background-color', '#EEE');
    $(this).css('background-color', '#FEFEFE');
    //console.log("selected: " + fileid);
  });
  
  //overlay all the glob cards
  var z = 0;
  $allGlobsCards()
    .click(function() {
      // make the card z-indexes cycle
      var numCards = $selectedGlobsCards().length;
      $selectedGlobsCards().each(function() {
        $(this).css('z-index', (parseInt( $(this).css('z-index') ) + 1) % numCards);
      });
      adjustGlobCardOpacities();
    })
    .each(function() {
      $(this).css('z-index', z++);
      $(this).text($.trim($(this).text()));
    });
  adjustGlobCardOpacities();
}

function adjustGlobCardOpacities() {
  // highlight the card on top of the stack
  $selectedGlobsCards().each(function() {
    if (parseInt($(this).css('z-index')) == $selectedGlobsCards().length - 1) {
      $(this).css('opacity', 0.75);
    } else {
      $(this).css('opacity', 0.2);
    }
  });
}
