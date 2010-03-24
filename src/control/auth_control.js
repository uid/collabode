import("helpers");
import("utils.*");

function render_login() {
  renderHtml("editor/login.ejs", {
  });
  return true;
}

function login(destination) {
  getSession().userId = request.params.username.toLowerCase();
  response.redirect(destination);
  return true;
}

function logout() {
  delete getSession().userId;
  response.redirect('/');
  return true;
}
