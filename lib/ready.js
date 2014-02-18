
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
  var pending = 0;
  var threshold = .2;

  conn.on('message', function(msg){
    ++pending;
  });

  conn.on('finish', function(){
    --pending;
    check();
  });

  conn.on('requeue', function(){
    --pending;
    check();
  });

  function check() {
    if (pending <= max * threshold) ready();
  }

  function ready() {
    debug('RDY %s', max);
    conn.ready(max);
  }
};