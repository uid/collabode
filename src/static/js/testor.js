function Testor(collab) {
  
  var testNodes = {};
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
      
      node = $('<div>');
      testNodes[test.name] = node;
      
      node.append($('<div>').addClass('testclass').html(test.className));
      node.append($('<div>').addClass('testmethod').html(test.methodName));
      
      node.append($('<button>').html('<div></div>'));
      
      node.append($('<a>').html('<div></div>').click(function() { onTestToggleTrace(node); }));
      var trace = $('<div>').addClass('testtrace');
      trace.append($('<table><tr><td class="expected"></td><td class="actual"></td></tr><tr><td colspan="2" class="stackTrace"></td></tr></table>'));
      node.append(trace);
      
      container.append(node);
    }
    node.attr('class', 'test');
    node.addClass(result.resultName);
    node.addClass(result.status.toLowerCase());
    if (result.trace) {
      node.addClass('hasDetails');
      $('.testtrace .stackTrace', node).text(result.trace.stackTrace);
      $('.testtrace .expected', node).text(result.trace.expected);
      $('.testtrace .actual', node).text(result.trace.actual);
    } else {
      $('.testtrace .stackTrace', node).text("");
      $('.testtrace .expected', node).text("");
      $('.testtrace .actual', node).text("");
      $('.testtrace', node).toggle(false);
    }
    $('button', node).unbind('click.testor').bind('click.testor', function() { onTestUpdateStatus(test, result); });
  };
  
  return testor;
};
