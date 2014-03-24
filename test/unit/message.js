
var Message = require('../../lib/message');
var assert = require('assert');
var body = new Buffer('135a2ad167d76e45000130363236323534303166363566303038736f6d65206d6573736167652068657265', 'hex');

describe('Message(buffer)', function(){
  it('should parse the message', function(){
    var msg = new Message(body, { features: {} });
    msg.attempts.should.equal(1);
    msg.timestamp.toString().should.equal('1394474113503292997');
    msg.body.toString().should.equal('some message here');
  })
})

describe('Message#inspect()', function(){
  it('should return something useful', function(){
    var msg = new Message(body, { features: {} });
    msg.inspect().should.equal('<Message 062625401f65f008 attempts=1 size=17>');
  })
})

describe('Message#json()', function(){
  it('should return parsed json', function(){
    var msg = new Message(body, { features: {} });
    msg.body = new Buffer('{"foo":"bar"}');
    msg.json().should.eql({ foo: 'bar' });
  })
})

describe('Message#finish()', function(){
  it('should FIN <id>', function(done){
    var conn = {
      features: {},
      finish: function(id){
        id.should.equal('062625401f65f008');
        done();
      }
    };

    var msg = new Message(body, conn);
    assert(!msg.responded);
    msg.finish();
    assert(msg.responded);
  })
})

describe('Message#touch()', function(){
  it('should TOUCH <id>', function(done){
    var conn = {
      features: {},
      touch: function(id){
        id.should.equal('062625401f65f008');
        done();
      }
    };

    var msg = new Message(body, conn);
    assert(!msg.responded);
    msg.touch();
    assert(!msg.responded);
  })

  it('should update .lastTouch', function(done){
    var conn = {
      features: {},
      touch: function(id){
        id.should.equal('062625401f65f008');
      }
    };

    var msg = new Message(body, conn);
    var prev = msg.lastTouch;

    setTimeout(function(){
      msg.touch();
      msg.lastTouch.should.not.equal(prev);
      done();
    }, 10);
  })
})

describe('Message#reqeue()', function(){
  it('should REQ <id>', function(done){
    var conn = {
      features: {},
      requeue: function(id, timeout){
        id.should.equal('062625401f65f008');
        assert(null == timeout);
        done();
      }
    };

    var msg = new Message(body, conn);
    assert(!msg.responded);
    msg.requeue();
    assert(msg.responded);
  })
})

describe('Message#reqeue(delay)', function(){
  it('should REQ <id> with delay', function(done){
    var conn = {
      features: {},
      requeue: function(id, delay){
        id.should.equal('062625401f65f008');
        assert(5000 == delay);
        done();
      }
    };

    var msg = new Message(body, conn);
    assert(!msg.responded);
    msg.requeue(5000);
    assert(msg.responded);
  })
})

describe('Message#timeUntilTimeout()', function(){
  it('should return the time until timeout', function(){
    var conn = {
      features: {
        msg_timeout: 5000
      }
    };

    var msg = new Message(body, conn);
    assert('number' == typeof msg.timeUntilTimeout());
  })
})

describe('Message#timedout()', function(){
  it('should return false if the message has not timed out', function(){
    var conn = {
      features: {
        msg_timeout: 5000
      }
    };

    var msg = new Message(body, conn);
    msg.timedout().should.be.false;
  })
})

describe('Message#timedout()', function(){
  it('should return false if the message has not timed out', function(done){
    var conn = {
      features: {
        msg_timeout: 100
      }
    };

    var msg = new Message(body, conn);

    setTimeout(function(){
      msg.timedout().should.be.true;
      done();
    }, 150);
  })
})

