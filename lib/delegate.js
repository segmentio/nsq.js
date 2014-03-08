
/**
 * Deleaget `src` `event` to `dst`.
 *
 * @param {Object} src
 * @param {String} event
 * @param {Object} dst
 * @api private
 */

module.exports = function(src, event, dst){
  src.on(event, function(a, b, c){
    dst.emit(event, a, b, c);
  });
};