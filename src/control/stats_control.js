import("fastJSON");
import("fileutils.fileLineIterator");
import("jsutils.*");
import("utils.*");

jimport("java.io.File");

jimport("java.lang.System");

var ONE_DAY = 1000*60*60*24;
var WINDOW = 1000*30;

function render_stats(day_or_start_time, end_time) {
  var now = new Date();
  
  var start, end;
  if (end_time) {
    start = new Date(decodeURIComponent(day_or_start_time));
    end = new Date(decodeURIComponent(end_time));
  } else if (day_or_start_time) {
    start = new Date(decodeURIComponent(day_or_start_time));
    end = new Date(start.getTime() + ONE_DAY - 1);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(start.getTime() + ONE_DAY - 1);
  }
  
  var collectors = [];
  collectors = collectors.concat(_collect_jslog_stats(start, end));
  collectors = collectors.concat(_collect_access_stats(start, end));
  
  var graphs = _graphs(start, end, collectors);
  
  renderHtml("statistics/graphs.ejs", {
    start: start,
    end: end,
    graphs: graphs
  });
  return true;
}

function _collect_jslog_stats(start, end) {
  var ret = [];
  var collectors = _jslog_collectors();
  keys(collectors).forEach(function(prefix) {
    keys(collectors[prefix]).forEach(function(logName) {
      _collect_jslogfile_stats(start, end, prefix, logName, collectors[prefix][logName])
      ret = ret.concat(collectors[prefix][logName].map(function(spec) { return spec.collector; }));
    });
  });
  return ret;
}

function _collect_jslogfile_stats(start, end, prefix, logName, collectors) {
  var now = new Date();
  var end_eod = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  for (var time = start;
       time.getTime() < now.getTime() && time.getTime() <= end_eod.getTime();
       time = new Date(time.getTime() + ONE_DAY)) {
    var file = _logFileName(prefix, logName, time);
    if ( ! file) { continue; }
    var iterator = fileLineIterator(file);
    while (iterator.hasNext) {
      var entry = fastJSON.parse(iterator.next);
      if (entry.date < start.getTime()) { continue; }
      if (entry.date > end.getTime()) { break; }
      collectors.forEach(function(spec) {
        if (entry[spec.key] && (entry[spec.key] == spec.value || ! spec.value)) {
          spec.collector.add(entry);
        }
      });
    }
  }
}

function _jslog_collectors() {
  return {
    'backend': {
      'server-events': [
        { key: 'type', value: 'streaming-connection-count', collector: _streaming_connection_collector() },
        { key: 'type', value: 'streaming-message-latencies', collector: _streaming_messages_collector() },
        { key: 'type', value: 'streaming-message-latencies', collector: _streaming_latencies_collector() },
        { key: 'type', value: 'event', collector: _server_events_collector() }
      ],
      'streaming-events': [
        { key: 'type', value: 'event', collector: _streaming_events_collector() }
      ]
    }
  };
}

function _collect_access_stats(start, end) {
  var collector = _access_collector();
  var now = new Date();
  var end_eod = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  var fields = [ 'host', 'client', 'day', 'month', 'year', 'time', 'tz',
                 'method', 'path', 'response', 'size', 'referrer', 'useragent', 'unknown' ];
  var regex = /([\w.]+) ([\d.]+) -  -  \[(\d+)\/(\w+)\/(\d+):(\d+:\d+:\d+) (.\d+)\] "(\w+) (.*) HTTP\/..." (\d+) (\d+) "(.*)" "(.*)" +(\d+)/;
  for (var time = start;
       time.getTime() < now.getTime() && time.getTime() <= end_eod.getTime();
       time = new Date(time.getTime() + ONE_DAY)) {
    var file = _accessFileName(time);
    if ( ! file) { continue; }
    var iterator = fileLineIterator(file);
    while (iterator.hasNext) {
      var line = iterator.next;
      var arr = regex.exec(line);
      if ( ! arr) {
        System.err.println(line);
        continue;
      }
      var entry = {};
      fields.forEach(function(field, i) { entry[field] = arr[i+1]; });
      entry.date = Date.parse(entry.month + ' ' + entry.day + ' ' + entry.year + ' ' + entry.time + ' GMT' + entry.tz);
      if (entry.date < start.getTime()) { continue; }
      if (entry.date > end.getTime()) { break; }
      collector.add(entry);
    }
  }
  return [ collector ];
}

function _access_collector() {
  var events = {};
  var data = {};
  return {
    title: function() { return 'Web Server'; },
    series: function() { return keys(events).sort(); },
    units: function() { return 'Requests / ' + WINDOW + ' ms'; },
    data: function() { return data; },
    add: function(entry) {
      var time = entry.date - (entry.date % WINDOW);
      var event = entry.method;
      if ( ! data[time]) { data[time] = {} };
      events[event] = 1;
      data[time][event] = (data[time][event] || 0) + 1;
    }
  };
}

function _streaming_connection_collector() {
  var types = [ "streaming", "longpolling", "shortpolling", "(unconnected)" ];
  var data = {};
  return {
    title: function() { return 'Streaming Connections' },
    series: function() { return types.concat([ 'total' ]); },
    units: function() { return 'Open Connections'; },
    data: function() { return data; },
    add: function(entry) {
      var datum = { total: 0 };
      types.forEach(function(type) {
        datum[type] = +(entry[type] || 0);
        datum.total += datum[type];
      });
      data[entry.date] = datum;
    }
  };
}

function _streaming_messages_collector() {
  var data = {};
  return {
    title: function() { return 'Streaming Messages' },
    series: function() { return [ 'count' ]; },
    units: function() { return 'Message / ?'; },
    data: function() { return data; },
    add: function(entry) {
      data[entry.date] = { count: +entry.count };
    }
  };
}

function _streaming_latencies_collector() {
  var percentiles = [ "p50", "p90", "p95", "p99", "max" ];
  var data = {};
  return {
    title: function() { return 'Streaming Message Latency' },
    series: function() { return percentiles; },
    units: function() { return 'ms'; },
    data: function() { return data; },
    add: function(entry) {
      if (entry.count == 0) { return; }
      var datum = { };
      percentiles.forEach(function(p) {
        datum[p] = +(entry[p] || 0) / +entry['count'];
      });
      data[entry.date] = datum;
    }
  };
}

function _server_events_collector() {
  var events = {};
  var data = {};
  return {
    title: function() { return 'Server Events'; },
    series: function() { return keys(events).sort(); },
    units: function() { return 'Events / ' + WINDOW + ' ms'; },
    data: function() { return data; },
    add: function(entry) {
      var time = entry.date - (entry.date % WINDOW);
      var event = entry.event;
      if ( ! data[time]) { data[time] = {} };
      events[event] = 1;
      data[time][event] = (data[time][event] || 0) + 1;
    }
  };
}

function _streaming_events_collector() {
  var events = {};
  var data = {};
  return {
    title: function() { return 'Streaming Events'; },
    series: function() { return keys(events).sort(); },
    units: function() { return 'Events / ' + WINDOW + ' ms'; },
    data: function() { return data; },
    add: function(entry) {
      var time = entry.date - (entry.date % WINDOW);
      var event = entry.event + (entry.reason ? ': ' + entry.reason : '');
      if ( ! data[time]) { data[time] = {} };
      events[event] = 1;
      data[time][event] = (data[time][event] || 0) + 1;
    }
  };
}

function _graphs(start, end, collectors) {
  var graphs = { graphs: [], t_max: 0 };
  collectors.forEach(function(collector) {
    var graph = _graph(start, end, collector);
    graphs.graphs.push(graph);
    graphs.t_max = Math.max(graphs.t_max, (graph.data.length > 1 ? graph.data[graph.data.length - 1][0] : 0));
  });
  return graphs;
}

function _graph(start, end, collector) {
  var data = [];
  data.push([ 'Time' ].concat(collector.series()));
  keys(collector.data()).sort().forEach(function(time) {
    var row = collector.data()[time];
    row = collector.series().map(function(s) { return row[s] || 0; });
    data.push( [ (+time - start.getTime()) / 1000 / 60 ].concat(row));
  });
  return {
    title: collector.title(),
    data: data,
    x: 'Minute',
    y: collector.units ? collector.units() : undefined
  };
}

function _accessFileName(day) {
  var fmt = [day.getFullYear(), _n(day.getMonth()+1), _n(day.getDate())].join('_');
  var fname = (appjet.config['logDir'] + '/backend/access/access-' +
               fmt + '.request.log');

  if (!(new File(fname)).exists()) {
    return null;
  }

  return fname;
}

//
// log.js
//

function _n(x) {
  if (x < 10) { return "0"+x; }
  else { return x; }
}

function _logFileName(prefix, logName, day) {
  var fmt = [day.getFullYear(), _n(day.getMonth()+1), _n(day.getDate())].join('-');
  var fname = (appjet.config['logDir'] + '/'+prefix+'/' + logName + '/' +
               logName + '-' + fmt + '.jslog');

  if (!(new File(fname)).exists()) {
    return null;
  }

  return fname;
}
