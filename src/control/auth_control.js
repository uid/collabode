import("globals.*");
import("helpers");
import("jsutils");
import("stringutils.md5");
import("utils.*");

import("collab.collab_server");

import("editor.workspace");

import("pad.model");
import("pad.revisions");

jimport("collabode.Workspace");

jimport("edu.mit.csail.uid.turkit.util.Base64");

jimport("java.security.KeyFactory");
jimport("java.security.Signature");
jimport("java.security.spec.X509EncodedKeySpec");

jimport("java.lang.System");

const localhost = /((^0:0:0:0:0:0:0:1(%0)?)|(127.0.0.1))$/;

function render_settings() {
  var padId = workspace.accessSettingsPad(getSession().userId);
  
  model.accessPadGlobal(padId, function(pad) {
    helpers.addClientVars({
      padId: padId,
      collab_client_vars: collab_server.getCollabClientVars(pad),
      initialRevisionList: revisions.getRevisionList(pad),
      serverTimestamp: +(new Date),
      initialOptions: pad.getPadOptionsObj(),
      opts: {}
    });
  });
  
  renderHtml("editor/settings.ejs", {
    projects: Workspace.listProjects()
  });
  return true;
}

function do_login(clazz, username, destination) {
  username = username.replace(/\W+/g, '').toLowerCase();
  var session = getSession();
  session.userId = clazz + '.' + username;
  session.userName = username;
  session.restricted = workspace.restricted(session.userId);
  session.userColorId = _userOrUnusedOrRandomColor(session.userId);
  appjet.cache.recent_users[session.userId] = session;
  response.redirect(destination);
}

function _userOrUnusedOrRandomColor(userId) {
  var used = {};
  jsutils.eachProperty(appjet.cache.recent_users, function(recentUserId, session) {
    used[session.userColorId] = recentUserId != userId;
  });
  
  var hash = Math.abs(new java.lang.String(userId).hashCode() % COLOR_PALETTE.length);
  if ( ! used[hash]) { return hash; }
  
  for (var ii = 0; ii < COLOR_PALETTE.length; ii++) {
    if ( ! used[ii]) { return ii; }
  }
  
  return Math.floor(Math.random() * COLOR_PALETTE.length);
}

function render_login(username, destination) {
  if (username == '' && request.clientAddr.match(localhost)) {
    do_login('u', 'admin', destination);
  } else if (appjet.config.authKey) {
    renderHtml("editor/login.ejs", { failure: "External authentication required" });
  } else if (username != '') {
    do_login('r', username, destination);
  } else {
    renderHtml("editor/login.ejs", { });
  }
  return true;
}

function login(destination) {
  var p = request.params;
  if (appjet.config.authKey) {
    renderHtml("editor/login.ejs", { failure: "External authentication required" });
  } else if (p.rusername != '') {
    do_login('r', p.rusername, destination);
  } else if ((p.username != '') && (_hash(p.username) == p.password)) { // XXX
    do_login('u', p.username, destination);
  } else {
    renderHtml("editor/login.ejs", { failure: "Login failed" });
  }
  return true;
}

function external_login(username, signature, destination) {
  if ( ! appjet.config.authKey) {
    renderHtml("editor/login.ejs", { failure: "External authentication not configured" });
  } else {
    var spec = new X509EncodedKeySpec(Base64.decode(appjet.config.authKey));
    var key = KeyFactory.getInstance("RSA").generatePublic(spec);
    var sig = Signature.getInstance("SHA1withRSA");
    sig.initVerify(key);
    sig.update(new java.lang.String(username + '@' + request.clientAddr).getBytes());
    if (sig.verify(Base64.decode(decodeURIComponent(signature)))) {
      do_login('r', username, destination);
    } else {
      renderHtml("editor/login.ejs", { failure: "External authentication signature verification failed" });
    }
  }
  return true;
}

function logout() {
  delete getSession().userId;
  delete getSession().userName;
  delete getSession().restricted;
  response.redirect('/');
  return true;
}

function _hash(username) {
  return md5(username + '\n').substring(0, 4);
}
