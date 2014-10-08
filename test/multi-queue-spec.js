/* jshint expr: true */
'use strict';

var MultiQueue = require('../lib').MultiQueue;
var Queue = require('../lib').Queue;
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
    it('should create a queues object with a default queue', function() {
      Object.keys(mq._queues).length.should.equal(1);
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

  describe('#create', function() {
    it('should create a new queue', function() {
      var key = 'key';
      var opts = { concurrency: 5 };
      var spy = sinon.spy(mq, '_newQ');

      mq.create(key, opts);
      spy.should.be.calledOnce;
      spy.should.be.calledWithExactly(key, opts);
    });

    it('should not create a new queue if it existsj', function() {
      var key = 'key';
      var opts = { concurrency: 5 };
      mq.create(key, opts);

      var spy = sinon.spy(mq, '_newQ');
      mq.create(key, opts);
      spy.should.not.be.called;
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

    it('should throw if a queue doesn\'t exist', function() {
      var opts = { unique: 'hi' };
      var err = null;

      try {
        mq.push('foo', noop, opts);
      } catch(e) {
        err = e;
      }

      err.should.be.an.error;
    });

    it('should call push on a queue', function() {
      var spy = sinon.spy(mq, '_newQ');
      var meta = {};
      var opts = { name: 'hi',  meta: meta };

      mq.create('foo');
      mq.push('foo', noop, opts);
      mq.push('foo', noop, opts);

      spy.should.be.calledOnce;
      stub.should.be.calledTwice;
      stub.should.be.calledWith(opts.name, undefined, noop, opts.meta);
    });

    it('should use the default queue if a key is not provided', function() {
      mq.push(noop);
      stub.should.be.calledOnce;
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
      mq.create(key);
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
      mq.create(key);
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
      mq.create(key);
      mq.push(key, noop, {});
      mq.empty(key);
      stub.should.be.calledOnce;
    });

    it('should not call empty if the queue doesn\'t exist', function() {
      mq.empty('foo');
      stub.should.not.be.calledOnce;
    });
  });

  describe('#removeTask', function() {
    var stub = null;

    before(function() {
      stub = sinon.stub(Queue.prototype, 'remove');
    });

    beforeEach(function() {
      mq.create('hi');
      mq.stop();
    });

    afterEach(function() {
      stub.reset();
    });

    after(function() {
      stub.restore();
    });

    it('should call removeTask on a queue', function() {
      var key = 'hi';
      var name = 'test';
      mq.push(key, noop, { name: name });
      mq.removeTask(key, name);
      stub.should.be.calledWith(name);
    });

    it('should not call removeTask if the queue doesn\'t exist', function() {
      mq.removeTask('foo', 'foo');
      stub.should.not.be.calledOnce;
    });

    it('should removeTask from the default queue if no key is provided', function() {
      mq.push(noop, {name :'foo'});
      mq.removeTask('foo');
      stub.should.be.calledOnce;
    });
  });
});
