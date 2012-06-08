function UserList(ace2editor, collab, user, options) {
  
  var nodes = {};
  var container = $('#userlist');
  
  ace2editor.setProperty('showsauthorcolors', false);
  container.hover(function() {
    ace2editor.setProperty('showsauthorcolors', true);
  }, function() {
    ace2editor.setProperty('showsauthorcolors', false);
  });
  container.delegate('.usertip', 'hover', function() {
    $('p', this).fadeToggle(100);
  });
  
  function onJoinOrUpdate(userInfo, away) {
    var node;
    if (userInfo.userId in nodes) {
      node = nodes[userInfo.userId];
      if ( ! away) { node.removeClass('useraway'); }
    } else {
      var tip = $("<div class='usertip'><p></p></div>")
      var history, text, send, close;
      var chat = $("<div class='chatbubble'></div>")
        .append(history = $("<div class='chathistory'></div>").append("<div class='chatarchive'></div>"))
        .append(text = $("<textarea class='chattext'></textarea>"))
        .append(send = $("<button class='chatsend'>Send</button>"))
        .append(close = $("<button class='chatclose' title='Close'></button>"));
      
      node = nodes[userInfo.userId] = $("<span class='user'></span>").append(tip).append(chat);
      if (away) { node.addClass('useraway'); }
      node.chatHistory = false;
      node.chatStart = Number.MAX_VALUE;
      node.chatOpened = false;
      node.chatPopped = false;
      
      if (userInfo != user) {
        tip.click(function() {
          _chatOpen(userInfo);
          _chatFocus(userInfo.userId);
        });
      }
      chat.click(function() {
        _chatFocus(userInfo.userId);
      });
      text.keyup(function(evt) {
        if (evt.keyCode == 13) { // enter key
          _chatSend(userInfo.userId);
        } else if (evt.keyCode == 27) { // escape key
          _chatClose(userInfo.userId);
        }
      });
      send.click(function() {
        _chatSend(userInfo.userId);
      });
      close.click(function() {
        _chatClose(userInfo.userId);
      });
      
      container.append(node);
    }
    node.css('background-color', options.colorPalette[userInfo.colorId]);
    $('.usertip p', node).text(userInfo.name || userInfo.userName); // XXX ||
  }
  
  function onLeave(userInfo) {
    if (userInfo.userId in nodes) {
      nodes[userInfo.userId].addClass('useraway');
    }
  }
  
  function _chatSend(chatUserId) {
    var node = nodes[chatUserId];
    var text = $('.chattext', node);
    var message = $.trim(text.val());
    if (message) {
      collab.sendExtendedMessage({ type: "USER_CHAT", action: "send", to: chatUserId, message: text.val() });
      _chatAppend(chatUserId, user, text.val());
    }
    text.val('');
    if (node.chatPopped) {
      node.chatPopped = false;
      collab.sendExtendedMessage({ type: "USER_CHAT", action: "ack", to: chatUserId });
    }
  }
  
  function _chatOpen(userInfo, pop) {
    if ( ! (userInfo.userId in nodes)) {
      onJoinOrUpdate(userInfo, true);
    }
    var node = nodes[userInfo.userId];
    if ( ! node.chatHistory) {
      collab.sendExtendedMessage({ type: "USER_CHAT", action: "history", to: userInfo.userId });
    }
    node.chatPopped = node.chatPopped || pop;
    node.chatOpened = true;
    $('.chatbubble', node).show();
    $('.chathistory', node).scrollTop(10000000);
    return node;
  }
  
  function _chatFocus(chatUserId) {
    var node = nodes[chatUserId];
    if (node.chatPopped) {
      node.chatPopped = false;
      collab.sendExtendedMessage({ type: "USER_CHAT", action: "ack", to: chatUserId });
    }
    $('.chatbubble').css('z-index', 40);
    $('.chatbubble', node).css('z-index', 50);
    $('.chattext', node).focus();
  }
  
  function _chatClose(chatUserId) {
    var node = nodes[chatUserId];
    node.chatOpened = false;
    node.chatPopped = false;
    $('.chatbubble', node).hide();
  }
  
  function _chatAppend(chatUserId, from, message, archive) {
    var node = nodes[chatUserId];
    var from = $('<b>').text(from.name).css('background-color', options.colorPalette[from.colorId]);
    var message = $('<span>').text(': ' + message);
    $(archive ? '.chatarchive' : '.chathistory', node).append($('<div class="chatline">').append(from).append(message));
    $('.chathistory', node).scrollTop(10000000);
  }
  
  function _chatDropped(chatUserId) {
    var node = nodes[chatUserId];
    $('.chathistory', node).append('<div class="chaterror">Message could not be delivered</div>').scrollTop(10000000);
  }
  
  collab.setOnUserJoin(onJoinOrUpdate);
  collab.setOnUpdateUserInfo(onJoinOrUpdate);
  collab.setOnUserLeave(onLeave);
  collab.setOnExtendedMessage("USER_CHAT", function(msg) {
    switch (msg.action) {
    case 'send':
      var node = _chatOpen(msg.from, true);
      node.chatStart = Math.min(node.chatStart, msg.idx);
      _chatAppend(msg.from.userId, msg.from, msg.message);
      break;
    case 'history':
      var node = nodes[msg.to];
      if ( ! node.chatHistory) {
        node.chatHistory = true;
        $.each(msg.history.slice(0, node.chatStart), function() {
          _chatAppend(msg.to, this.from, this.message, true);
        });
      }
      break;
    case 'ack':
      var node = nodes[msg.to];
      if (node && node.chatPopped) {
        _chatClose(msg.to);
      }
      break;
    case 'dropped':
      _chatDropped(msg.to);
      break;
    }
  });
  
  onJoinOrUpdate(user);
  
  var userlist = {
    chat: function(userInfo) {
      var node = _chatOpen(userInfo);
      _chatFocus(userInfo.userId);
    }
  };
  
  return userlist;
}
