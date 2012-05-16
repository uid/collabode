function Layout() { }

Layout.onResize = function() { };
Layout.resize = function() {
  $(".autoresized").each(function(i) {
    var div = $(this);
    div.height($(window).height() - (div.offset().top || div.parent().offset().top) - 40);
  });
  Layout.onResize();
};

Layout.hoverOpen = function(url) {
  var hover = $("#hovercontainerbox");
  var frame = $("iframe", hover);
  if (frame.attr("src") == url) {
    return Layout.hoverClose();
  } else if (frame.length) {
    frame.attr("src", url);
    return false;
  }
  hover.prepend($("<iframe>").attr("src", url).attr("frameborder", 0)).fadeIn();
  hover.next().animate({ left: hover.width() }, {
    complete: function() {
      Layout.resize();
    }
  });
  return false;
};
Layout.hoverClose = function() {
  var hover = $("#hovercontainerbox");
  hover.fadeOut();
  hover.next().animate({ left: 0 }, {
    complete: function() {
      $("iframe", hover).remove();
      Layout.resize();
    }
  });
  return false;
};

$(document).ready(function() {
  $("#additions .docbarbutton").appendTo("#docbartools");
  $("#additions .sidebarsection").appendTo("#sidebarbox");
  
  $(window).bind('resize', Layout.resize);
  Layout.resize();
  setInterval(function() { Layout.resize(); }, 5000); // XXX just in case?
  
  $("#hoverclose").click(Layout.hoverClose);
});
