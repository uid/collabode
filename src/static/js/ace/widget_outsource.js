
function makeOutsourceWidget(userlist, sendRequest, options) {
  
  var outsourceWidget = {};
  
  var dialogContainer;
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
    
    dialogContainer = $("<div id='outsource-container' />")
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
        reqTxt.data('edited', reqTxt.val() != '');
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
    $("#editorcontainerbox").append(dialogContainer);
    $("label", dialogContainer).css('font-family', lineNo.css('font-family'));
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
  
  var statusContainer = $('#outsourcedcontainer');
  var nodes = {};
  
  function _makeChat(userInfo, text) {
    return $('<a href="#" class="reqdetail"></a>')
      .text(text + ' ' + userInfo.userName)
      .prepend($('<div class="chatbutton"></div>')
        .css('background-color', options.colorPalette[userInfo.colorId]))
      .click(function() {
        userlist.chat(userInfo);
        return false;
      });
  }
  
  outsourceWidget.updateRequests = function(requests) {
    $.each(requests, function(idx, req) {
      var node = $('<div>');
      node.addClass('outsrcreq');
      var state = req.completed ? 'completed' : req.assigned ? 'assigned' : 'new';
      node.data('state', state).addClass(state);
      if (req.requester.userId == clientVars.userId || req.worker.userId == clientVars.userId) {
        node.addClass('mine');
      }
      node.append($('<div class="reqdesc">').text(req.description));
      var worker = $('<div class="reqworker">');
      var avatar = $('<div class="reqavatar">');
      worker.append(avatar);
      node.append(worker);
      var location = $('<div class="reqdetail">');
      if (req.location) {
        var filename = req.location.substring(req.location.lastIndexOf('/')+1);
        location.append($('<a href="' + req.location + '">').text(filename));
      } else {
        location.html('<i>unknown</i>');
      }
      node.append(location);
      
      if (req.worker.userId) {
        worker.append($('<div>').text(req.worker.userName));
        avatar.css('background-color', options.colorPalette[req.worker.colorId]);
        if (state == 'assigned') {
          if (req.worker.userId == clientVars.userId) {
            node.append(_makeChat(req.requester, 'Chat with requester:'));
          } else if (req.requester.userId == clientVars.userId) {
            node.append(_makeChat(req.worker, 'Chat with'));
          }
        }
      } else if (state == 'new') {
        avatar.css('background-color', '#fff');
      }
      
      if (req.worker.userId && req.requester.userId == clientVars.userId) {
        var changes = $('<div class="reqdetail">');
        var href = '/contrib:' + req.worker.userId + ':';
        if (req.assigned) { href += req.assigned; }
        if (req.completed) { href += '..' + req.completed; }
        href += '/' + clientVars.editorProject;
        var link = $('<a>').attr('href', '#').click(function() { return Layout.hoverOpen(href); });
        var filenames = [];
        $.each(req.deltas, function(filename) { filenames.push(filename); });
        $.each(filenames.sort(), function(idx, filename) {
          var delta = req.deltas[filename];
          var line = $('<span>').text(filename.substring(filename.lastIndexOf('/')+1));
          if (delta.ins) { line.append($('<span class="deltains">').text(' +'+delta.ins)); }
          if (delta.del) { line.append($('<span class="deltadel">').text(' -'+delta.del)); }
          link.append(line.append('<br/>'));
        });
        node.append(changes.append(link));
      }
      
      if (req.id in nodes) {
        var old = nodes[req.id].replaceWith(node);
        if (state != old.data('state')) {
          node.prepend($('<div class="reqhighlight">').fadeIn(1000).delay(1000).fadeOut(2000));
        }
      } else {
        statusContainer.prepend(node);
      }
      nodes[req.id] = node;
    });
  };
  
  return outsourceWidget;
}

$(document).ready(function() { // on task framing page
  function start() {
    $('#overlay').hide();
    $('#done').removeAttr('disabled');
  }
  $('#intro #start').bind('click', start);
  if (clientVars.skipIntro) {
    start();
  }
});
