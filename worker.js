importScripts('numbers.js');

self.addEventListener('message', function (event) {
	solutions(event.data.target, event.data.numbers, function (expr) {
		self.postMessage(expr.toString());
		return true;
	});

	self.postMessage(null);
	self.close();
}, false);
