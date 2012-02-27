import("helpers");
import("utils.*");

import("collab.ace.easysync2.{AttribPool,Changeset}");
import("collab.collab_server");

import("editor.workspace");

import("pad.model");
import("pad.revisions");

jimport("collabode.Workspace");

jimport("org.eclipse.core.resources.IResource");

jimport("java.io.ByteArrayInputStream");

jimport("java.lang.System");

function render_history(whoId, projectname) {
  var project = Workspace.accessProject(projectname);
  
  var starts = [];
  var pads = [];
  project.accept(function(resource) {
    if (resource.getType() == IResource.FILE) {
      var padId = whoId + "@" + resource.getFullPath().toString(); // XXX
      model.accessPadGlobal(padId, function(pad) {
        if (pad.exists()) {
          starts.push(pad.getRevisionDate(0).getTime());
          var data = {
            resource: resource,
            revisions: []
          }
          var head = pad.getHeadRevisionNumber();
          for (var rev = 0; rev <= head; rev++) {
            if (pad.getRevisionAuthor(rev) == "#styleq") { continue; }
            data.revisions[rev] = {
              revision: rev,
              date: pad.getRevisionDate(rev),
              changeset: pad.getRevisionChangeset(rev),
              author: pad.getRevisionAuthor(rev)
            };
          }
          pads.push(data)
        }
      });
    }
    return true;
  });
  
  renderHtml("editor/history.ejs", {
    project: project,
    whoId: whoId,
    pads: pads,
    start: Math.min.apply(Math, starts)
  });
  return true;
}

function render_pad_history(padId) {
  response.setContentType('text/plain');
  var head;
  model.accessPadGlobal(padId, function(pad) {
    head = pad.getHeadRevisionNumber();
  });
  for (var rev = 0; rev <= head; rev++) {
    model.accessPadGlobal(padId, function(pad) {
      if (pad.getRevisionAuthor(rev) == "#styleq") { return; }
      response.write(rev);
      var date = pad.getRevisionDate(rev);
      response.write("\t" + (date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "\t" + pad.getRevisionAuthor(rev));
      response.write("\n");
      if (pad.getRevisionAuthor(rev) == "") {
        response.write(pad.getRevisionChangeset(rev));
        response.write("<<<<\n");
      }
    });
  }
  for (var rev = 0; rev <= head; rev++) {
    model.accessPadGlobal(padId, function(pad) {
      if (pad.getRevisionAuthor(rev) == "#styleq") { return; }
      response.write(rev);
      response.write("\n");
    });
  }
  return true;
}

function render_version(whoId, projectname, filename, lineNo) {
  var project = Workspace.accessProject(projectname);
  var resource = project.findMember(filename);
  var padId = whoId + "@" + resource.getFullPath().toString(); // XXX
  
  model.accessPadGlobal(padId, function(pad) {
    response.setContentType('text/plain');
    response.write(pad.getRevisionText(lineNo));
  });
  
  return true;
}

function render_replay(whoId, defaultId, projectname, filename, rev) {
  var project = Workspace.accessProject(projectname);
  var resource = project.findMember(filename);
  var sourcePadId = whoId + "@" + resource.getFullPath().toString(); // XXX
  
  if (rev == 0) {
    model.accessPadGlobal(sourcePadId, function(sourcePad) {
      System.out.println("Setting disk contents to revision 0");
      resource.setContents(new ByteArrayInputStream(new java.lang.String(sourcePad.getRevisionText(0)).getBytes()), false, true, null);
    });
  }
  model.accessPadGlobal(sourcePadId, function(sourcePad) {
    var author = sourcePad.getRevisionAuthor(rev);
    if (author == "#styleq") {
      System.out.println("Skipping syntax color revision " + rev);
    } else {
      if (author == "" || ! author) {
        author = defaultId;
      }
      var targetPadId = workspace.accessDocumentPad(author, resource);
      model.accessPadGlobal(targetPadId, function(targetPad) {
        var cs = sourcePad.getRevisionChangeset(rev);
        // remove attributes
        cs = Changeset.mapAttribNumbers(cs, function() { return false; });
        // merge
        var unpacked = Changeset.unpack(cs);
        var assem = Changeset.smartOpAssembler();
        var iter = Changeset.opIterator(unpacked.ops);
        while (iter.hasNext()) {
          assem.append(iter.next());
        }
        assem.endDocument();
        cs = Changeset.pack(unpacked.oldLen, unpacked.newLen, assem.toString(), unpacked.charBank);

        System.out.println("## Applying revision " + rev + " " + cs + "#!#!#!#!");
        workspace.accessDocumentPad(author, resource);
        collab_server.applyChangesetToPad(targetPad,
                                          cs,
                                          author);
      });
    }
  });
  
  java.lang.Thread.sleep(100);
  return true;
}

function render_replay_mobile(whoId, defaultId, projectname, filename, rev) {
  // NOTE: rev is no longer used, at least for now
  
  // This is a total hack because I can't figure out how the real url args work -__-
  rev = filename;
  filename = projectname.substring(projectname.indexOf("/"), projectname.length) 
  projectname = projectname.substring(0, projectname.indexOf("/"));
  
  System.out.println("----");
  System.out.println("whoId: " + whoId);
  System.out.println("defaultId: " + defaultId);
  System.out.println("projectname: " + projectname);
  System.out.println("filename: " + filename);
  System.out.println("rev: " + rev);
  
  // Get a padId for this... is it a pad yet? D:
  var padId = workspace.replayPadIdFor(whoId, filename);
  System.out.println("padId: " + padId);
  addPadClientVars(padId);
  
  // Now that we've parsed the resource names from the url,
  // get the actual resources
  var project = Workspace.accessProject(projectname);
  var resource = project.findMember(filename);
  var sourcePadId = whoId + "@" + resource.getFullPath().toString(); // XXX
  System.out.println("sourcePadId: " + sourcePadId);
  
  // Apparently the ... file? needs to be zeroed out on revision 0.  XXX Why?
  if (rev == 0) {
    model.accessPadGlobal(sourcePadId, function(sourcePad) {
      System.out.println("Setting disk contents to revision 0");
      resource.setContents(new ByteArrayInputStream(new java.lang.String(sourcePad.getRevisionText(0)).getBytes()), false, true, null);
    });
  }
  
  //cycle(whoId, defaultId, projectname, filename);
  
  renderHtml("replay.ejs", {
    project: project
  });
  return true;
}

function cycle(whoId, defaultId, projectname, filename) {
  model.accessPadGlobal(sourcePadId, function(sourcePad) {
    
    // Determine the target pad id, where the replays will be written
    // Destory and recreate any previous target pads
    var targetPadId = padId; // TODO: uhhh
    System.out.println("targetPadId: " + targetPadId);
    model.accessPadGlobal(targetPadId, function(targetPad) {
      
      // Note: This has been revised to just not deal with the workspace.
      
      // If a pad with the target pad id exists, destroy it
      // and recreate it
      if (targetPad.exists()) {
        targetPad.destroy();
      }
      targetPad.create(false);
    });
    
    // TODO: cycle through all the revisions up until the most recent
    var rev = sourcePad.getHeadRevisionNumber();
    for (var r = 0; r <= rev; r++) {
      
      System.out.println("");
      
      var author = sourcePad.getRevisionAuthor(r);
      
      // Skip syntax coloring
      if (author == "#styleq") {
        System.out.println("Skipping syntax color revision " + r);
        continue;
      }
      
      // Determine the author otherwise set the author to the defaultId
      if (author == "" || ! author) {
        author = defaultId;
      }
      
      // Access the target pad (which should now exist) and start doing stuff
      model.accessPadGlobal(targetPadId, function(targetPad) {
        
        if ( ! targetPad.exists() ) { // just in case?
          pad.create(false);
        }
        
        var cs = sourcePad.getRevisionChangeset(r);
        // remove attributes
        cs = Changeset.mapAttribNumbers(cs, function() { return false; });
        // merge
        var unpacked = Changeset.unpack(cs);
        var assem = Changeset.smartOpAssembler();
        var iter = Changeset.opIterator(unpacked.ops);
        while (iter.hasNext()) {
          assem.append(iter.next());
        }
        assem.endDocument();
        cs = Changeset.pack(unpacked.oldLen, unpacked.newLen, assem.toString(), unpacked.charBank);
  
        System.out.println("## Applying revision " + r + " " + cs + "#!#!#!#!");
        //workspace.accessReplayPad(whoId, filename);
        collab_server.applyChangesetToPad(targetPad,
                                          cs,
                                          author);
        //collab_server.setPadText(targetPad, sourcePad.getRevisionText(r));
        
        java.lang.Thread.sleep(100);
        //Workspace.scheduleTask("runningOutput", id, file, text, "STDOUT", attribs);
        //response.setContentType('text/plain');
        //response.write(targetPad.getRevisionText(r));
        
      }); // end: access to target pad
    } // end: access to source pad
  });
  return true;
}