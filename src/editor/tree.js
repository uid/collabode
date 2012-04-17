import("jsutils.scalaFn");

import("collab.ace.easysync2.{AttribPool,Changeset}");
import("collab.collab_server");

import("pad.model");

jimport("collabode.PadFunctions");
jimport("collabode.PadDocumentOwner");
jimport("collabode.Workspace");
jimport("collabode.running.FileRunOwner");
jimport("collabode.testing.ProjectTestsOwner");
jimport("collabode.tree.TreeManager");

jimport("org.eclipse.core.resources.IMarker");
jimport("org.eclipse.core.resources.IResource");
jimport("org.eclipse.core.resources.IContainer");
jimport("org.eclipse.core.runtime.Path");

jimport("org.eclipse.text.edits.ReplaceEdit");

jimport("java.io.StringReader");
jimport("java.util.Properties");

jimport("java.lang.System");

// Set handlers for messages from clients
function onStartup() {
  collab_server.setExtendedHandler("TREE_INIT_REQUEST", initRequest);
  collab_server.setExtendedHandler("TREE_FOLDER_OPENED", folderOpened);
  collab_server.setExtendedHandler("TREE_FOLDER_CLOSED", folderClosed);
}

// TreeManager keeps track of file tree state
function treeManager() {
  return TreeManager.getTreeManager();
}

// Response to request for entire current state of tree. This
// happens when the user loads a new page with a file tree on it
function initRequest(nullPadId, user, connectionId, msg) {
  // Currently get all projects, not taking in to account
  // user permissions
  var projects = Workspace.listProjects();

  // Store tree nodes to send back to client
  var data = [];

  addPathToOpenFolders(msg.current, user, connectionId);

  // Make each resource into a tree node
  projects.forEach(function(item) {
    var node = makeNode(user, item);
    data.push(node);
  });

  collab_server.sendConnectionExtendedMessage(connectionId, {
    type: "TREE_INIT",
    data: data
  });
}

// When a user loads a page that is in the tree, the user should be able
// to see that node in the tree also
function addPathToOpenFolders(file, user, connectionId) {

  // Split the path into its components
  var components = file.split("/");

  // Path that will be added to set of open folders for this user
  var path = "";
  var msgPath = "";

  for (var i=1;i<components.length-1;i++) {
    path += ("/"+components[i]);
    msgPath += ((i==1?"":",")+components[i]);

    // Save path as open
    if (!treeManager().isFolderOpen(user, path)) {
      folderOpened(null, user, connectionId, {path: msgPath}, true);
    }
  }
}

// Response to when a client closes a folder
function folderClosed(nullPadId, user, connectionId, msg) {

  // Path is comma separated, so replace commas with '/'
  var resource_path = "/"+msg.path.toString().replace(/,/g,"/");

  // Save state of the closed folder
  treeManager().folderClosed(user, resource_path);

  collab_server.sendUserExtendedMessage(user, {
    type : "TREE_CLOSE_FOLDER",
    node : ""+resource_path
  }, connectionId);
}

// Response to when a client opens a folder
function folderOpened(nullPadId, user, connectionId, msg, noOriginal) {
  var resource;

  // Path is comma separated, so replace commas with '/'
  var resource_path = "/"+msg.path.toString().replace(/,/g,"/");


  treeManager().folderOpened(user, resource_path);
  resource = Workspace.getWorkspace().getRoot().findMember(new Path(resource_path));

  // Get children of the opened folder
  var resources = resource.members();

  // Store created nodes
  var children = [];

  // Make each resource into a tree node
  resources.forEach(function(item) {
    var child = makeNode(user, item);
    children.push(child);
  });

  // Children come in reverse order
  children.reverse();

  if(!noOriginal) {
    // Send the child nodes to the connection that opened the folder
    collab_server.sendConnectionExtendedMessage(connectionId, {
      type : "TREE_ADD",
      parent : ""+resource_path,
      data : children,
  
      // Message may contain more than one new node. Nodes will
      // already be in correct sorted order
      many : true
    });
  }

  // Notify user's other connections to open the folder
  collab_server.sendUserExtendedMessage(user, {
    type : "TREE_OPEN_FOLDER",
    node : ""+resource_path
  }, connectionId);
}

// Response to client creating a new resource
function newResource(resource, parentPath) {

  // Client expects nodes to come in array
  var child = [];

  // Notify the necessary users to add the new resource to tree
  treeManager().getUsersToNotifyOfChange(parentPath).forEach(function(user) {
    child.push(makeNode(user, resource));

    collab_server.sendUserExtendedMessage(user, {
      type : "TREE_ADD",
      parent : ""+parentPath,
      data : child,

      // Message will only contain the new node. Client must make
      // sure that node is placed in correct sorted order
      many : false
    });

    // Empty array
    child = [];
  });
}

// Response to client deleting a resource
function removeResource(resource, parentPath) {

  // Notify the necessary users to delete the resource from tree
  treeManager().getUsersToNotifyOfChange(parentPath).forEach(function(user) {
    collab_server.sendUserExtendedMessage(user, {
      type : "TREE_REMOVE",
      node : ""+resource.getFullPath()
    });
  });
}

// Makes and returns a list of child nodes of the input resource
function getResourceChildren(user, resource) {
  var children = [];

  // Create a node for each child of resource
  resource.members().forEach(function(item) {
    var node = makeNode(user, item);
    children.push(node);
  });

  return children;
}

// Creates the tree node that is sent to client
function makeNode(user, resource, position) {

  // Tell whether node is a folder or a file
  var type = ((resource.getType() == 1) ? "file" : "folder"); // resource.getType() of 1 is a file

  // If node is a folder, indicate whether it is open
  var isOpen = ((type == "folder") ? treeManager().isFolderOpen(user, resource.getFullPath()) : "");

  var node = {
    // Node in which this node should be placed inside
    parent : ""+resource.getParent().getFullPath(),

    // Title of node displayed to user
    name : ""+resource.getName(),

    // Full path, used to identify node
    path : ""+resource.getFullPath(),

    // Folder of file
    type : ""+type,

    // Either a file or a folder that is open or closed
    state : ((type == "file") ? "" : ((isOpen) ? "open" : "closed")),

    // Recursively create nodes for the children of the folder or none if node is a file
    children : ((type == "file") ? "none" : ((isOpen) ? getResourceChildren(user, resource) : []))
  }

  return node;
}
