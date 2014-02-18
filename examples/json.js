
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
  console.log('%s %j', msg.id, msg.json());
  setTimeout(function(){
    msg.finish();
  }, 200);
});

// publish

var writer = nsq.writer(':4150');

setInterval(function(){
  writer.publish('events', { type: 'login', user: 'tobi' });
}, 150);