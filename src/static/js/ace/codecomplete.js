
var selectedIndex = 1;
var proposalSource;
var proposalDisplay;

var codecomplete = {}
codecomplete.active = false;        //indicates whether widget is open
codecomplete.stopKey = false;       //indicates whether to prevent default key action
codecomplete.stopClick = false;     //indicates whether to prevent default click action
codecomplete.replace = false;       //indicates whether to make text replacement
codecomplete.incrementEnd = false;  //indicates whether to increment codecomplete.end
codecomplete.replacementString = "";
codecomplete.start;                 //index of beginning character to codecomplete at
codecomplete.end;                   //index of last character to codecomplete at
codecomplete.cursorStart;           //cursor position where codecomplete was invoked
codecomplete.filterPrefix;          //prefix to filter codecomplete list with

// functions used by codecompletion widget
codecomplete.init = function($) {
  codecomplete.showCC = function(proposals,top,left,rep) {
    codecomplete.emptyCC();
    if (proposals.length > 0) {
      proposalSource = proposals;
      proposalDisplay = proposalSource;
      codecomplete.populateCC(proposalDisplay);
      $("#ac-widget").css({"visibility":"visible","top":top+"px","left":left+"px"});
      $("#ac-widget").scrollTop(0);
      codecomplete.setHighlight();
      codecomplete.active = true;
      codecomplete.ignoreSpace = false;
      
      // set the replacement start
      codecomplete.start = proposals[0].offset;
      
      // set the initial end of the replacement (will increment during filtering)
      codecomplete.end = codecomplete.start+proposals[0].length;
      codecomplete.cursorStart = codecomplete.start+proposals[0].length;
      
      // set the initial filter prefix
      codecomplete.filterPrefix = rep.alltext.substring(codecomplete.start,codecomplete.end);
    } else {
      codecomplete.active = false;
    }
  }
  
  codecomplete.hideCC = function() {
    $("#ac-widget").css({"visibility":"hidden"});
    codecomplete.emptyCC();
    codecomplete.active = false;
  }
  
  codecomplete.emptyCC = function() {
    $("#ac-widget-list").empty();
    selectedIndex = 1;
  }

  codecomplete.populateCC = function(items) {
    forEach(items, function(p,i) {
      $("#ac-widget-list").append($('<li class="ac-widget-item">').text(p.completion));
    });
  }
  
  codecomplete.filterCC = function(newChar) {
    // move end marker depending on whether it is a backspace or a new character;
    // filterPrefix changes accordingly
    if (codecomplete.incrementEnd) {
      codecomplete.end++;
      codecomplete.filterPrefix = ""+codecomplete.filterPrefix+newChar;
    } else {
      codecomplete.end--;
      codecomplete.filterPrefix = codecomplete.filterPrefix.slice(0,-1);
    }
    
    // do not filter if the cursor has moved further back than where
    // the code complete was initially invoked
    if (codecomplete.end < codecomplete.cursorStart) {
      codecomplete.hideCC();
      codecomplete.active = false;
    }
    
    // filter the displayed list based on the filterPrefix
    proposalDisplay = new Array();
    selectedIndex = 1;
    for (i in proposalSource) {
      var matchString = proposalSource[i].replacement.match("^"+codecomplete.filterPrefix.toLowerCase(),"i");
      if (matchString != null) {
         proposalDisplay.push(proposalSource[i]);
      }
    }
    
    // only show the code assist box if display list is non-empty
    if (proposalDisplay.length > 0) {
      codecomplete.emptyCC();
      codecomplete.populateCC(proposalDisplay);
      codecomplete.setHighlight();
    } else {
      codecomplete.hideCC();
      codecomplete.active = false;
    }
  }
  
  codecomplete.arrowDown = function() {
    if (selectedIndex == $(".ac-widget-item").length) {
      selectedIndex = 1;
    } else {
      selectedIndex += 1;
    }
    codecomplete.setHighlight();
    codecomplete.scrollDown();
  }
  
  codecomplete.arrowUp = function() {
    if (selectedIndex == 1) {
      selectedIndex = $(".ac-widget-item").length;
    } else {
      selectedIndex -= 1;
    }
    codecomplete.setHighlight();
    codecomplete.scrollUp();
  }
  
  codecomplete.scrollDown = function() {
    $("#ac-widget").scrollLeft(0);
    codecomplete.makeScrollVisible();
    var currTop = $("#ac-widget").scrollTop();
    if ($(".ac-widget-item:first").hasClass("ac-selected")) {
      $("#ac-widget").scrollTop(0);
    } else if ($(".ac-selected").position().top > 128) {
      $("#ac-widget").scrollTop(currTop+16);
    }
  }

  codecomplete.scrollUp = function() {
    $("#ac-widget").scrollLeft(0);
    codecomplete.makeScrollVisible();
    var currTop = $("#ac-widget").scrollTop();
    if ($(".ac-widget-item:last").hasClass("ac-selected")) {
      $("#ac-widget").scrollTop(16*$(".ac-widget-item").length);
    } else if ($(".ac-selected").position().top < 0) {
      $("#ac-widget").scrollTop(currTop-16);
    }
  }
  
  codecomplete.makeScrollVisible = function() {
    var currTop = $("#ac-widget").scrollTop();
    var selectedPosition = $(".ac-selected").position().top;
    var adjust;
    if (selectedPosition < 0) {
      adjust = selectedPosition;
      $("#ac-widget").scrollTop(currTop+adjust);
    } else if (selectedPosition > 128) {
      adjust = selectedPosition-128;
      $("#ac-widget").scrollTop(currTop+adjust);
    }
  }
  
  codecomplete.setHighlight = function() {
    $(".ac-widget-item").removeClass("ac-selected");
    $(".ac-widget-item:nth-child("+selectedIndex+")").addClass("ac-selected");
  }
  
  codecomplete.setReplacement = function() {
    var proposal = proposalDisplay[selectedIndex-1];
    codecomplete.replacementString = proposal.replacement;
  }
}

// key handler while code assist is active
codecomplete.keyHandlerCC = function(keyCode, evt) {
  codecomplete.replace = false;
  codecomplete.stopKey = false;
  if (keyCode >= 48 && keyCode <= 90 && keyCode != 59 && keyCode != 57) { // numbers and letters
    codecomplete.incrementEnd = true;
    codecomplete.filterCC(String.fromCharCode(keyCode));
  } else if (keyCode == 27) { // escape key
    codecomplete.hideCC();
    codecomplete.stopKey = true;
  } else if (keyCode == 40) { // down arrow
    codecomplete.arrowDown();
    codecomplete.stopKey = true;
  } else if (keyCode == 38) { // up arrow
    codecomplete.arrowUp();
    codecomplete.stopKey = true;
  } else if (keyCode == 8) { // backspace
    codecomplete.incrementEnd = false;
    codecomplete.filterCC();
  } else if (keyCode == 13) { // enter
    codecomplete.setReplacement();
    codecomplete.hideCC();
    codecomplete.replace = true;
    codecomplete.stopKey = true;
  } else if (keyCode == 59 || keyCode == 190 || (keyCode == 32 && !evt.ctrlKey)) { // semicolon, period, and space
    codecomplete.setReplacement();
    codecomplete.hideCC();
    codecomplete.replace = true;
  } else if (keyCode == 57 && evt.shiftKey) { // open paren
    codecomplete.setReplacement();
    codecomplete.hideCC();
    codecomplete.replace = true;
    codecomplete.stopKey = true;
  } else {
    codecomplete.incrementEnd = true;
    codecomplete.filterCC(String.fromCharCode(keyCode));
  }
}

codecomplete.handleClick = function(event) {
  codecomplete.hideCC();
  codecomplete.stopClick = false;
}








