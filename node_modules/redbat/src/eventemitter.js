const Namespace = require("./namespace");
const _ = require("lodash");

module.exports = function(options) {
	const emitter = this;

	options = _.defaults(options, {
		fast: false,
		defaultNamespace: "default",
		stats: false,
		id: Math.random()
	});

	this._id = options.id;

	this.namespaces = {};

	this.namespaces[options.defaultNamespace] = new Namespace({
		id: emitter._id
	}, emitter);

	this.namespace = this.of = function(name, namespaceOptions) {
		if (!name) return emitter.namespaces[options.defaultNamespace];

		if (!emitter.namespaces[name]) {
			return emitter.namespaces[name] = new Namespace(_.defaults(namespaceOptions, {
				id: Math.random(),
				stats: options.stats
			}), emitter);
		} else {
			return emitter.namespaces[name];
		}
	}

	const namespace = this.namespace();

	this.on = namespace.on;
	this.onFast = namespace.onFast;
	this.once = namespace.once;
	this.onceFast = namespace.onceFast;
	this.wait = namespace.wait;
	this.emit = namespace.emit;
	this.emitFast = namespace.emitFast;
	this.use = namespace.use;
	this.catch = namespace.catch;
	this.listener = namespace.getListeners;
	this.pipe = namespace.pipe;
	this.pipe2 = namespace.pipe2;
	this.unpipe = namespace.unpipe;
	this.merge = namespace.merge;
	this.merge2 = namespace.merge2;
	this.freeze = namespace.freeze;
	this.stats = namespace.stats;

	this.reset = function(what = "all") {
		if (what === "all") {
			emitter.namespaces = {};
			emitter.namespaces[options.defaultNamespace] = new Namespace(emitter._id, emitter);
		} else if (what === "namespaces") {
			_.each(_.keys(emitter.namespaces), key => emitter.namespaces[key].reset());
		} else {
			throw new Error("Cannot reset '" + what +"'");
		}
	}

	if (options.fast) {
		delete this.on;
		delete this.use;
		delete this.once;
		delete this.emit;
		delete this.pipe;
		this.on = this.onFast;
		this.once = this.onceFast;
		this.emit = this.emitFast;
	}

	return this;
}
