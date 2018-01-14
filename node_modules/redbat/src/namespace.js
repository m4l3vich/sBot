const overload = require("overload-js");
const async = require("async");
const stream = require("stream");
const _ = require("lodash");

const o = overload.o;

const Namespace = function(options = {}, emitter = {}) {
	const namespace = this;

	this.listeners = [];
	this.middlewares = [];
	this.catches = [];
	this.connected = [];
	this.listenerStats = {};
	this.freezed = false;

	this._id = options.id;

	this._input = null;
	this._output = null;

	this.reset = function() {
		this.listeners = [];
		this.middlewares = [];
		this.catches = [];
		this.connected = [];
	}


	this.freeze = function(event, set = true) {
		if (!event) {
			namespace.freezed = set;
		} else {
			namespace.getListeners(event, false, function(e) {
				e.freezed = set;
			});
		}

		return namespace;
	}
	this.unfreeze = function(event) {
		return namespace.freeze(event, false);
	}

	this.getInputStream = function() {
		if (namespace._input) return namespace._input;

		var input = new stream.Writable();

		input._write = function(chunk, encoding, callback) {
			const data = chunk.toString().split(";");
			const type = decodeURIComponent(data[0]);
			const args = data[1].split(",").map(JSON.parse);

			namespace._emit(type, args, false, true);

			callback();
		}

		return namespace._input = input;
	}
	this.getOutputStream = function() {
		if (namespace._output) return namespace._output;

		var output = new stream.Readable();
		var _push = output.push.bind(output);

		namespace.use(function(type, args) {
			_push(encodeURIComponent(type) + ";" + args.map(JSON.stringify));
		}, false, true);

		output._read = function() {
			_push = output.push.bind(this);
		}

		output.resume();

		return namespace._output = output;
	}

	this._on = function(type, ttl, once, handler) {
		var _resolve;
		var noHandler = !handler;

		if (noHandler) {
			handler = function() {
				_resolve(_.slice(arguments));
			}
		}

		const listener = {
			type: type,
			ttl: ttl ? ttl + Date.now() : null,
			handler: handler,
			once: once
		}

		namespace.listeners.push(listener);

		return noHandler ? (new Promise(function(resolve, reject) {
			_resolve = function(args) {
				resolve.apply(namespace, args);
			}
		})) : namespace;
	}
	/*
		Probably should refactor this ;-;
		My eyes are bleeding when I'm reading it
		(My fingers where bleeding when I was writing this)
		Please refactor it for me

		:: Can't find how to do it even in overloadjs doc
	*/
	this.on = overload()
		.args(o.any(RegExp, String, Array), Function).use((type, handler) => namespace._on(type, 0, false, handler))
		.args(o.any(RegExp, String, Array), Number, Function).use((type, ttl, handler) => namespace._on(type, ttl, false, handler));
	this.once = overload()
		.args(o.any(RegExp, String, Array), Function).use((type, handler) => namespace._on(type, 0, true, handler))
		.args(o.any(RegExp, String, Array), Number, Function).use((type, ttl, handler) => namespace._on(type, ttl, true, handler));
	this.wait = (type, ttl) => namespace._on(type, ttl, true, undefined);

	this.delete = function(query) {
		namespace.getListeners(query, true);
		return namespace;
	}

	this.pipe = function() {
		[].push.apply(namespace.connected, namespace.namespacifyAll(arguments));
		return namespace;
	}
	this.pipe2 = function(target) {
		namespace.pipe(target);
		target.pipe(namespace);
	}

	this.merge = function(target) {
		namespace.listeners = namespace.namespacify(target).listeners.concat(namespace.listeners);
	}
	this.merge2 = function(target) {
		namespace.merge(target);
		target.merge(namespace);
	}

	this.unpipe = function(target) {
		target = namespace.namespacify(target);

		_.each(namespace.connected, function(e, i) {
			if (e._id === target._id) {
				namespace.connected.splice(i, 1);
			}
		});
	}

	this.onFast = function(event, handler) {
		namespace.listeners.push({
			type: event,
			handler: handler
		});
		return namespace;
	}
	this.onceFast = function(event, handler) {
		namespace.listeners.push({
			type: event,
			handler: handler,
			once: true
		});
		return namespace;
	}

	this._emit = function(type, args, skipPiped, skipMiddlewares) {
		if (namespace.freezed) return namespace;

		if (options.stats) {
			namespace.listenerStats[type] = ~~namespace.listenerStats[type] + 1;
		}

		if (!skipPiped) _.each(namespace.connected, e => e && e._emit(type, args, true));

		async.eachSeries([
			namespace.executeMiddlewares.bind(namespace, skipMiddlewares),
			namespace.executeListeners
		], function(handler, callback) {
			handler(type, args, callback);
		}, function(error) {
			namespace.triggerError(type, args, error);
		});

		return namespace;
	}

	this.emit = function(type) {
		return namespace._emit(type, _.slice(arguments, 1));
	}

	this.emitFast = function(type) {
		const data = _.slice(arguments, 1);

		_.each(namespace.listeners, function(listener) {
			if (typeof listener.type === "string" ? listener.type === type : _.indexOf(listener.type, type) !== -1) {
				listener.handler.apply(namespace, data);
			}
		});
	}

	this.stats = function() {
		return namespace.listenerStats;
	}

	this.use = function(handler, once, skip) {
	 	namespace.middlewares.push({
			handler: handler,
			once: once,
			skip: skip
		});

	 	return namespace;
	}
	this.useOnce = function(handler, skip) {
		return namespace.use(handler, true, skip);
	}
	this.catch = function(handler) {
		namespace.catches.push({
			handler: handler
		});

		return namespace;
	}

	this.getListeners = function(query, del, each) {
		var result = {
			listeners: []
		};

		_.map(namespace.listeners, function(e, i) {
			if (!e) {
				return false;
			}

			if (e.once) {
				namespace.listeners.splice(i, 1);
			}

			if (e.ttl && e.ttl < Date.now()) {
				namespace.listeners.splice(i, 1);
				return false;
			}

			var ok;

			if (e.type instanceof RegExp) {
				ok = result.matched = query.match(e.type);
			} else if (Array.isArray(e.type)) {
				ok = _.indexOf(e.type, query) !== -1;
			} else {
				ok = e.type === query;
			}

			if (ok && del) {
				namespace.listeners.splice(i, 1);
			} else if (ok && each) {
				each(e);
			}

			if (!e.freezed && ok) {
				result.listeners.push(e);
			}
		});

		return result;
	}

	this.executeListeners = function(type, data, callback) {
		const result = namespace.getListeners(type);
		const listeners = result.listeners;
		const matched = result.matched;
		const shouldCallWithNext = listeners.length > 1;

		if (!listeners.length) {
			return;
		}

		if (shouldCallWithNext) {
			async.eachSeries(listeners, function(listener, callback) {
				listener.handler.apply(result.matched ? matched : listener, _.concat(data, function(error) {
					callback(error || null);
				}));
			}, function(error) {
				callback(error || null);
			});
		} else {
			callback(listeners[0].handler.apply(result.matched ? matched : listeners[0], data));
		}
	}
	this.executeChain = function(skipMarked, chain, getArgs, handlerExecuted, callback) {
		if (!chain.length) return callback();

		var i = 0;
		var once;

		async.eachSeries(chain, function(handler, callback) {
			if (handler.skip && skipMarked) return callback();

			const fn = handler.handler;
			const once = handler.once;

			const next = function(error) {
				callback(error || null);
			}

			const result = fn.apply(namespace, getArgs(fn, next));

			handlerExecuted(fn, result, next);

			if (once) {
				chain.splice(i, 1);
			}

			i++;
		}, callback);
	}
	this.executeMiddlewares = function(skip, type, data, callback) {
		namespace.executeChain(
			skip,
			namespace.middlewares,
			(handler, next) => [type, data, handler.length > 2 ? next : undefined],
			function(handler, result, next) {
				if (handler.length < 3) {
					next(result);
				}
			},
			callback
		);
	}
	this.triggerError = function(type, args, error) {
		if (!error) return;
		if (!namespace.catches.length) throw error;

		namespace.executeChain(
			false,
			namespace.catches,
			(handler, next) => [type, args, error, next],
			function(handler, result, next) {
				if (handler.length < 4) {
					next(result); // lol, this will fall in recursion if error handler will also end with error
				}
			},
			function() {} // dummy function
		);

		return true;
	}

	this.namespacifyAll = function(data) {
		return _.map(data, namespace.namespacify);
	}
	this.namespacify = function(query) {
		if (query instanceof Namespace) {
			return query;
		} else {
			return emitter.namespace(query);
		}
	}
	this.namespace = this.of = emitter.namespace;

	return this;
}

module.exports = Namespace;
