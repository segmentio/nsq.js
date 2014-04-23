
// $ node examples/simple
// $ jstrace examples/trace-deltas

exports.remote = function(traces){
  var d = {};

  traces.on('connection:message', function(trace){
    d[trace.msg.id] = trace.timestamp;
  });

  traces.on('message:finish', function(trace){
    var start = d[trace.msg.id];
    if (!start) return;

    var delta = trace.timestamp - start;
    console.log('%s took %sms', trace.msg.id, delta);
  });
}