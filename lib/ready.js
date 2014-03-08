
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
  var pending = 0;
  var rdy = max;

  setInterval(check, 5000);

  conn.on('message', function(msg){ --rdy });
  conn.on('finish', check);
  conn.on('reqeue', check);

  function check() {
    if (rdy <= threshold) ready();
  }

  function ready() {
    debug('RDY %s', max);
    conn.ready(max);
    rdy = max;
  }
};