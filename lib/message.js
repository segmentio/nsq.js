
/**
 * Module dependencies.
 */

var BigNum = require('bignumber.js');
var Int64 = require('node-int64');

// TODO: review ^

/**
 * Expose `Message`.
 */

module.exports = Message;

/**
 * Initialize a new message with the given `body`.
 *
 *    [x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x][x]...
 *    |       (int64)        ||    ||      (hex string encoded in ASCII)           || (binary)
 *    |       8-byte         ||    ||                 16-byte                      || N-byte
 *    ------------------------------------------------------------------------------------------...
 *      nanosecond timestamp    ^^                   message ID                       message body
 *                           (uint16)
 *                            2-byte
 *                           attempts
 *
 * @param {Buffer} body
 * @param {Connection} conn
 * @api private
 */

function Message(body, conn) {
  this.msgTimeout = conn.features.msg_timeout;
  this.createdAt = new Date;
  this.parse(body);
  this.conn = conn;
}

/**
 * Mark the message as finished.
 *
 * @param {Function} [fn]
 * @api public
 */

Message.prototype.finish = function(fn){
  this.responded = true;
  this.conn.finish(this.id, fn);
};

/**
 * Return the amount of time in milliseconds until
 * the message will timeout and requeue.
 *
 * @return {Number}
 * @api public
 */

Message.prototype.timeUntilTimeout = function(){
  return this.createdAt + this.msgTimeout - new Date;
};

/**
 * Re-queue the message with optional `timeout`.
 *
 * @param {Number} [timeout]
 * @param {Function} [fn]
 * @api public
 */

Message.prototype.requeue = function(timeout, fn){
  this.responded = true;
  this.conn.requeue(this.id, timeout, fn);
};

/**
 * Touch the message.
 *
 * @param {Function} [fn]
 * @api public
 */

Message.prototype.touch = function(fn){
  this.lastTouch = new Date;
  this.conn.touch(this.id, fn);
};

/**
 * Return parsed json.
 *
 * @return {Object}
 * @api public
 */

Message.prototype.json = function(){
  if (this._json) return this._json;
  return this._json = JSON.parse(this.body.toString());
};

/**
 * Parse the given `buf` and assign message properties.
 *
 * @param {Buffer} buf
 * @api private
 */

Message.prototype.parse = function(buf){
  var off = 0;

  // timestamp
  this.timestamp = new Int64(buf, 0).toOctetString();
  this.timestamp = new BigNum(this.timestamp, 16);
  off += 8;

  // attempts
  this.attempts = buf.readInt16BE(off);
  off += 2;

  // message id
  this.id = buf.slice(off, off + 16).toString();
  off += 16;

  // body
  this.body = buf.slice(off, buf.length);
};

/**
 * Inspect implementation.
 *
 * @return {Object}
 * @api public
 */

Message.prototype.inspect = function(){
  return {
    id: this.id,
    attempts: this.attempts,
    timestamp: '<BigNum ' + this.timestamp + '>',
    body: this.body
  }
};