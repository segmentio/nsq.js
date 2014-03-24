
/**
 * Module dependencies.
 */

var debug = require('debug')('nsq:ready');

/**
 * RDY handling mixin.
 *
 * @param {Connection} conn
 * @param {Number} max
 * @api private
 */

module.exports = function(conn, max){
  var threshold = Math.round(max * .2);
  var paused = false;
  var pending = 0;
  var rdy = max;

  conn.on('pause', function(){
    paused = true;
  });

  conn.on('resume', function(){
    paused = false;
    check();
  });

  conn.on('message', function(msg){ --rdy });

  conn.on('finish', check);
  conn.on('requeue', check);

  function check() {
    if (paused) return;
    if (rdy <= threshold) ready();
  }

  function ready() {
    debug('RDY %s', max);
    conn.ready(max);
    rdy = max;
  }
};