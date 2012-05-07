(function ($) {
  $.dialog = {};
  $.dialog.show = function(url, width, height) {
    var background = $('<div id="dialog-background">');
    var content = $('<div id="dialog-content">');
    var iframe = $('<iframe>').attr('src', url).attr('width', width).attr('height', height);
    content.append(iframe);
    iframe.css({
      border:"none"
    });
    background.css({
      position:'absolute',
      top:0,
      left:0,
      width:$(window).width(),
      height:$(window).height(),
      background:'black',
      "z-index":1000,
      opacity:0.3
    });
    content.css({
      position:'absolute',
      top:($(window).height()-height)/2,
      left:($(window).width()-width)/2,
      width:width,
      height:height,
      "z-index":1001,
      background:'white'
    });
    background.click(function() {
      $.dialog.close();
    });
    iframe.load(function() {
      //Give dialog access to close_dialog.
      $(this)[0].contentWindow.close_dialog = function() {
        $.dialog.close();
      }
      $(this).contents().find("body").addClass("dialog");
      $(this)[0].contentWindow.initialize();
    });
    $("body").append(background).append(content);
  };
  $.dialog.close = function() {
    $("#dialog-background").remove();
    $("#dialog-content").remove();
  };
})(jQuery);