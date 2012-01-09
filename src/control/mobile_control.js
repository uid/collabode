import("helpers");
import("utils.*");

jimport("collabode.mobile.Application");

jimport("java.lang.System");

function render_mobile() {
	renderHtml("mobile/mobile.ejs", {
		users: Application.getUsers()
	});
	return true;
}