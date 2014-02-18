
/**
 * Module dependencies.
 */

var nsq = require('..');

// subscribe

var reader = nsq.reader({
  // nsqd: ['0.0.0.0:4150'],
  // nsqd: ['0.0.0.0:4150', '0.0.0.0:4051', '0.0.0.0:4041'],
  nsqlookupd: ['0.0.0.0:6000', '0.0.0.0:4161'],
  maxInFlight: 5,
  topic: 'events',
  channel: 'ingestion'
});

reader.on('message', function(msg){
  console.log(msg.id);
  setTimeout(function(){
    msg.finish();
  }, 500);
});

// publish

// var writer = nsq.writer({ port: 4150 });

// setInterval(function(){
//   writer.publish('events', 'some message here');
// }, 500);