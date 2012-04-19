
function makeOutsourceWidget(sendRequest) {
  
  var outsourceWidget = {};
  
  var container;
  var lineNo;
  var reqTxt;
  var button;
  
  outsourceWidget.createRequest = function(selection) {
    _close();
    _init(selection);
    _show();
  };
  
  function _init(selection) {
    var details = $("<div id='outsource-details' />")
      .append("<input type='radio' id='outsource-mode' checked='checked' />")
      .append("<label for='outsource-mode'>Direct editing &amp; automatic integration</label>");
    
    container = $("<div id='outsource-container' />")
      .append($("<input id='outsource-file' type='text' disabled='disabled' />").val(clientVars.editorFile))
      .append("<label for='outsource-line'>line</label>")
      .append(lineNo = $("<input id='outsource-line' type='text' />").val(selection.start[0]+1))
      .append(reqTxt = $("<textarea id='outsource-request'>Details...</textarea>"))
      .append(details)
      .append($("<button id='outsource-cancel' type='button'>Cancel</button>").click(_close))
      .append(button = $("<button id='outsource-next' type='button'>Outsource</button>").click(_makeRequest));
    
    lineNo.keyup(_handleKeys);
    reqTxt.keyup(_handleKeys);
    
    reqTxt.data('default', reqTxt.val())
      .css('color', 'gray')
      .focus(function() {
        if ( ! reqTxt.data('edited')) { reqTxt.val(''); }
        reqTxt.css('color', '');
      })
      .change(function() {
        reqTxt.data('edited', reqTxt.val() != '');
        button.attr('disabled', reqTxt.val() == '');
      })
      .keyup(function() {
        button.attr('disabled', reqTxt.val() == '');
      })
      .blur(function() {
        if ( ! reqTxt.data('edited')) {
          reqTxt.val(reqTxt.data('default'));
          reqTxt.css('color', 'gray');
        }
      })
      .val(selection.text.replace(/^\s+|\s+$/gm, '')).change();
  }
  
  function _show() {
    $("#editorcontainerbox").append(container);
    $("label", container).css('font-family', lineNo.css('font-family'));
    reqTxt.focus().select();
  }
  
  function _handleKeys(evt) {
    if (evt.keyCode == 27) { // escape key
      _close();
    }
  }
  
  function _close() {
    $("#outsource-container").remove();
  }
  
  function _makeRequest() {
    sendRequest({ lineNo: lineNo.val(), reqTxt: reqTxt.val() });
    _close();
  }
  
  return outsourceWidget;
}
