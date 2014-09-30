'use strict';

var MQ = require('./lib').MultiQueue;

module.exports = function() {
  return new MQ();
};
