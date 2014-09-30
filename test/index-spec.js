'use strict';

var queue = require('../');
var MQ = require('../lib').MultiQueue;
require('chai').should();

describe('index', function() {
  it('should return a multi-queue', function() {
    var q = queue();
    q.should.be.an.instanceOf(MQ);
  });
});
