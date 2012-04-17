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
import("stringutils.md5");
import("jsutils.eachProperty");

import("helpers");

jimport("net.appjet.oui.JarVirtualFile");
jimport("java.util.Random");

const COOKIE_NAME = "ode";
const COOKIE_DOMAIN = undefined; // XXX only legal value when accessed by IP addr; problematic?

var _jrand = new Random(); // replaces stringutils._jrand

function _randomHash(len) {
  var x = md5(""+_jrand.nextDouble()*1e12+_jrand.nextDouble()*1e12);
  if (len) {
    return String(x).substr(0,len);
  } else {
    return x;
  }
}

function getSession() {
  // avoid sessionId collisions by using randomer Random
  if ( ! (request.cookies[COOKIE_NAME] || appjet.requestCache.sessionId)) {
    var sessionId = _randomHash(16);
    
    response.setCookie({
      name: COOKIE_NAME,
      value: sessionId,
      path: "/",
      domain: COOKIE_DOMAIN
    });
    
    appjet.requestCache.sessionId = sessionId;
  }
  
  return sessions.getSession({
    cookieName: COOKIE_NAME,
    domain: COOKIE_DOMAIN
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

function urlGet(url0, params) { // logic and return structure from netutils.urlPost(...)
  var partialUrl = new java.net.URL(url0);
  
  var components = [];
  eachProperty(params, function(k, v) {
    components.push(encodeURIComponent(k)+"="+encodeURIComponent(v));
  });
  var query = components.join('&');
  
  var url = new java.net.URL(url0 + (partialUrl.getQuery() ? '&' : '?') + query);
  
  var conn = url.openConnection();
  var content = conn.getContent();
  var responseCode = conn.getResponseCode();
  var contentType = conn.getContentType();
  var contentEncoding = conn.getContentEncoding();
  
  if ((content instanceof java.io.InputStream) && (new java.lang.String(contentType)).startsWith("text/")) {
    if (! contentEncoding) {
      var encoding = contentType.split(/;\s*/);
      if (encoding.length > 1) {
        encoding = encoding[1].split("=");
        if (encoding[0] == "charset")
          contentEncoding = encoding[1];
      }
    }
    content = net.appjet.common.util.BetterFile.getStreamBytes(content);
    if (contentEncoding) {
      content = (new java.lang.String(content, contentEncoding));
    }
  }
  
  return {
    content: content,
    status: responseCode,
    contentType: contentType,
    contentEncoding: contentEncoding
  };
}
