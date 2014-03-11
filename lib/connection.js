
/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter;
var debug = require('debug')('nsq:connection');
var delegate = require('./delegate');
var Message = require('./message');
var Framer = require('./framer');
var pkg = require('../package');
var Backoff = require('backo');
var assert = require('assert');
var net = require('net');
var os = require('os');

/**
 * Hostname.
 */

var host = os.hostname();

/**
 * Expose `Connection`.
 */

module.exports = Connection;

/**
 * Initialize an NSQD connection with the given `opts`.
 *
 *  - `host` hostname [0.0.0.0]
 *  - `port` port number [4150]
 *  - `maxAttempts` max attempts [Infinity]
 *  - `maxInFlight` max-in-flight [1]
 *  - `msgTimeout` session-specific msg timeout
 *
 * @param {Object} opts
 * @api private
 */

function Connection(opts) {
  opts = opts || {};
  this.port = opts.port || 4150;
  this.host = opts.host || '0.0.0.0';
  this.addr = this.host + ':' + this.port;
  this.maxInFlight = opts.maxInFlight || 1;
  this.maxAttempts = opts.maxAttempts || Infinity;
  this.ua = pkg.name + '/' + pkg.version;
  this.onerror = this.onerror.bind(this);
  this.callbacks = [];
  this.opts = opts;
  this.version = 2;
}

/**
 * Inherit from `Emitter.prototype`.
 */

Connection.prototype.__proto__ = Emitter.prototype;

/**
 * Initialize connection by sending the version and identifying.
 *
 * @api private
 */

Connection.prototype.connect = function(fn){
  fn = fn || this.onerror;
  var callbacks = this.callbacks;
  var opts = this.opts;
  var self = this;

  // reset state
  this.closing = false;
  this.callbacks = [];
  var addr = this.addr;
  debug('%s - connect V%s', addr, this.version);

  // framer
  this.framer = new Framer;
  this.framer.on('frame', this.onframe.bind(this));

  // socket
  this.sock = net.connect({ host: this.host, port: this.port });
  this.sock.on('data', function(d){ self.framer.write(d) });
  delegate(this.sock, 'connect', this);
  delegate(this.sock, 'close', this);
  delegate(this.sock, 'end', this);

  this.sock.on('error', function(err){
    debug('%s - socket error: %s', addr, err.message);
    err.message = addr + ': ' + err.message;
    err.address = addr;
    error(err, callbacks);
    error(err, self.callbacks);
    self.emit('error', err);
  });

  // identify
  var identity = {
    feature_negotiation: true,
    short_id: host.split('.')[0],
    long_id: host,
    user_agent: this.ua,
    msg_timeout: opts.msgTimeout
  };

  this.sock.write('  V' + this.version);
  this.identify(identity, function(err, features){
    if (err) return fn(err);
    self.features = JSON.parse(features);
    self.emit('ready');
    fn();
  });
};

/**
 * Send command `name` with `args`, optional body `data`
 * and optional callback `fn`.
 *
 * @param {String} name
 * @param {Array} args
 * @param {String|Buffer} data
 * @param {Function} [fn]
 * @api private
 */

Connection.prototype.command = function(name, args, data, fn){
  debug('%s - command: %s %j', this.addr, name, args);

  // callback
  if ('function' == typeof data) {
    fn = data;
    data = null;
  }

  // push callback
  if (hasSuccessResponse(name)) {
    this.callbacks.push(fn || this.onerror);
  }

  // command
  if (args) {
    this.sock.write(name + ' ' + args.join(' ') + '\n');
  } else {
    this.sock.write(name + '\n');
  }

  // data
  if (data) {
    if (!Buffer.isBuffer(data)) data = new Buffer(data);
    this.sock.write(int32(data.length));
    this.sock.write(data);
  }
};

/**
 * Identify.
 *
 * @param {Object} opts
 * @api private
 */

Connection.prototype.identify = function(opts, fn){
  debug('%s - identify %j', this.addr, opts);
  var json = JSON.stringify(opts);
  this.command('IDENTIFY', null, json, fn);
};

/**
 * Handle `frame`.
 *
 * @param {Object} frame
 * @api private
 */

Connection.prototype.onframe = function(frame){
  switch (frame.type) {
    // response
    case 0:
      var res = frame.body.toString();
      debug('%s - response %s', this.addr, res);
      if ('_heartbeat_' == res) return this.nop();
      var fn = this.callbacks.shift();
      fn(null, res);
      break;

    // error
    case 1:
      var res = frame.body.toString();
      var err = new Error(res);
      debug('%s - error %s', this.addr, res);
      var fn = this.callbacks.shift();
      if (fn) fn(err)
      else this.emit('error response', err);
      break;

    // message
    case 2:
      var msg = new Message(frame.body, this);
      debug('%s - message %s attempts=%s', this.addr, msg.id, msg.attempts);
      if (msg.attempts >= this.maxAttempts) this.emit('discard', msg)
      else this.emit('message', msg);
      break;
  }
};

/**
 * Unhandled command error.
 *
 * @api private
 */

Connection.prototype.onerror = function(err){
  if (!err) return;
  debug('%s - unhandled error: %s', this.addr, err);
};

/**
 * Subscribe to `topic` / `channel`.
 *
 * @param {String} topic
 * @param {String} channel
 * @param {Function} [fn]
 * @api private
 */

Connection.prototype.subscribe = function(topic, channel, fn){
  assertValidTopic(topic);
  assertValidChannel(channel);
  this.command('SUB', [topic, channel], fn);
};

/**
 * Publish `data` to `topic`.
 *
 * @param {String} topic
 * @param {Buffer} data
 * @param {Function} [fn]
 * @api private
 */

Connection.prototype.publish = function(topic, data, fn){
  assertValidTopic(topic);
  this.command('PUB', [topic], data, fn);
};

/**
 * Send ready count `n`.
 *
 * @param {Number} n
 * @api private
 */

Connection.prototype.ready = function(n){
  assert('number' == typeof n, 'count must be a number');
  assert(n >= 0, 'count must be positive');
  this.lastReady = n;
  this.command('RDY', [n]);
};

/**
 * Mark message `id` as finished.
 *
 * @param {String} id
 * @api private
 */

Connection.prototype.finish = function(id){
  assertValidMessageId(id);
  this.emit('finish', id);
  this.command('FIN', [id]);
};

/**
 * Mark message `id` for requeueing with optional
 * `timeout` before it's triggered for processing.
 *
 * @param {String} id
 * @param {Number} [timeout] in milliseconds
 * @api private
 */

Connection.prototype.requeue = function(id, timeout){
  assertValidMessageId(id);
  this.emit('requeue', id);
  this.command('REQ', [id, timeout || 0]);
};

/**
 * Reset the timeout for an in-flight message.
 *
 * @param {String} id
 * @api private
 */

Connection.prototype.touch = function(id){
  assertValidMessageId(id);
  this.emit('touch', id);
  this.command('TOUCH', [id]);
};

/**
 * Send NOP.
 *
 * @api private
 */

Connection.prototype.nop = function(){
  this.command('NOP', []);
};

/**
 * Cleanly close the connection.
 *
 * @param {Function} [fn]
 * @api private
 */

Connection.prototype.close = function(fn){
  if (this.closing) return;
  this.closing = true;
  this.command('CLS', [], fn);
};

/**
 * Dirty close of the connection.
 *
 * @api private
 */

Connection.prototype.destroy = function(){
  debug('destroy');
  this.sock.destroy();
};

/**
 * Assert valid message `id`.
 *
 * @param {String} id
 * @api private
 */

function assertValidMessageId(id) {
  if (Buffer.byteLength(id) <= 16) return;
  throw new Error('invalid message id "' + id + '"');
}

/**
 * Assert valid topic `name`.
 *
 * @param {String} name
 * @api private
 */

function assertValidTopic(name) {
  var re = /^[\.a-zA-Z0-9_-]+$/;
  if (name.length && name.length <= 33 && re.test(name)) return;
  throw new Error('invalid topic name "' + name + '"');
}

/**
 * Assert valid channel `name`.
 *
 * @param {String} name
 * @api private
 */

function assertValidChannel(name) {
  var re = /^[\.a-zA-Z0-9_-]+(#ephemeral)?$/;
  if (name.length && name.length <= 33 && re.test(name)) return;
  throw new Error('invalid channel name "' + name + '"');
}
/**
 * Return int32be representation of `n`.
 */

function int32(n) {
  var buf = new Buffer(4);
  buf.writeInt32BE(n, 0);
  return buf;
}

/**
 * Check if command `name` has a response.
 */

function hasSuccessResponse(name) {
  return ~['IDENTIFY', 'SUB', 'PUB', 'MPUB', 'CLS'].indexOf(name);
}

/**
 * Pass `err` to `fns`.
 *
 * @param {Error} err
 * @param {Array} fns
 * @api private
 */

function error(err, fns) {
  debug('broadcast error to %d functions', fns.length);
  fns.forEach(function(fn){
    fn(err);
  });
}