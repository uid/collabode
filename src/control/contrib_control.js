import("helpers");
import("utils.*");

import("editor.contrib");

jimport("java.lang.System");

function render_contrib(author, since, until, projectname) {
  var padIds = contrib.padsEdited(projectname, author);
  var changes = {};
  padIds.forEach(function(padId) {
    changes[padId] = contrib.padChangeAText(contrib.padChange(padId, since, until));
  });
  
  helpers.addClientVars({
    author: author,
    changes: changes
  });
  
  renderHtml("editor/contrib.ejs", {
    projectname: projectname,
    author: author,
    since: _formatDate(since),
    until: _formatDate(until)
  });
  return true;
}

function _formatDate(ms) {
  if ( ! ms) { return null; }
  var date = new Date(+ms);
  var now = new Date();
  if (now.getDate() == date.getDate() && now.getMonth() == date.getMonth()) {
    return date.toLocaleTimeString();
  } else {
    return date.toLocaleString();
  }
}
