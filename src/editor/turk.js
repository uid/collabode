import("collab.collab_server");

import("editor.workspace");

jimport("edu.mit.csail.uid.turkit.MTurk");

jimport("java.lang.System");

function onStartup() {
  collab_server.setExtendedHandler("OUTSOURCE_REQUEST", _onOutsourceRequest);
}

function _onOutsourceRequest(padId, userId, connectionId, msg) {
  System.out.println("Outsourcing unimplemented"); // XXX
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
