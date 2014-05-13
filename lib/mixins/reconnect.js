
/**
 * Module dependencies.
 */

var debug = require('debug')('nsq:reconnect');
var Backoff = require('backo');

/**
 * Exponential backoff reconnection mixin.
 *
 * @param {Connection} conn
 * @api private
 */

module.exports = function(conn, max){
  var backoff = new Backoff({ min: 100, max: 10000, jitter: 200 });
  var attempts = 0;

  conn.on('connect', function(){
    debug('%s - reset backoff', conn.addr);
    backoff.reset();
    attempts = 0;
  });

  conn.on('close', function(){
    if (conn.closing) return;
    debug('%s - socket closed', conn.addr);
    reconnect();
  });

  function exceeded() {
    return attempts++ >= max;
  }

  function reconnect() {
    if (exceeded()) return debug('%s - reconnection attempts exceeded', conn.addr);
    var ms = backoff.duration();
    debug('%s - reconnection attempt (%s/%s) in %dms', conn.addr, attempts, max, ms);
    setTimeout(function(){
      conn.connect();
      conn.emit('reconnect', conn);
    }, ms);
  }
};