'use strict';

var DEFAULT_QUEUE = '__main__';
var is = require('is-predicate');
var Emitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var extend = require('util')._extend;

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
function mkTask(name, isUnique, fn) {
  if (is.not.string(name)) name = uniqueId();

  // Allow setting isUnique to true through
  if (is.str(isUnique)) {
    name = isUnique;
    isUnique = true;
  } else if (is.not.bool(isUnique)) {
    isUnique = false;
  }

  if (is.not.fn(fn)) throw new TypeError('Expected `fn` to be a function.');

  return {
    name: name,
    unique: isUnique,
    fn: fn
  };
}

var getName = prop('name');

var EVENTS = [
  'start', 'stop', 'empty',
  'queue', 'run', 'done'
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
  this.tasks = [];
  this.workers = 0;
  this.paused = false;
  this.setConcurrency(this.opts.concurrency);
}

Queue.prototype = {
  push: function(name, isUnique, fn) {
    var task = mkTask(name, isUnique, fn);

    var isDup = this.tasks.some(function(t) {
      return (task.name === t.name) && t.unique;
    });
    if (isDup) return false;

    this.tasks.push(task);

    // This task is queued
    if (!this.getAvailWorkers()) this.emit(EVENTS.QUEUE, this.name, task.name);

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

  setConcurrency: function(n) {
    if (n < 1) n = 1; // min concurrency is 1
    if (this.concurrency === n) return;
    this.concurrency = this.opts.concurrency = n;
  },

  emit: noop,

  _run: function() {
    var nWorkers = this.getAvailWorkers();

    // No work or can't work
    if (this.paused || !nWorkers || !this.tasks.length) return;

    // Upcoming working tasks
    var tasks = this.tasks.splice(0, nWorkers);
    this.workers += tasks.length;

    var self = this;

    var done = function _done(name, taskName) {
      return function __done(err) {
        self.workers -= 1;
        self.emit(EVENTS.DONE, err, name, taskName);

        if (!self.tasks.length) self.emit(EVENTS.EMPTY, self.name);
        else self._run();
      };
    };

    tasks.forEach(function(t) {
      t.fn.call(t.fn, once(done(this.name, t.name)));
      this.emit(EVENTS.RUN, this.name, t.name);
    }, this);
  },

  getAvailWorkers: function() {
    var n = this.concurrency - this.workers;
    return n > 0 ? n : 0;
  },

  get length () {
    return this.tasks.length + this.workers;
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

    return q.push(opts.name, opts.unique, task);
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
    if (!name) {
      name = key;
      key = DEFAULT_QUEUE;
    }

    var q = this._getQ(key);
    if (!q) return false;
    return q.remove(name);
  }
});

exports.mkTask = mkTask;
exports.Queue = Queue;
exports.MultiQueue = MultiQueue;
