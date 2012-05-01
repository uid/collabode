function UserList(ace2editor, collab, user, options) {
  
  var nodes = {};
  var container = $('#userlist');
  
  ace2editor.setProperty('showsauthorcolors', false);
  container.hover(function() {
    ace2editor.setProperty('showsauthorcolors', true);
  }, function() {
    ace2editor.setProperty('showsauthorcolors', false);
  });
  container.delegate('.user', 'hover', function() {
    $('p', this).fadeToggle(100);
  });
  
  function onJoinOrUpdate(userInfo) {
    var node;
    if (userInfo.userId in nodes) {
      node = nodes[userInfo.userId];
    } else {
      node = nodes[userInfo.userId] = $("<span class='user'><p></p></span>");
    }
    node.css('background-color', options.colorPalette[userInfo.colorId]);
    $('p', node).text(userInfo.name);
    container.append(node);
  }
  
  function onLeave(userInfo) {
    var node = nodes[userInfo.userId];
    delete nodes[userInfo.userId];
    node.remove();
  }
  
  collab.setOnUserJoin(onJoinOrUpdate);
  collab.setOnUpdateUserInfo(onJoinOrUpdate);
  collab.setOnUserLeave(onLeave);
  
  onJoinOrUpdate(user);
  
  var userlist = {};
  
  return userlist;
}
