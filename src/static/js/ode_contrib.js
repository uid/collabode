$(document).ready(function() {
  $.each(clientVars.changes, function(name, rep) {
    Readonly.appendHTML('#pads', rep);
  });
  
  var mods = $('.'+linestylefilter.getAuthorClassName(clientVars.author)).filter('.u, .s');
  mods.parent().addClass('unfaded');
  
  Readonly.foldAwayNot('.unfaded');
});
