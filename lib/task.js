'use strict';

var deepEqual = require('deep-equal');
var async = require('async');

var c = 0;
function id() {
  return c++; // see what I did there?
}

function mkTask(key, task) {
  return {
    id: id(),
    key: key,
    task: task,
    status: 'queued'
  };
}

function TaskQueue(key, worker, concurrency) {
  this.key = key;
  this.concurrency = concurrency;
  this.paused = false;
  this.queue = async.queue(worker, concurrency);
  this.tasks = this.queue.tasks;
}

TaskQueue.prototype = {
  /**
   * Sets the queue in a paused state
   */
  pause: function() {
    this.paused = true;
  },

  /**
   * Sets the queue in an unpaused state
   */
  resume: function() {
    this.paused = false;
  },

  /**
   * Adds a task to the queue
   */
  enqueue: function(task) {
    return this.queue.push(mkTask(this.key, task));
  },

  /**
   * Return an array of tasks based on concurrency.
   * Said tasks are removed from the queue.
   */
  dequeue: function(task) {

    // No tasks should run for this queue while dequeuing is in progress
    this.pause();

    // Iterate till task list is exhaused or found a task
    var idx = null;
    for (var i = 0, l = this.length; i < l || idx == null; i++) {
      if (deepEqual(task, this.tasks[i].task)) idx = i;
    }

    if (idx == null) return null;

    return this.tasks.splice(idx, 1);
  },

  /**
   * Return an array of tasks based on concurrency.
   * Said tasks are removed from the queue.
   */
  empty: function() {
    var q = this.queue;
    this.queue = [];
    return q;
  },

  /**
   * Returns a boolean value based on existence of task
   * Uses deepEqual to compare if tasks are identical
   */
  has: function(task) {
    return this.tasks.some(function(t) {
      return deepEqual(task, t.task);
    });
  },

  get length() {
    return this.tasks.length;
  }
};

module.exports = TaskQueue;
