
/**
 * Add a `.next()` method to `arr` for round-robin-ish iteration.
 *
 * @param {Array} arr
 * @return {Array}
 * @api public
 */

module.exports = function(arr){
  var n = 0;

  arr.next = function(){
    var i = n++ % arr.length;
    return arr[i];
  };

  return arr;
};