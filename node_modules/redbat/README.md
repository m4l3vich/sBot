# RedBat

[![Build Status](https://travis-ci.org/RedFoxCode/redbat.svg?branch=master)](https://travis-ci.org/RedFoxCode/redbat)

**redbat** is a re-implementation of regular EventEmitter with extra-features (middlewares, ttl and other).

# Features

* Fluent API
* Midвlewares
* TTL for listeners
* Namespaces
* Namespace event piping

# Reference

### Namespaces

Namespaces store events/middlewares where events are emitted/processed/manipulated. Namespaces are like separate rooms in the flat - if you will say `hello` in one room, it will not be said in another room.

When creating EventEmitter instance and executing this code...

```javascript
const emitter = new redbat.EventEmitter();

emitter
    .on("test", function() {})
    .emit("test");
```

...it will emit and process event `test` in namespace called `default`. If you wish you can change it's name to whatever you like by providing options argument to EventEmitter constructor as first argument:

```javascript
const emitter = new redbat.EventEmitter({
    defaultNamespace: "df"
});
```

Now if we will call `on` method it will be emitted in `df` namespace. To emit event to another namespace you need to use `namespace` method:

```javascript
emitter.namespace(); // will return default namespace
emitter.namespace("my namespace"); // will create and return new namespace called 'my namespace'
emitter.namespace("my namespace"); // will return already existing namespace
```

To emit event in namespace you do pretty much the same:

```javascript
emitter
    .namespace("my namespace")
    .on("test", function() {}) // will be executed
    .emit("test");

emitter.emit("test"); // will not be executed (emitted in default namespace)
```

### Listeners

**on**

To create new listener you should call `on` method of Namespace. It accepts next arguments:

1. **type** (required), array or string
2. **ttl** (optional), number
3. **handler** (required), function

Type is event name on which listeners should be called. It can be string: `"my event"`, it will be triggered by event `my event`. And it can be array of strings: `["my event", "my event 2"]`, it will be triggered by event `my event` and `my event 2`.

TTL is abbreviation from `time to live`. It's a number representing time in milliseconds after which listener will be destroyed.

Handler is function that will be called when event will be fired.

To destroy listener use `delete` method.

```javascript
emitter.delete("1337");
```

**emit**

To emit event you should call `emit` method of Namespace. It accepts type as first argument. Other arguments will be given in event handler.

```javascript
emitter
    .on("test", function(a, b, c) {
        console.log(a, b, c); // logs '1 2 3'
    })
    .emit("test", 1, 2, 3);
```

**chaining events**

If you have more then one listener for one event you shoud call function provided as last argument given in event handler. By calling it you assume that event handler has finished it's work.

```javascript
emitter
    .on("test", function(next) {
        next();
    })
    .on("test", function(next) {
        next();
    })
    .emit("test");
```

**once and wait**

If you need to process handler only once and then destroy listener use `once` method. It accepts same arguments as `on` and you can chain them.

Wait is the same as `once`, the only difference is that `wait` method returns instance of Promise.

```javascript
emitter.wait("test").then(console.log);
```

So you can use it with await (ES6)

```javascript
async function waitPlease() {
    return console.log(await emitter.wait("test"));
}

waitPlease();
```

**event piping**

You can pipe (redirect) events from one namespace to another by calling `pipe` method of Namespace. It accepts Namespace as first argument or it's name.

```javascript
emitter.namespace("1").pipe("2");

emitter.namespace("1")
    .on("test", console.log); // will be called

emitter.namespace("2")
    .on("test", console.log); // also will be called

emitter.namespace("1").emit("test", "Hello");

// but...

emitter.namespace("2").emit("test", "Hello"); // handler in namespace '1' will not be called
```

To unpipe namespace use `unpipe` method

```javascript
emitter
    .namespace("1")
    .unpipe("2");
```

**middlewares**

Middlewares are functions that are called before processing any event of namespace (doesn't matter does event handler exist or not). You can have as many middlewares as you want (until memory runs out). Middleware handler takes three arguments:

1. **type** string - you got it lol
2. **args** array - array of arguments given in emit
3. **next** function - must be called when middleware finished it's work

To add a middleware use `use` method of Namespace

```javascript
emitter.use(function(type, args, next) {
    console.log("I'm a middleware");
    next();
});
```

Example of two middlewares:

```javascript
emitter
    .use(function(type, args, next) {
        console.log(1);
        next();
    })
    .use(function(type, args, next) {
        console.log(2);
        next();
    })
    .emit("some event");
```

You may not call `next` if middleware handler takes only 2 arguments. `next` will be called by it self

```javascript
// will also work
emitter
    .use(function(type, args) {
        console.log(1);
    })
    .use(function(type, args) {
        console.log(2);
    })
    .emit("some event");
```

You can indicate that middleware finished with error. To do it call `next` with first argument as error

```javascript
emitter.use(function(type, args, next) {
    next(new Error("Error testing"));
});
```

This will just throw an error. To handle them you should add error handler with `catch` method.

```javascript
emitter.catch(function(type, args, error, next) {
    // handle error somehow
});
```

**onFast, onceFast, emitFast**

If you don't need features like TTL or middlewares, but performance use `onFast`, `onceFast` and `emitFast` to create and call listeners. `onFast` takes same arguments, but without TTL. `onceFast` takes same arguments as `onFast`. `emitFast` takes same arguments as `emit`. Using this method this will disable features like middlewares.

> **Note:** I don't actually know why you will need this, because you can use regular EventEmitter

### Advanced usage

**Listener with regexp** 

`on` method can take RegExp as first argument.

```javascript
emitter.on(/^test/i, function() {}); // will be triggered two times
emitter.emit("test1").emit("test2");
```

**Resetting namespaces**

You can delete all namespaces of EventEmitter.

```javascript
emitter.reset("all");
```

Or just reset state of all EventEmitter namespaces (will not delete namespaces, but reset their listener, middlewares etc)

```javascript
emitter.reset("namespaces");
```

For namespaces, `reset` method takes no arguments.

```javascript
emitter.namespace().reset();
```

**Freezing events and namespaces**

To freeze the whoole namespace call `freeze` method with no arguments

```javascript
emitter.on("test", function() {}).freeze().emit("test"); // will not trigger event
```

To unfreeze use `unfreeze` method.

You can freeze event given in first argument of `freeze` method

```javascript
emitter
    .on("foo", function() {}) // will not be triggered
    .on("bar", function() {}) // will be triggered
    .freeze("foo")
    .emit("foo")
    .emit("bar");
```

**Collecting namespace stats**

You can collect stats of listeners of namespaces (see how much listener was called). Psss... second argument of `namespace` EventEmitter method takes namespace options.

```javascript
emitter.namespace("php", {
    stats: true
}).emit("shit").stats(); // => { "shit": 1 }
```

**Creating independent namespace**

To create a namespace that is independent of its eventemitter use `Namespace` constructor.

```javascript
const independentNamespace = new redbat.Namespace();
```

Of course, you cannot call `namespace` method

```javascript
independentNamespace.namespace(); // throws an exception
```

All features (middlewares, ttl, event piping, etc) work as well.

**getInputStream and getOutputStream**

You can get a readable stream of events and writable stream to emit events in namespace.

```javascript
independentNamespace.getInputStream().write("test;hello");
```

This code will emit event called `test` and with arguments `["hello"]`. The structure of input stream chunks is: `<event name>;<arg1>,<arg2>...`. Every element should be url encoded.

Output stream sends every event emitted in namespace

```javascript
independentNamespace.getOutputStream().pipe(process.stdout);
independentNamespace.emit("test", "hello");
/*
this should write in console: test;hello
*/
```

Or you can save event history to file

```javascript
independentNamespace.getOutputStream().pipe(fs.createWriteStream("eventhistory.log"));
```

# Other

For building and testing first install dependencies

```sh
cd redbat
npm install
```

**testing**

```sh
npm run test
```

**building**

```sh
npm run build
```

# LICENSE

MIT License

Copyright (c) 2017 Gleb Makagonov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
