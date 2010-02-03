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
