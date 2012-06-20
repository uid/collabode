$(document).ready(function() {
  var names = [];
  $.each(clientVars.changes, function(name) { names.push(name); });
  $.each(names.sort(), function(idx, name) {
    Readonly.appendHTML('#pads', clientVars.changes[name], name.substring(name.lastIndexOf('/')+1));
  });
  
  var mods = $('.'+linestylefilter.getAuthorClassName(clientVars.author)).filter('.u, .s');
  mods.parent().addClass('unfaded');
  
  Readonly.foldAwayNot('.unfaded');
});
