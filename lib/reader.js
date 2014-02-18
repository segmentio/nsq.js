
/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter;
var debug = require('debug')('nsq:reader');
var Connection = require('./connection');
var reconnect = require('./reconnect');
var delegate = require('./delegate');
var lookup = require('nsq-lookup');
var utils = require('./utils');
var assert = require('assert');

/**
 * Expose `Reader`.
 */

module.exports = Reader;

/**
 * Initialize a new Reader.
 *
 * - `topic` subscription topic
 * - `channel` subscription channel
 * - `nsqd` optional addresses
 * - `nsqlookupd` optional addresses
 * - `maxInFlight` max messages in-flight [1]
 * - `pollInterval` nsqlookupd poll interval[10000]
 *
 * The Reader is in charge of establishing connections
 * between the given `nsqd` nodes, or looking them
 * up and connecting via `nsqlookupd`. Subscribes
 * are buffered so that no initialization is required.
 *
 * @param {Object} opts
 * @api public
 */

function Reader(opts) {
  // required
  assert(opts.topic, '.topic required');
  assert(opts.channel, '.channel required');
  assert(opts.nsqd || opts.nsqlookupd, '.nsqd or .nsqlookupd addresses required');

  // initialize
  this.nsqd = opts.nsqd;
  this.topic = opts.topic;
  this.channel = opts.channel;
  this.maxInFlight = opts.maxInFlight;
  this.nsqlookupd = opts.nsqlookupd;
  this.pollInterval = opts.pollInterval;
  this.connected = {};
  this.conns = [];

  this.connect();
}

/**
 * Establish connections to the given nsqd instances,
 * or look them up via nsqlookupd.
 *
 * @api private
 */

Reader.prototype.connect = function(){
  var self = this;

  // nsqd
  if (this.nsqd) {
    this.connectToEach(this.nsqd);
  }

  // nsqlookupd
  this.lookup(function(err, nodes){
    if (err) return self.emit('error', err);
    self.connectToEach(nodes.map(address));
  });

  this.poll(this.pollInterval);
};

/**
 * Poll for nsqlookupd additional nodes every `ms`.
 *
 * @param {Number} ms
 * @api private
 */

Reader.prototype.poll = function(ms){
  var self = this;

  debug('polling every %dms', ms);
  setInterval(function(){
    self.lookup(function(err, nodes){
      if (err) return self.emit('error', err);
      nodes.map(address).forEach(function(addr){
        if (self.connected[addr]) {
          console.log('already connected to %s', addr);
          debug('already connected to %s', addr);
        } else {
          console.log('connecting to %s', addr);
          self.connectTo(addr);
        }
      });
    });
  }, ms);
};

/**
 * Lookup nsqd nodes via .nsqlookupd addresses and
 * filter on the `.topic` and invoke `fn(err, nodes)`.
 *
 * @param {Function} fn
 * @api private
 */

Reader.prototype.lookup = function(fn){
  var addrs = this.nsqlookupd.map(normalize);
  var topic = this.topic;
  var self = this;

  debug('lookup %j', addrs);
  lookup(addrs, function(err, nodes){
    if (err) return fn(err);
    if (err) return self.emit('error', err);
    nodes = nodes.filter(byTopic(topic));
    debug('found %d nodes with topic %j', nodes.length, topic);
    fn(null, nodes);
  });
};

/**
 * Connect to all `addrs`.
 *
 * @param {Array} addrs
 * @api private
 */

Reader.prototype.connectToEach = function(addrs){
  addrs.forEach(this.connectTo.bind(this));
};

/**
 * Connect to nsqd at `addr`.
 *
 * @param {String} addr
 * @api private
 */

Reader.prototype.connectTo = function(addr){
  var maxInFlight = this.maxInFlight;
  var channel = this.channel;
  var topic = this.topic;

  this.connected[addr] = true;

  debug('connect nsqd %s %s/%s [%d]', addr, topic, channel, maxInFlight);

  var host = addr.split(':')[0];
  var port = addr.split(':')[1];

  var conn = new Connection({
    maxInFlight: maxInFlight,
    host: host,
    port: port
  });

  reconnect(conn);
  this.delegate(conn);

  conn.connect();
  conn.subscribe(topic, channel);
  conn.ready(maxInFlight);

  var pending = 0;
  conn.on('message', function(msg){
    ++pending;
  });

  conn.on('finish', function(){
    --pending;
    if (pending <= maxInFlight * .20) conn.ready(maxInFlight);
  });

  conn.on('requeue', function(){
    --pending;
  });
};

/**
 * Delegate events from `conn`.
 *
 * @param {Connection} conn
 * @api private
 */

Reader.prototype.delegate = function(conn){
  delegate(conn, 'message', this);
  delegate(conn, 'connect', this);
  delegate(conn, 'error', this);
  delegate(conn, 'end', this);
};

/**
 * Inherit from `Emitter.prototype`.
 */

Reader.prototype.__proto__ = Emitter.prototype;

/**
 * Filter nodes by `topic`.
 */

function byTopic(topic) {
  return function(node){
    return ~node.topics.indexOf(topic);
  }
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
