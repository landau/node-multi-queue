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

    it('should call setConcurrency', function() {
      var spy = sinon.spy(Queue.prototype, 'setConcurrency');
      var opts = { concurrency: 5 };
      new Queue('name', opts);
      spy.should.be.calledOnce;
      spy.should.be.calledWith(opts.concurrency);
      spy.restore();
    });
  });

  describe('#setConcurrency', function() {
    it('should not allow values less than 1', function() {
      q.setConcurrency(0);
      q.concurrency.should.equal(1);
    });

    it('should update concurrency', function() {
      q.setConcurrency(10);
      q.concurrency.should.equal(10);
    });

    it('should not update concurrency if value is unchanged', function() {
      q.setConcurrency(10);
      q.concurrency.should.equal(10);
      q.setConcurrency(10);
      q.concurrency.should.equal(10);
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
      q.push(null, null, noop);
      q.tasks[0].fn.should.equal(noop);
    });

    it('should ignore duplicate tasks', function() {
      q.push('foo', true, noop);
      q.push('foo', true, noop);
      q.push('bar', true, noop);
      q.push('bar', true, noop);
      q.push('foo', false, noop);

      q.tasks.length.should.equal(2);
    });


    it('should call _run', function() {
      q.push('foo', null, noop);
      stub.should.be.calledOnce;
    });
  });

  describe('#stop', function() {
    it('should set paused to true', function() {
      q.stop();
      q.paused.should.be.true;
    });

    it('should emit a stop event', function(done) {
      var spy = sinon.spy(q, 'emit');
      q.stop();
      setImmediate(function() {
        spy.should.be.calledWith('stop', q.name);
        done();
      });
    });
  });

  describe('#start', function() {
    var stub = null;

    before(function() {
      stub = sinon.stub(Queue.prototype, '_run', noop);
    });

    afterEach(function() {
      stub.reset();
    });

    after(function() {
      stub.restore();
    });

    it('should not do anything if the process is not paused', function(done) {
      q.paused.should.be.false;

      q.start();
      setImmediate(function() {
        stub.should.not.be.called;
        done();
      });
    });

    it('should emit a start event', function(done) {
      var spy = sinon.spy(q, 'emit');
      q.stop();
      q.start();
      setImmediate(function() {
        spy.should.be.calledWith('start', q.name);
        done();
      });
    });

    it('should call _run', function(done) {
      q.stop();
      q.start();

      setImmediate(function() {
        stub.should.be.calledOnce;
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

    it('should emit an empty event', function(done) {
      var spy = sinon.spy(q, 'emit');
      q.tasks.push(1);
      q.empty();
      setImmediate(function() {
        spy.should.be.calledWith('empty', q.name);
        done();
      });
    });
  });

  describe('#remove', function() {
    before(function() {
      sinon.stub(Queue.prototype, '_run', noop);
    });

    beforeEach(function() {
      q.push('foo', null, noop);
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
      q.push(null, null, spy);
      spy.should.not.be.called;
    });

    it('should not run if there are zero available workers', function() {
      q.workers = 5;
      q.push(null, null, spy);
      spy.should.not.be.called;
    });

    it('should not run if there are zero tasks', function() {
      q._run();
      spy.should.not.be.called;
    });

    it('should run', function(done) {
      q.push(null, null, spy);

      setImmediate(function() {
        spy.should.be.calledOnce;
        done();
      });
    });

    it('should run 2 tasks concurrently', function(done) {
      var q = new Queue('name', { concurrency: 2 });
      q.push(null, null, spy);
      q.push(null, null, spy);

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

      q.push(null, null, spy);
      q.push(null, null, spy);
      q.push(null, null, spy);

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
