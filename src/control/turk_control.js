import("fastJSON");
import("fileutils.fileLineIterator");
import("helpers");
import("jsutils");
import("netutils");
import("utils.*");

import("editor.auth");
import("editor.log");
import("editor.turk");
import("editor.workspace");

jimport("collabode.Workspace");

jimport("java.lang.System");

function render_mturk_task(requester, projectname, filename) {
  var assignmentId = request.params.assignmentId;
  if (assignmentId == 'ASSIGNMENT_ID_NOT_AVAILABLE') { assignmentId = null; }
  
  var assigned = assignmentId && request.params.workerId;
  
  var hit = turk.getMTurkHIT('u.'+requester, request.params.hitId); // XXX f'n that prepends u.
  
  renderHtml("turk/mturk_task.ejs", {
    workerId: request.params.workerId,
    hitId: request.params.hitId,
    assignmentId: assignmentId,
    submitTo: request.params.turkSubmitTo,
    assigned: assigned,
    description: hit..Description.toString(),
    projectname: projectname,
    filename: filename
  });
  return true;
}

function render_instawork_task(taskId, projectname, filename) {
  var filepath = request.path.substring(request.path.indexOf('/', 1));
  
  if ( ! taskId) {
    response.redirect('/instawork:' + request.params.taskId + filepath);
    return true;
  }
  
  try {
    var task = turk.getRequestObj(taskId);
  } catch (e) {
    System.err.println(e); // XXX
    renderError(404);
  }
  
  if ( ! turk.claimRequest(taskId, projectname)) {
    renderError(403);
  }
  
  helpers.addClientVars({
    skipIntro: !! getSession().instaworked
  });
  renderHtml("turk/instawork_task.ejs", {
    task: task,
    frameURL: filepath
  });
  return true;
}

function complete_instawork_task(taskId, projectname, filename) {
  if ( ! turk.completeRequest(taskId, projectname)) {
    renderError(403);
  }
  
  getSession().instaworked = true;
  response.setStatusCode(307);
  response.setHeader('Location', appjet.config.instaworkURL + '/done/' + taskId);
  return true;
}

function render_report() {
  var userId = getSession().userId;
  var requests = turk.getRequestsFull().filter(function(req) {
    return req.requester.userId == userId || req.worker.userId == userId;
  });
  
  var chatlogs = {};
  requests.forEach(function(req) {
    if ( ! chatlogs[req.created]) {
      chatlogs[req.created] = [];
      var filename = log.logFileName('frontend', 'chats', new Date(req.created));
      if ( ! filename) { return; }
      for (var it = fileLineIterator(filename); it.hasNext; ) {
        chatlogs[req.created].push(fastJSON.parse(it.next));
      }
    }
  });
  
  renderHtml("turk/report.ejs", {
    requests: requests,
    chatlogs: chatlogs
  });
  return true;
}

function record_report() {
  var userId = getSession().userId;
  var requests = turk.getRequestsFull().filter(function(req) {
    return req.requester.userId == userId || req.worker.userId == userId;
  });
  
  var url = "https://docs.google.com/spreadsheet/formResponse?formkey=" + appjet.config.outsourceFeedbackKey;
  var keys = jsutils.keys(request.params);
  requests.forEach(function(req) {
    var params = { 'entry.0.single': req.id };
    keys.filter(function(key) { return key.indexOf(req.id) == 0 }).forEach(function(key) {
      params[key.substring(req.id.length)] = request.params[key];
    });
    
    try {
      netutils.urlPost(url, params);
    } catch (e) {
      System.err.println("Failed to record " + fastJSON.stringify(params)); // XXX
      System.err.println(e); // XXX
    }
  });
  
  renderHtml("turk/reported.ejs", {});
  return true;
}

function render_framed(description, destination) {
  renderHtml("turk/framed.ejs", {
    description: decodeURIComponent(description),
    assigned: true,
    frameURL: destination
  });
  return true;
}

function render_knockout(methodAndParams, replacement, projectname, filename) {
  var method = methodAndParams.split(',')[0];
  var params = methodAndParams.split(',').slice(1);
  replacement = decodeURIComponent(replacement);
  
  var project = Workspace.accessProject(projectname);
  var file = project.findMember(filename);
  
  renderHtml("turk/knockout.ejs", {
    project: project,
    file: file,
    method: method
  });
  return true;
}

function create_knockout(methodAndParams, replacement, projectname, filename) {
  var method = methodAndParams.split(',')[0];
  var params = methodAndParams.split(',').slice(1);
  replacement = decodeURIComponent(replacement);
  
  var destination = projectname+"-"+method+params.length+"-"+getSession().userName; // XXX uniqueness
  var project = Workspace.cloneProject(getSession().userId, projectname, destination);
  var file = project.findMember(filename);
  
  // XXX duplicated from editor_control.clone_path (except CLAIM gives WRITE)
  auth.acl(project).forEach(function(acl) {
    if ((acl.userId != auth.ANYONE) && (acl.userId != getSession().userId)) { return; };
    if (acl.permission == auth.CLAIM) {
      auth.del_acl(project, acl.path, acl.userId);
      auth.add_acl(project, acl.path, getSession().userId, auth.WRITE);
    }
  });
  
  var userId = getSession().userId;
  var padId = workspace.accessDocumentPad(userId, file);
  var lineno = workspace.knockout(padId, userId, method, params, replacement);
  
  var description = "Implement the method '"+method+"' in "+file.getName()+", line "+lineno+".";
  response.redirect('/frame"'+description+'"'+file.getFullPath()+':'+lineno);
  return true;
}
