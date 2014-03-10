
var Message = require('../lib/message');
var Framer = require('../lib/framer');
var assert = require('assert');

var data = [
  '000000b0000000007b226d61785f7264795f636f756e74223a323530302c2276657273696f6e223a22302e322e3234222c226d61785f6d73675f74696d656f7574223a3930303030302c226d73675f74696d656f7574223a36303030302c22746c735f7631223a66616c73652c226465666c617465223a66616c73652c226465666c6174655f6c6576656c223a302c226d61785f6465666c6174655f6c6576656c223a362c22736e61707079223a66616c73657d',
  '00000006000000004f4b',
  '0000002f00000002135a2ad167d76e45000130363236323534303166363566303038736f6d65206d6573736167652068657265',
  '062625401f65f008'
];

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

    data.forEach(function(data){
      framer.write(new Buffer(data, 'hex'));
    });
  })
})