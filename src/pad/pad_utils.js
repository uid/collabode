import("pad.model");

function setCurrentPad(p) {
    appjet.context.attributes().update("currentPadId", p);
}

function clearCurrentPad() {
    appjet.context.attributes()['$minus$eq']("currentPadId");
}

function getCurrentPad() {
    var padOpt = appjet.context.attributes().get("currentPadId");
    if (padOpt.isEmpty()) return null;
    return padOpt.get();
}

function accessPadLocal(localPadId, fn, rwMode) {
    if (!request.isDefined) {
        throw Error("accessPadLocal() cannot run outside an HTTP request.");
    }
    var globalPadId = getGlobalPadId(localPadId);
    var fnwrap = function(pad) {
        pad.getLocalId = function() {
            return getLocalPadId(pad);
        };
        return fn(pad);
    }
    return model.accessPadGlobal(globalPadId, fnwrap, rwMode);
}

function getGlobalPadId(localPadId) {
    if (!request.isDefined) {
        throw Error("getGlobalPadId() cannot run outside an HTTP request.");
    }
    return localPadId;
}

function makeGlobalId(domainId, localPadId) {
    return [domainId, localPadId].map(String).join('$');
}

function globalToLocalId(globalId) {
    var parts = globalId.split('$');
    if (parts.length == 1) {
        return parts[0];
    } else {
        return parts[1];
    }
}

function getLocalPadId(pad) {
    var globalId = pad.getId();
    return globalToLocalId(globalId);
}
