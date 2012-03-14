import("helpers");
import("utils.*");

import("collab.collab_server");

import("editor.auth");
import("editor.workspace");

import("pad.model");
import("pad.revisions");

jimport("collabode.Workspace");

jimport("org.eclipse.core.resources.IMarker");
jimport("org.eclipse.core.resources.IResource");
jimport("org.eclipse.core.resources.IContainer");

jimport("java.lang.System");

function render_root() {
  renderHtml("editor/root.ejs", {
    projects: Workspace.listProjects()
  });
  return true;
}

function render_new_project(projectname) {
  var project = Workspace.accessProject(projectname);
  
  if ( ! project.exists()) {
    renderHtml("editor/project_create.ejs", {
      project: project,
      projects: Workspace.listProjects()
    });
    return true;
  }
  
  var projectfiles = Workspace.listProjects().slice();
  projectfiles.splice(projectfiles.indexOf(project)+1, 0, project.members());
  
  renderHtml("editor/project.ejs", {
    project: project,
    projectfiles: projectfiles,
    markers: _find_markers(project)
  });
  return true;
}

function _list_accessible_projects(revealed) {
  var projects = Workspace.listProjects().slice();
  var userId = getSession().userId;
  if (workspace.restricted(userId)) {
    projects = projects.filter(function(project) {
      return (project == revealed) || ( ! workspace.restricted(userId)) || auth.has_acl(project.getName(), '', userId, auth.READ);
    });
  }
  return projects;
}

function render_project(projectname) {
  var project = Workspace.accessProject(projectname);
  
  var projectfiles = _list_accessible_projects(project);
  
  if ( ! project.exists()) {
    renderHtml("editor/none.ejs", {
      project: project,
      filename: "",
      projectfiles: projectfiles
    });
    return true;
  }
  
  projectfiles.splice(projectfiles.indexOf(project)+1, 0, project.members());
  
  renderHtml("editor/project.ejs", {
    project: project,
    projectfiles: projectfiles,
    acl: auth.acl(project, project),
    markers: _find_markers(project)
  });
  return true;
}

function create_project() {
  var projectname = request.params["projectname"];
  var projecttype = request.params["projecttype"];
  var project = null;
  if (projecttype == "webappproject") {
    project = Workspace.createWebAppProject(projectname);
  } else {
    project = Workspace.createJavaProject(projectname);
  }
  response.redirect(''+project.getFullPath());
  return true;
}

function render_path(projectname, filename, lineno) {
  var project = Workspace.accessProject(projectname);
  var resource = project.findMember(filename);
  
  var projectfiles = _list_accessible_projects(project);
  
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
    return _render_file(project, resource, lineno, tree(resource.getParent()));
  
  case IResource.FOLDER:
    renderHtml("editor/folder.ejs", {
      project: project,
      folder: resource,
      projectfiles: tree(resource),
      acl: auth.acl(project, resource),
      markers: _find_markers(resource)
    });
    return true;
  }
}

function _find_markers(resource) {
  function name(severity) {
    switch (severity) {
    case IMarker.SEVERITY_INFO: return 'info';
    case IMarker.SEVERITY_WARNING: return 'warning';
    case IMarker.SEVERITY_ERROR: return 'error';
    }
    return 'note';
  }
  function objectify(m) {
    return {
      id: m.getId(),
      severity: m.getAttribute(IMarker.SEVERITY, -1),
      severityName: name(m.getAttribute(IMarker.SEVERITY)),
      message: m.getAttribute(IMarker.MESSAGE),
      resource: m.getResource(),
      lineNumber: m.getAttribute(IMarker.LINE_NUMBER, 0),
      equals: function() { return false; },
      getClass: function() { return { getSimpleName: function() { return 'marker' } }; }
    };
  }
  function compare(m1, m2) {
    var result = 0;
    [
      function() { return m2.severity - m1.severity; },
      function() { return m1.resource.getFullPath().toString().localeCompare(m2.resource.getFullPath().toString()); },
      function() { return m1.lineNumber - m2.lineNumber; },
      function() { return m1.id - m2.id; }
    ].forEach(function(f) {
      if (result == 0) { result = f(); }
    });
    return result;
  }
  
  var markers = resource.findMarkers(null, true, IResource.DEPTH_INFINITE).map(objectify);
  markers.sort(compare);
  return markers;
}

var _controllers = {
  java: function(project, file) {
    return {
      continuousTesting: appjet.config.continuousTesting == 'true',
      testDriven: workspace.accessTestsOwner(project).isTestDriven(),
      isTest: file.getName().match(/Test\.java$/)
    }
  }
};

var _renderers = {
  launch: function(project, file) {
    return {
      launch: Workspace.accessLaunchConfig(file)
    };
  },
  
  _file: function(project, file) {
    var padId = workspace.accessDocumentPad(getSession().userId, file);
    
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
    
    return {
      filetype: workspace.getContentTypeName(getSession().userId, padId)
    }
  }
};

function _render_file(project, file, lineno, projectfiles) {
  var extension = null;
  var lastdot = file.getName().lastIndexOf('.');
  if (lastdot > 0) {
    extension = file.getName().substr(lastdot+1);
  }
  
  var data = {
    project: project,
    file: file,
    projectfiles: projectfiles,
    extension: extension,
    user_has_acl: function(permission) {
      return auth.has_acl(project.getName(), file.getName(), getSession().userId, permission);
    }
  };
  if (extension && _controllers[extension]) {
    data.add = _controllers[extension](project, file);
  }
  data.additions = function() {
    return renderFirstTemplateAsString([ "editor/add/" + extension + ".ejs" ], data);
  };
  
  if (extension && _renderers[extension]) {
    data.__proto__ = _renderers[extension](project, file);
    data.wizard = renderTemplateAsString("editor/wizard/" + extension + ".ejs", data);
    renderHtml("editor/wizard.ejs", data);
    return true;
  }
  
  data.__proto__ = _renderers._file(project, file);
  if (lineno) { helpers.addClientVars({ scrollToLineNo: lineno }); }
  renderHtml("editor/file.ejs", data);
  return true;
}

function render_confirm_delete(projectname, filename) {
  var project = Workspace.accessProject(projectname);
  var resource = project.findMember(filename);
  
  renderHtml("editor/path_delete.ejs", {
    project: project,
    projects: _list_accessible_projects(project),
    resource: resource
  });
  return true;
}

function modify_path(projectname, filename) {
  var project = Workspace.accessProject(projectname);
  var folder = project.findMember(filename);
  
  if ( ! (folder instanceof IContainer)) { // XXX
    return true;
  }
  
  var foldername = request.params["foldername"] || "";
  var filename = request.params["filename"] || "";
  
  if ((request.params["folder"] || ! filename.length) && foldername.length) {
    _create_path_folder(project, folder, foldername);
  }
  
  if ((request.params["file"] || ! foldername.length) && filename.length) {
    _create_path_file(project, folder, filename, request.params["content"] || "");
  }
  
  if (request.params["acl"]) {
    auth.add_acl(project, folder.getProjectRelativePath(), request.params["acl_userid"], request.params["acl_permission"]);
  }
  
  response.redirect(request.url);
  return true;
}

function _create_path_folder(project, parent, foldername) {
  var folder = parent.getFolder(foldername);
  if (folder.exists()) {
    return true;
  }
  
  folder.create(false, true, null);
}

function _create_path_file(project, parent, filename, content) {
  var file = parent.getFile(filename);
  if (file.exists()) {
    return true;
  }
  
  content = new java.lang.String(content).getBytes();
  file.create(new java.io.ByteArrayInputStream(content), false, null);
}

function delete_path(projectname, filename) {
  var project = Workspace.accessProject(projectname);
  var resource = project.findMember(filename);
  var parentpath = ''+resource.getParent().getFullPath();
  
  resource['delete'](IResource.ALWAYS_DELETE_PROJECT_CONTENT, null); // workaround because `delete` is a JS keyword
  
  response.redirect(parentpath);
  return true;
}

function render_confirm_delacl(userId, projectname, filename) {
  var project = Workspace.accessProject(projectname);
  var resource = project.findMember(filename);
  
  renderHtml("editor/acl_delete.ejs", {
    project: project,
    projects: _list_accessible_projects(project),
    resource: resource,
    userId: userId
  });
  return true;
}

function delete_acl(userId, projectname, filename) {
  var project = Workspace.accessProject(projectname);
  var resource = project.findMember(filename);
  
  auth.del_acl(project, resource.getProjectRelativePath(), userId);
  
  response.redirect(''+resource.getFullPath());
  return true;
}
