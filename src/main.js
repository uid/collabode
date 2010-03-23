import("dispatch.{Dispatcher,PrefixMatcher,forward}");
import("fastJSON");
import("sqlbase.sqlcommon");

import("control.static_control");
import("control.editor_control");
import("control.run_control");

import("collab.collabroom_server");
import("collab.collab_server");
import("pad.model");
import("pad.dbwriter");

import("editor.workspace");

jimport("java.lang.System.out.println");

serverhandlers.startupHandler = function() {
    sqlcommon.init("org.apache.derby.jdbc.EmbeddedDriver",
                   "jdbc:derby:pads");
    
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
serverhandlers.tasks.reviseDocument = function(padId) {
    workspace.taskReviseDocument(padId);
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
    
    var get = new Dispatcher();
    get.addLocations([
        [PrefixMatcher('/static/'), forward(static_control)],
        ['/', editor_control.render_root],
        [_file('run'), run_control.render_run],
        [_file('test'), run_control.render_test],
        [_file('delete'), editor_control.render_confirm_delete],
        [_proj(), editor_control.render_project],
        [_file(), editor_control.render_path]
    ]);
    
    var post = new Dispatcher();
    post.addLocations([
        [_file('delete'), editor_control.delete_path],
        [_proj(), editor_control.create_project],
        [_file(), editor_control.create_path]
    ]);
    
    var dispatchers = { GET: get, POST: post };
    
    if (dispatchers[request.method].dispatch()) {
        return;
    }
    
    // XXX 404
}

function _proj(verb) {
  return new RegExp("^" + (verb ? "/" + verb : "") + "/([\\w-\\.]+)/?$")
}

function _file(verb) {
  return new RegExp("^" + (verb ? "/" + verb : "") + "/([\\w-\\.]+)/(.+)$")
}
