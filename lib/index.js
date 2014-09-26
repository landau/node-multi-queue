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

function mkTask(name, fn) {
  if (!fn) {
    fn = name;
    if (is.not.fn(fn)) throw new TypeError('Expected `fn` to be a function.');
    name = uniqueId();
  }

  return {
    name: name,
    fn: fn || noop
  };
}

var getName = prop('name');

var DEFAULT_QUEUE_OPTS = {
  concurrency: 1
};

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
    return true;
  },

  stop: function() {
    if (this.paused) return false;
    this.paused = true;
    return true;
  },

  empty: function() {
    if (this.tasks.length) {
      this.tasks = [];
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

  _run: function() {
    var nWorkers = this.getAvailWorkers();

    // No work or can't work
    if (this.paused || !nWorkers || !this.tasks.length) return;

    // Upcoming working tasks
    var tasks = this.tasks.splice(0, nWorkers);
    this.workers += tasks.length;

    var done = function _done() {
      this.workers -= 1;
      this._run();
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
