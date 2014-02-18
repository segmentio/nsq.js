
/**
 * Module dependencies.
 */

var Reader = require('./lib/reader');
var Writer = require('./lib/writer');

/**
 * Create a new reader.
 *
 * @param {Object} opts
 * @return {Writer}
 * @api public
 */

exports.reader = function(opts){
  return new Reader(opts);
};

/**
 * Create a new writer.
 *
 * @param {Object} opts
 * @return {Writer}
 * @api public
 */

exports.writer = function(opts){
  return new Writer(opts);
};