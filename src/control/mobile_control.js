import("helpers");
import("utils.*");

import("sqlbase.sqlobj");

import("editor.workspace");

//jimport("collabode.mobile.Application");

jimport("java.lang.System");

/**
 * Render the root of the mobile instructor interface
 */
function render_mobile() {
	addPadClientVars(workspace.accessDummyPad(getSession().userId));
	
	var debug = false;
	if (debug) {	  
	  // XXX: test code **************
	  System.out.println("getting users from db");
	  arr = getUsers();
	  for (var i in arr) {
	    System.out.println(arr[i].username + " - " + arr[i].photo);
	  }
	  // XXX: end of test code ************
	}
	
	renderHtml("mobile/mobile.ejs", {
		users: getUsers()
	});
	return true;
}

/**
 * Get users from the database
 */
function getUsers() {
  return sqlobj.selectMulti("MBL_USERS", {}, {});
}
