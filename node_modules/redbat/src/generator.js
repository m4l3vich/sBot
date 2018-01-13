const EventEmitter = require("./eventemitter");
const _ = require("lodash");

module.exports = function() {
	var self = this;

	this.methods = {};
	
	this.Generator = function() {
		var gen = this;

		EventEmitter.apply(this);

		_.each(_.keys(self.methods), function(method) {
			if (gen[method]) {
				throw new Error("Method '" + method + "' already exists");
			}

			gen[method] = self.methods[method];
		});
	}	
}