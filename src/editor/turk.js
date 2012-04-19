import("fastJSON");
import("netutils");
import("utils");

import("collab.collab_server");

import("editor.workspace");

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
      return netutils.urlPost(appjet.config.instaworkURL + '/api/create_task', {
        userId: appjet.config.instaworkUser,
        secretKey: appjet.config.instaworkKey,
        title: 'Quick collaborative programming',
        description: description + ' (near line ' + lineNo + ')',
        url: url
      });
    }
  }
}

function _onOutsourceRequest(padId, userId, connectionId, msg) {
  if ( ! appjet.config.outsourceProvider) {
    return;
  }
  var host = InetAddress.getLocalHost().getHostName() + ':' + appjet.config.listenPort; // XXX not reliable
  _providers[appjet.config.outsourceProvider].create(request.scheme + '://' + host,
                                                     workspace.filenameFor(padId),
                                                     msg.request.reqTxt,
                                                     msg.request.lineNo)
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
  return fastJSON.parse(utils.urlGet(appjet.config.instaworkURL + '/api/get_task', {
    userId: appjet.config.instaworkUser,
    secretKey: appjet.config.instaworkKey,
    taskId: taskId
  }).content);
}
