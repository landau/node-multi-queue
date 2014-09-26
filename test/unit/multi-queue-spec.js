/* jshint expr: true */
'use strict';

var MultiQueue = require('../../lib').MultiQueue;
var Queue = require('../../lib').Queue;
var Emitter = require('events').EventEmitter;
var sinon = require('sinon');
var chai = require('chai');
chai.should();

function noop() {}

describe('MultiQueue', function() {
  var mq = null;
  beforeEach(function() {
    mq = new MultiQueue();
  });

  it('should inherit from EventEmitter', function() {
    for (var p in Emitter) {
      if (Emitter.prototype.hasOwnProperty(p)) {
        MultiQueue.prototype[p].should.equal(Emitter.prototype[p]);
      }
    }
  });

  describe('#constructor', function() {
    it('should set an empty queues object', function() {
      Object.keys(mq._queues).length.should.equal(0);
    });
  });

  describe('#_getQ', function() {
    it('should return the default queue', function() {
      mq._queues.__main__ = 1;
      mq._getQ().should.equal(1);
    });

    it('should return queue via `key`', function() {
      mq._queues.foo = 1;
      mq._getQ('foo').should.equal(1);
    });
  });

  describe('#_newQ', function() {
    it('should create a new queue', function() {
      var q = mq._newQ('foo');
      mq._queues.foo.should.equal(q);
      q.should.be.instanceOf(Queue);
    });

    it('should create a default queue', function() {
      var q = mq._newQ();
      mq._queues.__main__.should.equal(q);
    });
  });

  describe('#push', function() {
    var stub = null;

    before(function() {
      stub = sinon.stub(Queue.prototype, 'push');
    });

    afterEach(function() {
      stub.reset();
    });

    after(function() {
      stub.restore();
    });

    it('should create a new queue if one doesn\'t exist', function() {
      var spy = sinon.spy(mq, '_newQ');
      var opts = { name: 'hi' };

      mq.push('foo', noop, opts);

      spy.should.be.calledWith('foo', opts);
      stub.should.be.calledWith(opts.name, noop);
    });

    it('should call push on a queue', function() {
      var spy = sinon.spy(mq, '_newQ');
      var opts = { name: 'hi' };

      mq.push('foo', noop, opts);
      mq.push('foo', noop, opts);

      spy.should.be.calledOnce;
      stub.should.be.calledTwice;
    });

    it('should use the default queue if a key is not provided', function() {
      var spy = sinon.spy(mq, '_newQ');
      mq.push(noop);
      stub.should.be.calledOnce;
      spy.should.be.calledWith('__main__');
    });
  });

  describe('#start', function() {
    var stub = null;

    before(function() {
      stub = sinon.stub(Queue.prototype, 'start');
      sinon.stub(Queue.prototype, 'push');
    });

    afterEach(function() {
      stub.reset();
    });

    after(function() {
      stub.restore();
      Queue.prototype.push.restore();
    });

    it('should call start on a queue', function() {
      var key = 'hi';
      mq.push(key, noop, {});
      mq.start(key);
      stub.should.be.calledOnce;
    });

    it('should not call start if the queue doesn\'t exist', function() {
      mq.start('foo');
      stub.should.not.be.calledOnce;
    });
  });

  describe('#stop', function() {
    var stub = null;

    before(function() {
      stub = sinon.stub(Queue.prototype, 'stop');
      sinon.stub(Queue.prototype, 'push');
    });

    afterEach(function() {
      stub.reset();
    });

    after(function() {
      stub.restore();
      Queue.prototype.push.restore();
    });

    it('should call stop on a queue', function() {
      var key = 'hi';
      mq.push(key, noop, {});
      mq.stop(key);
      stub.should.be.calledOnce;
    });

    it('should not call stop if the queue doesn\'t exist', function() {
      mq.stop('foo');
      stub.should.not.be.calledOnce;
    });
  });

  describe('#empty', function() {
    var stub = null;

    before(function() {
      stub = sinon.stub(Queue.prototype, 'empty');
      sinon.stub(Queue.prototype, 'push');
    });

    afterEach(function() {
      stub.reset();
    });

    after(function() {
      stub.restore();
      Queue.prototype.push.restore();
    });

    it('should call empty on a queue', function() {
      var key = 'hi';
      mq.push(key, noop, {});
      mq.empty(key);
      stub.should.be.calledOnce;
    });

    it('should not call empty if the queue doesn\'t exist', function() {
      mq.empty('foo');
      stub.should.not.be.calledOnce;
    });
  });

  describe('#remove', function() {
    var stub = null;

    before(function() {
      stub = sinon.stub(Queue.prototype, 'remove');
      sinon.stub(Queue.prototype, 'push');
    });

    afterEach(function() {
      stub.reset();
    });

    after(function() {
      stub.restore();
      Queue.prototype.push.restore();
    });

    it('should call remove on a queue', function() {
      var key = 'hi';
      var name = 'test';
      mq.push(key, noop, { name: name });
      mq.remove(key, name);
      stub.should.be.calledWith(name);
    });

    it('should not call remove if the queue doesn\'t exist', function() {
      mq.remove('foo');
      stub.should.not.be.calledOnce;
    });
  });
});
