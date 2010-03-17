function Testor() {
  
  var testNodes = {};
  var container = $('#testorcontainer');
  
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
      
      var node = $('<div>');
      testNodes[test.name] = node;
      
      node.append($('<div>').addClass('testclass').html(test.className));
      node.append($('<div>').addClass('testmethod').html(test.methodName));
      
      node.append($('<button>').html('<div></div>').click(onTestUpdateStatus));
      
      node.append($('<a>').html('<div></div>').click(onTestToggleTrace));
      var trace = $('<div>').addClass('testtrace');
      trace.append($('<table><tr><td class="expected"></td><td class="actual"></td></tr><table><div class="stackTrace"></div>'));
      node.append(trace);
      
      container.append(node);
    }
    node.attr('class', 'test');
    node.addClass(result.resultName);
    node.addClass(result.status);
    if (result.trace) {
      node.addClass('hasDetails');
      $('.testtrace .stackTrace', node).html(result.trace.stackTrace);
      $('.testtrace .expected', node).html(result.trace.expected);
      $('.testtrace .actual', node).html(result.trace.actual);
    } else {
      $('.testtrace .stackTrace', node).html("");
      $('.testtrace .expected', node).html("");
      $('.testtrace .actual', node).html("");
    }
  };
  
  return testor;
};

function onTestToggleTrace(event) {
  var div = event.currentTarget.parentElement;
  $('.testtrace', div).toggle("fast");
}

function onTestUpdateStatus(b) {
}
