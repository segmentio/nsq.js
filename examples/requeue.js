
/**
 * Module dependencies.
 */

var nsq = require('..');

// subscribe

var reader = nsq.reader({
  nsqd: ['0.0.0.0:4150'],
  maxInFlight: 1,
  maxAttempts: 5,
  topic: 'events',
  channel: 'ingestion'
});

reader.on('error', function(err){
  console.log(err.stack);
});

reader.on('message', function(msg){
  var body = msg.body.toString();
  console.log('%s attempts=%s', body, msg.attempts);
  msg.requeue(2000);
});

reader.on('discard', function(msg){
  var body = msg.body.toString();
  console.log('giving up on %s', body);
  msg.finish();
});

// publish

var writer = nsq.writer({ port: 4150 });

writer.publish('events', 'foo');
writer.publish('events', 'bar');
writer.publish('events', 'baz');
