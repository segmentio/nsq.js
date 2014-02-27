
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
 *  - `host` hostname
 *  - `port` port number
 *  - `maxAttempts` max attempts [Infinity]
 *  - `maxInFlight` max-in-flight [1]
 *  - `msgTimeout` session-specific msg timeout
 *
 * @param {Object} opts
 * @api private
 */

function Connection(opts) {
  assert(opts, 'settings required');
  this.maxInFlight = opts.maxInFlight || 1;
  this.maxAttempts = opts.maxAttempts || Infinity;
  this.ua = pkg.name + '/' + pkg.version;
  this.onerror = this.onerror.bind(this);
  this.on('error', this.broadcastError.bind(this));
  this.opts = opts;
  this.version = 2;
}

/**
 * Inherit from `Emitter.prototype`.
 */

Connection.prototype.__proto__ = Emitter.prototype;

/**
 * Invoke remaining callbacks with connection lost error.
 *
 * @api private
 */

Connection.prototype.broadcastError = function(){
  var err = new Error('nsq connection lost');
  this.callbacks.forEach(function(fn){
    fn(err);
  });
};

/**
 * Initialize connection by sending the version and identifying.
 *
 * @api private
 */

Connection.prototype.connect = function(fn){
  fn = fn || this.onerror;
  var opts = this.opts;
  var self = this;

  // reset state
  this.closing = false;
  this.callbacks = [];
  debug('connect: %s:%s V%s', opts.host, opts.port, this.version);

  // framer
  this.framer = opts.framer || new Framer;
  this.framer.on('frame', this.onframe.bind(this));

  // socket
  this.sock = net.connect(opts);
  this.sock.on('data', function(d){ self.framer.write(d) });
  delegate(this.sock, 'connect', this);
  delegate(this.sock, 'error', this);
  delegate(this.sock, 'end', this);

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
  debug('command: %s %j', name, args);

  // callback
  if ('function' == typeof data) {
    fn = data;
    data = null;
  }

  // push callback
  this.callbacks.push(fn || this.onerror);

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
  debug('identify %j', opts);
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
      debug('response %s', res);
      if ('_heartbeat_' == res) return this.nop();
      var fn = this.callbacks.shift();
      fn(null, res);
      break;

    // error
    case 1:
      var res = frame.body.toString();
      debug('error %s', res);
      var fn = this.callbacks.shift();
      fn(new Error(res));
      break;

    // message
    case 2:
      var msg = new Message(frame.body, this);
      debug('message %s attempts=%s', msg.id, msg.attempts);
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
  debug('unhandled error %s', err);
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
 * @param {Function} [fn]
 * @api private
 */

Connection.prototype.finish = function(id, fn){
  assertValidMessageId(id);
  this.emit('finish', id);
  this.command('FIN', [id], fn);
};

/**
 * Mark message `id` for requeueing with optional
 * `timeout` before it's triggered for processing.
 *
 * @param {String} id
 * @param {Number} [timeout] in milliseconds
 * @param {Function} [fn]
 * @api private
 */

Connection.prototype.requeue = function(id, timeout, fn){
  assertValidMessageId(id);
  this.emit('requeue', id);
  this.command('REQ', [id, timeout || 0], fn);
};

/**
 * Reset the timeout for an in-flight message.
 *
 * @param {String} id
 * @param {Function} [fn]
 * @api private
 */

Connection.prototype.touch = function(id, fn){
  assertValidMessageId(id);
  this.emit('touch', id);
  this.command('TOUCH', [id], fn);
};

/**
 * Send NOP.
 *
 * @param {Function} [fn]
 * @api private
 */

Connection.prototype.nop = function(fn){
  this.command('NOP', [], fn);
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
  this.command('CLS', fn);
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
