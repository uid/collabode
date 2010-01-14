import("dispatch.{Dispatcher,PrefixMatcher,forward}");
import("fastJSON");
import("sqlbase.sqlcommon");

import("control.static_control");
import("control.pad_control");

import("collab.collabroom_server");
import("collab.collab_server");
import("pad.model");
import("pad.dbwriter");

jimport("java.lang.System.out.println");

serverhandlers.startupHandler = function() {
    println("Startup handler");
    
    var sp = function(k) { return appjet.config['SQL_'+k] || null; };
    sqlcommon.init(sp('JDBC_DRIVER'), sp('JDBC_URL'), sp('USERNAME'), sp('PASSWORD'));
    
    model.onStartup();
    collab_server.onStartup();
    dbwriter.onStartup();
    collabroom_server.onStartup();
};

serverhandlers.requestHandler = function() {
    // XXX maybe check some stuff?
    handlePath();
};

serverhandlers.tasks.writePad = function(globalPadId) {
    dbwriter.taskWritePad(globalPadId);
};

serverhandlers.cometHandler = function(op, id, data) {
    if ( ! data) {
        // XXX println("[comet] connect/disconnect " + op + " " + id);
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
        // XXX println("[comet] " + op + " " + id + " " + wrapper.data);
        collabroom_server.handleComet(op, id, wrapper.data);
    } else {
        println("[comet] incorrectly wrapped " + wrapper['type']);
    }
};

function handlePath() {
    response.neverCache();
    
    var dispatcher = new Dispatcher();
    dispatcher.addLocations([
        [PrefixMatcher('/static/'), forward(static_control)],
        [/^\/([^\/]+)$/, pad_control.render_pad]
    ]);
    
    if (dispatcher.dispatch()) {
        return;
    }
    
    // XXX 404
}
