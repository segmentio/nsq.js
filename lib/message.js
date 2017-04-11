
/**
 * Module dependencies.
 */

var BigNum = require('bignum');
var Int64 = require('node-int64');
var ms = require('ms');

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
  this.trace = conn.trace || function(){};
  this.msgTimeout = conn.features.msg_timeout;
  this.lastTouch = Date.now();
  this.parse(body);
  this.conn = conn;
}

/**
 * Mark the message as finished.
 *
 * @api public
 */

Message.prototype.finish = function(fn){
  this.responded = true;
  this.conn.finish(this.id, fn);
  this.trace('message:finish', { msg: this });
};

/**
 * Return the amount of time in milliseconds until
 * the message will timeout and requeue.
 *
 * @return {Number}
 * @api public
 */

Message.prototype.timeUntilTimeout = function(){
  return this.lastTouch + this.msgTimeout - Date.now();
};

/**
 * Check if the in-flight message has timed out.
 *
 * @return {Boolean}
 * @api public
 */

Message.prototype.timedout = function(){
  return this.timeUntilTimeout() <= 0;
};

/**
 * Re-queue the message with optional `delay`.
 *
 * @param {Number|String} [delay]
 * @api public
 */

Message.prototype.requeue = function(delay, fn){
  if ('string' == typeof delay) delay = ms(delay);
  this.responded = true;
  this.conn.requeue(this.id, delay, fn);
  this.trace('message:requeue', { msg: this });
};

/**
 * Touch the message.
 *
 * @api public
 */

Message.prototype.touch = function(fn){
  this.lastTouch = Date.now();
  this.conn.touch(this.id, fn);
  this.trace('message:touch', { msg: this });
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
 * JSON implementation.
 *
 * @api public
 */

Message.prototype.toJSON = function(){
  return {
    id: this.id,
    attempts: this.attempts,
    timestamp: this.timestamp.toString(),
    msgTimeout: this.msgTimeout
  }
};

/**
 * Inspect implementation.
 *
 * @return {String}
 * @api public
 */

Message.prototype.inspect = function(){
  return '<Message ' + this.id + ' attempts=' + this.attempts + ' size=' + this.body.length + '>';
};
