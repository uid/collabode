import("editor.workspace");

jimport("collabode.WorkspaceExec");

jimport("java.lang.System");

function render_run(projectname, typename) {
  System.out.println("render_run(" + projectname + ", " + typename + ")");
  
  var project = workspace.accessProject(projectname);
  WorkspaceExec.runClass(project, typename.replace(/\//g, '.'), appjet.context.response());
}

function render_test(projectname, typename) {
  System.out.println("render_test(" + projectname + ", " + typename + ")");
  
  var project = workspace.accessProject(projectname);
  WorkspaceExec.testClass(project, typename.replace(/\//g, '.'), appjet.context.response());
}
