import("jsutils.scalaFn");

import("collab.ace.easysync2.{AttribPool,Changeset}");
import("collab.collab_server");

import("pad.model");

jimport("collabode.PadFunctions");
jimport("collabode.PadDocumentOwner");
jimport("collabode.Workspace");
jimport("collabode.testing.ProjectTestsOwner");

jimport("java.lang.System");

function onStartup() {
  PadFunctions.bind(scalaFn(3, _pdsyncPadText),
                    scalaFn(4, _pdsyncPadStyle),
                    scalaFn(3, _reportPadProblems),
                    scalaFn(3, _reportTestResult));
}

function listProjects() {
  return Workspace.listProjects();
}

function accessProject(projectname) {
  return Workspace.accessProject(projectname);
}

function createProject(projectname) {
  return Workspace.createProject(projectname);
}

function _padIdFor(username, file) {
  return username + "@" + file.getFullPath();
}

function _pdsyncPadText(username, file, txt) { // XXX should take revisions, not full text
  model.accessPadGlobal(_padIdFor(username, file), function(pad) {
    pad.pdsync(function() {
      collab_server.setPadText(pad, txt);
    });
  });
}

function _pdsyncPadStyle(username, file, len, ops) {
  model.accessPadGlobal(_padIdFor(username, file), function(pad) {
    var apool = pad.pool();
    var builder = Changeset.builder(pad.text().length); // XXX ignoring len
    while (ops.hasNext()) {
      var op = ops.next();
      builder.keep(op.chars, op.lines, op.attribs.map(function(a) { return a.slice(); }), apool);
    }
    var changeset = builder.toString();
    pad.pdsync(function () {
      collab_server.applyChangesetToPad(pad, changeset, "#syntaxcolor");
    });
  });
}

function _reportPadProblems(username, file, problems) {
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

const everyone = "pool.everyone";

function accessDocumentPad(username, file) {
  var padId = _padIdFor(username, file);
  
  model.accessPadGlobal(padId, function(pad) {
    if ( ! pad.exists()) {
      pad.create();
    }
  });
  
  Workspace.createDocument(username, file);
  
  return padId;
}

function _getDocument(padId) {
  var username_filename = padId.split("@", 2);
  return PadDocumentOwner.of(username_filename[0]).get(username_filename[1]);
}

function taskReviseDocument(padId) {
  model.accessPadGlobal(padId, function(pad) {
    _getDocument(padId).revise(pad.text()); // XXX need to implement partial revision
  });
}

function onNewEditor(padId, connectionId) {
  var doc = _getDocument(padId);
  ProjectTestsOwner.of(doc.getProject()).reportResults(scalaFn(2, function(test, result) {
    collab_server.updateClientTestResult(connectionId, test, result);
  }));
}

function codeComplete(padId, offset, connectionId) {
  _getDocument(padId).codeComplete(offset, scalaFn(1, function(proposals) {
    collab_server.updateClientCodeCompletionProposals(connectionId, padId, offset, proposals.map(function(proposal) {
      return {
        completion: "" + new java.lang.String(proposal.getCompletion()),
        start: proposal.getReplaceStart(),
        end: proposal.getReplaceEnd()
      };
    }));
  }));
}

function getContentTypeName(padId) {
  return _getDocument(padId).getContentTypeName();
}

function _reportTestResult(project, test, result) {
  collab_server.updateProjectClientsTestResult("" + project.getName(), test, result);
}
