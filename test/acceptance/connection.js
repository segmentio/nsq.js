
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
})