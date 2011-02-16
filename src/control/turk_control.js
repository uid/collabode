import("helpers");
import("utils.*");

import("editor.turk");
import("editor.workspace");

jimport("collabode.Workspace");

jimport("java.lang.System");

function render_task(requester, projectname, filename) {
  var assignmentId = request.params.assignmentId;
  if (assignmentId == 'ASSIGNMENT_ID_NOT_AVAILABLE') { assignmentId = null; }
  
  var assigned = assignmentId && request.params.workerId;
  
  var hit = turk.getHIT('u.'+requester, request.params.hitId); // XXX f'n that prepends u.
  
  renderHtml("turk/task.ejs", {
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
  var project = Workspace.cloneProject(workspace.everyone, projectname, destination);
  var file = project.findMember(filename);
  
  workspace.cloneAcl(getSession().userId, projectname, destination);
  
  var padId = workspace.accessDocumentPad(workspace.everyone, file);
  var lineno = workspace.knockout(padId, method, params, replacement);
  
  var description = "Implement the method '"+method+"' in "+file.getName()+", line "+lineno+".";
  response.redirect('/frame"'+description+'"'+file.getFullPath()+':'+lineno);
  return true;
}
