
/**
 * Module dependencies.
 */

var nsq = require('..');

// subscribe

var reader = nsq.reader({
  nsqd: ['0.0.0.0:4150'],
  maxInFlight: 5,
  topic: 'events',
  channel: 'ingestion'
});

reader.on('message', function(msg){
  console.log(msg.id);
  setTimeout(function(){
    msg.finish();
  }, 200);
});

// publish

var writer = nsq.writer({ port: 4150 });

setInterval(function(){
  writer.publish('events', 'some message here');
}, 150);