"use strict";

importScripts('numbers.js');

self.addEventListener('message', function (event) {
	solutions(event.data.target, event.data.numbers, function (expr) {
		self.postMessage(expr.toString());
	});

	self.postMessage(null);
	self.close();
}, false);
