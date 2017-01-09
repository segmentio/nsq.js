
var assert = require('assert');
var get = require('lodash.get');
var utils = require('../utils');

beforeEach(function(done){
  utils.deleteTopic('test', done);
})

afterEach(function(done){
  utils.stats('test', 'reader', function(err, stats){
    if (err) return done(err);
    var state = get(stats.body.data, 'topics[0].channels[0].clients[0].state');
    assert(state != 3, 'client in subscribed state');
    done();
  })
});
