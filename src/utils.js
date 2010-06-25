import("fileutils.{readFile,fileLastModified}");
import("ejs.EJS");
import("sessions");
import("jsutils.eachProperty");

import("helpers");

jimport("net.appjet.oui.JarVirtualFile");

function getSession() {
  return sessions.getSession({
    cookieName: "ode",
    domain: request.domain.indexOf(".") < 0 ? undefined : "." + request.domain
  });
}

function renderError(code) {
  response.reset();
  response.setStatusCode(code);
  renderHtml("error/" + code + ".ejs", { });
  response.stop();
}

function renderFirstTemplateAsString(filenames, data) {
  var html = "";
  eachProperty(filenames, function(i, filename) {
    if (new JarVirtualFile("/templates/"+filename).exists()) {
      html = renderTemplateAsString(filename, data);
      return false;
    }
  });
  return html;
}

function renderTemplateAsString(filename, data) {
  data = data || {};
  data.helpers = helpers; // global helpers
  data.session = getSession();

  var f = "/templates/"+filename;
  if (! appjet.scopeCache.ejs) {
    appjet.scopeCache.ejs = {};
  }
  var cacheObj = appjet.scopeCache.ejs[filename];
  if (cacheObj === undefined || fileLastModified(f) > cacheObj.mtime) {
    var templateText = readFile(f);
    cacheObj = {};
    cacheObj.tmpl = new EJS({text: templateText, name: filename});
    cacheObj.mtime = fileLastModified(f);
    appjet.scopeCache.ejs[filename] = cacheObj;
  }
  var html = cacheObj.tmpl.render(data);
  return html;
}

function renderHtml(bodyFileName, data) {
  var bodyHtml = renderTemplateAsString(bodyFileName, data);
  response.write(renderTemplateAsString("html.ejs", {bodyHtml: bodyHtml}));
  if (request.acceptsGzip) {
    response.setGzip(true);
  }
}

function camelToUnderscore(camel) {
  return camel.replace(/[A-Z]/, function(m) { return '_'+m.toLowerCase(); });
}
