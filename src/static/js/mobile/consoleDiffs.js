//var fileid;
var differ;

//// Helper functions
function $allGlobsCards() {
  return $('.globs-card');
}

function $selectedGlobsCards() {
  return $('.globs-card.' + fileid);
}

function ConsoleDiffs() {
  this.idh = "#console-output";
  this.id = this.idh + "-page";
  this.fileChooserId = this.idh + "-filechooser";
  this.diffsBoxId = this.idh + "-diffs-box";
  this.obj = $(this.id);
  this.$fileChooser = $(this.fileChooserId);
  this.$fileChooserList = this.$fileChooser.find("ul");
  this.$diffsBox = $(this.diffsBoxId);
  this.data = null;  
  this.dataStartTime;
  this.dataEndTime;
  
  differ = new diff_match_patch();
  
  var panel_scroller = new iScroll("console-output-page", {
    //vScroll: true,
    //vScrollbar: true,
    //bounce: true
  });
  
  setTimeout(function() {
    collab.sendExtendedMessage({type: "REQUEST_SESSION_START_END_TIMES"});
  }, 1000);
  
  // this.updateTimer = null;
  var percent = 1.0;
  this.show = function() {
    // Determine start mins
    var startTime = this.dataStartTime.split(" ");
    startTime = startTime[startTime.length-1];
    var startMins = parseInt(startTime.split(":")[1]);
    // Determine end mins
    var endTime = this.dataEndTime.split(" ");
    endTime = endTime[endTime.length-1];
    var endMins = parseInt(endTime.split(":")[1]);
    // Construct a fake timestamp using the mins and percentage
    var percentMins = (endMins - startMins)*percent + startMins;
    var percentTime = endTime.split(":");
    percentTime[1] = "" + percentMins;
    percentTime = percentTime.join(":");
    var percentTimestamp = this.dataEndTime.split(" ")[0] + " " + percentTime;
    requestConsoleDiffs(percentTimestamp);
    return this;
  }
  
  this.display = function() {
    // Empty out the file chooser list; we're going to rebuild it
    // TODO: This probably isn't ideal; pass in the files
    this.$fileChooserList.empty();
    
    // Create outputs cards and file chooser at the same time
    for (var file in this.data) {
      var fileid = file.substring(0, file.indexOf("."));
      this.$fileChooserList.append('<li id="globs-' + fileid + '">' + file + '</li>');
    }
    
    this.$fileChooserList.children().click({
        data: this.data,
        $diffsBox: this.$diffsBox
      }, function(e) {
        var fileid = $(this).attr("id");
        var file = $(this).text();
        e.data.$diffsBox.empty();
        $(this).siblings().css('background-color', '#EEE');
        $(this).css('background-color', '#FEFEFE');
        generateDiffs(e.data.$diffsBox, e.data.data[file]);
    });
    
    // choose the first file to show
    this.$fileChooserList.children().first().click();
    
    // Poll continuously for updates
    //this.updateTimer = setTimeout(this.show, 500);
    
    // Show
    panel_scroller.refresh();
    this.obj.fadeIn(200);
    return this;
  }
  
  this.hide = function() {
    // Stop polling for updates
    // clearTimeout(this.updateTimer);
    
    // Fade out the panel
    this.obj.fadeOut(200);
    
    // TODO: ... clear anything out?
    return this;
  }
  
  return this;
}

function generateDiffs($diffsBox, clusters) {  
  // 'proto' is the cluster with the most occurrences
  // All other clusters will be diffed against the proto cluster
  var proto = {authors: []};
  for (var i in clusters) {
    if (clusters[i].authors.length > proto.authors.length) {
      proto = clusters[i];
    }
  }
  
  // Append the proto cluster at the top
  var scroller = $('<div/>')
    .append(occurrences(proto.authors.length, proto.authors))
    .append($.trim(proto.text));
  $diffsBox.append(
      $('<div id="proto" class="globs-diff"/>').append(scroller)
  );
  new iScroll("proto", {bounce: false});
  
  for (var i in clusters) {
    if (clusters[i].text != proto.text) {
      var diffs = differ.diff_main($.trim(proto.text), $.trim(clusters[i].text));
      differ.diff_cleanupSemantic(diffs);
      var html = differ.diff_myPrettyHtml(diffs);
      var scroller = $('<div/>')
        .append(occurrences(clusters[i].authors.length, clusters[i].authors))
        .append(html);
      $diffsBox.append(
          $('<div id="globs-diff-' + i + '" class="globs-diff"/>')
          .append(scroller)
      );
      new iScroll("globs-diff-" + i, {bounce: false});
    }
  }
}

function occurrences(count, authors) {
  var odiv = $('<div/>')
    .css('position', 'absolute')
    .css('width', 30)
    .css('right', 70)
    .css('z-index', 100);
  var countstring = '<p class="globs-diff-count">Students: <b>' + count + '</b></p>';
  var o = $('<div/>')
    .css('position', 'absolute')
    .css('z-index', 100)
    .css('top', 0)
    .css('left', 0)
    .append(countstring);
  odiv.append(o);
  for (var i = 1; i < Math.min(count, 3); i++) {
    odiv.append($('<div/>')
        .css('position', 'absolute')
        .css('z-index', 100-i)
        .css('top', 2*i)
        .css('left', 2*i)
        .append(countstring)
        );
  }
  var authorsbox = $('<div class="authors-container"/>')
    .append( $('<div class="authors-list"/>').append(authors.join(', ')) );
  authorsbox
    .css('position', 'absolute')
    .css('top', 21)
    .css('right', 0)
    .hide();
  o.append(authorsbox);
  
  // timeout is a slight hack because the touch event from the iScroll
  // causes the authors-container to toggle too many times
  var timeout = true;
  o.click(function(e) {
    if (timeout) $(this).find('.authors-container').slideToggle(200);
    timeout = false;
    setTimeout(function() {
      timeout = true;
    }, 200);
  });
  
  odiv.append(o);
  return odiv;
}

diff_match_patch.prototype.diff_myPrettyHtml = function(diffs) {
  var html = [];
  var pattern_amp = /&/g;
  var pattern_lt = /</g;
  var pattern_gt = />/g;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];    // Operation (insert, delete, equal)
    var data = diffs[x][1];  // Text of change.
    var text = data.replace(pattern_amp, '&amp;').replace(pattern_lt, '&lt;');
    switch (op) {
      case DIFF_INSERT:
        html[x] = '<ins style="background:#FFCC33;">' + text + '</ins>';
        break;
      case DIFF_DELETE:
        // only show <del> tags if:
        // - the text isn't blank
        // - the next tag isn't an <ins> tag
        if (data != "" && x != diffs.length-1 && diffs[x+1][0] != DIFF_INSERT) {          
          html[x] = '<del style="background:#FFCC33;">' + text + '</del>';
        } else {
          html[x] = '<del style="background:#FFCC33; display: none;">' + text + '</del>';
        }
        break;
      case DIFF_EQUAL:
        html[x] = '<span>' + text + '</span>';
        break;
    }
  }
  return html.join('');
};

/*=======================
 * Functions to request other information
 */
function requestConsoleDiffs(endTime) {
  var request = {
      type: "REQUEST_CONSOLE_OUTPUTS",
      endTime: endTime
  };
  collab.sendExtendedMessage(request);
  return false;
}
