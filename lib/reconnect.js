
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

module.exports = function(conn){
  var backoff = new Backoff({ min: 100, max: 10000, jitter: 200 });

  conn.on('connect', function(){
    debug('%s - reset backoff', conn.addr);
    backoff.reset();
  });

  conn.on('error', function(err){
    debug('%s - socket error %s', conn.addr, err.stack);
    reconnect();
  });

  conn.on('end', function(){
    if (conn.closing) return;
    debug('%s - socket closed', conn.addr);
    reconnect();
  });

  function reconnect() {
    var ms = backoff.duration();
    debug('%s - reconnection attempt in %dms', conn.addr, ms);
    setTimeout(function(){
      conn.connect();
      conn.emit('reconnect', conn);
    }, ms);
  }
};