import("editor.workspace");

jimport("edu.mit.csail.uid.turkit.MTurk");

jimport("java.lang.System");

function getHIT(userId, hitId) {
  var settings = workspace.getSettings(userId);
  return new XML(MTurk.restRequest(settings.get('turkID'),
                                   settings.get('turkSecret'),
                                   settings.get('turkSandbox') == 'true' ? true : false,
                                   'GetHIT',
                                   'HITId',
                                   hitId))..HIT;
}
