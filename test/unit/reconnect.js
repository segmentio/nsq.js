
var Emitter = require('events').EventEmitter;
var reconnect = require('../../lib/mixins/reconnect');
var assert = require('assert');

describe('reconnect(conn)', function(){
  it('should emit "reconnect"', function(done){
    var conn = new Emitter;
    var called;

    conn.connect = function(){
      called = true;
    };

    reconnect(conn);

    conn.emit('connect');
    conn.emit('close');

    conn.on('reconnect', function(c){
      assert(called);
      assert(c == conn);
      done();
    });

    conn.emit('connect');
  })

  it('should reconnect on close', function(done){
    var conn = new Emitter;

    conn.connect = done;

    reconnect(conn);
    conn.emit('close');
  })

  it('should not reconnect after .close()', function(done){
    var conn = new Emitter;

    conn.connect = function(){
      assert(false, 'should not call .connect()');
    };

    conn.closing = true;
    reconnect(conn);
    conn.emit('end');

    process.nextTick(done);
  })
})