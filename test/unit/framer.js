
var Message = require('../../lib/message');
var Framer = require('../../lib/framer');
var assert = require('assert');
var framerData = require('../utils').framerData;

describe('Framer', function(){
  it('should emit frames', function(done){
    var framer = new Framer;
    var n = 0;

    framer.on('frame', function(frame){
      switch (n++) {
        case 0:
          frame.type.should.equal(0);
          frame.body.toString().should.equal('{"max_rdy_count":2500,"version":"0.2.24","max_msg_timeout":900000,"msg_timeout":60000,"tls_v1":false,"deflate":false,"deflate_level":0,"max_deflate_level":6,"snappy":false}');
          break;
        case 1:
          frame.type.should.equal(0);
          assert('OK' == frame.body.toString());
          break;
        case 2:
          frame.type.should.equal(2);
          var msg = new Message(frame.body, { features: {} });
          msg.id.should.equal('062625401f65f008');
          msg.attempts.should.equal(1);
          msg.timestamp.toString().should.equal('1394474113503292997');
          msg.body.toString().should.equal('some message here');
          done();
          break;
      }
    });

    framerData.forEach(function(data){
      framer.write(new Buffer(data, 'hex'));
    });
  })
})
