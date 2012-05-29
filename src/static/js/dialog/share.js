/**
 * Initialize the share dialog.
 * @param users The list of (string) users in the system
 * @param allowedPermissions The list of (string) allowed permission names 
 * @param existingPermissions A list of {user: ..., permission: ...} containing the existing permissions
 * @param callback function(modifications) to be called when user clicks OK. 
 *                 modifications is a list of either {action: 'delete', user: ...}, 
 *                 or {action: 'add', user: ..., permission: ...}.
 */
function initShareDialog(users, allowedPermissions, existingPermissions, callback) {
  
  /* list of entries {
   *   user: ..., 
   *   permission: ..., 
   *   status: 'delete'/'add'/'original', 
   *   id: a unique entry ID
   */
  var permissions = []; 
  
  var permissionsMap = {}; // user -> permission
  
  var nextEntryID = 1;
  function getEntryID() {
    return "share-entry-"+(nextEntryID++);
  }
  

  
  function getEntryRow(entry) {
    var row = $('<tr>').attr('id', entry.id).addClass('share-row-'+entry.status);
    row.append($('<td>').addClass('share-row-user').text(entry.user));
    row.append($('<td>').addClass('share-row-permission').text(entry.permission));
    var actionButton = $("<button>");
    if (entry.status == 'delete'){
      actionButton.text('Undo');
      actionButton.click(function() {
        restorePermissionEntry(entry);
      });
    } else {
      actionButton.text('Delete');
      actionButton.click(function() {
        deletePermissionEntry(entry);
      });
    }
    row.append($('<td>').addClass('share-row-action').append(actionButton));
    
    return row;
  }
  
  function deletePermissionEntry(entry) {
    delete permissionsMap[entry.user];
    
    if (entry.status=='add') {
      // if entry is newly added, remove it
      for (var i=0;i<permissions.length;i++){
        if(permissions[i] == entry) {
          permissions.splice(i, 1);
          break;
        }
      }
      $('#'+entry.id).remove();
    } else {
      // otherwise, cross it out
      entry.status = 'delete';
      $('#'+entry.id).replaceWith(getEntryRow(entry));
    }
  }
  
  function restorePermissionEntry(deletedEntry) {
    if (deletedEntry.user in permissionsMap) {
      //delete/cross out all other entries for this user
      for (var i=0;i<permissions.length;i++) {
        var entry = permissions[i];
        if (entry.user == deletedEntry.user && entry.status != 'delete') {
          deletePermissionEntry(entry);
        }
      }
    }
    permissionsMap[deletedEntry.user] = deletedEntry.permission;
    deletedEntry.status = 'original';
    $('#'+deletedEntry.id).replaceWith(getEntryRow(deletedEntry));
  }
  

  function addPermissionEntry(user, permission) {
    if (user in permissionsMap) {
      if (permissionsMap[user] == permission) {
        return; //permission already exists and is the same
      } else {
        //delete/cross out all existing entries for this user
        for (var i=0;i<permissions.length;i++) {
          var entry = permissions[i];
          if (entry.user == user && entry.status != 'delete') {
            deletePermissionEntry(entry);
          }
        }
      }
    }
    permissionsMap[user] = permission;
    
    //add entry to permission list and update GUI
    var newEntry = {
      user: user,
      permission: permission,
      status: 'add',
      id: getEntryID()
    };
    
    permissions.push(newEntry);
    $('#share-new-row').before(getEntryRow(newEntry));
  }
  
  
  function initNewRow() {
    for (var i=0;i<users.length;i++){
      $('#share-new-user').append($('<option>').attr('value', users[i]).text(users[i]));
    }
    for (var i=0;i<allowedPermissions.length;i++) {
      $('#share-new-permission').append($('<option>').attr('value', allowedPermissions[i]).text(allowedPermissions[i]));
    }
    $('#share-new-add').click(function() {
      addPermissionEntry(
          $('#share-new-user').val(),
          $('#share-new-permission').val()
          );
    });
  }
  
  function initOKButton() {
    $('#share-ok').click(function() {
      var modifications = [];
      for (var i=0;i<permissions.length;i++) {
        var entry = permissions[i];
        if(entry.status == 'delete') {
          modifications.push({
            action: 'delete',
            user: entry.user
          });
        } else if(entry.status == 'add') {
          modifications.push({
            action: 'add',
            user: entry.user,
            permission: entry.permission
          });
        }
      }
      callback(modifications);      
    });
  }
  
  function addExisting() {
    for (var i=0;i<existingPermissions.length;i++) {
      var entry = existingPermissions[i];
      var newEntry = {
        user: entry.user,
        permission: entry.permission,
        status: 'original',
        id: getEntryID()
      };
      permissions.push(newEntry);
      permissionsMap[entry.user] = entry.permission;
      $('#share-new-row').before(getEntryRow(newEntry));
    }
  }
  
  $(document).ready(function() {
    initNewRow();
    initOKButton();
    addExisting();
  });
}

