function binarySearch(arr, find, comparator) {
  var low = 0, high = arr.length - 1, ii, comparison;
  while (low <= high) {
    ii = Math.floor((low + high) / 2);
    comparison = comparator(arr[ii], find);
    if (comparison < 0) { low = ii + 1; }
    else if (comparison > 0) { high = ii - 1; }
    else { return ii; }
  }
  return high;
};

$(document).ready(function() {
  
  var divs = [];
  var cached = {};
  
  function buildTimeline() {
    var timeline = $("#timeline");
    
    var width = 8;
    var last = 0;
    var lastTime = -1000;
    var count = history.revisions.length;
    
    for (ii in history.revisions) {
      var rev = history.revisions[ii];
      var left = Math.max(last, rev.time / 1000);
      var div = $("<div class='rev' />")
        .css('left', left+'px');
      if (rev.author != '') {
        div.append($("<div class='del' />").css('height', rev.deleted*2+'px'))
          .append($("<div class='ins' />").css('height', rev.inserted*2+'px'));
      }
      if ((left - lastTime > 70) || (ii == count-1)) {
        div.append($("<div class='ts' />").text(rev.timestamp));
        lastTime = left;
      }
      last = left + width;
      timeline.append(div);
      divs.push(div);
    }
  }
  buildTimeline();
  
  function onResize() {
    $("#editortop, #editorbottom").css('width', divs[divs.length-1].position().left+$("#contents").width()+18+25+'px');
    $(".autoresize").each(function(i) {
      var height = $(window).height() - $(this).offset().top - 80;
      $(this).height(height);
      $(".autoresized", this).height(height - 100);
    });
  }
  $(window).bind('resize', onResize);
  onResize();
  
  function cacheText(idx) {
    var revision = history.revisions[idx].revision;
    $.ajax({
      url: '/history/'+history.padId+':'+revision,
      success: function(data) {
        cached[idx] = data;
      },
      complete: function() {
        for (var next = idx+1; next < divs.length; next++) {
          if (cached[next] === undefined) {
            setTimeout(cacheText, 100, next);
            return;
          }
        }
      }
    })
  }
  cacheText(0);
  
  function display(idx, contents) {
    $("#revision").text(history.revisions[idx].revision);
    $("#timestamp").text(history.revisions[idx].timestamp);
    $("#contents").text(contents);
  }
  
  var running;
  var currentIdx = -1;
  
  function onScroll() {
    var idx = binarySearch(divs, $(window).scrollLeft(), function(div, left) {
      return div.offset().left - left;
    });
    if (idx < 0) { idx = 0; }
    if (currentIdx == idx) { return; }
    currentIdx = idx;
    
    var revision = history.revisions[idx].revision;
    if (running) { running.abort(); }
    
    if (cached[idx] !== undefined) {
      display(idx, cached[idx]);
      return;
    }
    
    running = $.ajax({
      url: '/history/'+history.padId+':'+revision,
      success: function(data) {
        cached[idx] = data;
        if (currentIdx == idx) {
          display(idx, data);
        }
      }
    });
  }
  $(window).scroll(onScroll);
  onScroll();
  
});
