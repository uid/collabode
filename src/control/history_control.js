import("helpers");
import("utils.*");

import("sqlbase.sqlobj");

import("collab.ace.easysync2.{AttribPool,Changeset}");
import("collab.collab_server");

import("editor.mobile");
import("editor.workspace");

import("pad.model");
import("pad.revisions");

//jimport("collabode.history.PQueue");
//jimport("collabode.history.Replay");
jimport("collabode.history.Revision");
jimport("collabode.Workspace");

jimport("org.eclipse.core.resources.IResource");
jimport("org.eclipse.jdt.core.IPackageFragmentRoot");
jimport("org.eclipse.jdt.core.JavaCore");

jimport("java.io.ByteArrayInputStream");
jimport("java.util.PriorityQueue");

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
              author: pad.getRevisionAuthor(rewv)
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
      //System.out.println("Skipping syntax color revision " + rev);
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
/*
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
        //System.out.println("Skipping syntax color revision " + r);
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
}*/

/////////////////////////////////////////////
// Real replay stuff
function replayAll() {
  
  System.out.println("Replaying...");
  
  var pq = new PriorityQueue();
  
  var projects = Workspace.listProjects();
  for (var p in projects) {
    var project = projects[p];
    if (project.hasNature("org.eclipse.jdt.core.javanature")) {
      var jproject = JavaCore.create(project);
      System.out.println(jproject.getElementName());
      
      var projectName = jproject.getElementName();
      var session = projectName.split("-")[0];
      var username = projectName.split("-")[1];
      
      if (username != null) {              
        mobile.doMobileLogin(username, username);
      }
      
      packages = jproject.getPackageFragments();

      for (var pp in packages) {
        var ppackage = packages[pp]; 
        if (ppackage.getKind() == IPackageFragmentRoot.K_SOURCE) {
          //System.out.println("  src/");

          var units = ppackage.getCompilationUnits();
          for (var u in units) {
            var unit = units[u];
            System.out.println("    -> " + unit.getElementName());
            
            // Generate replays if they don't already exist
            handleReplay("choir", username, session, projectName, 
                "src/"+unit.getElementName(), pq);            
          }
        }
      }
    }
  }
  
  // Great!  Theoretically all the changesets that could have been packaged up
  // have been saved into the priority queue.
  // Now go through the priority queue and apply these changes!
  
  //System.out.println();
  System.out.println("Playback -- " + pq.size() + " revisions");
  while (pq.peek() != null) {
    playback(pq.poll());
  }
}

function handleReplay(whoId, defaultId, session, projectname, filename, pq) {
  /*
  //This is a total hack because I can't figure out how the real url args work -__-
  rev = filename;
  filename = projectname.substring(projectname.indexOf("/"), projectname.length) 
  projectname = projectname.substring(0, projectname.indexOf("/"));
  var session = projectname.substring(0, projectname.indexOf("-"));
  
  System.out.println("----");
  System.out.println("whoId: " + whoId);
  System.out.println("defaultId: " + defaultId);
  System.out.println("session: " + session);
  System.out.println("projectname: " + projectname);
  System.out.println("filename: " + filename);
  */
  
  //Get a padId for this...
  //var padId = workspace.replayPadIdFor(whoId, filename);
  //System.out.println("padId: " + padId);
  
  // Now that we've parsed the resource names from the url,
  // get the actual resources
  var project = Workspace.accessProject(projectname);
  var resource = project.findMember(filename);
  var sourcePadId = whoId + "@" + resource.getFullPath().toString(); // XXX
  var sourceConsolePadId = whoId + "*run*" + resource.getFullPath().toString();
  //System.out.println("sourcePadId: " + sourcePadId);
  //System.out.println("sourceConsolePadId: " + sourceConsolePadId);
  
  initReplay(session, sourcePadId, whoId, defaultId, pq);
  initReplay(session, sourceConsolePadId, whoId, defaultId, pq);
}

function initReplay(session, padId, whoId, defaultId, pq) {
  try {

    // Look up replayId in db
    var replay = sqlobj.selectSingle("REPLAYS", {
      session: session,
      padId: padId
    });

    if (replay == null) {
      // This replay hasn't been recorded yet.    
      //playback(generateReplay(session, padId));
      try {        
        generateReplay(session, padId, whoId, defaultId);
      } catch (e) {
        //System.out.println("GENERATE ERROR: " + e);
      }

    } else {    
      // This replay has been recorded, can play back directly   
      //playback(replay.replayId);
      //System.out.println("Replay exists! skipping..");
    }
    
    // Go through all the replays and insert them into a priority queue
    // by timestamp so they can be played back in order.
    var replayId = sqlobj.selectSingle("REPLAYS", {
      session: session,
      padId: padId
    }).replayId;
    
    var revs = sqlobj.selectMulti("REPLAY_DATA", { replayId: replayId });
    for (var r in revs) {
      /*System.out.println(revs[r].revisionNum + ": " + 
          revs[r].timestamp + " " +
          revs[r].changeset + " " +
          revs[r].action);*/
      pq.add(new Revision(
          padId,
          revs[r].revisionNum, 
          revs[r].author,
          revs[r].timestamp,
          revs[r].changeset,
          revs[r].action));
    }
    
    //System.out.println("done! pq size: " + pq.size());
  } catch (e) {
    //System.out.println("ERROR: " + e);
  }
  
}

function generateReplay(session, padId, whoId, defaultId) {
  //System.out.println("No replay exists for " + session + " - " + padId + " generating..");

  // Get head revision number from db
  model.accessPadGlobal(padId, function(sourcePad) {
    // Generate a replayId and add this item to the db
    var headRevision = sourcePad.getHeadRevisionNumber(); 
    
    // XXX Ugly, this is 2 db accesses just to get the auto-incremented replayId.
    // Might want to come up with a naming pattern for replayIds
    sqlobj.insert("REPLAYS", {
      session: session,
      padId: padId,
      headRevision: headRevision
    });

    var replay = sqlobj.selectSingle("REPLAYS", {
      session: session,
      padId: padId
    });
    
    // XXX: Wow.
    if (replay == null) {
      System.out.println("... this happens?!");
      setTimeout(function() {
        replay = sqlobj.selectSingle("REPLAYS", {
          session: session,
          padId: padId
        });
      }, 100);
    }
    
    var timestamp = "unknown";
    for (var rev = 0; rev < headRevision; rev++) {
      
      var author = sourcePad.getRevisionAuthor(rev);
      
      // Skip syntax coloring
      if (author == "#styleq") {
        //System.out.println("Skipping syntax color revision " + rev);
        continue;
      }
      
      // Determine the author otherwise set the author to the defaultId
      if (author == "" || ! author) {
        author = defaultId;
      }
        
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
  
      //System.out.println("## revision " + rev + " " + cs + "#!#!#!#!");

      var csText = cs.substring(cs.indexOf("$")+1, cs.length);
      //System.out.println(rev + ": " + csText);
      var action = "UNKNOWN";
      if (csText.indexOf("[ Started") == 1 /*&& 
          csText.indexOf(" ]") == csText.length-2*/) {
        action = "RUN";
        //timestamp = csText.substring(csText.indexOf("[ Started ") + "[ Started ".length,
            //csText.indexOf(" ]"));
      } else {
        action = "WRITE";
      }
      
      sqlobj.insert("REPLAY_DATA", {
        replayId: replay.replayId,
        padId: replay.padId,
        revisionNum: rev,
        author: defaultId,
        timestamp: sourcePad.getRevisionDate(rev),
        changeset: cs,
        action: action
      });
    }
  });
  
  return replay.replayId;      
  
  // At the end... // safeguards should exist to make this whole thing fault-tolerant
    // so that at any point if the replay generation gets stopped the entire thing 
    // doesn't fail
  // Save replayId with head revision number to db
}

function playback(rev) { // rev is a single revision
  if (rev.action == "WRITE") {
    workspace.replayTaskRunningOutput(rev.author, rev.padId, rev.cs);

  } else if (rev.action == "RUN") {
    workspace.replayOnRunRequest(rev.padId, rev.author);
  }
}
