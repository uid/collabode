
function makeOrgImportsWidget($, sendSelection) {

  var orgImportsWidget = {};
  var mouseHandler = {};
  var listWidget = makeListWidget($, mouseHandler);
  
  var filterPrefix;
  var orgImportsWidgets;
  var currentResolveIndex = 0;
  var response = [];
  
  var orgImportsContainer = $("<div id='orgimports-container' />");
  var orgImportsInput = $("<input id='orgimports-input' type='text' />");
  var orgImportsCancel = $("<button id='orgimports-cancel' type='button'>Cancel</button>");
  var orgImportsNext = $("<button id='orgimports-next' type='button'></button>");
  
  orgImportsWidget.handleImportResolve = function(items) {
    orgImportsWidgets = items;
    if (currentResolveIndex > orgImportsWidgets.length-1) {
      sendSelection(response);
      _close();
    } else {
      listWidget.close();
      orgImportsNext.text((currentResolveIndex == orgImportsWidgets.length-1) ? "Finish" : "Next");
      $("#orgimports-input").attr("value","");
      _show(orgImportsWidgets[currentResolveIndex]);
    }
  }
  
  function _show(items) {
    var proposals = _listWidgetItems(items);
    listWidget.show(proposals, 36, 9);
    orgImportsInput.appendTo(orgImportsContainer);
    orgImportsCancel.appendTo(orgImportsContainer);
    orgImportsNext.appendTo(orgImportsContainer);
    $("#listwidget").appendTo(orgImportsContainer);
    $("#editorcontainerbox").append(orgImportsContainer);
    $("#orgimports-input").keyup(_handleKeys);
    $("#listwidget").addClass("orgimports");
    $("#orgimports-input").focus();
    $("#orgimports-cancel").click(function() { _cancel(); });
    $("#orgimports-next").click(function() { _makeSelection(); });
    $("#orgimports-container").click(function() { $("#orgimports-input").focus(); });
  }
  
  orgImportsWidget.filter = function() {
    listWidget.filter($("#orgimports-input").val());
  }
  
  // used in ace2_inner
  orgImportsWidget.active = function() {
    return listWidget.active;
  }
  
  function _listWidgetItems(items) {
    var proposals = [];
    for (i in items) {
      var prop = [items[i], "", i];
      proposals.push(prop);
    }
    return proposals;
  }
  
  function _handleKeys(evt) {
    var keyCode = evt.keyCode;
    if (listWidget.handleKeys(evt)) {
      if (keyCode == 27) { // escape key
        _cancel();
      } else if(keyCode == 13) { // enter
        _makeSelection();
      } else {
        orgImportsWidget.filter();
      }
    }
  }

  mouseHandler.handleClick = function() {
  }
  
  mouseHandler.handleDblClick = function() {
    window.focus();
    _makeSelection();
  }
  
  function _close() {
    $("#orgimports-container").remove();
    listWidget.close();
  }
  
  function _cancel() {
    sendSelection(null);
    _close();
  }
  
  function _makeSelection() {
    response.push(listWidget.getSelectedItem()[2]);
    currentResolveIndex++;
    orgImportsWidget.handleImportResolve(orgImportsWidgets);
  }

  orgImportsWidget.handleClick = function(event) {
    _cancel();
  }
  
  return orgImportsWidget;
}
