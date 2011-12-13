function makeSelectionTracker(scheduler) {
  
  function makeSelection(selectStart, selectEnd, focusAtStart) {
    return { selectStart: selectStart, selectEnd: selectEnd, focusAtStart: focusAtStart };
  }
  
  var selection = makeSelection(0, 0, false);
  var localChange = false;
  
  var changeCallback = null;
  
  var changeCallbackTimeout = null;
  function setChangeCallbackTimeout() {
    if (changeCallback && changeCallbackTimeout === null) {
      changeCallbackTimeout = scheduler.setTimeout(function() {
        try {
          if (localChange) { changeCallback(); }
        } finally {
          changeCallbackTimeout = null;
        }
      }, 0);
    }
  }
  
  var self;
  return self = {
    selectionChanged: function(selectStart, selectEnd, focusAtStart) {
      selection = makeSelection(selectStart, selectEnd, focusAtStart);
      localChange = true;
      setChangeCallbackTimeout();
    },
    prepareSelection: function() {
      if ( ! localChange) {
        return null;
      }
      localChange = false;
      return selection;
    },
    setUserChangeNotificationCallback: function (callback) {
      changeCallback = callback;
    }
  };
}
