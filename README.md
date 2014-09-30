[![Build Status](https://travis-ci.org/landau/node-multi-queue.svg?branch=master)](https://travis-ci.org/landau/node-multi-queue)

node-multi-queue
================

An async queue.

### Features

* Multiple/Managable queues

## Install

`npm i -S multi-queue`

## Usage

```js
var mqueue = require('multi-queue');
var mq = mqueue();

// Request pages 1 - 5,
// 3 pages at a time
// disallow duplicate requests per unique, page 2 will NOT run twice
[1, 2, 2, 3, 4, 5].forEach(function(page) {
  mq.push('tweets', function(done) {
    twitter.fetchPage(page, function(err, tweets) {
      // Do some stuff with tweets
      done(); // Must call done to inform mq that task is complete
    });
  }, { concurrency: 3, unique: 'fetch' + page });
})

```

## API

### Constructor

```js
var Queue = require('multi-queue');
var q = new Queue();
```

### Queue#push `push([key], task, [options])`

Add a task to a queue(`key`).

`task` is expected to be a function that receives a single callback argument
which must be called to continue processing tasks.

> If no key is provided then the task is added to the default queue.

```js
var mq = mqueue();
// add task to the `repos` queue
mq.push('repos', function(done) {
  github.getRepos(function (err, repos) {
    // do some stuff
    done(); // Must call done to inform mq that the task is complete
  });
});

// Add to default queue with some concurrency
mq.push(function(done) {
  github.getRepos(function (err, repos) {
    // do some stuff
    done(); // Must call done to inform mq that the task is complete
  }, { concurrency: 10 });
});

// Add to a queue uniquely
mq.push(function(done) {
  github.getRepos(function (err, repos) {
    // do some stuff
    done(); // Must call done to inform mq that the task is complete
  }, { unique: 'github' });
});

// IGNORED
mq.push(function(done) {
  github.getRepos(function (err, repos) {
    // do some stuff
    done(); // Must call done to inform mq that the task is complete
  }, { unique: 'github' });
});
```

#### Option: `name`

By specifying a name for a task you gain the ability to call the following methods:

* remove

#### Option: `unique`

This option guarantees your tasks are unique.

```js
var mq = mqueue();
mq.push(getTweets, { unique: 'tweets' });
mq.push(getTweets, { name: 'tweets', unique: true }); // equivalent to the above

mq.push(getTweetsAgain, { unique: 'tweets' }); // Will not be added to queue
mq.push('myKey', getTweetsAgain, { unique: 'tweets' }); // Added to the myKey queue
```

> Note: If a `string` value is set to `unique` then that will act as a name and unique will
> be set to `true`.
> In otherwords, `{unique: 'tweets'}` is equivalent to `{ name: 'tweets', unique: true }`.

#### Option: `concurrency`
> Default: 1

Executes N tasks specified by `concurrency`. `concurrency` is set by the first task
to be added to a queue. 

```js
var q = new Queue();
q.push(getTweets, { concurrency: 5 });
q.push(getTweets, { concurrency: 2 }); // Already set with 5. Ignored
q.push('tweets', getTweets, { concurrency: 2 }); // Added to different queue, uses 2
```

### Queue#start `start([key])`

Start a queue specified by `key`.

> If `key` is omitted then the default queue is started

### Queue#stop `stop([key])`

Stop a queue specified by `key`.

> If `key` is omitted then the default queue is stopped

### Queue#empty `empty([key])`

Remove all tasks from the queue specified by `key`.

> If `key` is omitted then the default queue is emptied

### Queue#remove `remove([key], name)`

Remove a task(`name`) from the queue(`key`).

> If `key` is omitted then the default queue is used

> In order to remove a task then it must be named when it is added via queue.push.

### Events

`MultiQueue` extends `EventEmitter` and emits the following events:

#### `start` 

Called when `start` is called

```js
mq.on('start', function(name) {
  console.log(name); // foo
})
mq.start('foo');
```

#### `stop` 

Called when `stop` is called

```js
mq.on('stop', function(name) {
  console.log(name); // foo
})
mq.stop('foo');
```

#### `empty` 

Called when a queue is emptied

```js
mq.on('empty', function(name) {
  console.log(name); // name of emptied queue
})
mq.empty('foo');
```

#### `queue` 

Called when a task is added and queued (can't run immediately)

```js
mq.on('queue', function(name, taskName) {
  console.log(name); // name of queue added to 'foo'
  console.log(taskName); // name of task 'baz'. `bar` was not queued
})
mq.push('foo', someFn, { name: 'bar', concurrency: 1 });
mq.push('foo', someFn, { name: 'baz' });
```

#### `run` 

Called when a task is executed

```js
mq.on('run', function(name, taskName) {
  console.log(name); 
  console.log(taskName); 
})
mq.push('foo', someFn, { name: 'bar' });
```

#### `duplicate` 

Called when a task is executed

```js
// called once in this scenario
mq.on('duplicate', function(name, taskName) {
  console.log(name); // 'foo'
  console.log(taskName); 'bar'
})
mq.push('foo', someFn, { name: 'bar' });
mq.push('foo', someFn, { name: 'bar' });
```

#### `done` 

Called when a task is completed

> Pass values into `done` in order to gain some insight into the task

```js
// Expose an error
function someFn(done) {
  done(new Error('test'));
}
mq.on('done', function(err, name, taskName) {
  console.log(err.message); // 'test'
  console.log(name); 
  console.log(taskName); 
})
mq.push('foo', someFn, { name: 'bar' });

```js
// Expose values
function someFn(done) {
  done(null, 'hi');
}
mq.on('done', function(err, val, name, taskName) {
  console.log(err); // null
  console.log(val); // 'hi'
  console.log(name); 
  console.log(taskName); 
})
mq.push('foo', someFn, { name: 'bar' });
```


## TODO
- Timeout tasks
- Active concurrency (When a task with a differenct concurrency is added to the queue update value)
