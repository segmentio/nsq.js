
var utils = require('../utils');
var assert = require('assert');
var nsq = require('../..');
var uid = require('uid');
var Reader = require('../../lib/reader');


describe('Reader', function(){
  var topic = uid();
  afterEach(function(done){
    utils.deleteTopic(topic, function(){
      topic = uid();
      done();
    })
  })

  describe('Reader()', function(){
    describe('with .nsqd addresses', function(){
      it('should subscribe to messages', function(done){
        var pub = nsq.writer();
        var sub = nsq.reader({
          topic: topic,
          channel: 'reader',
          nsqd: ['0.0.0.0:4150']
        });

        sub.on('message', function(msg){
          msg.finish(done);
        });

        pub.on('ready', function(){
          pub.publish(topic, 'something', function(err){
            if (err) return done(err);
          });
        });
      })

      it('should connect after event handlers are added', function(done){
        var sub = nsq.reader({
          topic: topic,
          channel: 'reader',
          nsqd: ['0.0.0.0:4150']
        });

        sub.connect = function(){
          sub.emit('done');
        };

        sub.on('done', done);
      });
    });

    describe('with .nsqlookupd addresses', function(){
      it('should subscribe to messages', function(done){
        var pub = nsq.writer();
        var sub = nsq.reader({
          topic: topic,
          channel: 'reader',
          nsqlookupd: ['0.0.0.0:4161'],
          pollInterval: 100
        });
        sub.on('message', function(msg){
          msg.finish(done);
        });

        pub.on('ready', function(){
          pub.publish(topic, 'something', function(err){
            if (err) return done(err);
          });
        });
      })

      it('should set .timer attribute', function(done){
        var sub = nsq.reader({
          topic: topic,
          channel: 'reader',
          nsqlookupd: ['0.0.0.0:4161']
        });

        setImmediate(function(){
          assert(sub.timer !== null);
          done();
        });
      })
    });

    it('should discard messages after the max attempts', function(done){
      var pub = nsq.writer();
      var sub = nsq.reader({
        topic: topic,
        channel: 'reader',
        nsqd: ['0.0.0.0:4150'],
        maxAttempts: 5,
      });

      sub.once('discard', function(msg){
        sub.removeAllListeners('message');
        done();
      });

      sub.on('message', function(msg){
        msg.requeue(0);
      });

      pub.on('ready', function(){
        pub.publish(topic, 'something');
      });
    });

    it('should re-receive the message after calling requeue', function(done){
      var pub = nsq.writer();
      var sub = nsq.reader({
        topic: topic,
        channel: 'reader',
        nsqd: ['0.0.0.0:4150'],
        maxAttempts: 5,
      });

      var attempts = 1;
      sub.on('message', function(msg){
        assert.equal(attempts, msg.attempts);

        if (attempts === 1) {
          msg.requeue(null, function(err) { assert(!err); });
        } else {
          msg.finish(done);
        }

        ++attempts;
      });

      pub.on('ready', function(){
        pub.publish(topic, 'something');
      });
    });
  });

  describe('Reader#close()', function(){
    var topic = uid();
    beforeEach(function(done){
      var oldTopic = topic;
      var newTopic = uid();
      topic = newTopic;
      utils.deleteTopic(oldTopic, function(){
        utils.createTopic(newTopic, done);
      })
    })

    it('should wait for pending messages and emit "close"', function(done){
      var pub = nsq.writer();
      var recv = 0;

      var sub = nsq.reader({
        topic: topic,
        channel: 'reader',
        nsqd: ['0.0.0.0:4150'],
        maxInFlight: 10
      });

      var n = 0;
      pub.on('ready', function(){
        var count = 30;
        while (count--) pub.publish(topic, { n: n++ });
      });

      sub.on('close', function(){
        assert(recv < 30, 'received too many messages');
        done();
      });

      sub.on('message', function(msg){
        setTimeout(function(){
          if (recv++ == 10) sub.close();
          msg.finish();
        }, 50);
      });
    })
  })

  describe('Reader#close(fn)', function(){
    it('should wait for pending messages and invoke the callback', function(done){
      var pub = nsq.writer();
      var recv = 0;

      var sub = nsq.reader({
        topic: topic,
        channel: 'reader',
        nsqd: ['0.0.0.0:4150'],
        maxInFlight: 10
      });

      var n = 0;
      pub.on('ready', function(){
        var count = 30;
        while (count--) pub.publish(topic, { n: n++ });
      });

      sub.on('message', function(msg){
        setTimeout(function(){
          if (recv++ == 10) {
            sub.close(function(){
              assert(recv < 30, 'received too many messages');
              done();
            });
          }
          msg.finish();
        }, 50);
      });
    })

    it('should close if there are no in-flight messages', function(done){
      var pub = nsq.writer();
      var sub = nsq.reader({
        topic: topic,
        channel: 'reader',
        nsqd: ['0.0.0.0:4150'],
        maxInFlight: 10
      });

      sub.on('ready', function(){
        // give it some time to SUB... lame
        // add subscribe event?
        setTimeout(function(){
          sub.close(done);
        }, 100);
      });
    })
  })

  describe('Reader#close(fn)', function(){
    it('should stop polling nsqlookupd if reader had been closed', function(done){
      var sub = nsq.reader({
        topic: topic,
        channel: 'reader',
        nsqlookupd: ['0.0.0.0:4161'],
        pollInterval: 100
      });

      setImmediate(function(){
        sub.close();
        sub.lookup = function(fn){
          done(new Error('setInterval() is still running'));
        };
      });

      setTimeout(done, 500);
    })
  })
});
