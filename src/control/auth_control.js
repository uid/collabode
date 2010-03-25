import("helpers");
import("utils.*");

function render_login() {
  renderHtml("editor/login.ejs", {
  });
  return true;
}

function login(destination) {
  var username = request.params.username.replace(/\s+/g, '').toLowerCase();
  getSession().userId = "u." + username;
  getSession().userName = username;
  response.redirect(destination);
  return true;
}

function logout() {
  delete getSession().userId;
  delete getSession().userName;
  response.redirect('/');
  return true;
}
