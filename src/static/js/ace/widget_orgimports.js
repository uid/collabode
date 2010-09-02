
function makeOrgImportsWidget($, ace, sendSelection) {

  var orgImportsWidget = {};
  var listWidget = makeListWidget($, _handleListClick);
  
  var importSuggestions;
  var currentResolveIndex;
  var response;
  
  var orgImportsContainer;
  var orgImportsInput;
  var orgImportsCancel;
  var orgImportsNext;

  
  function _init() {
    currentResolveIndex = 0;
    response = [];
    orgImportsContainer = $("<div id='orgimports-container' />");
    orgImportsInput = $("<input id='orgimports-input' type='text' />");
    orgImportsCancel = $("<button id='orgimports-cancel' type='button'>Cancel</button>");
    orgImportsNext = $("<button id='orgimports-next' type='button'></button>");
  }
  
  orgImportsWidget.handleOrgImportsResolve = function(suggestions) {
    _close();
    _init();
    importSuggestions = suggestions;
    _showImportWidget();
    _setListWidget();
    _setButtonText();
  }
  
  function _handleMultipleResolves() {
    if (currentResolveIndex > importSuggestions.length-1) {
      sendSelection(response);
      _close();
    } else {
      _setListWidget();
      _setButtonText();
    }
  }
  
  function _showImportWidget() {
    ace.addClickHandler(_handleEditorClick);
    orgImportsInput.appendTo(orgImportsContainer);
    orgImportsCancel.appendTo(orgImportsContainer);
    orgImportsNext.appendTo(orgImportsContainer);
    $("#editorcontainerbox").append(orgImportsContainer);
    $("#orgimports-input").keyup(_handleKeys);
    $("#orgimports-input").focus();
    $("#orgimports-cancel").click(function() { _cancel(); });
    $("#orgimports-next").click(function() { _makeSelection(); });
    $("#orgimports-container").click(function() { $("#orgimports-input").focus(); });
  }
  
  function _setListWidget() {
    listWidget.close();
    listWidget.show(_listWidgetItems(importSuggestions[currentResolveIndex]), 36, 9);
    $("#listwidget").appendTo($("#orgimports-container"));
    $("#listwidget").addClass("orgimports");
  }
  
  function _setButtonText() {
    $("#orgimports-next").text((currentResolveIndex == importSuggestions.length-1) ? "Finish" : "Next");
    $("#orgimports-input").attr("value","");
  }

  function _filter() {
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
        _filter();
      }
    }
  }
  
  function _close() {
    $("#orgimports-container").remove();
    listWidget.close();
    ace.removeClickHandler(_handleEditorClick);
  }
  
  function _cancel() {
    sendSelection(null);
    _close();
  }
  
  function _makeSelection() {
    response.push(listWidget.getSelectedItem()[2]);
    currentResolveIndex++;
    _handleMultipleResolves();
  }

  function _handleListClick(evt) {
    if (evt.type == "click") {
    } else {
      window.focus();
      _makeSelection();
    }
  }
  
  function _handleEditorClick(event) {
    if (orgImportsWidget.active()) {
      _cancel();
    }
  }
  
  return orgImportsWidget;
}
