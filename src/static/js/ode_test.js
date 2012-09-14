$(document).ready(function() {
  function title(name) {
    return name.substring(name.lastIndexOf('/')+1);
  }
  
  var testRep = clientVars.files[clientVars.testfilename];
  var testDiv = Readonly.appendHTML('#test', testRep, title(clientVars.testfilename));
  $.each(testRep.unfolded, function(idx, lines) {
    testDiv.children('.ace-line').slice(lines.from, lines.to+1).addClass('unfaded');
  });
  delete clientVars.files[clientVars.testfilename];
  
  $.each(clientVars.files, function(name, rep) {
    var div = Readonly.appendHTML('#files', rep, title(name));
    $.each(rep.unfolded, function(idx, lines) {
      div.children('.ace-line').slice(lines.from, lines.to+1).addClass('unfaded');
    });
  });
  
  Readonly.foldAwayNot('.unfaded');
});
