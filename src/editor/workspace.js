import("jsutils.scalaFn");

import("collab.collab_server");

import("pad.model");

jimport("collabode.PadFunctions");
jimport("collabode.PadWorkingCopyOwner");
jimport("collabode.Workspace");

jimport("java.lang.System");

function onStartup() {
  PadFunctions.bind(scalaFn(3, _createPad),
                    scalaFn(3, _setPadContents),
                    scalaFn(3, _reportPadProblems));
}

function accessProject(projectname) {
  return Workspace.accessProject(projectname);
}

function _padIdFor(username, file) {
  return username + "@" + file.getFullPath();
}

function _createPad(username, file, initialText) {
  //System.out.println("_createPad " + username + " " + file);
  model.accessPadGlobal(_padIdFor(username, file), function(pad) {
    if (pad.exists()) {
      collab_server.setPadText(pad, initialText);
    } else {
      pad.create(initialText);
    }
  });
  return true;
}

function _setPadContents(username, file, newText) {
  //System.out.println("_setPadContents " + username + " " + file);
  model.accessPadGlobal(_padIdFor(username, file), function(pad) {
    collab_server.setPadText(pad, newText);
  });
  return true;
}

function _reportPadProblems(username, file, problems) {
  //System.out.println("_reportPadProblems " + username + " " + file);
  //problems.forEach(function(problem) {
  //  System.out.println("  " + problem);
  //});
  model.accessPadGlobal(_padIdFor(username, file), function(pad) {
    collab_server.updatePadClientsAnnotations(pad, "problem", problems.map(function(problem) {
      return {
        lineNumber: problem.getSourceLineNumber(),
        severity: (problem.isError() ? "error" : "warning"),
        message: problem.getMessage()
      };
    }));
  });
}

function accessWorkingCopyPad(username, file) {
  //System.out.println("accessWorkingCopyPad");
  
  Workspace.createWorkingCopy(username, file);
  
  var padId = _padIdFor(username, file);
  
  model.accessPadGlobal(padId, function(pad) {
    if ( ! pad.exists()) {
      System.err.println("  rendering nonexistent pad " + padId);
    }
  });
  
  return padId;
}

function _getBuffer(padId) {
  var username_filename = padId.split("@", 2);
  return PadWorkingCopyOwner.of(username_filename[0]).getBuffer(username_filename[1]);
}

function reviseWorkingCopy(padId, text) {
  //System.out.println("reviseWorkingCopy");
  _getBuffer(padId).reviseContents(text);
}

function reconcileWorkingCopy(padId) {
  //System.out.println("reconcileWorkingCopy");
  _getBuffer(padId).reconcileWorkingCopy(true);
}

function codeComplete(padId, offset, connectionId) {
  System.out.println("codeComplete");
  _getBuffer(padId).codeComplete(offset, scalaFn(1, function(proposals) {
    collab_server.updateClientCodeCompletionProposals(connectionId, padId, offset, proposals.map(function(proposal) {
      return {
        completion: "" + new java.lang.String(proposal.getCompletion()),
        start: proposal.getReplaceStart(),
        end: proposal.getReplaceEnd()
      };
    }));
  }));
}
