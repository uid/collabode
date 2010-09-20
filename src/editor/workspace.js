import("jsutils.scalaFn");

import("collab.ace.easysync2.{AttribPool,Changeset}");
import("collab.collab_server");

import("pad.model");

jimport("collabode.PadFunctions");
jimport("collabode.PadDocumentOwner");
jimport("collabode.Workspace");
jimport("collabode.running.FileRunOwner");
jimport("collabode.testing.ProjectTestsOwner");

jimport("org.eclipse.text.edits.ReplaceEdit");

jimport("java.io.StringReader");
jimport("java.util.Properties");

jimport("java.lang.System");

function onStartup() {
  PadFunctions.bind(scalaFn(3, _pdsyncPadText));
  collab_server.setExtendedHandler("RUN_REQUEST", _onRunRequest);
  collab_server.setExtendedHandler("TESTS_REQUEST", _onTestsRequest);
  collab_server.setExtendedHandler("FORMAT_REQUEST", _onFormatRequest);
  collab_server.setExtendedHandler("ORGIMPORTS_REQUEST", _onOrganizeImportsRequest);
  collab_server.setExtendedHandler("ORGIMPORTS_RESOLVED", _onOrganizeImportsResolved);
}

function _padIdFor(username, file) {
  return username + "@" + file.getFullPath();
}

function _pdsyncPadText(username, file, txt) { // XXX should take revisions, not full text
  var rev;
  model.accessPadGlobal(_padIdFor(username, file), function(pad) {
    pad.pdsync(function() {
      collab_server.setPadText(pad, txt);
    });
    rev = pad.getHeadRevisionNumber();
  });
  return rev;
}

function taskReportProblems(username, file, problems) {
  model.accessPadGlobal(_padIdFor(username, file), function(pad) {
    collab_server.sendPadExtendedMessage(pad, {
      type: "ANNOTATIONS",
      annotationType: "problem",
      annotations: problems.map(function(problem) {
          return {
            lineNumber: problem.getSourceLineNumber(),
            severity: (problem.isError() ? "error" : "warning"),
            message: problem.getMessage()
          }
        })
    });
  });
}

const everyone = "pool.everyone";

function accessDocumentPad(username, file) {
  var padId = _padIdFor(username, file);
  
  model.accessPadGlobal(padId, function(pad) {
    if ( ! pad.exists()) {
      pad.create(true);
    }
  });
  
  Workspace.createDocument(username, file);
  
  return padId;
}

function _userFileFor(padId) {
  var uf = padId.split("@", 2);
  return { username: uf[0], filename: uf[1] };
}

function _getDocument(padId) {
  var uf = _userFileFor(padId);
  return PadDocumentOwner.of(uf.username).get(uf.filename);
}

function restricted(userId) {
  return userId[0] != 'u';
}

function accessAclPad() {
  var padId = "*acl*";
  
  model.accessPadGlobal(padId, function(pad) {
    if ( ! pad.exists()) {
      pad.create(false);
    }
  });
  
  return padId;
}

function _findAcl(userId, f) {
  model.accessPadGlobal(accessAclPad(), function(pad) {
    var lines = pad.text().split('\n');
    for (idx in lines) {
      if ( ! lines.hasOwnProperty(idx)) { continue; }
      var line = lines[idx];
      if (line == '') { continue; }
      var acl = line.split(/\s+/);
      if (acl.length < 2) { continue; }
      if ((acl[0] != 'anyone') && (acl[0] != userId)) { continue; }
      
      if (f(acl)) { break; }
    }
  });
}

function cloneAcl(userId, project, destination) {
  var additions = [];
  _findAcl('clones', function(acl) {
    var match = acl[1].match('^/'+project+'(/.*)');
    if (match) {
      acl[0] = userId;
      acl[1] = '/'+destination+match[1];
      additions.push(acl.join(' '));
    }
    return false;
  });
  _findAcl(userId, function(acl) {
    additions = additions.filter(function(line) {
      return line != acl.join(' ');
    });
  });
  additions = additions.map(function(line) { return line+'\n'; });
  model.accessPadGlobal(accessAclPad(), function(pad) {
    collab_server.setPadText(pad, pad.text() + additions.join(''));
  });
}

function _isAllowedBySomeAcl(userId, allowed) {
  var ret = false;
  _findAcl(userId, function(acl) {
    ret = ret || allowed(acl);
    return ret;
  });
  return ret;
}

function isRenderAllowed(projectname, filename, userId) {
  var path = '/'+((filename == '') ? projectname : projectname+'/'+filename);
  return _isAllowedBySomeAcl(userId, function(acl) {
    if (acl[1].length > path.length) {
      return acl[1].indexOf(path) == 0;
    } else {
      return path.indexOf(acl[1]) == 0;
    }
  });
}

function isChangesetAllowed(padId, changeset, author) {
  if (author == '') { return true; } // XXX always internal?
  if (author[0] == '#') { return true; } // XXX always internal?
  if ( ! restricted(author)) { return true; }
  
  var uf = _userFileFor(padId);
  return _isAllowedBySomeAcl(author, function(acl) {
    if (acl[1] != uf.filename) { return false; }
    var doc = _getDocument(padId);
    return doc.isAllowed(_makeReplaceEdits(changeset), acl.slice(2));
  });
}

function accessSettingsPad(userId) {
  var padId = userId + "*settings*";
  
  model.accessPadGlobal(padId, function(pad) {
    if ( ! pad.exists()) {
      pad.create(false);
    }
  });
  
  return padId;
}

function getSettings(userId, key) {
  var props = new Properties();
  model.accessPadGlobal(accessSettingsPad(userId), function(pad) {
    props.load(new StringReader(pad.text()));
  });
  return props;
}

function taskPdsyncDocumentText(padId, newRev, cs) {
  var doc = _getDocument(padId);
  doc.pdsyncApply(newRev, _makeReplaceEdits(cs));
}

function taskPdsyncPadStyle(username, file, baseRev, iterator) {
  model.accessPadGlobal(_padIdFor(username, file), function(pad) {
    var changeset = _makeChangeSetStr(pad, iterator);
    while (baseRev != pad.getHeadRevisionNumber()) {
      baseRev++;
      changeset = Changeset.follow(pad.getRevisionChangeset(baseRev), changeset, false, pad.pool());
    }
    pad.pdsync(function () {
      collab_server.applyChangesetToPad(pad, changeset, "#syntaxcolor");
    });
  });
}

function _makeReplaceEdits(changeset) {
  var edits = [];
  var unpacked = Changeset.unpack(changeset);
  var csIter = Changeset.opIterator(unpacked.ops);
  var bankIter = Changeset.stringIterator(unpacked.charBank);
  var ops = [];
  
  // combine consecutive |LxN and xN ops since we don't care about L,
  // and combine -'s followed by +'s into a single replacement
  var last = null;
  while (csIter.hasNext()) {
    var op = csIter.next();
    if (last == op.opcode) {
      ops[ops.length-1].chars += op.chars;
    } else if ((last == '-') && (op.opcode == '+')) {
      var del = ops.pop();
      ops.push({ opcode: 'r', delchars: del.chars, inschars: op.chars });
      last = 'r';
    } else if ((last == 'r') && (op.opcode == '+')) {
      ops[ops.length-1].inschars += op.chars;
    } else {
      ops.push({ opcode: op.opcode, chars: op.chars });
      last = op.opcode;
    }
  }
  
  var pos = 0;
  ops.forEach(function(op) {
    switch (op.opcode) {
    case 'r':
      edits.push(new ReplaceEdit(pos, op.delchars, bankIter.take(op.inschars)));
      pos += op.inschars;
      break;
    case '+':
      edits.push(new ReplaceEdit(pos, 0, bankIter.take(op.chars)));
      pos += op.chars;
      break;
    case '-':
      edits.push(new ReplaceEdit(pos, op.chars, ""));
      break;
    case '=':
      pos += op.chars;
      break;
    }
  });
  
  return edits;
}

function _makeChangeSetStr(pad, iterator) {
  var apool = pad.pool();
  var builder = Changeset.builder(iterator.length + 1); // XXX final newline
  while (iterator.hasNext()) {
    var op = iterator.next();
    switch (op.opcode) {
    case '=':
      builder.keepText(op.text, op.attribs.map(function(a) { return a.slice(); }), apool);
      break; 
    case '-':
      var lastNewLinePos = op.text.lastIndexOf('\n');
      if (lastNewLinePos < 0) {
        builder.remove(op.text.length, 0);
      } else {
        // XXX faster to use regex for last newline plus doc.getNumberOfLines in Java?
        builder.remove(lastNewLinePos + 1, op.text.match(/\n/g).length);
        builder.remove(op.text.length - lastNewLinePos - 1, 0);
      }
      break;
    case '+':
      builder.insert(op.text, op.attribs.map(function(a) { return a.slice(); }), apool);
      break;
    }
  }
  return builder.toString();
}

function onNewEditor(padId, connectionId) {
}

function _onTestsRequest(padId, connectionId, msg) {
  switch (msg.action) {
  case 'state':
    var doc = _getDocument(padId);
    ProjectTestsOwner.of(doc.getProject()).reportResults(scalaFn(2, function(test, result) {
      collab_server.sendConnectionExtendedMessage(connectionId, _testResultMessage(test, result));
    }));
    break;
  }
}

function codeComplete(padId, offset, connectionId) {
  _getDocument(padId).codeComplete(offset, scalaFn(1, function(proposals) {
    collab_server.updateClientCodeCompletionProposals(connectionId, padId, offset, proposals.map(function(proposal) {
      return {
        completion: "" + proposal.displayString,
        replacement: "" + proposal.replacementString,
        offset: proposal.replacementOffset,
        image: (proposal.imageName ? "" + proposal.imageName : null),
        kind: "" + proposal.kind
      };
    }));
  }));
}

function getContentTypeName(padId) {
  return _getDocument(padId).getContentTypeName();
}

function knockout(padId, method, params, replacement) {
  var changeset;
  model.accessPadGlobal(padId, function(pad) {
    var iterator = _getDocument(padId).knockout(method, params, replacement);
    changeset = _makeChangeSetStr(pad, iterator);
    collab_server.applyChangesetToPad(pad, changeset, "#knockout");
  });
  return Changeset.opIterator(Changeset.unpack(changeset).ops).next().lines;
}

function _testResultMessage(test, result) {
  var msg = {
      type: "TEST_RESULT",
      test: {
        name: "" + test.name,
        className: "" + test.className,
        methodName: "" + test.methodName
      },
      result: null
    };
    
    if (result) {
      msg.result = {
        resultName: "" + result.resultName(),
        status: "" + result.status
      };
      if (result.trace) {
        msg.result.trace = { stackTrace: "" + result.trace.getTrace() };
        // XXX always seems to be null, even in the TestResult c'tor
        if (result.trace.getExpected()) {
          msg.result.trace.expected = "" + result.trace.getExpected();
          msg.result.trace.actual = "" + result.trace.getActual();
        }
      }
    }
    
    return msg;
}

function taskTestResult(project, test, result) {
  var projectName = "" + project.getName();
  var padIds = collab_server.getAllPadsWithConnections().filter(function(padId) {
    return projectName == _userFileFor(padId).filename.split("/", 3)[1];
  });
  var msg = _testResultMessage(test, result);
  padIds.forEach(function(padId) {
    model.accessPadGlobal(padId, function(pad) {
      collab_server.sendPadExtendedMessage(pad, msg);
    });
  });
}

function _runningPadIdFor(username, file) {
  return username + "*run*" + file.getFullPath();
}

function _runningUserFileFor(padId) {
  var uf = padId.split("*run*", 2);
  return { username: uf[0], filename: uf[1] };
}

function accessRunFilePad(username, file) {
  var padId = _runningPadIdFor(username, file);
  
  model.accessPadGlobal(padId, function(pad) {
    if ( ! pad.exists()) {
      pad.create(false);
    }
  });
  
  return padId;
}

function _onRunRequest(padId, connectionId, msg) {
  var uf = _runningUserFileFor(padId);
  var owner = FileRunOwner.of(uf.username);
  
  switch (msg.action) {
  case 'state':
    collab_server.sendConnectionExtendedMessage(connectionId, {
      type: "RUN_STATE_CHANGE",
      state: owner.state(uf.filename)
    });
    break;
  case 'launch':
    owner.run(uf.filename);
    break;
  case 'terminate':
    owner.stop(uf.filename);
    break;
  }
}

function _onFormatRequest(padId, connectionId, msg) {
  var iterator = _getDocument(padId).formatDocument();
  model.accessPadGlobal(padId, function(pad) {
    var cs = _makeChangeSetStr(pad, iterator);
    collab_server.sendConnectionExtendedMessage(connectionId, {
      type: "APPLY_CHANGESET_AS_USER",
      changeset: cs,
      apool: pad.pool()
    });
  });
}

function _onOrganizeImportsRequest(padId, connectionId, msg) {
  _getDocument(padId).organizeImports(connectionId);
}

function taskOrgImportsPrompt(connectionId, openChoices, ranges) {
  var openChoicesArr = openChoices.map(function (options) {
    return options.map(function (option) { return option.getFullyQualifiedName(); });
  });
  
  var offsets = ranges.map(function (range) { return range.getOffset(); });
  var lengths = ranges.map(function (range) { return range.getLength(); });

  collab_server.sendConnectionExtendedMessage(connectionId, {
    type: "ORGIMPORTS_PROMPT",
    suggestion: openChoicesArr,
    length: lengths,
    offset: offsets
  });
}

function taskOrgImportsApply(username, file, connectionId, iterator) {
  model.accessPadGlobal(_padIdFor(username, file), function(pad) {
    var cs = _makeChangeSetStr(pad, iterator);
    collab_server.sendConnectionExtendedMessage(connectionId, {
      type: "APPLY_CHANGESET_AS_USER",
      changeset: cs,
      apool: pad.pool()
    });
  });
}

function _onOrganizeImportsResolved(padId, connectionId, msg) {
  _getDocument(padId).organizeImportsResolved(connectionId, msg.choices);
}

function taskRunningStateChange(username, file, state) {
  var gray = [ [ 'foreground', '150,150,150' ] ];
  model.accessPadGlobal(_runningPadIdFor(username, file), function(pad) {
    switch(state) {
    case 'launching':
      collab_server.setPadText(pad, "");
      collab_server.appendPadText(pad, " [ Started " + new Date() + " ]\n", gray);
      break;
    case 'failed':
      collab_server.appendPadText(pad, " [ Failed to launch ]\n", gray);
    case 'terminated':
      collab_server.appendPadText(pad, " [ Stopped " + new Date() + " ]\n", gray);
      break;
    }
    collab_server.sendPadExtendedMessage(pad, { type: "RUN_STATE_CHANGE", state: state });
  });
}

function taskRunningOutput(username, file, text, attribs) {
  model.accessPadGlobal(_runningPadIdFor(username, file), function(pad) {
    collab_server.appendPadText(pad, text, attribs.map(function(a) { return a.slice(); }));
  });
}
