import("helpers");
import("utils.*");

import("collab.collab_server");

import("editor.workspace");

import("pad.model");
import("pad.revisions");

jimport("collabode.Workspace");

jimport("java.lang.System");

function render_console(projectname, filename) {
  var project = Workspace.accessProject(projectname);
  var file = project.findMember(filename);
  
  var padId = workspace.accessRunFilePad(workspace.everyone, file);
  
  model.accessPadGlobal(padId, function(pad) {
    helpers.addClientVars({
      padId: padId,
      collab_client_vars: collab_server.getCollabClientVars(pad),
      initialRevisionList: revisions.getRevisionList(pad),
      serverTimestamp: +(new Date),
      initialOptions: pad.getPadOptionsObj(),
      userId: getSession().userId,
      userName: getSession().userName,
      opts: {}
    });
  });
  
  renderHtml("editor/console.ejs", {
    project: project,
    file: file
  });
  return true;
}
