
/**
 * Module dependencies.
 */

var request = require('superagent');

/**
 * Delete `topic`.
 *
 * @param {String} topic
 * @param {Function} fn
 */

exports.deleteTopic = function(topic, fn){
  request
  .post('http://127.0.0.1:4151/topic/delete')
  .query({ topic: topic })
  .end(function(err, res){
    if (err && err.status == 404) err = null;
    fn(err, res);
  });
};

exports.stats = function(topic, channel, fn){
  request
  .get('http://127.0.0.1:4151/stats')
  .query({ format: 'json', topic: topic, channel: channel })
  .end(function(err, res){
    if (err) return fn(err)
    fn(null, res);
  });
};

exports.framerData = [
  '000000b0000000007b226d61785f7264795f636f756e74223a323530302c2276657273696f6e223a22302e322e3234222c226d61785f6d73675f74696d656f7574223a3930303030302c226d73675f74696d656f7574223a36303030302c22746c735f7631223a66616c73652c226465666c617465223a66616c73652c226465666c6174655f6c6576656c223a302c226d61785f6465666c6174655f6c6576656c223a362c22736e61707079223a66616c73657d',
  '00000006000000004f4b',
  '0000002f00000002135a2ad167d76e45000130363236323534303166363566303038736f6d65206d6573736167652068657265',
  '062625401f65f008'
];
