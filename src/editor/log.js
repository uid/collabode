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

import("sync.callsyncIfTrue");
import("jsutils.*");

jimport("java.io.File");

function _n(x) {
  if (x < 10) { return "0"+x; }
  else { return x; }
}

function logFileName(prefix, logName, day) {
  var fmt = [day.getFullYear(), _n(day.getMonth()+1), _n(day.getDate())].join('-');
  var fname = (appjet.config['logDir'] + '/'+prefix+'/' + logName + '/' +
         logName + '-' + fmt + '.jslog');

  // make sure file exists
  if (!(new File(fname)).exists()) {
    //log.warn("WARNING: file does not exist: "+fname);
    return null;
  }

  return fname;
}

function log(name, m) {
  var cache = appjet.cache;

  callsyncIfTrue(
    cache,
    function() { return ! ('logWriters' in cache)},
    function() { cache.logWriters = {}; }
  );

  callsyncIfTrue(
    cache.logWriters,
    function() { return !(name in cache.logWriters) },
    function() {
      lw = new net.appjet.oui.GenericLogger('frontend', name, true);
      lw.start();
      cache.logWriters[name] = lw;
    });

  var lw = cache.logWriters[name];
  if (typeof(m) == 'object') {
    lw.logObject(m);
  } else {
    lw.log(m);
  }
}
