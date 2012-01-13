/**
 * Copyright 2009 Google Inc.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import("fileutils.{readFile,fileLastModified}");
import("ejs.EJS");
import("sessions");
import("jsutils.eachProperty");

import("helpers");

import("collab.collab_server");

import("pad.model");
import("pad.revisions");

jimport("net.appjet.oui.JarVirtualFile");

function getSession() {
  return sessions.getSession({
    cookieName: "ode",
    domain: undefined // XXX only legal value when accessed by IP addr; problematic?
  });
}

function addPadClientVars(padId) {
  model.accessPadGlobal(padId, function(pad) {
    helpers.addClientVars({
      padId: padId,
      collab_client_vars: collab_server.getCollabClientVars(pad),
      initialRevisionList: revisions.getRevisionList(pad),
      serverTimestamp: +(new Date),
      initialOptions: pad.getPadOptionsObj(),
      userId: getSession().userId,
      userName: getSession().userName,
      opts: {}
    });
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
