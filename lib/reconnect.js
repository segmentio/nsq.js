
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
    debug('reset backoff');
    backoff.reset();
  });

  conn.on('error', function(err){
    reconnect();
  });

  conn.on('end', function(){
    if (conn.closing) return;
    reconnect();
  });

  function reconnect() {
    var ms = backoff.duration();
    debug('reconnection attempt in %dms', ms);
    setTimeout(function(){
      conn.connect();
    }, ms);
  }
};