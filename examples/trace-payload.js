
// $ node examples/simple
// $ jstrace examples/trace-payload

exports.remote = function(traces){
  traces.on('connection:message', function(trace){
    var body = trace.msg.body;
    traces.emit('message size', body.length);
  });
};

// bytes is a local dep, and may not be running
// in the remote process, so we send back some
// data ( the message size ) instead and report
// on it locally.

exports.local = function(traces){
  var bytes = require('bytes');

  traces.on('message size', function(len){
    console.log('length %s', bytes(len));
  });
};