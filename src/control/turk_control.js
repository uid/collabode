import("helpers");
import("utils.*");

import("editor.turk");

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
