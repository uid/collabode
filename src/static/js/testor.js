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
      
      node.append($('<button>').html('<div></div>'));
      container.append(node);
    }
    node.attr('class', 'test');
    node.addClass(result.resultName);
    node.addClass(result.status);
  };
  
  return testor;
}
