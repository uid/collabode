import("fastJSON");
import("cache_utils.syncedWithCache");

import("collab.collab_server");
import("collab.collabroom_server");

import("editor.log");

jimport("net.appjet.oui.GenericLogger");

jimport("java.util.concurrent.ConcurrentHashMap");
jimport("java.util.concurrent.ConcurrentLinkedQueue");

jimport("java.lang.System");

function onStartup() {
  collab_server.setExtendedHandler("USER_CHAT", _onChat);
}

function _getChatCache() {
  var key = Array.prototype.slice.apply(arguments).sort().join('$');
  return syncedWithCache('chat.chatcache', function(cache) {
    if (! cache.map) {
      cache.map = new ConcurrentHashMap();
    }
    cache.map.putIfAbsent(key, new ConcurrentLinkedQueue());
    return cache.map.get(key);
  });
}

function _onChat(padId, userId, connectionId, msg) {
  switch (msg.action) {
  case 'send':
    var cache = _getChatCache(userId, msg.to);
    msg.from = collabroom_server.getConnection(connectionId).data.userInfo;
    msg.idx = cache.size();
    var chat = { from: msg.from, to: msg.to, message: msg.message, idx: msg.idx };
    cache.add(chat);
    chat.delivered = collab_server.sendUserExtendedMessage(msg.to, msg);
    if ( ! chat.delivered) {
      collab_server.sendConnectionExtendedMessage(connectionId, {
        type: 'USER_CHAT', action: 'dropped', to: msg.to
      });
      System.err.println("Dropped chat message " + fastJSON.stringify(chat)); // XXX
    }
    log.log('chats', chat);
    break;
  case 'history':
    msg.history = _getChatCache(userId, msg.to).toArray().slice();
    collab_server.sendConnectionExtendedMessage(connectionId, msg);
    break;
  case 'ack':
    collab_server.sendUserExtendedMessage(userId, msg);
    break;
  }
}
