
/**
 * Module dependencies.
 */

var nsq = require('..');

// subscribe

var sub = nsq.reader({
  nsqd: ['0.0.0.0:4150'],
  maxInFlight: 5,
  topic: 'events',
  channel: 'ingestion'
});

sub.on('message', function(msg){
  console.log('recv %s', msg.id);
  msg.finish();
});

// publish

var pub = nsq.writer({ host: '0.0.0.0', port: 4150 });

setInterval(function(){
  pub.publish('events', 'some message here');
}, 30);

setTimeout(function(){
  console.log('pausing');
  sub.pause();
}, 1500);

setTimeout(function(){
  console.log('resuming');
  sub.resume();
}, 10000);