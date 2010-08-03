import("dispatch.{Dispatcher,PrefixMatcher,forward}");
import("fastJSON");
import("sqlbase.sqlcommon");

import("utils");

import("control.static_control");
import("control.auth_control");
import("control.console_control");
import("control.editor_control");

import("collab.collabroom_server");
import("collab.collab_server");
import("pad.model");
import("pad.dbwriter");

import("editor.workspace");

jimport("java.lang.System.out.println");

serverhandlers.startupHandler = function() {
    sqlcommon.init(appjet.config.dbDriver,
                   appjet.config.dbURL, "u", "");
    
    model.onStartup();
    collab_server.onStartup();
    dbwriter.onStartup();
    collabroom_server.onStartup();
    workspace.onStartup();
};

serverhandlers.requestHandler = function() {
    // XXX maybe check some stuff?
    handlePath();
};

serverhandlers.tasks.writePad = function(padId) {
    dbwriter.taskWritePad(padId);
};
serverhandlers.tasks.pdsyncDocumentText = function(padId, cs) {
    workspace.taskPdsyncDocumentText(padId, cs);
};
serverhandlers.tasks.pdsyncPadStyle = function(username, file, iterator) {
    workspace.taskPdsyncPadStyle(username, file, iterator);
};
serverhandlers.tasks.reportProblems = function(username, file, problems) {
    workspace.taskReportProblems(username, file, problems);
}
serverhandlers.tasks.runningStateChange = function(username, file, state) {
    workspace.taskRunningStateChange(username, file, state);
};
serverhandlers.tasks.runningOutput = function(username, file, text, attribs) {
    workspace.taskRunningOutput(username, file, text, attribs);
};
serverhandlers.tasks.testResult = function(project, test, result) {
    workspace.taskTestResult(project, test, result);
};
serverhandlers.tasks.orgImportsPrompt = function(connectionId, openChoices, ranges) {
    workspace.taskOrgImportsPrompt(connectionId, openChoices, ranges);
};
serverhandlers.tasks.orgImportsApply = function(username, file, connectionId, iterator) {
    workspace.taskOrgImportsApply(username, file, connectionId, iterator);
};

serverhandlers.cometHandler = function(op, id, data) {
    if ( ! data) {
        collabroom_server.handleComet(op, id, data);
        return;
    }
    
    while (data[data.length-1] == '\u0000') {
        data = data.substr(0, data.length-1);
    }
    
    var wrapper;
    try {
        wrapper = fastJSON.parse(data);
    } catch (err) {
        try {
            wrapper = fastJSON.parse(data + '}');
        } catch (err) {
            println("[comet] invalid JSON");
            throw err;
        }
    }
    if (wrapper.type == "COLLABROOM") {
        collabroom_server.handleComet(op, id, wrapper.data);
    } else {
        println("[comet] incorrectly wrapped " + wrapper['type']);
    }
};

function handlePath() {
  response.neverCache();

  var noauth = {
    GET: new Dispatcher(),
    POST: new Dispatcher()
  };
  noauth.HEAD = noauth.GET;
  noauth.GET.addLocations([
    ['/favicon.ico', forward(static_control)],
    ['/robots.txt', forward(static_control)],
    [PrefixMatcher('/static/'), forward(static_control)],
    ['/', editor_control.render_root],
    [/^\/login:([\w]+)(\/.*)$/, auth_control.render_login],
    [/^\/login()(\/.*)$/, auth_control.render_login],
    ['/logout', auth_control.logout]
  ]);
  noauth.POST.addLocations([
    [/^\/login(\/.*)$/, auth_control.login]
  ]);
  
  if (noauth[request.method].dispatch()) {
    return;
  }
  
  var userId = utils.getSession().userId;
  if ( ! userId) {
    response.redirect('/login' + request.path);
    return;
  }
  
  function allow(handler) {
    return function() { return handler.apply(this, arguments); };
  }
  function deny(handler) {
    return function() { utils.renderError(403); return true; };
  }
  function check(handler) {
    return function(projectname, filename) {
      if (workspace.isRenderAllowed(projectname, filename, userId)) {
        return handler.apply(this, arguments);
      } else {
        return deny()(); // what is this, Perl?
      }
    };
  }
  
  var u = workspace.restricted(userId) ? deny : allow;
  var r = workspace.restricted(userId) ? check : allow;
  
  var authed = {
    GET: new Dispatcher(),
    POST: new Dispatcher()
  };
  authed.HEAD = authed.GET;
  authed.GET.addLocations([
    ['/acl', u(auth_control.render_acl)],
    [_file('console'), r(console_control.render_console)],
    [_proj('delete'), u(editor_control.render_confirm_delete)],
    [_file('delete'), u(editor_control.render_confirm_delete)],
    [_file('clone'), r(editor_control.clone_path)],
    [_proj(), r(editor_control.render_project)],
    [_file(), r(editor_control.render_path)]
  ]);
  authed.POST.addLocations([
    [_proj('delete'), u(editor_control.delete_path)],
    [_file('delete'), u(editor_control.delete_path)],
    ['/', u(editor_control.create_project)],
    [_proj(), u(editor_control.create_path)],
    [_file(), u(editor_control.create_path)]
  ]);
  
  if (authed[request.method].dispatch()) {
    return;
  }
  
  utils.renderError(404);
}

function _proj(verb) {
  return new RegExp("^" + (verb ? "/" + verb : "") + "/([\\w-\\.]+)/?()$")
}

function _file(verb) {
  return new RegExp("^" + (verb ? "/" + verb : "") + "/([\\w-\\.]+)/(.+)$")
}
