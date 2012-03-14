import("jsutils.scalaFn");

import("collab.ace.easysync2.{AttribPool,Changeset}");
import("collab.collab_server");

import("editor.auth");

import("pad.model");

jimport("collabode.PadDocumentOwner");
jimport("collabode.Workspace");
jimport("collabode.collab.Collab");
jimport("collabode.running.FileRunOwner");
jimport("collabode.testing.ProjectTestsOwner");

jimport("org.eclipse.text.edits.ReplaceEdit");

jimport("java.io.StringReader");
jimport("java.util.Properties");
jimport("java.util.concurrent.ConcurrentHashMap");

jimport("java.lang.System");

function onStartup() {
  appjet.cache.pad_annotations = new ConcurrentHashMap();
  
  collab_server.setExtendedHandler("RUN_REQUEST", _onRunRequest);
  collab_server.setExtendedHandler("ANNOTATIONS_REQUEST", _onAnnotationsRequest);
  collab_server.setExtendedHandler("TESTS_REQUEST", _onTestsRequest);
  collab_server.setExtendedHandler("TESTS_RUN_REQUEST", _onTestsRunRequest);
  collab_server.setExtendedHandler("CODECOMPLETE_REQUEST", _onCodeCompleteRequest);
  collab_server.setExtendedHandler("FORMAT_REQUEST", _onFormatRequest);
  collab_server.setExtendedHandler("ORGIMPORTS_REQUEST", _onOrganizeImportsRequest);
  collab_server.setExtendedHandler("ORGIMPORTS_RESOLVED", _onOrganizeImportsResolved);
}

function _padIdFor(userId, file) {
  return Collab.of(userId).id + "@" + file.getFullPath();
}

function _padIdForDoc(collab) {
  return collab.collaboration.id + "@" + collab.file.getFullPath();
}

function accessDocumentPad(userId, file) {
  var padId = _padIdFor(userId, file);
  
  model.accessPadGlobal(padId, function(pad) {
    if (pad.exists() && ! Collab.of(userId).hasFile(file)) {
      pad.destroy();
    }
    
    if ( ! pad.exists()) {
      pad.create(true);
    }
    
    Collab.of(userId).createDocument(userId, file, pad.getHeadRevisionNumber(), scalaFn(1, function(txt) {
      pad.pdsync(function() { collab_server.setPadText(pad, txt); });
      return pad.getHeadRevisionNumber();
    }));
  });
  
  return padId;
}

function _filenameFor(padId) {
  var cf = padId.split("@", 2);
  return cf[1];
}

function restricted(userId) {
  return userId[0] != 'u';
}

function isChangesetAllowed(padId, changeset, author) {
  if (author == '') { return true; } // XXX always internal?
  if (author[0] == '#') { return true; } // XXX always internal?
  if ( ! restricted(author)) { return true; }
  
  var doc = PadDocumentOwner.of(author).get(_filenameFor(padId));
  var file = doc.collab.file;
  return auth.has_acl(file.getProject().getName(), file.getProjectRelativePath().toString(), author, auth.WRITE, function(restrictions) {
    return doc.isAllowed(_makeReplaceEdits(changeset), restrictions);
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

function taskPdsyncDocumentText(padId, newRev, cs, author) {
  var doc = PadDocumentOwner.of(author).get(_filenameFor(padId));
  doc.collab.syncUnionCoordinateEdits(doc, newRev, _makeReplaceEdits(cs));
}

function taskPdsyncQueuedStyles(collab) {
  if (collab.styleQueue.isEmpty()) { return; }
  model.accessPadGlobal(_padIdForDoc(collab), function(pad) {
    var changeset = null;
    var baseRev;
    var iterator;
    while ((iterator = collab.styleQueue.poll()) != null) {
      if ( ! iterator.hasNext()) { continue; }
      if (changeset == null) {
        changeset = _makeChangeSetStr(pad, iterator);
        baseRev = iterator.revision;
      } else if (iterator.revision != baseRev) {
        _pdsyncPadStyle('styleq', pad, changeset, baseRev);
        changeset = _makeChangeSetStr(pad, iterator);
        baseRev = iterator.revision;
      } else {
        changeset = Changeset.overlay(changeset, _makeChangeSetStr(pad, iterator));
      }
    }
    if ( ! changeset) { return; }
    _pdsyncPadStyle('styleq', pad, changeset, baseRev);
  });
}

function _pdsyncPadStyle(author, pad, changeset, baseRev) {
  while (baseRev != pad.getHeadRevisionNumber()) {
    baseRev++;
    // XXX Changeset.followAttributes sets colliding attribute values lexically rather than using later changeset
    var baseRevCs = Changeset.filterAttribNumbers(pad.getRevisionChangeset(baseRev), function() { return false; });
    changeset = Changeset.follow(baseRevCs, changeset, false, pad.pool());
  }
  pad.pdsync(function () {
    collab_server.applyChangesetToPad(pad, changeset, "#"+author);
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

function _onAnnotationsRequest(padId, userId, connectionId, msg) {
  var cached = appjet.cache.pad_annotations.get(padId);
  if ( ! cached) { return; }
  cached.values().toArray().forEach(function(message) {
    collab_server.sendConnectionExtendedMessage(connectionId, message);
  });
}

function taskUpdateAnnotations(userId, file, type, annotations) {
  var padId = _padIdFor(userId, file);
  model.accessPadGlobal(padId, function(pad) {
    var message = {
      type: "ANNOTATIONS",
      userId: userId,
      annotationType: type,
      annotations: annotations.map(function(annotation) {
          return {
            lineNumber: annotation.lineNumber,
            subtype: "" + annotation.subtype,
            message: "" + annotation.message
          }
        })
    };
    
    var cached = appjet.cache.pad_annotations.get(padId);
    if ( ! cached) {
      cached = new ConcurrentHashMap();
      appjet.cache.pad_annotations.put(padId, cached);
    }
    cached.put(type + "@" + userId, message); // XXX ok key?
    
    collab_server.sendPadExtendedMessage(pad, message);
  });
}

function accessTestsOwner(project) {
  return ProjectTestsOwner.of(project);
}

function _onTestsRequest(padId, userId, connectionId, msg) {
  var doc = PadDocumentOwner.of(userId).get(_filenameFor(padId));
  var owner = ProjectTestsOwner.of(doc.collab.file.getProject());
  switch (msg.action) {
  case 'state':
    owner.reportResults(scalaFn(2, function(test, result) {
      collab_server.sendConnectionExtendedMessage(connectionId, _testResultMessage(test, result));
    }));
    break;
  case 'update':
    var testsPadId;
    var iterator = owner.advanceStatus(msg.test.className, msg.test.methodName, msg.from, scalaFn(1, function(testsFile) {
      testsPadId = accessDocumentPad(userId, testsFile); // ensure existence
      return PadDocumentOwner.of(userId).get(_filenameFor(testsPadId));
    }));
    model.accessPadGlobal(testsPadId, function(pad) {
      collab_server.applyChangesetToPad(pad, _makeChangeSetStr(pad, iterator), userId);
    });
    break;
  }
}

function _onTestsRunRequest(padId, userId, connectionId, msg) {
  var doc = PadDocumentOwner.of(userId).get(_filenameFor(padId));
  ProjectTestsOwner.of(doc.collab.file.getProject()).scheduleRun();
}

function _onCodeCompleteRequest(padId, userId, connectionId, msg) {
  var doc = PadDocumentOwner.of(userId).get(_filenameFor(padId));
  doc.codeComplete(doc.collab.unionToLocalOffset(doc, msg.offset), scalaFn(1, function(proposals) {
    collab_server.sendConnectionExtendedMessage(connectionId, {
      type: "CODECOMPLETE_PROPOSALS",
      offset: msg.offset,
      proposals: proposals.map(function(proposal) {
        return {
          completion: "" + proposal.displayString,
          replacement: "" + proposal.replacementString,
          offset: doc.collab.localToUnionOffset(doc, proposal.replacementOffset),
          image: (proposal.imageName ? "" + proposal.imageName : null),
          kind: "" + proposal.kind
        };
      })
    });
  }));
}

function getContentTypeName(author, padId) {
  return PadDocumentOwner.of(author).get(_filenameFor(padId)).getContentTypeName();
}

function knockout(padId, userId, method, params, replacement) {
  var changeset;
  model.accessPadGlobal(padId, function(pad) {
    var iterator = PadDocumentOwner.of(userId).get(_filenameFor(padId)).knockout(method, params, replacement);
    changeset = _makeChangeSetStr(pad, iterator);
    collab_server.applyChangesetToPad(pad, changeset, userId);
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
    return _filenameFor(padId) && (projectName == _filenameFor(padId).split("/", 3)[1]);
  });
  var msg = _testResultMessage(test, result);
  padIds.forEach(function(padId) {
    model.accessPadGlobal(padId, function(pad) {
      collab_server.sendPadExtendedMessage(pad, msg);
    });
  });
}

function _runningPadIdFor(id, file) {
  return id + "*run*" + file.getFullPath();
}

function _runningFilenameFor(padId) {
  var cf = padId.split("*run*", 2);
  return cf[1];
}

function accessRunFilePad(userId, file) {
  var padId = _runningPadIdFor(Collab.of(userId).id, file);
  
  model.accessPadGlobal(padId, function(pad) {
    if ( ! pad.exists()) {
      pad.create(false);
    }
  });
  
  return padId;
}

function _onRunRequest(padId, userId, connectionId, msg) {
  var filename = _runningFilenameFor(padId);
  var owner = FileRunOwner.of(Collab.of(userId).id);
  
  switch (msg.action) {
  case 'state':
    collab_server.sendConnectionExtendedMessage(connectionId, {
      type: "RUN_STATE_CHANGE",
      state: owner.state(filename)
    });
    break;
  case 'launch':
    owner.run(filename);
    break;
  case 'terminate':
    owner.stop(filename);
    break;
  }
}

function _onFormatRequest(padId, userId, connectionId, msg) {
  var iterator = PadDocumentOwner.of(userId).get(_filenameFor(padId)).formatDocument();
  model.accessPadGlobal(padId, function(pad) {
    var cs = _makeChangeSetStr(pad, iterator);
    collab_server.sendConnectionExtendedMessage(connectionId, {
      type: "APPLY_CHANGESET_AS_USER",
      changeset: cs,
      apool: pad.pool()
    });
  });
}

function _onOrganizeImportsRequest(padId, userId, connectionId, msg) {
  PadDocumentOwner.of(userId).get(_filenameFor(padId)).organizeImports(connectionId);
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

function _onOrganizeImportsResolved(padId, userId, connectionId, msg) {
  PadDocumentOwner.of(userId).get(_filenameFor(padId)).organizeImportsResolved(connectionId, msg.choices);
}

function taskRunningStateChange(id, file, state) {
  var gray = [ [ 'foreground', '150,150,150' ] ];
  model.accessPadGlobal(_runningPadIdFor(id, file), function(pad) {
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

function taskRunningOutput(id, file, text, attribs) {
  model.accessPadGlobal(_runningPadIdFor(id, file), function(pad) {
    collab_server.appendPadText(pad, text, attribs.map(function(a) { return a.slice(); }));
  });
}
