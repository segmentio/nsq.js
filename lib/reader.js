
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

  this.connect();
}

Reader.prototype.connect = function(){
  if (this.nsqd) this.connectTo(this.nsqd);
  else this.lookup(this.nsqlookupd);
};

Reader.prototype.lookup = function(addrs){
  var self = this;
  var topic = this.topic;

  addrs = addrs.map(normalize);
  debug('lookup %j', addrs);

  lookup(addrs, function(err, nodes){
    if (err) return self.emit('error', err);
    var addrs = nodes.filter(byTopic(topic)).map(address);
    debug('found %j with topic %j', addrs, topic);
    self.connectTo(addrs);
  });
};

Reader.prototype.connectTo = function(addrs){
  var self = this;
  this.conns = [];
  addrs.forEach(function(addr){
    self.connectNode(addr);
  });
};

Reader.prototype.connectNode = function(addr){
  var maxInFlight = this.maxInFlight;
  var topic = this.topic;
  var channel = this.channel;

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

  conn.on('message', function(msg){
    console.log(msg);
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
