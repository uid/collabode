function Testor(collab) {
  
  var testNodes = {};
  var testOrder = {};
  var container = $('#testorcontainer');
  
  function onTestToggleTrace(div) {
    $('.testtrace', div).toggle("fast");
  }
  
  function onTestUpdateStatus(test, result) {
    collab.sendExtendedMessage({
      type: "TESTS_REQUEST",
      action: "update",
      test: test,
      from: result.status
    });
  }
  
  var testor = {};
  
  testor.updateTest = function(test, result) {
    var node;
    if (test.name in testNodes) {
      node = testNodes[test.name];
      if (( ! result) || ( ! result.resultName)) {
        delete testNodes[test.name];
        node.remove();
        return;
      }
    } else {
      if (( ! result) || ( ! result.resultName)) {
        return;
      }
      
      var place = testOrder[test.name] || test.name; // fall back to alphabetical
      node = $('<div>').data('place', place);
      testNodes[test.name] = node;
      
      node.append($('<div class="extra top"></div><div class="extra left"></div><div class="extra right"></div>'));
      node.append($('<div>').addClass('testclass').text(test.className));
      node.append($('<div>').addClass('testmethod').append($('<a>').attr('href', '#').text(test.methodName).click(function() {
        return Layout.hoverOpen('/coverage/' + clientVars.editorProject + ':' + test.name);
      })));
      
      node.append($('<button>').html('<div></div>'));
      
      node.append($('<a>').addClass('toggle').html('<div></div>').click(function() { onTestToggleTrace(node); }));
      var trace = $('<div>').addClass('testtrace');
      trace.append($('<table><tr><td class="expected"></td><td class="actual"></td></tr><tr><td colspan="2" class="stackTrace"></td></tr></table>'));
      node.append(trace);
      
      container.children().each(function(idx) {
        if ($(this).data('place') > place) {
          node.insertBefore(this);
          return false;
        }
      });
      if ( ! node.parent().length) { container.append(node); }
    }
    node.attr('class', 'test');
    node.addClass(result.resultName);
    node.addClass(result.status.toLowerCase());
    if (result.trace) {
      node.addClass('hasDetails');
      $('.testtrace .stackTrace', node).text(result.trace.stackTrace);
      $('.testtrace .expected', node).text(result.trace.expected || "");
      $('.testtrace .actual', node).text(result.trace.actual || "");
    } else {
      $('.testtrace .stackTrace', node).text("");
      $('.testtrace .expected', node).text("");
      $('.testtrace .actual', node).text("");
      $('.testtrace', node).toggle(false);
    }
    $('button', node).unbind('click.testor').bind('click.testor', function() { onTestUpdateStatus(test, result); });
  };
  
  testor.updateOrder = function(order) {
    for (var idx in order) {
      var name = order[idx];
      testOrder[name] = idx;
      if (name in testNodes) {
        testNodes[name].data('place', idx);
      }
    }
    container.children().sort(function(a, b) {
      return $(a).data('place') - $(b).data('place');
    }).appendTo(container);
  };
  
  return testor;
};
