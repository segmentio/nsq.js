
var Connection = require('../../lib/connection');
var assert = require('assert');
var nsq = require('../..');

describe('Writer#publish()', function(){
  it('should publish messages', function(done){
    var pub = nsq.writer();
    var sub = new Connection;

    pub.on('ready', function(){
      pub.publish('testing-writer', 'something');
    });

    pub.on('ready', function(){
      sub.subscribe('testing-writer', 'tailer');
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

    pub.publish('testing-writer', 'something', function(err){
      err.message.should.equal('no nsqd nodes connected');
      done();
    });
  })

  it('should emit "error"', function(done){
    var pub = nsq.writer({ port: 5000 });

    pub.on('error', function(err){
      err.code.should.equal('ECONNREFUSED');
      err.address.should.equal('0.0.0.0:5000');
      done();
    });
  })
})