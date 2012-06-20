import("fastJSON");
import("netutils");
import("sqlbase.sqlobj");
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

const TABLE = "OUTSOURCE_TASKS";

function onStartup() {
  collab_server.setExtendedHandler("OUTSOURCE_REQUEST", _onOutsourceRequest);
}

var _providers = {
  instawork: {
    create: function(base, location, description) {
      var url = base + '/instawork' + location;
      var result = netutils.urlPost(appjet.config.instaworkURL + '/api/create_task', {
        userId: appjet.config.instaworkUser,
        secretKey: appjet.config.instaworkKey,
        title: 'Quick collaborative programming',
        description: description,
        url: url,
        pool: appjet.config.instaworkPool
      });
      return fastJSON.parse(result.content).taskId;
    }
  }
}

function getRequestObj(id) {
  return sqlobj.selectSingle(TABLE, { id: id });
}

function getRequestsFull(projectname, id) {
  var provider = _providers[appjet.config.outsourceProvider];
  var constraints = { projectname: projectname };
  if (id) { constraints.id = id };
  return sqlobj.selectMulti(TABLE, constraints, { orderBy: 'created' }).map(function(req) {
    req.created = +req.created;
    req.assigned = req.assigned ? +req.assigned : null;
    req.completed = req.completed ? +req.completed : null;
    req.requester = appjet.cache.recent_users[req.requester] || { userId: req.requester }; // XXX really, this knows about that?
    req.worker = req.worker ? appjet.cache.recent_users[req.worker] || { userId: req.worker } : {}; // XXX really, this knows about that?
    if (req.worker.userId) {
      var padIds = contrib.padsEdited(projectname, req.worker.userId);
      req.deltas = {};
      padIds.forEach(function(padId) {
        var change = contrib.padChange(padId, req.assigned, req.completed);
        req.deltas[workspace.filenameFor(padId)] = contrib.authorDelta(req.worker.userId, change);
      });
    }
    return req;
  });
}

function _outsourcedMessage(projectname, id) {
  return {
    type: "OUTSOURCED",
    requests: getRequestsFull(projectname, id)
  };
}

function _updateRequest(id, projectname) {
  var padIds = collab_server.getAllPadsWithConnections().filter(function(padId) {
    return workspace.filenameFor(padId) && (projectname == workspace.filenameFor(padId).split("/", 3)[1]);
  });
  var msg = _outsourcedMessage(projectname, id);
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
    collab_server.sendConnectionExtendedMessage(connectionId, _outsourcedMessage(project.getName()));
    break;
  case 'create':
    if (workspace.restricted(userId) && ! auth.has_acl(project, doc.collab.file, userId, auth.OWNER)) {
      return;
    }
    var host = appjet.config.listenHost || InetAddress.getLocalHost().getHostName();
    if (appjet.config.listenPort != '80') { host += ':' + appjet.config.listenPort; }
    var location = workspace.filenameFor(padId) + ':' + msg.request.lineNo;
    var provider = _providers[appjet.config.outsourceProvider];
    var id = provider.create(request.scheme + '://' + host,
                             location,
                             msg.request.reqTxt + ' (near line ' + msg.request.lineNo + ')');
    sqlobj.insert(TABLE, {
      id: id,
      projectname: project.getName(),
      description: msg.request.reqTxt,
      location: location,
      created: new Date(),
      requester: userId
    });
    _updateRequest(id, project.getName());
    break;
  }
}

function claimRequest(id, projectname) {
  var req = sqlobj.selectSingle(TABLE, { id: id });
  var userId = getSession().userId;
  if (req.worker == null) {
    sqlobj.updateSingle(TABLE, { id: id }, {
      assigned: new Date(),
      worker: userId
    });
    auth.add_acl(Workspace.accessProject(projectname), '', userId, auth.WRITE);
    _updateRequest(id, projectname);
    return true;
  } else if (req.worker == userId) {
    return true;
  } else {
    return false;
  }
}

function completeRequest(id, projectname) {
  var req = sqlobj.selectSingle(TABLE, { id: id });
  var userId = getSession().userId;
  if (req.worker == userId && ! req.completed) {
    sqlobj.updateSingle(TABLE, { id: id }, { completed: new Date() });
    auth.del_acl(Workspace.accessProject(projectname), '', userId);
    _updateRequest(id, projectname);
    return true;
  } else if (req.completed) {
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
