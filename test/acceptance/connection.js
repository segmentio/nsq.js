
var Connection = require('../../lib/connection');
var assert = require('assert');

describe('Connection', function(){
  it('should identify on connect', function(done){
    var conn = new Connection;

    conn.connect();

    conn.on('ready', function(){
      assert(conn.features.version);
      assert(conn.features.max_rdy_count);
      assert(conn.features.msg_timeout);
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
})
