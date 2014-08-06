
/**
 * Parse `<host>:<port>` strings and pass-through others.
 *
 * @param {String|Object} str
 * @return {Object}
 * @api private
 */

exports.address = function(str){
  if ('string' != typeof str) return str;
  return {
    host: str.split(':')[0],
    port: str.split(':')[1]
  }
};

/**
 * Delegate `src` `event` to `dst`.
 *
 * @param {Object} src
 * @param {String} event
 * @param {Object} dst
 * @api private
 */

exports.delegate = function(src, event, dst){
  src.on(event, function(a, b, c){
    dst.emit(event, a, b, c);
  });
};