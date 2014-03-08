
/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter;
var debug = require('debug')('nsq:framer');

/**
 * Expose `Framer`.
 */

module.exports = Framer;

/**
 * Initialize a new framer.
 *
 *   |  (int32) ||  (int32) || (binary)
 *   |  4-byte  ||  4-byte  || N-byte
 *   ------------------------------------...
 *       size     frame type     data
 *
 * @api private
 */

function Framer() {
  this.buf = null;
}

/**
 * Inherit from `Emitter.prototype`.
 */

Framer.prototype.__proto__ = Emitter.prototype;

/**
 * Write `buf` and emit "frame".
 *
 * @param {Buffer} buf
 * @api private
 */

Framer.prototype.write = function(buf){
  debug('write: %d bytes', buf.length);
  var off = 0;
  var frame;

  var buf = this.buf = this.buf
    ? Buffer.concat([this.buf, buf])
    : buf;

  while (true) {
    var frame = parseFrame(buf, off);
    if (!frame) break;
    off = frame.next;
    this.emit('frame', frame);
  }

  this.buf = buf.slice(off);
  if (0 == this.buf.length) this.buf = null;
};

/**
 * Parse frame at `off`.
 *
 * @api private
 */

function parseFrame(buf, off){
  if (off + 8 > buf.length) return;

  // size / type
  var size = buf.readInt32BE(off) - 4;
  var type = buf.readInt32BE(off + 4);
  debug('size=%d type=%d', size, type);
  off += 8;

  // frame
  var end = off + size;
  if (end > buf.length) return;

  return {
    body: buf.slice(off, end),
    type: type,
    next: end
  }
}
