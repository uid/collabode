var Readonly = {};

Readonly.appendHTML = function(target, rep) {
  var div = $('<div>').addClass('pad').appendTo(target);
  var divs = [ $('<div>').addClass('pre') ];
  
  var textlines = Changeset.splitTextLines(rep.atext.text);
  var alines = Changeset.splitAttributionLines(rep.atext.attribs, rep.atext.text);
  var apool = (new AttribPool()).fromJsonable(rep.apool);
  
  for (var ii = 0; ii < textlines.length; ii++) {
    var line = textlines[ii];
    var aline = alines[ii];
    var emptyLine = (line == '\n');
    var domInfo = domline.createDomLine( ! emptyLine, true);
    linestylefilter.populateDomLine(line, aline, apool, domInfo, clientVars.author);
    domInfo.prepareForAdd();
    var node = domInfo.node;
    divs.push($('<div>').addClass(node.className).html(node.innerHTML));
  }
  
  divs.push($('<div>').addClass('post'));
  div.append.apply(div, divs);
  
  return div;
};

Readonly.foldLines = function(lines, title) {
  var toggle, lines;
  $('<div></div>').addClass('folded')
    .insertBefore(lines[0])
    .append(toggle = $('<div>').addClass('toggle').append($('<span>').text(title || '...')))
    .append(lines = $('<div>').addClass('lines').append(lines))
    .toggle(function() {
      toggle.toggle();
      lines.slideToggle('fast');
    }, function() {
      lines.slideToggle('fast', function() {
        toggle.toggle();
      });
    });
};

Readonly.foldAwayNot = function(selector) {
  $('.pre, '+selector+' + :not('+selector+')').each(function(idx, line) {
    var fold = $(line).add($(line).nextUntil(selector));
    if (fold.length > 4) { Readonly.foldLines(fold.slice(1, -1)); }
  });
};
