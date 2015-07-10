
/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter;
var debug = require('debug')('nsq:connection');
var delegate = require('./utils').delegate;
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
 *  - `trace` optional trace function
 *
 * @param {Object} opts
 * @api private
 */

function Connection(opts) {
  opts = opts || {};
  this.trace = opts.trace || function(){};
  this.id = opts.id;
  this.port = opts.port || 4150;
  this.host = opts.host || '0.0.0.0';
  this.addr = this.host + ':' + this.port;
  this.maxInFlight = opts.maxInFlight || 1;
  this.maxAttempts = opts.maxAttempts || Infinity;
  this.ua = pkg.name + '/' + pkg.version;
  this.onerror = this.onerror.bind(this);
  this.callbacks = [];
  this.inFlight = 0;
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

  this.sock.on('close', function(){
    self._ready = false;
  });

  this.sock.on('error', function(err){
    debug('%s - socket error: %s', addr, err.message);
    self._ready = false;
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
    msg_timeout: opts.msgTimeout,
    client_id: this.id
  };

  this.sock.write('  V' + this.version);
  this.identify(identity, onIdentify(this, fn));
};

/**
 * Send command `name` with `args`, optional body `data`
 * and optional callback `fn`.
 *
 * @param {String} name
 * @param {Array} args
 * @param {String|Buffer|Array} data
 * @param {Function} [fn]
 * @api private
 */

Connection.prototype.command = function(name, args, data, fn){
  debug('%s - command: %s %j', this.addr, name, args);
  var waiting = hasResponse(name);
  var sock = this.sock;
  var chunks = [];

  // socket closed
  if (this.closed) {
    debug('%s - ignoring %s socket was closed', this.addr, name);
    return;
  }

  // callback
  if ('function' == typeof data) {
    fn = data;
    data = null;
  }

  // pending response callback
  if (waiting) {
    this.callbacks.push(fn);
  }

  // command
  if (args) {
    chunks.push(coerce(name + ' ' + args.join(' ') + '\n'));
  } else {
    chunks.push(coerce(name + '\n'));
  }

  // data
  if (data) {
    if (Array.isArray(data)) {
      data = data.map(coerce);
      chunks.push(int32(length(data)));
      chunks.push(int32(data.length));
      data.forEach(function(part){
        chunks.push(int32(part.length));
        chunks.push(part);
      });
    } else {
      data = coerce(data);
      chunks.push(int32(data.length));
      chunks.push(data);
    }
  }

  // flush
  var buf = Buffer.concat(chunks);
  sock.write(buf, function(){
    if (!waiting && fn) fn();
  });
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
  this.command('IDENTIFY', null, json, function(err, res){
    if (err) return fn(err);
    var features;
    try {
      features = JSON.parse(res);
    } catch (e) {
      err = new Error('failed to parse response "' + res + '"');
    }
    fn(err, features);
  });
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
      if (fn) return fn(null, res);
      var err = new Error('invalid state');
      err.response = res;
      err.address = this.addr;
      err.ready = this._ready;
      err.closing = this.closing;
      this.emit('error', err);
      break;

    // error
    case 1:
      var res = frame.body.toString();
      var err = new Error(this.addr + ': ' + res);
      err.address = this.addr;
      debug('%s - error %s', this.addr, res);
      var fn = this.callbacks.shift();
      if (fn) fn(err)
      else this.emit('error response', err);
      break;

    // message
    case 2:
      ++this.inFlight;
      var msg = new Message(frame.body, this);
      this.trace('connection:message', { msg: msg });
      debug('%s - message %s attempts=%s', this.addr, msg.id, msg.attempts);
      if (msg.attempts > this.maxAttempts) {
        msg.finish();
        this.emit('discard', msg);
        return;
      }
      this.emit('message', msg);
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
  fn = fn || this.onerror;
  if (!this._ready) return fn(new Error('cannot subscribe, connection not ready'));
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
  fn = fn || this.onerror;
  if (!this._ready) return fn(new Error('cannot publish, connection not ready'));
  this.command('PUB', [topic], data, fn);
};

/**
 * Publish `msgs` to `topic`.
 *
 * @param {String} topic
 * @param {Array} msgs
 * @param {Function} [fn]
 * @api private
 */

Connection.prototype.mpublish = function(topic, msgs, fn){
  assertValidTopic(topic);
  assert(Array.isArray(msgs), 'msgs must be an array');
  fn = fn || this.onerror;
  if (!this._ready) return fn(new Error('cannot mpublish, connection not ready'));
  this.command('MPUB', [topic], msgs, fn);
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
  this.trace('connection:ready', { count: n, connection: this });
};

/**
 * Mark message `id` as finished.
 *
 * @param {String} id
 * @api private
 */

Connection.prototype.finish = function(id){
  assertValidMessageId(id);
  var fn = this.onerror;
  var self = this;
  if (!this._ready) return fn(new Error('cannot finish, connection not ready'));
  this.command('FIN', [id], function(){
    self.emit('finish', id);
    --self.inFlight;
  });
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
  var fn = this.onerror;
  var self = this;
  if (!this._ready) return fn(new Error('cannot requeue, connection not ready'));
  this.command('REQ', [id, timeout || 0], function(){
    self.emit('requeue', id);
    --self.inFlight;
  });
};

/**
 * Reset the timeout for an in-flight message.
 *
 * @param {String} id
 * @api private
 */

Connection.prototype.touch = function(id){
  assertValidMessageId(id);
  var fn = this.onerror;
  var self = this;
  if (!this._ready) return fn(new Error('cannot touch, connection not ready'));
  this.command('TOUCH', [id], function(){
    self.emit('touch', id);
  });
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
  debug('%s - close', this.addr);
  var self = this;
  if (this.closing) return;
  fn = fn || this.onerror;
  this.closing = true;
  this.command('CLS', [], function(err){
    if (err) return fn(err);
    self.emit('closing');
    fn();
  });
};

/**
 * Pause the connection.
 *
 * The "pause" event is used by the ready() mixin.
 *
 * @api private
 */

Connection.prototype.pause = function(){
  debug('%s - pause', this.addr);
  this.emit('pause');
};

/**
 * Unpause the connection.
 *
 * The "resume" event is used by the ready() mixin.
 *
 * @api private
 */

Connection.prototype.resume = function(){
  debug('%s - resume', this.addr);
  this.emit('resume');
};

/**
 * Close the connection.
 *
 * @api private
 */

Connection.prototype.end = function(fn){
  debug('%s - end', this.addr);
  this.closing = true;
  if (fn) this.sock.once('end', fn);
  this.closed = true;
  this.sock.end();
};

/**
 * Dirty close of the connection.
 *
 * @api private
 */

Connection.prototype.destroy = function(){
  debug('destroy');
  this.sock.emit = function(){};
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
  var re = /^[\.a-zA-Z0-9_-]+(#ephemeral)?$/;
  if (name.length && name.length <= 64 && re.test(name)) return;
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
  if (name.length && name.length <= 64 && re.test(name)) return;
  throw new Error('invalid channel name "' + name + '"');
}

/**
 * Sum of `bufs`.
 *
 * @param {Array} bufs
 * @return {Number}
 * @api private
 */

function length(bufs) {
  var sum = 0;

  for (var i = 0; i < bufs.length; i++) {
    sum += bufs[i].length;
  }

  return sum;
}

/**
 * Coerce to a buffer.
 *
 * @param {String|Buffer} val
 * @return {Buffer}
 * @api private
 */

function coerce(val) {
  if (Buffer.isBuffer(val)) return val;
  return new Buffer(val);
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

function hasResponse(name) {
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
  // pop them off the queue in order and make
  // sure they are called only once
  for (var fn; fn = fns.shift();) {
    fn(err);
  }
}

/**
 * On identify is called marks the given `conn`
 * as ready and calls the given `fn`.
 *
 * @param {Connection} conn
 * @param {Function} fn
 * @return {Function}
 */

function onIdentify(conn, fn){
  return function(err, features){
    if (err) return fn(err);
    conn.features = features;
    conn._ready = true;
    conn.emit('ready');
    fn();
  };
}
