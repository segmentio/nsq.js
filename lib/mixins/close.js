
/**
 * Module dependencies.
 */

var debug = require('debug')('nsq:close');

/**
 * Graceful close mixin.
 *
 * @param {Reader} reader
 * @api private
 */

module.exports = function(reader){
  var pending = 0;

  function decr() {
    --pending;
    check();
  }

  function check() {
    debug('pending %d', pending);
    if (pending) return;

    reader.emit('close');
    reader.conns.each(function(conn){
      conn.end();
    });
  }

  reader.once('closing', function(){
    debug('closing');

    reader.conns.each(function(conn){
      pending += conn.inFlight;
      conn.on('requeue', decr);
      conn.on('finish', decr);
    });

    process.nextTick(check);
  });
};