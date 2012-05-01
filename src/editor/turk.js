import("fastJSON");
import("netutils");
import("utils.*");

import("collab.collab_server");

import("editor.auth");
import("editor.workspace");

import("pad.model");

jimport("collabode.Workspace");

jimport("edu.mit.csail.uid.turkit.MTurk");

jimport("java.net.InetAddress");

jimport("java.lang.System");

function onStartup() {
  collab_server.setExtendedHandler("OUTSOURCE_REQUEST", _onOutsourceRequest);
}

var _providers = {
  instawork: {
    create: function(base, filename, description, lineNo) {
      var url = base + '/instawork' + filename + ':' + lineNo;
      var result = netutils.urlPost(appjet.config.instaworkURL + '/api/create_task', {
        userId: appjet.config.instaworkUser,
        secretKey: appjet.config.instaworkKey,
        title: 'Quick collaborative programming',
        description: description + ' (near line ' + lineNo + ')',
        url: url
      });
      return fastJSON.parse(result.content).taskId;
    },
    get: function(id) {
      try {
        var task = getInstaworkTask(id);
      } catch (ioe if ioe.javaException instanceof java.io.IOException) {
        return { id: id }; // XXX
      }
      return {
        id: task.taskId,
        description: task.description,
        location: task.url.substring(task.url.indexOf('/instawork/')+11)
      };
    }
  }
}

function _outsourcedMessage(project, id) {
  var provider = _providers[appjet.config.outsourceProvider];
  var reqs = Workspace.getProjectPrefs(project, "outsource").node("req");
  return {
    type: "OUTSOURCED",
    requests: (id ? [ id ] : reqs.keys()).map(function(id) {
      var req = provider.get(id);
      var state = reqs.get(id, "unknown").split('@');
      req.state = state[0];
      if (state[1]) {
        req.user = appjet.cache.recent_users[state[1]]; // XXX really, this knows about that?
      }
      return req;
    })
  };
}

function _updateRequest(id, projectname) {
  var padIds = collab_server.getAllPadsWithConnections().filter(function(padId) {
    return workspace.filenameFor(padId) && (projectname == workspace.filenameFor(padId).split("/", 3)[1]);
  });
  var project = Workspace.accessProject(projectname);
  var msg = _outsourcedMessage(project, id);
  padIds.forEach(function(padId) {
    model.accessPadGlobal(padId, function(pad) {
      collab_server.sendPadExtendedMessage(pad, msg);
    });
  });
}

function _onOutsourceRequest(padId, userId, connectionId, msg) {
  if ( ! appjet.config.outsourceProvider) {
    return;
  }
  
  var doc = workspace.documentFor(userId, padId);
  var project = doc.collab.file.getProject();
  
  switch (msg.action) {
  case 'state':
    collab_server.sendConnectionExtendedMessage(connectionId, _outsourcedMessage(project));
    break;
  case 'create':
    if (workspace.restricted(userId) && ! auth.has_acl(project, doc.collab.file, userId, auth.OWNER)) {
      return;
    }
    var host = InetAddress.getLocalHost().getHostName() + ':' + appjet.config.listenPort; // XXX not reliable
    var provider = _providers[appjet.config.outsourceProvider];
    var id = provider.create(request.scheme + '://' + host,
                             workspace.filenameFor(padId),
                             msg.request.reqTxt,
                             msg.request.lineNo);
    var reqs = Workspace.getProjectPrefs(project, "outsource").node("req");
    reqs.put(id, "new");
    Workspace.getWorkspace().run(function() { reqs.flush(); }, null);
    _updateRequest(id, project.getName());
    break;
  }
}

function claimRequest(id, projectname) {
  var project = Workspace.accessProject(projectname);
  var reqs = Workspace.getProjectPrefs(project, "outsource").node("req");
  var state = reqs.get(id, "unknown");
  var userId = getSession().userId;
  if (state == 'new') {
    reqs.put(id, 'assigned@' + userId);
    Workspace.getWorkspace().run(function() { reqs.flush(); }, null);
    _updateRequest(id, projectname);
    auth.add_acl(project, '', userId, auth.WRITE);
    return true;
  } else if (state.split('@')[1] == userId) {
    return true;
  } else {
    return false;
  }
}

function completeRequest(id, projectname) {
  var project = Workspace.accessProject(projectname);
  var reqs = Workspace.getProjectPrefs(project, "outsource").node("req");
  var state = reqs.get(id, "unknown");
  var userId = getSession().userId;
  if (state != 'assigned@' + userId) {
    return false;
  } else {
    reqs.put(id, 'done@' + userId);
    Workspace.getWorkspace().run(function() { reqs.flush(); }, null);
    _updateRequest(id, projectname);
    auth.del_acl(project, '', userId);
    return true;
  }
}

function getMTurkHIT(userId, hitId) {
  var settings = workspace.getSettings(userId);
  return new XML(MTurk.restRequest(settings.get('turkID'),
                                   settings.get('turkSecret'),
                                   settings.get('turkSandbox') == 'true' ? true : false,
                                   'GetHIT',
                                   'HITId',
                                   hitId))..HIT;
}

function getInstaworkTask(taskId) {
  return fastJSON.parse(urlGet(appjet.config.instaworkURL + '/api/get_task', {
    userId: appjet.config.instaworkUser,
    secretKey: appjet.config.instaworkKey,
    taskId: taskId
  }).content);
}
