
var Connection = require('../../lib/connection');
var utils = require('../utils');
var assert = require('assert');
var nsq = require('../..');

describe('Writer#publish()', function(){
  beforeEach(function(done){
    utils.deleteTopic('test', function(){
      done();
    });
  })

  it('should publish messages', function(done){
    var pub = nsq.writer();
    var sub = new Connection;

    pub.on('ready', function(){
      pub.publish('test', 'something');
    });

    sub.on('ready', function(){
      sub.subscribe('test', 'tailer');
      sub.ready(5);
    });

    sub.on('message', function(msg){
      msg.finish();
      done();
    });

    sub.connect();
  })

  it('should invoke callbacks with errors', function(done){
    var pub = nsq.writer({ port: 5000 });

    pub.on('error', function(){});

    pub.publish('test', 'something', function(err){
      err.message.should.equal('no nsqd nodes connected');
      done();
    });
  })

  it('should emit "error"', function(done){
    var pub = nsq.writer({ port: 5000 });

    pub.once('error', function(err){
      err.code.should.equal('ECONNREFUSED');
      err.address.should.equal('0.0.0.0:5000');
      done();
    });

    // hack to prevent multiple done()s since
    // we perform reconnection attempts
    pub.on('error', function(){});
  })

  it('should close with an optional callback', function(done){
    var pub = nsq.writer();
    var sub = new Connection;
    var n = 0;

    function next(err){
      if (err) return done(err);
      n = n + 1;
    }

    pub.on('ready', function(){
      pub.publish('test', new Buffer(1024), next);
      pub.publish('test', new Buffer(1024), next);
      pub.publish('test', new Buffer(1024), next);
      pub.close(function(){
        assert(n === 3);
        done();
      });
    });

    sub.on('ready', function(){
      sub.subscribe('test', 'tailer');
    });

    sub.on('message', function(msg){
      msg.finish();
    });

    sub.connect();
  })

  describe('with an array', function(){
    it('should MPUT', function(done){
      var pub = nsq.writer();
      var sub = new Connection;
      var msgs = [];
      var n = 0;

      pub.on('ready', function(){
        pub.publish('test', ['foo', 'bar', 'baz']);
      });

      sub.on('ready', function(){
        sub.subscribe('test', 'something');
        sub.ready(5);
      });

      sub.on('message', function(msg){
        msgs.push(msg.body.toString());
        msg.finish();

        if (++n == 3) {
          msgs.should.eql(['foo', 'bar', 'baz']);
          done();
        }
      });

      sub.connect();
    })
  })

  describe('with a buffer', function(){
    it('should not stringify', function(done){
      var pub = nsq.writer();
      var sub = new Connection;

      pub.on('ready', function(){
        pub.publish('test', Buffer('foobar'));
      });

      sub.on('ready', function(){
        sub.subscribe('test', 'something');
        sub.ready(5);
      });

      sub.on('message', function(msg){
        msg.finish();
        msg.body.toString().should.eql('foobar');
        done();
      });

      sub.connect();
    })
  })
})
