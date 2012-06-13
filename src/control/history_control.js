import("helpers");
import("utils.*");

import("collab.ace.easysync2.{AttribPool,Changeset}");
import("sqlbase.sqlbase");
import("sqlbase.sqlcommon");
import("sqlbase.sqlobj");

import("editor.workspace");

import("pad.model");
import("pad.revisions");

jimport("java.lang.System");

function render_list() {
  padIds = sqlbase.getAllJSONKeys("PAD_META")
  editors = {};
  padIds.forEach(function(padId) {
    editors[padId] = [];
    var attribs = sqlbase.getJSON("PAD_APOOL", padId)['numToAttrib'];
    for (n in attribs) {
      if (attribs[n][0] == "author" && attribs[n][1] && attribs[n][1][0] != "#") {
        editors[padId].push(attribs[n][1]);
      }
    }
  });
  renderHtml("history/list.ejs", {
    padIds: padIds,
    editors: editors
  });
  return true;
}

function render_pad(padId) {
  var revisions = [];
  model.accessPadGlobal(padId, function(pad) {
    var start = pad.getRevisionDate(0).getTime();
    var head = pad.getHeadRevisionNumber();
    for (var rev = 0; rev <= head; rev++) {
      var author = pad.getRevisionAuthor(rev);
      if (author && author[0] == "#") { continue; }
      
      var deleted = 0;
      var inserted = 0;
      var unpacked = Changeset.unpack(pad.getRevisionChangeset(rev));
      var csIter = Changeset.opIterator(unpacked.ops);
      
      while (csIter.hasNext()) {
        var op = csIter.next();
        if (op.opcode == '-') { deleted += op.chars; }
        else if (op.opcode == '+') { inserted += op.chars; }
      }
      
      var date = pad.getRevisionDate(rev);
      
      revisions.push({
        revision: rev,
        time: date.getTime() - start,
        timestamp: date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate() + "\n" + date.toTimeString().replace(/ GMT.*/,''),
        deleted: deleted,
        inserted: inserted,
        author: author
      });
    }
  });
  renderHtml("history/pad.ejs", {
    padId: padId,
    revisions: revisions
  });
  return true;
}

function render_version(padId, revision) {
  var text;
  model.accessPadGlobal(padId, function(pad) {
    text = pad.getRevisionText(revision);
  });
  response.setContentType('text/plain');
  response.write(text);
  response.stop();
  return true;
}
