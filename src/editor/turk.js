import("fastJSON");
import("netutils");
import("utils.*");

import("collab.collab_server");

import("editor.auth");
import("editor.contrib");
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
      function parseDate(date) {
        return date ? +new Date(date.replace(/-/g, '/').replace(/\.\d+/, '') + ' UTC') : null;
      }
      return {
        id: task.taskId,
        description: task.description,
        location: task.url.substring(task.url.indexOf('/instawork/')+11),
        created: parseDate(task.created),
        assigned: parseDate(task.assigned),
        completed: parseDate(task.completed)
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
      var req = _getRequest(id, project);
      req.id = id;
      req.details = provider.get(id);
      req.requester = appjet.cache.recent_users[req.requester]; // XXX really, this knows about that?
      req.worker = req.worker ? appjet.cache.recent_users[req.worker] || {} : {}; // XXX really, this knows about that?
      if (req.worker.userId) {
        var padIds = contrib.padsEdited(project.getName(), req.worker.userId);
        req.deltas = {};
        padIds.forEach(function(padId) {
          var change = contrib.padChange(padId, req.details.assigned, req.details.completed);
          req.deltas[workspace.filenameFor(padId)] = contrib.authorDelta(req.worker.userId, change);
        });
      }
      return req;
    })
  };
}

function _getRequest(id, project) {
  return fastJSON.parse(Workspace.getProjectPrefs(project, "outsource").node("req").get(id, "{}"));
}

function _putRequest(id, project, data) {
  var reqs = Workspace.getProjectPrefs(project, "outsource").node("req");
  reqs.put(id, fastJSON.stringify(data));
  Workspace.getWorkspace().run(function() { reqs.flush(); }, null);
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
    _putRequest(id, project, { state: 'new', requester: userId });
    _updateRequest(id, project.getName());
    break;
  }
}

function claimRequest(id, projectname) {
  var project = Workspace.accessProject(projectname);
  var req = _getRequest(id, project);
  var userId = getSession().userId;
  if (req.state == 'new') {
    req.state = 'assigned';
    req.worker = userId;
    _putRequest(id, project, req);
    _updateRequest(id, projectname);
    auth.add_acl(project, '', userId, auth.WRITE);
    return true;
  } else if (req.worker == userId) {
    return true;
  } else {
    return false;
  }
}

function completeRequest(id, projectname) {
  var project = Workspace.accessProject(projectname);
  var req = _getRequest(id, project);
  var userId = getSession().userId;
  if (req.state == 'assigned' && req.worker == userId) {
    req.state = 'done';
    _putRequest(id, project, req);
    _updateRequest(id, projectname);
    auth.del_acl(project, '', userId);
    return true;
  } else {
    return false;
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
