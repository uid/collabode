import("helpers");
import("utils.*");

import("collab.collab_server");

import("editor.workspace");

import("pad.model");
import("pad.revisions");

jimport("org.eclipse.core.resources.IResource");

jimport("java.lang.System");

function render_root() {
  renderHtml("editor/root.ejs", {
    projects: workspace.listProjects()
  });
}

function render_project(projectname) {
  var project = workspace.accessProject(projectname);
  
  if ( ! project.exists()) {
    renderHtml("editor/project_create.ejs", {
      project: project,
      projects: workspace.listProjects()
    });
    return true;
  }    
  
  var projectfiles = workspace.listProjects().slice();
  projectfiles.splice(projectfiles.indexOf(project)+1, 0, project.members());
  
  renderHtml("editor/project.ejs", {
    project: project,
    projectfiles: projectfiles
  });
  return true;
}

function create_project(projectname) {
  var project = workspace.createProject(projectname);
  response.redirect(request.url);
  return true;
}

function render_path(projectname, filename) {
  var project = workspace.accessProject(projectname);
  var resource = project.findMember(filename);
  
  var projectfiles = workspace.listProjects().slice();
  
  if (resource == null) {
    renderHtml("editor/none.ejs", {
      project: project,
      filename: filename,
      projectfiles: projectfiles
    });
    
    return true;
  }
  
  function tree(resource) {
    var members = resource.members();
    var idx;
    while ((idx = projectfiles.indexOf(resource)) < 0) {
      members = [ resource, members ];
      resource = resource.getParent();
    }
    projectfiles.splice(idx+1, 0, members);
    return projectfiles;
  }
  
  switch(resource.getType()) {
  
  case IResource.FILE:
    return _render_file(project, resource, tree(resource.getParent()));
  
  case IResource.FOLDER:    
    renderHtml("editor/folder.ejs", {
      project: project,
      folder: resource,
      projectfiles: tree(resource)
    });
    return true;
  }
}

function _render_file(project, file, projectfiles) {
  var userId = "anon"; // XXX
  var padId = workspace.accessDocumentPad(userId, file);
  
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
    file: file,
    projectfiles: projectfiles
  });
  return true;
}

function render_confirm_delete(projectname, filename) {
  var project = workspace.accessProject(projectname);
  var resource = project.findMember(filename);
  
  renderHtml("editor/path_delete.ejs", {
    project: project,
    projects: workspace.listProjects(),
    resource: resource
  });
  return true;
}

function create_path(projectname, filename) {
  var project = workspace.accessProject(projectname);
  var folder = project.findMember(filename);
  
  if (folder.getType() != IResource.FOLDER) {
    return true;
  }
  
  var foldername = request.params["foldername"];
  var filename = request.params["filename"];
  
  if ((request.params["folder"] || ! filename.length) && foldername.length) {
    _create_path_folder(project, folder, foldername);
  }
  
  if ((request.params["file"] || ! foldername.length) && filename.length) {
    _create_path_file(project, folder, filename);
  }
  
  response.redirect(request.url);
  return true;
}

function _create_path_folder(project, parent, foldername) {
  System.err.println("_create_path_folder(" + project + ", " + parent + ", " + foldername + ")");
  var folder = parent.getFolder(foldername);
  if (folder.exists()) {
    return true;
  }
  
  folder.create(false, true, null);
}

function _create_path_file(project, parent, filename) {
  System.err.println("_create_path_file(" + project + ", " + parent + ", " + filename + ")");
  var file = parent.getFile(filename);
  if (file.exists()) {
    return true;
  }
  
  file.create(new java.io.InputStream({ read: function() { return -1; }}), false, null);
}

function delete_path(projectname, filename) {
  var project = workspace.accessProject(projectname);
  var resource = project.findMember(filename);
  var parentpath = ''+resource.getParent().getFullPath();
  
  resource['delete'](false, null); // workaround because `delete` is a JS keyword
  
  response.redirect(parentpath);
  return true;
}
