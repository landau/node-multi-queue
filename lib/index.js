'use strict';

var DEFAULT_QUEUE = '__main__';
var is = require('is-predicate');
var Emitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var extend = require('util')._extend;

var _slice = Array.prototype.slice;

function defaults(o, q) {
  return Object.keys(q).reduce(function(o, k) {
    if (!o.hasOwnProperty(k)) o[k] = q[k];
    return o;
  }, o);
}

var c = -1;
function uniqueId() {
  c += 1;
  return 'task' + c;
}

function prop(p) {
  return function(o) { return o[p]; };
}

function comp() {
  var fns = _slice.call(arguments);

  return function _comp() {
    var init = fns.shift().apply(this, arguments);
    return fns.reduceRight(function(result, fn) {
      return fn(result);
    }, init);
  };
}

function once(fn) {
  var called = false;

  return function() {
    if (called) throw new Error('Callback was already called.');
    called = true;
    fn.apply(this, arguments);
  };
}


function noop(){}

/*
 * Makes a task object.
 *
 * @param {string} [name]
 * @param {function} fn
 * 
 * @return {object}
 */
function mkTask(name, fn) {
  if (!fn) {
    fn = name;
    name = uniqueId();
  }

  if (is.not.fn(fn)) throw new TypeError('Expected `fn` to be a function.');

  return {
    name: name,
    fn: fn
  };
}

var getName = prop('name');

var EVENTS = [
  'start',
  'stop',
  'empty'
].reduce(function (o, e) {
  o[e.toUpperCase()] = e;
  return o;
}, {});

var events = new Emitter();
events.setMaxListeners(200);

// ensure work is not done until next tick
function asyncEmit(emitter) {
  var _emit = emitter.emit;
  emitter.emit = function() {
    var args = arguments;
    var self = this;
    setImmediate(function() {
      _emit.apply(self, args);
    });
  };
}

var DEFAULT_QUEUE_OPTS = {
  concurrency: 1
};

/*
 * Async Queue
 */
function Queue(name, opts) {
  opts = opts || {};
  this.opts = defaults(opts, DEFAULT_QUEUE_OPTS);

  this.name = name;
  this.concurrency = this.opts.concurrency;
  this.tasks = [];
  this.workers = 0;
  this.paused = false;
}

Queue.prototype = {
  push: function(name, fn) {
    var task = mkTask(name, fn);

    var isDup = this.tasks.some(comp(is.equal(task.name), getName));
    if (isDup) return false;

    this.tasks.push(task);
    this._run(this);
    return true;
  },

  start: function() {
    if (!this.paused) return false; // nothing to see, sir
    this.paused = false;
    this._run();
    this.emit(EVENTS.START, this.name);
    return true;
  },

  stop: function() {
    if (this.paused) return false;
    this.paused = true;
    this.emit(EVENTS.STOP, this.name);
    return true;
  },

  empty: function() {
    if (this.tasks.length) {
      this.tasks = [];
      this.emit(EVENTS.EMPTY, this.name);
      return true;
    }
    return false;
  },

  remove: function(name) {
    var idx = this.tasks.map(getName).indexOf(name);

    if (idx > -1) {
      this.tasks.splice(idx, 1);
      return true;
    }

    return false;
  },

  emit: noop,

  _run: function() {
    var nWorkers = this.getAvailWorkers();

    // No work or can't work
    if (this.paused || !nWorkers || !this.tasks.length) return;

    // Upcoming working tasks
    var tasks = this.tasks.splice(0, nWorkers);
    this.workers += tasks.length;

    var done = function _done() {
      this.workers -= 1;
      if (is.zero(this.workers)) this.emit(EVENTS.EMPTY, this.name);
      else this._run();
    }.bind(this);

    tasks.forEach(function(t) {
      t.fn.call(t.fn, once(done));
    }, this);
  },

  getAvailWorkers: function() {
    var n = this.concurrency - this.workers;
    return n > 0 ? n : 0;
  }
};

function MultiQueue(opts) {
  this._opts = defaults((opts || {}), {});

  this._queues = Object.create(null);

  Emitter.call(this);
  asyncEmit(this);
}

inherits(MultiQueue, Emitter);

extend(MultiQueue.prototype, {
  _getQ: function (key) {
    if (!key) key = DEFAULT_QUEUE;
    return this._queues[key];
  },

  _newQ: function(key, opts) {
    if (is.not.str(key)) {
      opts = key;
      key = DEFAULT_QUEUE; 
    }

    var q = new Queue(key, opts);
    this._queues[key] = q;

    // Delegate each queue to emit it's own events
    q.emit = this.emit.bind(this);

    return q;
  },

  push: function(key, task, opts) {
    if (is.fn(key)) {
      opts = task || {};
      task = key;
      key = DEFAULT_QUEUE;
    }

    var q = this._getQ(key);
    if (!q) q = this._newQ(key, opts);

    return q.push(opts.name, task);
  },

  start: function(key) {
    var q = this._getQ(key);
    if (!q) return false;
    return q.start();
  },

  stop: function(key) {
    var q = this._getQ(key);
    if (!q) return;
    return q.stop();
  },

  empty: function(key) {
    var q = this._getQ(key);
    if (!q) return;
    return q.empty();
  },

  remove: function(key, name) {
    var q = this._getQ(key);
    if (!q) return false;
    return q.remove(name);
  }
});

exports.mkTask = mkTask;
exports.Queue = Queue;
exports.MultiQueue = MultiQueue;

// TODO handle unique
// TODO handle deleting queues that are empty/resetting concurrency
