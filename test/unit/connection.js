
var Connection = require('../../lib/connection');
var assert = require('assert');

describe('Connection(opts)', function(){
  it('should default maxAttempts to Infinity', function(){
    var conn = new Connection;
    assert(conn.maxAttempts == Infinity);
  })

  it('should default maxInFlight to 1', function(){
    var conn = new Connection;
    assert(conn.maxInFlight == 1);
  })

  it('should populate .addr', function(){
    var conn = new Connection({ host: '0.0.0.0', port: 1234 });
    assert(conn.addr == '0.0.0.0:1234');
  })
})

describe('Connection#command(name)', function(){
  it('should write command', function(){
    var conn = new Connection;
    var writes = [];

    conn.sock = {
      write: function(chunks){
        writes = writes.concat(chunks);
      }
    };

    conn.command('NOP');
    writes.toString().should.eql('NOP\n');
  })
})

describe('Connection#command(name, args)', function(){
  it('should write command and args', function(){
    var conn = new Connection;
    var writes = [];

    conn.sock = {
      write: function(chunks){
         writes = writes.concat(chunks);
      }
    };

    conn.command('RDY', [5]);
    writes.toString().should.eql('RDY 5\n');
  })

  it('should join multiple args', function(){
    var conn = new Connection;
    var writes = [];

    conn.sock = {
      write: function(chunks){
         writes = writes.concat(chunks);
      }
    };

    conn.command('REQ', ['12345', 5000]);
    writes.toString().should.eql('REQ 12345 5000\n');
  })
})

describe('Connection#command(name, args, data)', function(){
  it('should write command, args and data', function(){
    var conn = new Connection;
    var writes = [];

    conn.sock = {
      write: function(chunks){
         writes = writes.concat(chunks);
      }
    };

    conn.command('PUB', ['events'], new Buffer('foo bar'));
    writes.toString().should.eql('PUB events\n\u0000\u0000\u0000\u0007foo bar');
  })
})

describe('Connection#subscribe(topic, channel, fn)', function(){
  it('should SUB', function(done){
    var conn = new Connection;
    conn._ready = true;

    conn.command = function(cmd, args, fn){
      assert('SUB' == cmd);
      args.should.eql(['events', 'ingestion']);
      fn();
    };

    conn.subscribe('events', 'ingestion', done);
  })
})

describe('Connection#publish(topic, data, fn)', function(){
  it('should PUB', function(done){
    var conn = new Connection;
    conn._ready = true;

    conn.command = function(cmd, args, data, fn){
      assert('PUB' == cmd);
      args.should.eql(['events']);
      data.should.equal('foo bar baz');
      fn();
    };

    conn.publish('events', 'foo bar baz', done);
  })
})

describe('Connection#ready(n)', function(){
  it('should RDY', function(done){
    var conn = new Connection;

    conn.command = function(cmd, args){
      assert('RDY' == cmd);
      args.should.eql([15]);
      done();
    };

    conn.ready(15);
    assert(conn.lastReady = 15);
  })
})