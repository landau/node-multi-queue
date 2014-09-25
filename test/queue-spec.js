/* jshint expr: true */
'use strict';

var Queue = require('../lib').Queue;
var sinon = require('sinon');
var chai = require('chai');
chai.should();
chai.use(require('sinon-chai'));

function noop(){}

describe('Queue', function() {
  var q = null;
  beforeEach(function() {
    q = new Queue('name');
  });

  describe('#constructor', function() {
    it('should set name and opts', function() {
      q.name.should.equal('name');
      q.opts.should.be.an.object;
      q.opts.concurrency.should.equal(1);
      q.opts.concurrency.should.equal(q.concurrency);

      var q2 = new Queue('name', { concurrency: 2 });
      q2.concurrency.should.equal(2);
    });

    it('should not be paused', function() {
      q.paused.should.be.false;
    });

    it('should have 0 initial workers', function() {
      q.workers.should.equal(0);
    });

    it('should have 0 initial tasks', function() {
      q.tasks.length.should.equal(0);
    });
  });

  describe('#push', function() {
    var stub = null;

    before(function() {
      stub = sinon.stub(Queue.prototype, '_run', noop);
    });

    afterEach(function() {
      stub.reset();
    });

    after(function() {
      Queue.prototype._run.restore();
    });

    it('should push a task to the tasks array', function() {
      q.push(noop);
      q.tasks[0].fn.should.equal(noop);
    });

    it('should ignore duplicate tasks', function() {
      q.push('foo', noop);
      q.push('foo', noop);
      q.push('bar', noop);
      q.push('bar', noop);
      q.push('foo', noop);

      q.tasks.length.should.equal(2);
    });

    it('should call _run', function() {
      q.push('foo', noop);
      stub.should.be.calledOnce;
    });
  });

  describe('#stop', function() {
    it('should set paused to true', function() {
      q.stop();
      q.paused.should.be.true;
    });
  });

  describe('#start', function() {
    it('should not do anything if the process is not paused', function(done) {
      var stub = sinon.stub(Queue.prototype, '_run', noop);

      q.paused.should.be.false;

      q.start();
      setImmediate(function() {
        stub.should.not.be.called;
        stub.restore();
        done();
      });
    });

    it('should call _run', function(done) {
      var stub = sinon.stub(Queue.prototype, '_run', noop);

      q.stop();
      q.start();

      setImmediate(function() {
        stub.should.be.calledOnce;
        stub.restore();
        done();
      });
    });
  });

  describe('#empty', function() {
    it('should not set tasks as a new array if no tasks exists', function() {
      var ref = q.tasks;
      q.tasks.should.equal(ref);
      q.tasks.length.should.equal(0);
      q.empty();
      q.tasks.should.equal(ref);
      q.tasks.length.should.equal(0);
    });

    it('should set tasks as a new array', function() {
      var ref = q.tasks;
      ref.push(1);
      q.tasks.length.should.equal(1);
      q.empty();
      q.tasks.should.not.equal(ref);
      q.tasks.length.should.equal(0);
    });
  });

  describe('#remove', function() {
    before(function() {
      sinon.stub(Queue.prototype, '_run', noop);
    });

    beforeEach(function() {
      q.push('foo', noop);
    });

    after(function() {
      Queue.prototype._run.restore();
    });

    it('should remove a known task', function() {
      var didRemove = q.remove('foo');
      didRemove.should.be.true;
      q.tasks.length.should.equal(0);
    });

    it('should remain unchanged for an unknown task', function() {
      var didRemove = q.remove('bar');
      didRemove.should.be.false;
      q.tasks.length.should.equal(1);
    });
  });

  describe('#getAvailWorkers', function() {
    it('should return the number of avaialble workers', function() {
      var n = q.getAvailWorkers();
      n.should.be.a.number;
      n.should.equal(1); // default conc, and 0 workers running
    });

    it('should return zero for any number of workers >= to concurrency', function() {
      q.workers = 2;
      var n = q.getAvailWorkers();
      n.should.equal(0);
    });
  });

  describe('#remove', function() {
    var spy = null;

    before(function() {
      spy = sinon.spy(function(done) {
        done();
      });
    });

    beforeEach(function() {
      spy.reset();
    });

    it('should not run if paused', function() {
      q.stop();
      q.push(spy);
      spy.should.not.be.called;
    });

    it('should not run if there are zero available workers', function() {
      q.workers = 5;
      q.push(spy);
      spy.should.not.be.called;
    });

    it('should not run if there are zero tasks', function() {
      q._run();
      spy.should.not.be.called;
    });

    it('should run', function(done) {
      q.push(spy);

      setImmediate(function() {
        spy.should.be.calledOnce;
        done();
      });
    });

    it('should run 2 tasks concurrently', function(done) {
      var q = new Queue('name', { concurrency: 2 });
      q.push(spy);
      q.push(spy);

      setImmediate(function() {
        spy.should.be.calledTwice;
        done();
      });
    });

    it('should run 2 tasks concurrently and and queue a third', function(done) {
      var q = new Queue('name', { concurrency: 2 });
      var t = 50;

      spy = sinon.spy(function(done) {
        setTimeout(done, t);
      });

      q.push(spy);
      q.push(spy);
      q.push(spy);

      process.nextTick(function() {
        spy.should.be.calledTwice;

        setTimeout(function() {
          spy.should.be.calledThrice;
          done();
        }, t);
      });
    });
  });

});
