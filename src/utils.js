import("fileutils.{readFile,fileLastModified}");
import("ejs.EJS");

import("helpers");

function renderTemplateAsString(filename, data) {
  data = data || {};
  data.helpers = helpers; // global helpers

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
