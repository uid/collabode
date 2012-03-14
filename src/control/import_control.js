import("helpers");
import("utils.*");

import("editor.auth");
import("editor.workspace");

jimport("collabode.Workspace");
jimport("collabode.ProjectImporter");

jimport("java.lang.System");

function render_import_projects() {
  renderHtml("editor/project_import.ejs", {
    projects: Workspace.listProjects()
  });
  return true;
}

function import_projects() {
  var imported = ProjectImporter.importProjects(request.params["directory"]);
  if (imported.size() == 1) {
    response.redirect('' + imported.get(0).getFullPath());
  } else {
    response.redirect('/');
  }
  return true;
}
