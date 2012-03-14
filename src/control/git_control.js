import("helpers");
import("utils.*");

import("editor.workspace");

jimport("collabode.Workspace");
jimport("collabode.git.GitCommands");
jimport("org.eclipse.jgit.api.errors.JGitInternalException");

jimport("java.lang.System");

function render_command(command) {
  renderHtml("git/" + command + ".ejs", {
    projects: Workspace.listProjects()
  });
  return true;
}

function run_command(command) {
  try {
    var path = GitCommands[command](request.params["uri"]);
  } catch (jgie if jgie.javaException instanceof JGitInternalException) {
    renderHtml("git/error.ejs", {
      error: jgie.javaException,
      projects: Workspace.listProjects()
    });
    return true;
  }
  response.redirect(path);
  return true;
}
