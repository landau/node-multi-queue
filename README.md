node-multi-queue
================

An async queue.

### Features

* Multiple/Managable queues

## Install

`npm i -S multi-queue`

## Usage

```
var Queue = require('multi-queue');
var q = new Queue();

q.on('drain:tweets', function(info) {
  console.log(info.queue); // tweets
  console.log(info.length); // 0
});


// Request pages 1 - 5,
// 3 pages at a time
// disallow duplicate requests per unique
[1, 2, 2, 3, 4, 5].forEach(function(page) {
  q.push('tweets', function(done) {
    twitter.fetchPage(page, function() {
    });
  }, { concurrency: 3, unique: 'fetch' + page })
})

```

## API

### Constructor

```js
var Queue = require('multi-queue');
var q = new Queue();
```

### Queue#add `push([key], task, [options])`

If no key is provided then the task is added to the default queue.

```js
var q = new Queue();
q.push('repos', function(done) {
  github.getRepos(function (err, repos) {
    // do some stuff
    done();
  });
});
```

#### Option: `name`

By specifying a name for a task you gain the ability to call the following methods:

* remove

#### Option: `unique`

This option guarantees your tasks are unique.

```js
var q = new Queue();
q.push(getTweets, { unique: 'tweets' });
q.push(getTweets, { name: 'tweets', unique: true }); // equivalent to the above

q.push(getTweetsAgain, { unique: 'tweets' }); // Will not be added to queue
q.push(myKey, getTweetsAgain, { unique: 'tweets' }); // Added to the myKey queue
```

> Note: Whatever value set to `unique` will name the task as such. In otherwords,
> it is equivalent to `{ name: 'tweets', unique: true }`.

#### Option: `concurrency`
> Default: 1

Executes N tasks specified by `concurrency`. `concurrency` is prioritized by the
first task that specifies it for a given `key`. `concurrency` can be overridden
once all tasks for a given `key` have completed.

```js
var q = new Queue();
q.push(getTweets, { concurrency: 5 });
q.push(getTweets, { concurrency: 2 }); // Already set with 5. Ignored

// Some time later after previous requests complete
q.push(getTweets, { concurrency: 2 }); // Now set to 2
```

### Queue#start `start([key])`

Start a queue specified by `key`.

> If `key` is omitted then the default queue is started

### Queue#stop `stop([key], name)`

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

`Queue` extends `EventEmitter` and emits the following events:

> You can listen to a specific queue's events by namespacing as provided by `key`.
> Ex: `queue.on('drain:myQueue', ...); queue.push('myQueue'....);`

* `start` // Start a queue to begin running tasks
* `stop`  // Stops a queue from running tasks
* `empty` // Called when a queue is empty
* `drain` // Called when a queue is completely exhausted (0 running/queued tasks)
* `queue` // Called when a new task has been added to a queue

The callback provided to these events will receive the following `object`.

```js
{
  queue: [key], // name of queue
  length: [n] // number of remaining tasks in queue
}
```

## TODO
- Timeout tasks
