
var Emitter = require('events').EventEmitter;
var ready = require('../../lib/mixins/ready');
var assert = require('assert');

describe('ready(conn, max)', function(){
  it('should retain RDY count on FINs', function(done){
    var conn = new Emitter;

    conn.ready = function(n){
      assert(5 == n);
      done();
    };

    ready(conn, 5);

    conn.emit('message');
    conn.emit('message');
    conn.emit('message');
    conn.emit('message');
    conn.emit('finish');
    conn.emit('finish');
    conn.emit('finish');
    conn.emit('finish');
  })

  it('should retain RDY count on REQs', function(done){
    var conn = new Emitter;

    conn.ready = function(n){
      assert(5 == n);
      done();
    };

    ready(conn, 5);

    conn.emit('message');
    conn.emit('message');
    conn.emit('message');
    conn.emit('message');
    conn.emit('requeue');
    conn.emit('requeue');
    conn.emit('requeue');
    conn.emit('requeue');
  })
})