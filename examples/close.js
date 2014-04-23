
/**
 * Module dependencies.
 */

 var nsq = require('..');

// subscribe

var sub = nsq.reader({
  nsqd: ['0.0.0.0:4150'],
  maxInFlight: 25,
  topic: 'events',
  channel: 'ingestion'
});

sub.on('message', function(msg){
  setTimeout(function(){
    console.log('... fin %s', msg.id);
    msg.finish();
  }, 1000);
});

sub.on('close', function(){
  pub.close();
  console.log('... closed');
});

// publish

var pub = nsq.writer({ host: '0.0.0.0', port: 4150 });

setTimeout(function(){
  console.log('... sending events');
  var n = 100;
  while (n--) pub.publish('events', 'some message here');
}, 1000);

setTimeout(function(){
  console.log('... closing');
  sub.close();
}, 1500);