import("helpers");
import("utils.*");

import("editor.auth");
import("editor.workspace");

jimport("collabode.Workspace");

jimport("java.lang.System");
         
function clone_path(projectname, filename) {
  var destination = projectname+"-"+getSession().userName;
  var project = Workspace.cloneProject(getSession().userId, projectname, destination);
  var resource = project.findMember(filename);
  
  auth.acl(project).forEach(function(acl) {
    if (acl.permission == auth.CLAIM) {
      auth.del_acl(project, acl.path, acl.userId);
      if ((acl.userId == auth.ANYONE) || (acl.userId == getSession().userId)) {
        auth.add_acl(project, acl.path, getSession().userId, auth.OWNER);
      }      
    }
  });
  
  response.redirect(''+resource.getFullPath());
  return true;
}
