function PlotRenderer(parent) {
  this.id = "#graph-runCount";
  this.obj = $(this.id);
  this.parent = parent;
  var plot = null // Not null once the graph is drawn for the first time 
  
  var runLog = null;
  
  // Global graph options
  var options = {
      series: {
          points: { show: true }
      },
      xaxis: {
        mode: "time",
        timeformat: "%h:%M %P",
        twelveHourClock: "true"
      },
      yaxis: { show: false },
      grid: { clickable: true }
  }
  
  /**
   * Separate data from the run log into as many series as necessary
   * and return the data series with the correct attributes
   */
  function prepareData(runLog) {
    runLog = runLog;
    
    var normalRuns = [];
    var exceptionRuns = [];
    for (var i in runLog) {
      if (runLog[i].runException != null) {
        exceptionRuns.push([Number(runLog[i].runTime), 1, runLog[i].runException]);
      } else {
        normalRuns.push([Number(runLog[i].runTime), 1]);
      }
      if (i >= parent.getEventStream().getContentObj().children().length) {
        parent.getEventStream().logEvent(runLog[i]);
      }
    }
    return [{ data: normalRuns, color: "rgb(255, 234, 77)" }, 
            { data: exceptionRuns, color: "rgb(181, 0, 45)" }];
  }
  
  /** 
   * Initialize the plot for the first time
   */
  function initializePlot(runLog) {
    var data = prepareData(runLog);
    
    // Plot the graph
    plot = $.plot(this.obj, data, options);
    plot.setupGrid();
    plot.draw();
    
    // Bind event handlers    
    var previousPoint = null;
    this.obj.bind("plotclick", function (event, pos, item) {
      
      // Unhighlight any points that might have been previously clicked
      plot.unhighlight();
      $("#console-errors").empty();
      
      // Check to see if another point should be highlighted
      // and show additional information if necessary
      if (item) {
          plot.highlight(item.series, item.datapoint);

            if (previousPoint != item.dataIndex) {
                previousPoint = item.dataIndex;
                
                var x = item.datapoint[0]; //.toFixed(2),
                    y = item.datapoint[1]; //.toFixed(2);
                
                //var html = item.datapoint[0] + " " + item.datapoint[2];
                //var html = runLog[item.dataIndex].runException;
                //console.log(runLog, runLog[item.dataIndex]);
                //$("#console-errors").html("<p>" + html + "</p>");
                    
                $('.event').css("border", "1px solid #444")
                  .css("border-left", "none");
                $('#event-' + item.dataIndex).css("border", "2px solid #FFCC66");
                //$('.event')[item.dataIndex].css('border', '2px solid #FFCC66');
            }
        } else {
            previousPoint = null;            
        }
    });
  }
  
  // Size the graph to fit the data panel
  _sizeToPanelWidth(this.obj);
  
  // Call this function externally to update the plot
  this.update = function(runLog) {
    // If the plot has not yet been created, set everything up
    if (this.plot == null) {
      initializePlot(runLog);
      return;
    }
    
    // Otherwise just reset the data and redraw the graph
    plot.setData(prepareData(runLog));
    plot.setupGrid();
    plot.draw();
  }
  
  return this;
}