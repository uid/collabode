
function makeCodeCompleteWidget($, doReplace) {
  
  var codeCompleteWidget = {};
  var mouseHandler = {};
  var listWidget = makeListWidget($, mouseHandler);
  
  codeCompleteWidget.replacementStartOffset;

  var proposalObjects;
  var filterPrefix;
  var replacementObject;
  var distFromInvoke = 0;
  var preventKeyPressOrUp = false;
  var keypressRepeats = 0;

  codeCompleteWidget.show = function(items, top, left, rep, caretPosition) {
    proposalObjects = items;
    var proposals = _listWidgetItems(items);
    distFromInvoke = 0;
    codeCompleteWidget.replacementStartOffset = items[0].offset;
    listWidget.show(proposals, top, left);
    $("#listwidget").addClass("codecomplete");
    
    if (($(".codecomplete").height() + top) > $("#editorcontainerbox").height()) {
      top -= ($(".codecomplete").height() + listWidget.docLineHeight);
      $(".codecomplete").css("top", top+"px");
    }
    $(".codecomplete").css("visibility", "visible");
    
    if (listWidget.active) {
      filterPrefix = rep.alltext.substring(codeCompleteWidget.replacementStartOffset, caretPosition);
    }
  }
  
  // used in ace2_inner
  codeCompleteWidget.active = function() {
    return listWidget.active;
  }
  
  /*
   * Return true if some items match filter string
   */
  codeCompleteWidget.filter = function(str, backspace) {
    if (backspace) {
      distFromInvoke--;
      filterPrefix = filterPrefix.slice(0,-1);
    } else {
      distFromInvoke += str.length;
    }

    if (distFromInvoke < 0) {
      return false;
    }
    
    if (listWidget.filter(filterPrefix+str) > 0) {
      filterPrefix = ""+filterPrefix+str;
      return true;
    }
    return false;
  }
  
  function _listWidgetItems(items) {
    var proposals = [];
    for (i in items) {
      var prop = [items[i].completion, items[i].image, i];
      proposals.push(prop);
    }
    return proposals;
  }
  
  /*
   * Return true if ace editor should stop key handling
   */
  codeCompleteWidget.handleKeys = function(evt, isTypeForSpecialKey) {    
    var keyCode = evt.keyCode;
    if (preventKeyPressOrUp) {
      evt.preventDefault();
      if (evt.type == "keyup") { preventKeyPressOrUp = false; };
      return true;
    }
    
    isTypeForSpecialKey = ($.browser.mozilla) ? (evt.type == "keydown") : (evt.type == "keypress");
    if ( ! listWidget.active) {
      return false;
    } else if ((evt.metaKey || evt.ctrlKey || evt.altKey) && isTypeForSpecialKey) {
      _close();
      return false;
    }
    
    if (evt.type == "keyup" || evt.type == "keypress") {
      keypressRepeats = 0;
      return true;
    } else {
      if ( ! listWidget.handleKeys(evt)) {
        return false;
      }

      if (keyCode == 27) { // escape key
        evt.preventDefault();
        _close();
      } else if (keyCode == 8) { // backspace
        if ( ! codeCompleteWidget.filter("", true)) {
          _close();
        }
      } else if ((keyCode == 59 || keyCode == 186) || (keyCode == 32 && ! evt.ctrlKey)) { // semicolon and space
        _setReplacementObject();
        _close();
        doReplace(filterPrefix.length, replacementObject.replacement, replacementObject.kind);
      } else if (keyCode == 32 && evt.ctrlKey) { // code completion invoke
        _close();
      } else if (keyCode == 190) { // period
        _setReplacementObject();
        if ( ! codeCompleteWidget.filter(String.fromCharCode(46))) {
          _close();
          doReplace(filterPrefix.length, replacementObject.replacement, replacementObject.kind);
        }
      } else if ((keyCode == 57 && evt.shiftKey) || keyCode == 13) { // open paren, enter
        evt.preventDefault();
        preventKeyPressOrUp = true;
        _setReplacementObject();
        _close();
        doReplace(filterPrefix.length, replacementObject.replacement, replacementObject.kind);
        return true;
      } else {
        if ( ! codeCompleteWidget.filter(String.fromCharCode(keyCode))) {
          _close();
        }
      }
    }
    
  }
  
  function _close() {
    listWidget.close();
  }
  
  function _setReplacementObject() {
    replacementObject = proposalObjects[listWidget.getSelectedItem()[2]];
  }
  
  codeCompleteWidget.handleScroll = function(event) {
    _close();
  }
  
  codeCompleteWidget.handleClick = function(event) {
    _close();
  }
  
  mouseHandler.handleClick = function() {
    window.focus();
  }

  mouseHandler.handleDblClick = function() {
    window.focus();
    _setReplacementObject();
    _close();
    doReplace(filterPrefix.length, replacementObject.replacement, replacementObject.kind);
  }
  
  return codeCompleteWidget;
}
