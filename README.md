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

q.on('drain:tweets', function(info) {
  console.log(info.queue); // tweets
  console.log(info.length); // 0
});

// Request pages 1 - 5,
// 3 pages at a time
// disallow duplicate requests per unique
[1, 2, 2, 3, 4, 5].forEach(function(page) {
  q.push('tweets', function(done) {
    twitter.fetchPage(page, function(err, tweets) {
      // Do some stuff with tweets
      done(); // 
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
q.push('myKey', getTweetsAgain, { unique: 'tweets' }); // Added to the myKey queue
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

`Queue` extends `EventEmitter` and emits the following events:

* `start` // Called when `start` is called
* `stop`  // Called when a `stop` is called
* `empty` // Called when a queue is emptied

```js
mq.on('start', function(name) {
  console.log(name); // foo
})
mq.start('foo');
```

## TODO
- Timeout tasks
- Active concurrency (When a task with a differenct concurrency is added to the queue update value)
