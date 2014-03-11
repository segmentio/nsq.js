
/**
 * Module dependencies.
 */

var nsq = require('..');

// counts

var sent = 0;
var recv = 0;

// subscribe

var reader = nsq.reader({
  nsqlookupd: ['0.0.0.0:4161'],
  maxInFlight: 5,
  topic: 'events',
  channel: 'ingestion'
});

setInterval(function(){
  console.log('  sent/recv: %d/%d', sent, recv);
}, 200);


reader.on('message', function(msg){
  ++recv;
  msg.finish();
});

reader.on('error', function(err){
  console.error('reader error: %s', err.stack);
});

// publish

var writer = nsq.writer({
  nsqlookupd: ['0.0.0.0:4161']
});

setInterval(function(){
  ++sent;
  writer.publish('events', 'some message here', function(err){
    if (err) console.error('writer error: %s', err.stack);
  });
}, 150);