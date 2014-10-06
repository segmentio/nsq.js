
/**
 * Module dependencies.
 */

var nsq = require('..');

// subscribe

var reader = nsq.reader({
  nsqd: ['0.0.0.0:4150'],
  topic: 'events',
  channel: 'ingestion',
  maxInFlight: 1000
});

var n = 0;
reader.on('message', function(msg){
  process.stdout.write('\r  ' + n++);
  msg.finish();
});

// publish

var writer = nsq.writer({ port: 4150 });

function next() {
  setImmediate(function(){
    writer.publish('events', ['foo', 'bar', 'baz'], next);
  });
}

next();

setTimeout(function(){
  process.exit(0);
}, 10000);