
var utils = require('../utils');
var assert = require('assert');
var nsq = require('../..');

describe('Reader', function(){
  beforeEach(function(done){
    utils.deleteTopic('test', function(){
      done();
    });
  })

  describe('with .nsqd addresses', function(){
    it('should subscribe to messages', function(done){
      var pub = nsq.writer();

      var sub = nsq.reader({
        topic: 'test',
        channel: 'reader',
        nsqd: ['0.0.0.0:4150']
      });

      pub.on('ready', function(){
        pub.publish('test', 'something');
      });

      sub.once('message', function(msg){
        msg.finish();
        done();
      });
    })
  })

  describe('with .nsqlookupd addresses', function(){
    it('should subscribe to messages', function(done){
      var pub = nsq.writer();

      pub.on('ready', function(){
        pub.publish('test', 'something');

        var sub = nsq.reader({
          topic: 'test',
          channel: 'reader',
          nsqlookupd: ['0.0.0.0:4161']
        });

        sub.once('message', function(msg){
          msg.finish();
          done();
        });
      });
    })
  })

  it('should discard messages after the max attempts', function(done){
    var pub = nsq.writer();

    var sub = nsq.reader({
      topic: 'test',
      channel: 'reader',
      nsqd: ['0.0.0.0:4150'],
      maxAttempts: 5
    });

    pub.on('ready', function(){
      pub.publish('test', 'something');
    });

    sub.on('message', function(msg){
      msg.requeue();
    });

    sub.once('discard', function(msg){
      sub.removeAllListeners('message');
      done();
    });
  })
})
