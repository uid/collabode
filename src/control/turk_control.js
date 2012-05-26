import("helpers");
import("utils.*");

import("editor.auth");
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
    var task = turk.getInstaworkTask(taskId);
  } catch (e) {
    renderError(404);
  }
  
  if ( ! turk.claimRequest(taskId, projectname)) {
    renderError(403);
  }
  
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
