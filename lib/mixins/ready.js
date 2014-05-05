
/**
 * Module dependencies.
 */

var debug = require('debug')('nsq:ready');

/**
 * RDY handling mixin.
 *
 * @param {Connection} conn
 * @api private
 */

module.exports = function(conn){
  var closing = false;
  var paused = false;
  var pending = 0;
  var inflight;

  conn.on('ready', function(){
    inflight = conn.maxInFlight;
  });

  conn.on('closing', function(){
    closing = true;
  });

  conn.on('pause', function(){
    paused = true;
  });

  conn.on('resume', function(){
    paused = false;
    check();
  });

  conn.on('finish', check);
  conn.on('requeue', check);

  function check() {
    --inflight;
    if (paused || closing) return;
    var threshold = Math.ceil(conn.maxInFlight * .2);
    if (inflight <= threshold) ready();
  }

  function ready() {
    debug('%s - RDY %s', conn.addr, conn.maxInFlight);
    conn.ready(conn.maxInFlight);
    inflight = conn.maxInFlight;
  }
};