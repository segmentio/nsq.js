
var assert = require('assert');
var nsq = require('../..');

describe('Reader', function(){
  it('should subscribe to messages', function(done){
    var pub = nsq.writer();

    var sub = nsq.reader({
      topic: 'testing-reader',
      channel: 'reader',
      nsqd: ['0.0.0.0:4150']
    });

    pub.on('ready', function(){
      pub.publish('testing-reader', 'something');
    });

    sub.on('message', function(msg){
      msg.finish();
      done();
    });
  })
})