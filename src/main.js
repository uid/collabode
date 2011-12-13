import("dispatch.{Dispatcher,PrefixMatcher,forward}");
import("fastJSON");
import("sqlbase.sqlcommon");

import("utils");

import("control.static_control");
import("control.auth_control");
import("control.clone_control");
import("control.console_control");
import("control.editor_control");
import("control.stats_control");
import("control.turk_control");

import("collab.collabroom_server");
import("collab.collab_server");
import("pad.model");
import("pad.dbwriter");

import("editor.auth");
import("editor.workspace");

jimport("java.lang.System");

serverhandlers.startupHandler = function() {
    sqlcommon.init(appjet.config.dbDriver,
                   appjet.config.dbURL, "u", "");
    
    model.onStartup();
    collab_server.onStartup();
    dbwriter.onStartup();
    collabroom_server.onStartup();
    auth.onStartup();
    workspace.onStartup();
};

serverhandlers.requestHandler = function() {
    // XXX maybe check some stuff?
    handlePath();
};

serverhandlers.tasks.willShutdown = function() {
    collab_server.willShutdown();
};
serverhandlers.tasks.writePad = function(padId) {
    dbwriter.taskWritePad(padId);
};
serverhandlers.tasks.pdsyncDocumentText = function(padId, newRev, cs, author) {
    workspace.taskPdsyncDocumentText(padId, newRev, cs, author);
};
serverhandlers.tasks.pdsyncQueuedStyles = function(collab) {
  try {
    workspace.taskPdsyncQueuedStyles(collab);
  } catch (e if e.easysync) { System.err.println("Easysync error during pdsyncQueuedStyles: " + e); }
};
serverhandlers.tasks.updateAnnotations = function(username, file, type, annotations) {
    workspace.taskUpdateAnnotations(username, file, type, annotations);
};
serverhandlers.tasks.runningStateChange = function(id, file, state) {
    workspace.taskRunningStateChange(id, file, state);
};
serverhandlers.tasks.runningOutput = function(id, file, text, attribs) {
    workspace.taskRunningOutput(id, file, text, attribs);
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
            System.out.println("[comet] invalid JSON");
            throw err;
        }
    }
    if (wrapper.type == "COLLABROOM") {
        collabroom_server.handleComet(op, id, wrapper.data);
    } else {
        System.out.println("[comet] incorrectly wrapped " + wrapper['type']);
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
    [/^\/login:([\w]+):([^\/]+)(\/.*)$/, auth_control.external_login],
    [/^\/login()(\/.*)$/, auth_control.render_login],
    ['/logout', auth_control.logout],
    [_file('turk:([\\w]+)'), turk_control.render_task],
    [/^\/frame%22([\s\S]*?)%22(\/.*)$/, turk_control.render_framed] // XXX anyone can frame us?
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
  function check(handler, permission, shift, fakeId) {
    permission = permission || auth.READ;
    shift = shift || 0;
    return function() {
      if (auth.has_acl(arguments[0+shift], arguments[1+shift], fakeId || userId, permission)) {
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
    ['/settings', u(auth_control.render_settings)],
    ['/new', u(editor_control.render_new_project)],
    [_file('console'), r(console_control.render_console)],
    [_proj('delete'), u(editor_control.render_confirm_delete)],
    [_file('delete'), u(editor_control.render_confirm_delete)],
    [_proj('delacl:([\\w\\.]+)'), r(editor_control.render_confirm_delacl, auth.OWNER, 1)],
    [_file('delacl:([\\w\\.]+)'), r(editor_control.render_confirm_delacl, auth.OWNER, 1)],
    [_file('clone'), r(clone_control.clone_path)],
    [_file('knockout:([\\w,.\\[;]+)"([\\s\\S]*)"'), r(turk_control.render_knockout, auth.READ, 2, 'clones')],
    [/^\/statistics(?:\/(?:([^\/]+)(?:\/([^\/]+)?)?)?)?$/, u(stats_control.render_stats)],
    [_proj(), r(editor_control.render_project)],
    [_file(), r(editor_control.render_path)]
  ]);
  authed.POST.addLocations([
    [_proj('delete'), u(editor_control.delete_path)],
    [_file('delete'), u(editor_control.delete_path)],
    [_proj('delacl:([\\w\\.]+)'), r(editor_control.delete_acl, auth.OWNER, 1)],
    [_file('delacl:([\\w\\.]+)'), r(editor_control.delete_acl, auth.OWNER, 1)],
    [_file('knockout:([\\w,.\\[;]+)"([\\s\\S]*)"'), r(turk_control.create_knockout, auth.READ, 2, 'clones')],
    ['/', u(editor_control.create_project)],
    [_proj(), r(editor_control.modify_path, auth.OWNER)],
    [_file(), r(editor_control.modify_path, auth.OWNER)]
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
  var regex = new RegExp("^" + (verb ? "/" + verb : "") + "/([\\w-\\.]+)/(.+?)(?::(\\d+))?$");
  return {
    exec: function(path) { return regex.exec(decodeURIComponent(path)); }
  };
}
