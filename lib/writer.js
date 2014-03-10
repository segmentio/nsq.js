
/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter;
var debug = require('debug')('nsq:writer');
var Connection = require('./connection');
var reconnect = require('./reconnect');
var delegate = require('./delegate');
var utils = require('./utils');

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
  opts = utils.address(opts);
  this.conn = new Connection(opts);
  this.conn.on('error', function(){});
  reconnect(this.conn);
  delegate(this.conn, 'error response', this);
  delegate(this.conn, 'connect', this);
  delegate(this.conn, 'ready', this);
  delegate(this.conn, 'end', this);
  this.conn.connect();
}

/**
 * Inherit from `Emitter.prototype`.
 */

Writer.prototype.__proto__ = Emitter.prototype;

/**
 * Publish `msg` to `topic`.
 *
 * @param {String} topic
 * @param {String|Buffer|Object} msg
 * @param {Function} [fn]
 * @api public
 */

Writer.prototype.publish = function(topic, msg, fn){
  if (msg && 'object' == typeof msg) {
    msg = JSON.stringify(msg);
  }

  this.conn.publish.apply(this.conn, arguments);
};