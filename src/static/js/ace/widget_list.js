
function makeListWidget($, mouseHandler) {
  
  var listWidget = {};
  listWidget.active = false;
  
  var currentItems;
  var currentDisplayedItems;
  var selectedIndex = 1;
  var filterPrefix;
  
  var listWidgetContainer = $("<div id='listwidget' />");
  var listWidgetItemList = $("<div id='listwidget-list' />");
  listWidget.docLineHeight = $("iframe").contents().find("#sidedivinner div:first-child").height();
  
  listWidget.show = function(items, top, left) {
    if (items.length > 0) {
      listWidget.active = true;
      currentItems = items;
      currentDisplayedItems = currentItems;
      _populate();
      $("#editorcontainerbox").append(listWidgetContainer);
      listWidgetContainer.css({"top":top+"px","left":left+"px"});
      listWidgetItemList.appendTo(listWidgetContainer);
      _setHighlight();
      _attachClickHandlers();
    } else {
      listWidget.active = false;
    }
  }
  
  /*
   * Return true if any items match filter string
   */
  listWidget.filter = function(str) {
    currentDisplayedItems = new Array();
    selectedIndex = 1;
    str = str.toLowerCase().replace(/ /g,"");
    for (i in currentItems) {
      if (currentItems[i][0].toLowerCase().indexOf(str) == 0) {
        currentDisplayedItems.push(currentItems[i]);
      }
    }
    
    $("#listwidget-list").empty();
    if (currentDisplayedItems.length > 0) {
      _populate();
      _setHighlight();
      _scrollToSelection(true);
    }
    return currentDisplayedItems.length;
  }
  
  listWidget.close = function() {
    $("#listwidget").remove();
    window.focus();
    listWidget.active = false;
    selectedIndex = 1;
    listWidgetContainer = $("<div id='listwidget' />");
    listWidgetItemList = $("<div id='listwidget-list' />");
  }
  
  listWidget.getSelectedItem = function() {
    return currentDisplayedItems[selectedIndex-1];
  }
  
  function _populate() {
    forEach(currentDisplayedItems, function(p,i) {
      var item = $('<li class="listwidget-listitem" id=listitem'+i+'>').append(p[0]);
      if (p[1]) {
        item.prepend('<img src="/static/img/eclipse/jdt.ui.obj/'+p[1]+'"/>');
      }
      listWidgetItemList.append(item);
    });
  }
  
  function _setHighlight() {
    $(".listwidget-listitem").removeClass("listwidget-selected");
    $(".listwidget-listitem:nth-child("+selectedIndex+")").addClass("listwidget-selected");
  }
  
  function _attachClickHandlers() {
    var itemList = $("#listwidget-list");
    itemList.bind("click", function(event) { _handleClick(event); });
    itemList.bind("dblclick", function(event) { _handleDblClick(event); });
  }
  
  function _handleClick(event) {
    var item = event.target.id;
    selectedIndex = parseFloat(item.substr(8)) + 1;
    _setHighlight();
    mouseHandler.handleClick();
  }
  
  function _handleDblClick(event) {
    var item = event.target.id;
    selectedIndex = parseFloat(item.substr(8)) + 1;
    _setHighlight();
    mouseHandler.handleDblClick();
    event.preventDefault();
  }
  
  function _arrowDown() {
    if (selectedIndex == $(".listwidget-listitem").length) {
      selectedIndex = 1;
    } else {
      selectedIndex += 1;
    }
    _setHighlight();
    _scrollToSelection();
  }
  
  function _arrowUp() {
    if (selectedIndex == 1) {
      selectedIndex = $(".listwidget-listitem").length;
    } else {
      selectedIndex -= 1;
    }
    _setHighlight();
    _scrollToSelection();
  }
  
  function _scrollToSelection(resetLeft) {
    var currScroll = $("#listwidget").scrollTop();
    var currTop = $("#listwidget-list").position().top;
    var selectedPosition = $(".listwidget-selected").position().top;
    var adjust;
    if ((selectedPosition + currTop) < 0) {
      $("#listwidget").scrollTop(selectedPosition);
    } else if ((selectedPosition - currScroll) > listWidget.docLineHeight*8) {
      $("#listwidget").scrollTop(selectedPosition-listWidget.docLineHeight*8);
    }
    if (resetLeft) {
      $("#listwidget").scrollLeft(0);
    }
  }
  
  /* Handle list widget keys.
   * Return true if container widget should not handle key.
   */
  listWidget.handleKeys = function(evt) {
    var keyCode = evt.keyCode;
    if (keyCode == 40) { // down arrow
      _arrowDown();
      evt.preventDefault();
      return false;
    } else if (keyCode == 38) { // up arrow
      _arrowUp();
      evt.preventDefault();
      return false;
    } else {
      return true;
    }
  } 
  
  listWidget.handleScroll = function(event) {
    listWidget.close();
  }

  listWidget.handleClick = function(event) {
    listWidget.close();
  }
  
  return listWidget;
}