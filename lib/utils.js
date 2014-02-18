
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