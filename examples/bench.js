
/**
 * Module dependencies.
 */

var nsq = require('..');

// subscribe

var reader = nsq.reader({
  nsqd: ['0.0.0.0:4150'],
  maxInFlight: 1000
});

reader.subscribe('events', 'ingestion');

var n = 0;
reader.on('message', function(msg){
  process.stdout.write('\r  ' + n++);
  msg.finish();
});

// publish

var writer = nsq.writer({ port: 4150 });

setInterval(function(){
  var n = 20;
  while (n--) {
    writer.publish('events', 'some message here');
  }
}, 2);