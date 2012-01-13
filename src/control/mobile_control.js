import("helpers");
import("utils.*");

import("editor.workspace");

jimport("collabode.mobile.Application");

jimport("java.lang.System");

function render_mobile() {
	
	addPadClientVars(workspace.accessDummyPad(getSession().userId));
	
	renderHtml("mobile/mobile.ejs", {
		users: Application.getUsers()
	});
	return true;
}