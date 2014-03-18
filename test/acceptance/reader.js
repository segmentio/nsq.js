
var assert = require('assert');
var nsq = require('../..');

describe('Reader', function(){
  describe('with .nsqd addresses', function(){
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

  describe('with .nsqlookupd addresses', function(){
    it('should subscribe to messages', function(done){
      var pub = nsq.writer();

      var sub = nsq.reader({
        topic: 'testing-reader2',
        channel: 'reader',
        nsqlookupd: ['0.0.0.0:4161']
      });

      pub.on('ready', function(){
        pub.publish('testing-reader2', 'something');
      });

      sub.on('message', function(msg){
        msg.finish();
        done();
      });
    })
  })

  it('should discard messages after the max attempts', function(done){
    var pub = nsq.writer();

    var sub = nsq.reader({
      topic: 'testing-reader3',
      channel: 'reader',
      nsqd: ['0.0.0.0:4150'],
      maxAttempts: 5
    });

    pub.on('ready', function(){
      pub.publish('testing-reader3', 'something');
    });

    sub.on('message', function(msg){
      msg.requeue();
    });

    sub.on('discard', function(msg){
      msg.finish();
      done();
    });
  })
})
