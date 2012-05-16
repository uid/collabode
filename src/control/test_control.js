import("helpers");
import("jsutils.keys");
import("utils.*");

import("pad.model");

import("editor.workspace");

jimport("collabode.Workspace");
jimport("collabode.testing.ProjectTestsOwner");

jimport("java.lang.System");

function render_coverage(projectname, unused, testclassname, testmethodname) {
  var project = Workspace.accessProject(projectname);
  var userId = getSession().userId;
  
  var files = {};
  var calls = [];
  
  function _methodRange(padId, method) {
    var collab = workspace.documentFor(userId, padId).collab;
    var range = method.getSourceRange();
    return {
      from: collab.union.getLineOfOffset(collab.diskToUnionOffset(range.getOffset())),
      to: collab.union.getLineOfOffset(collab.diskToUnionOffset(range.getOffset() + range.getLength()))
    };
  }
  
  function _addMethod(method) {
    var filename = method.getResource().getProjectRelativePath().toString();
    var padId = workspace.accessDocumentPad(userId, method.getResource());
    var unfold = _methodRange(padId, method);
    if (files[filename]) {
      files[filename].unfolded.push(unfold);
    } else {
      model.accessPadGlobal(padId, function(pad) {
        files[filename] = {
          atext: pad.atext(),
          apool: pad.pool().toJsonable(),
          unfolded: [ unfold ]
        };
      });
    }
    return filename;
  }
  
  var test = ProjectTestsOwner.of(project).getMethod(testclassname, testmethodname);
  var testfilename = _addMethod(test);
  
  var coverage = ProjectTestsOwner.of(project).getCoverage(testclassname, testmethodname);
  for (var it = coverage.descendingIterator(); it.hasNext(); ) {
    var mr = it.next();
    if (keys(files).length > 10) {
      calls.push("and " + (coverage.size() - calls.length) + " more");
      break;
    }
    calls.push(mr.method.getDeclaringType().getElementName()
               + "." + mr.method.getElementName()
               + (mr.method.getParameterTypes().length > 0 ? "(...)" : "()")); // XXX easier way?
    _addMethod(mr.method);
  }
  
  helpers.addClientVars({
    author: userId,
    calls: calls,
    files: files,
    testfilename: testfilename
  });
  
  renderHtml("editor/test_coverage.ejs", {
    calls: calls,
    testclassname: testclassname,
    testmethodname: testmethodname
  });
  return true;
}
