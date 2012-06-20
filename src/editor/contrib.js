import("sqlbase.sqlbase");
import("utils.*");

import("collab.ace.easysync2.Changeset");
import("cache_utils.syncedWithCache");

import("pad.model");

import("editor.workspace");

jimport("net.appjet.common.util.LimitedSizeMapping");

jimport("java.lang.System");

const _CHANGE_CACHE_SIZE = 100;

function _getChangeCache(padId, since) {
  var key = padId + "~" + since;
  return syncedWithCache("editorcontrib", function(cache) {
    if ( ! cache.map) {
      cache.map = new LimitedSizeMapping(_CHANGE_CACHE_SIZE);
    }
    var mapSince = cache.map.get(key);
    if ( ! mapSince) {
      mapSince = new LimitedSizeMapping(_CHANGE_CACHE_SIZE / 10);
      cache.map.put(key, mapSince);
    }
    return mapSince;
  });
}

function padsEdited(projectname, author) {
  return sqlbase.getAllJSONKeys("PAD_META").filter(function(padId) {
    var filename = workspace.filenameFor(padId);
    if (( ! filename) || (projectname != filename.split("/", 3)[1])) { return false; }
    var attribs = sqlbase.getJSON("PAD_APOOL", padId)['numToAttrib'];
    for (n in attribs) {
      if (attribs[n][0] == "author" && attribs[n][1] == author) { return true; }
    }
    return false;
  });
}

function padChange(padId, since, until) {
  since = +since;
  until = +until;
  
  return model.accessPadGlobal(padId, function(pad) {
    if (since && since > +pad.getRevisionDate(pad.getHeadRevisionNumber())) {
      return null;
    } else if (until && until < +pad.getRevisionDate(1)) {
      return null;
    }
    
    since = since ? binarySearch(pad.getHeadRevisionNumber() + 1, function(rev) {
      return since < +pad.getRevisionDate(rev);
    }) - 1 : 0;
    since = Math.max(since, 1); // assume first revision is due to setPadText
    until = until ? binarySearch(pad.getHeadRevisionNumber() + 1, function(rev) {
      return until < +pad.getRevisionDate(rev);
    }) - 1 : pad.getHeadRevisionNumber();
    until = Math.max(since, until);
    
    var cache = _getChangeCache(padId, since);
    var cachedChange = cache.get(until);
    if (cachedChange) {         // already computed since -> until, use it
      cache.touch(until);
      return cachedChange;
    }
    
    var cs, first;
    var cachedRevs = cache.listAllKeys();
    if (cachedRevs.size()) {    // already computed since -> best, only compose best -> until
      var best = cachedRevs.get(cachedRevs.size() - 1);
      cs = cache.get(best).cs;
      first = best + 1;
    } else {                    // nothing cached, compose since -> until
      cs = Changeset.identity(Changeset.newLen(pad.getRevisionChangeset(since)));
      first = since + 1;
    }
    
    var pool = pad.pool();
    for (var rev = first; rev <= until; rev++) {
      cs = Changeset.compose(cs, pad.getRevisionChangeset(rev), pool);
    }
    var change = {
      padId: padId,
      start: pad.getInternalRevisionAText(since),
      end: pad.getInternalRevisionAText(until),
      cs: cs
    };
    cache.put(until, change);
    return change;
  });
}

function authorDelta(author, change) {
  if (( ! change) || Changeset.isIdentity(change.cs)) { return null; }
  
  var delta = { del: 0, ins: 0 };
  model.accessPadGlobal(change.padId, function(pad) {
    var pool = pad.pool();
    authorAttribNum = pool.putAttrib([ 'author', author ], false);
    var authored = Changeset.filterAttribNumbers(change.cs, function(num) {
      return num == authorAttribNum;
    });
    
    var iter = Changeset.opIterator(Changeset.unpack(authored).ops);
    var assem = Changeset.smartOpAssembler();
    while (iter.hasNext()) {
      assem.append(iter.next());
    }
    assem.endDocument();
    
    iter = Changeset.opIterator(assem.toString());
    while (iter.hasNext()) {
      var op = iter.next();
      if ( ! op.attribs) { continue; }
      if (op.opcode == '-') { delta.del += op.lines || 1; }
      else if (op.opcode == '+') { delta.ins += op.lines || 1; }
    }
  });
  
  return delta;
}

function padChangeAText(change) {
  if ( ! change) { return null; }
  
  // use underline and strikethrough to mark insertions and deletions; must be in the pool
  var insAttrib, delAttrib, apool;
  model.accessPadGlobal(change.padId, function(pad) {
    var pool = pad.pool();
    insAttrib = '*' + Changeset.numToString(pool.putAttrib([ '$$underline', true ]));
    delAttrib = '*' + Changeset.numToString(pool.putAttrib([ '$$strikethrough', true ]));
    apool = pool.toJsonable();
  });
  
  // start with text from end revision
  var rep = {
    apool: apool,
    atext: { text: change.end.text }
  };
  
  if (Changeset.isIdentity(change.cs)) {
    rep.atext.attribs = change.end.attribs;
    return rep;
  }
  
  // compute attribs, splicing deletions into text
  var attChar = 0, chgChar = 0, oldChar = 0;
  rep.atext.attribs = Changeset.applyZip(change.end.attribs, 0,
                                         Changeset.unpack(change.cs).ops, 0,
                                         function(attOp, chgOp, opOut) {
    if (chgChar == attChar && chgOp.opcode == '+') { // mark as added
      Changeset.copyOp(attOp, opOut);
      opOut.attribs += insAttrib;
      if (chgOp.chars <= attOp.chars) {
        opOut.chars = chgOp.chars;
        opOut.lines = chgOp.lines;
        chgOp.opcode = '';
        if (chgOp.chars < attOp.chars) { // ... chgOp shorter, leave 2nd part of attOp
          attOp.chars -= chgOp.chars;
          attOp.lines -= chgOp.lines;
        } else { // ... chgOp and attOp equal length, leave nothing
          attOp.opcode = '';
        }
      } else { // ... attOp shorter, leave 2nd part of chgOp
        attOp.opcode = '';
        chgOp.chars -= attOp.chars;
        chgOp.lines -= attOp.lines;
      }
      attChar += opOut.chars;
      chgChar += opOut.chars;
    } else if (chgChar == attChar && chgOp.opcode == '-') { // splice in deleted text, mark as deleted
      rep.atext.text = rep.atext.text.slice(0, attChar)
                       + change.start.text.substr(oldChar, chgOp.chars)
                       + rep.atext.text.slice(attChar);
      Changeset.copyOp(chgOp, opOut);
      opOut.opcode = '+';
      opOut.attribs += delAttrib;
      chgOp.opcode = '';
      attChar += opOut.chars;
      chgChar += opOut.chars;
      oldChar += opOut.chars;
    } else if (chgOp.opcode == '+' || chgOp.opcode == '-') {
      if (chgChar < attChar + attOp.chars) { // take 1st part of attOp interrupted by deletion
        Changeset.copyOp(attOp, opOut);
        var text = rep.atext.text.substr(attChar, attOp.chars);
        var lastNl = text.lastIndexOf("\n", chgChar - attChar - 1);
        if (lastNl < 0) {
          opOut.chars = chgChar - attChar;
          opOut.lines = 0;
        } else {
          opOut.chars = lastNl + 1;
          opOut.lines = text.substr(0, lastNl + 1).match(/\n/g).length;
        }
        attOp.chars -= opOut.chars;
        attOp.lines -= opOut.lines;
        attChar += opOut.chars;
      } else { // keep taking attOps until we reach the insert or delete
        Changeset.copyOp(attOp, opOut);
        attOp.opcode = '';
        attChar += attOp.chars;
      }
    } else if (chgOp.opcode) { // keep taking chgOps until we reach insert or delete
      chgOp.opcode = '';
      chgChar += chgOp.chars;
      oldChar += chgOp.chars;
    } else { // no more chgOps, attOps until the end
      Changeset.copyOp(attOp, opOut);
      attOp.opcode = '';
    }
  });
  
  return rep;
}
