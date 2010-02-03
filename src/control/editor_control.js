import("helpers");
import("utils.*");

import("collab.collab_server");

import("editor.workspace");

import("pad.model");
import("pad.revisions");

jimport("org.eclipse.core.resources.IResource");

jimport("java.lang.System");

function render_project(projectname) {
  var project = workspace.accessProject(projectname);
  
  renderHtml(project.exists() ? "editor/project.ejs" : "editor/project_create.ejs", {
    project: project
  });
  
  return true;
}

function render_path(projectname, filename) {
  var project = workspace.accessProject(projectname);
  var resource = project.findMember(filename);
  
  if (resource == null) {
    renderHtml("editor/none.ejs", {
      project: project,
      filename: filename
    });
    
    return true;
  }
  
  switch(resource.getType()) {
  
  case IResource.FILE:
    return _render_file(project, resource);
  
  case IResource.FOLDER:
    renderHtml("editor/folder.ejs", {
      project: project,
      folder: resource
    });
    
    return true;
  }
}

function _render_file(project, file) {
  //System.out.println("_render_file");
  var userId = "anon"; // XXX
  
  var padId = workspace.accessWorkingCopyPad(userId, file);
  //System.out.println("  rendering pad id " + padId);
  
  model.accessPadGlobal(padId, function(pad) {
    helpers.addClientVars({
      padId: padId,
      collab_client_vars: collab_server.getCollabClientVars(pad),
      initialRevisionList: revisions.getRevisionList(pad),
      serverTimestamp: +(new Date),
      initialOptions: pad.getPadOptionsObj(),
      userId: userId,
      opts: {}
    });
  })
  
  renderHtml("editor/file.ejs", {
    project: project,
    file: file
  });
  
  return true;
}
