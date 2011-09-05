import("jsutils");

jimport("collabode.Workspace");

jimport("java.lang.System");

const ANYONE = 'anyone';
const READ = 'read';
const CLAIM = 'claim';
const WRITE = 'write';
const OWNER = 'owner';
const PERMISSIONS = { read: READ, claim: CLAIM, write: WRITE, owner: OWNER };
const PERMISSION_VALUE = { read: 1, claim: 2, write: 3, owner: 4 };

function onStartup() {
  appjet.cache.recent_users = {};
}

function recent_users() {
  return jsutils.keys(appjet.cache.recent_users).sort();
}

function acl(project) {
  var prefs = Workspace.getProjectPrefs(project, "acl");
  return prefs.keys().map(function(key) {
    return {
      userId: key.split('/', 1)[0],
      path: key.split('/').slice(1).join('/'),
      permission: prefs.get(key, '').split(',')[0],
      restrictions: prefs.get(key, '').split(',').slice(1),
      equals: function() { return false; },
      getClass: function() { return { getSimpleName: function() { return 'acl' } }; }
    };
  });
}

function add_acl(project, filename, userId, permission) {
  permission = PERMISSIONS[permission];
  var prefs = Workspace.getProjectPrefs(project, "acl");
  prefs.put(userId + '/' + filename, permission);
  prefs.flush();
}

function del_acl(project, filename, userId) {
  var prefs = Workspace.getProjectPrefs(project, "acl");
  prefs.remove(userId + '/' + filename);
  prefs.flush();
}

function has_acl(projectname, filename, userId, permission, restrictionFunction) {
  var permitting = null;
  var allowed = acl(Workspace.accessProject(projectname)).some(function(acl) {
    permitting = acl;
    if ((acl.userId != ANYONE) && (acl.userId != userId)) { return false };
    if (acl.path.length > filename.length) {
      return (acl.path.indexOf(filename) == 0) && (permission == READ);
    } else {
      return (filename.indexOf(acl.path) == 0) && (PERMISSION_VALUE[acl.permission] >= PERMISSION_VALUE[permission]);
    }
  });
  if (allowed && (permitting.restrictions.length > 0) && restrictionFunction) {
    return restrictionFunction(permitting.restrictions);
  } else {
    return allowed;
  }
}
