function Layout() { }

Layout.onResize = function() { };

$(document).ready(function() {
  $("#additions .docbarbutton").appendTo("#docbartools");
  $("#additions .sidebarsection").appendTo("#sidebarbox");
  
  function onResize() {
    $(".autoresized").each(function(i) {
      $(this).height($(window).height() - $(this).offset().top - 40);
    });
    Layout.onResize();
  }
  
  $(window).bind('resize', onResize);
  onResize();
  setInterval(function() { onResize(); }, 5000); // XXX just in case?
});
