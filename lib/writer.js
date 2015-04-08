
/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter;
var reconnect = require('./mixins/reconnect');
var debug = require('debug')('nsq:writer');
var Connection = require('./connection');
var Set = require('set-component');
var lookup = require('nsq-lookup');
var utils = require('./utils');
var delegate = utils.delegate;

/**
 * Expose `Writer`.
 */

module.exports = Writer;

/**
 * Initialize a new Writer.
 *
 * @param {Object} opts
 * @api public
 */

function Writer(opts) {
  opts = opts || {};
  this.opts = utils.address(opts);
  this.conns = new Set;
  this.connect();
  this.n = 0;
}

/**
 * Inherit from `Emitter.prototype`.
 */

Writer.prototype.__proto__ = Emitter.prototype;

/**
 * Publish `msg` to `topic`.
 *
 * @param {String} topic
 * @param {String|Buffer|Object|Array} msg
 * @param {Function} [fn]
 * @api public
 */

Writer.prototype.publish = function(topic, msg, fn){
  fn = fn || function(){};

  // json support
  if (Array.isArray(msg)) {
    msg = msg.map(coerce);
  } else {
    msg = coerce(msg);
  }

  // connection pool
  var size = this.conns.size();
  var i = this.n++ % size;
  var conn = this.conns.values()[i];
  if (!conn) return fn(new Error('no nsqd nodes connected'));

  // publish
  debug('%s - publish', conn.addr);
  if (Array.isArray(msg)) {
    conn.mpublish(topic, msg, fn);
  } else {
    conn.publish(topic, msg, fn);
  }
};

/**
 * Establish connections to the given nsqd instances,
 * or look them up via nsqlookupd.
 *
 * @api private
 */

Writer.prototype.connect = function(){
  var opts = this.opts;
  var self = this;

  // direct
  if (opts.port) {
    this.connectTo((opts.host || '0.0.0.0') + ':' + opts.port);
    return;
  }

  // nsqd
  if (opts.nsqd) {
    this.connectToEach(opts.nsqd);
    return;
  }

  // nsqlookupd
  if (opts.nsqlookupd) {
    this.lookup(function(err, nodes){
      if (err) return self.emit('error', err);
      self.connectToEach(nodes.map(address));
    });
    return;
  }

  // default
  this.connectTo('0.0.0.0:4150');
};

/**
 * Lookup nsqd nodes via .nsqlookupd addresses and
 * and invoke `fn(err, nodes)`.
 *
 * @param {Function} fn
 * @api private
 */

Writer.prototype.lookup = function(fn){
  var addrs = this.opts.nsqlookupd.map(normalize);
  var self = this;

  debug('lookup %j', addrs);
  lookup(addrs, function(err, nodes){
    if (err) return fn(err);
    debug('found %d nodes', nodes.length);
    fn(null, nodes);
  });
};

/**
 * Connect to all `addrs`.
 *
 * @param {Array} addrs
 * @api private
 */

Writer.prototype.connectToEach = function(addrs){
  addrs.forEach(this.connectTo.bind(this));
};

/**
 * Connect to nsqd at `addr`.
 *
 * @param {String} addr
 * @api private
 */

Writer.prototype.connectTo = function(addr){
  var self = this;

  debug('%s - connect', addr);
  var opts = utils.address(addr);
  var conn = new Connection(opts);

  conn.on('close', function(){
    debug('%s - remove from pool', addr);
    self.conns.remove(conn);
  });

  conn.on('ready', function(){
    debug('%s - add to pool', addr);
    self.conns.add(conn);
  });

  // TODO: poll
  // TODO: tests
  reconnect(conn);
  delegate(conn, 'error response', this);
  delegate(conn, 'error', this);
  delegate(conn, 'connect', this);
  delegate(conn, 'ready', this);
  delegate(conn, 'end', this);

  conn.connect();
};

/**
 * Close the connections.
 *
 * @api public
 */

Writer.prototype.close = function(fn){
  debug('start close');

  var n = this.conns.size();
  this.conns.each(function(conn){
    conn.end(function() {
      debug('%s - conn ended', conn.addr);
      if (fn) --n || fn();
    });
  });
};

/**
 * Coerce `val`.
 */

function coerce(val) {
  if (val && 'object' == typeof val && !Buffer.isBuffer(val)) {
    return JSON.stringify(val);
  }

  return val;
}

/**
 * Return address of `node`.
 */

function address(node) {
  return node.broadcast_address + ':' + node.tcp_port;
}

/**
 * Normalize addresses to include the http scheme.
 */

function normalize(addr) {
  if (0 == addr.indexOf('http')) return addr;
  return 'http://' + addr;
}
