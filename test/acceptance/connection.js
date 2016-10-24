
var Connection = require('../../lib/connection');
var assert = require('assert');
var utils = require('../utils');

describe('Connection', function(){
  beforeEach(function(done){
    utils.deleteTopic('test', function(){
      done();
    });
  })

  it('should identify on connect', function(done){
    var conn = new Connection;

    conn.connect();

    conn.on('ready', function(){
      assert('version' in conn.features);
      assert('max_rdy_count' in conn.features);
      assert('msg_timeout' in conn.features);
      done();
    });
  })

  it('should emit messages', function(done){
    var pub = new Connection;
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

    pub.connect();
    sub.connect();
  })

  it('should close cleanly', function(done){
    var conn = new Connection;

    conn.on('ready', function(){
      conn.subscribe('test', 'tailer', function(err){
        assert(!err);
        conn.close(done);
      });
    });

    conn.connect();
  })

  it('should only call callbacks a single time', function(done){
    var conn = new Connection;
    var called = 0;

    conn.on('error', function(){});
    conn.on('ready', function(){
      conn.sock.destroy();
      conn.publish('test', 'something', function(err){
        called++;
      });
      assert.equal(called, 1);
      done();
    });

    conn.connect();
  })

  it('should not emit socket errors after destroy', function(done){
    var conn = new Connection;
    conn.on('error', done);
    conn.on('ready', function(){
      conn.destroy();
      conn.sock.emit('error', new Error);
      done();
    });
    conn.connect();
  })

  it('should not write after socket.end()', function(done){
    var conn = new Connection;
    conn.connect();
    conn.on('ready', function(){
      conn.end();
      conn.publish('test', 'stuff');
      conn.on('error', done);
      conn.on('end', done);
    });
  });
})
