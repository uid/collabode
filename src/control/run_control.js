import("utils.*");

import("editor.workspace");

jimport("collabode.WorkspaceExec");

jimport("java.lang.System");

function render_run_file(projectname, filename) {
  var project = workspace.accessProject(projectname);
  var file = project.findMember(filename);
  
  renderHtml("editor/run_file.ejs", {
    project: project,
    file: file,
    typename: WorkspaceExec.getClass(project, file)
  });
  return true;
}

function render_run_type(projectname, typename) {
  var project = workspace.accessProject(projectname);
  WorkspaceExec.runClass(project, typename.replace(/\//g, '.'), appjet.context.response());
}

function render_test(projectname, typename) {
  System.out.println("render_test(" + projectname + ", " + typename + ")");
  
  var project = workspace.accessProject(projectname);
  WorkspaceExec.testClass(project, typename.replace(/\//g, '.'), appjet.context.response());
}
