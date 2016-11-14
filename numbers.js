"use strict";

function Expr () {}

Expr.prototype = {
	toStringUnder: function (precedence) {
		if (precedence > this.precedence) {
			return '('+this.toString()+')';
		}
		else {
			return this.toString();
		}
	}
};


function BinExpr (op) {
	this.op = op;
}

BinExpr.prototype = new Expr();

BinExpr.prototype.initBinExpr = function (left, right, value, generation) {
	this.left       = left;
	this.right      = right;
	this.value      = value;
	this.used       = left.used | right.used;
	this.id         = this.toId();
	this.generation = generation;
	return this;
};

BinExpr.prototype.toString = function () {
	var p = this.precedence;
	return this.left.toStringUnder(p) + ' ' + this.op + ' ' + this.right.toStringUnder(p);
};

BinExpr.prototype.toId = function () {
	return '('+this.left.toId()+this.op+this.right.toId()+')';
};


function Add () {}

Add.prototype = new BinExpr('+');

Add.prototype.precedence = 0;

Add.prototype.init = function (left, right, generation) {
	return this.initBinExpr(left, right, left.value + right.value, generation);
};


function Sub () {}

Sub.prototype = new BinExpr('-');

Sub.prototype.precedence = 1;

Sub.prototype.init = function (left, right, generation) {
	return this.initBinExpr(left, right, left.value - right.value, generation);
};


function Mul () {}

Mul.prototype = new BinExpr('*');

Mul.prototype.precedence = 3;

Mul.prototype.init = function (left, right, generation) {
	return this.initBinExpr(left, right, left.value * right.value, generation);
};


function Div () {}

Div.prototype = new BinExpr('/');

Div.prototype.precedence = 2;

Div.prototype.init = function (left, right, generation) {
	return this.initBinExpr(left, right, left.value / right.value, generation);
};


function Val () {}

Val.prototype = new Expr();

Val.prototype.op = '$';
Val.prototype.precedence = 4;

Val.prototype.init = function (value, index, generation) {
	this.value      = value;
	this.index      = index;
	this.used       = 1 << index;
	this.id         = this.toId();
	this.generation = generation;
	return this;
};

Val.prototype.toString = function () {
	return String(this.value);
};

Val.prototype.toId = Val.prototype.toStringUnder = Val.prototype.toString;


function isNormalizedAdd (left, right) {
	var ro = right.op;
	if (ro === '+' || ro === '-') {
		return false;
	}

	var lo = left.op;
	if (lo === '+') {
		return left.right.value <= right.value;
	}
	else if (lo === '-') {
		return false;
	}
	else {
		return left.value <= right.value;
	}
}

function isNormalizedSub (left, right) {
	var ro = right.op;
	if (ro === '+' || ro === '-') {
		return false;
	}

	var lo = left.op;
	if (lo === '-') {
		return left.right.value <= right.value;
	}
	else {
		return true;
	}
}

function isNormalizedMul (left, right) {
	var ro = right.op;
	if (ro === '*' || ro === '/') {
		return false;
	}

	var lo = left.op;
	if (lo === '*') {
		return left.right.value <= right.value;
	}
	else if (lo === '/') {
		return false;
	}
	else {
		return left.value <= right.value;
	}
}

function isNormalizedDiv (left, right) {
	var ro = right.op;
	if (ro === '*' || ro === '/') {
		return false;
	}

	var lo = left.op;
	if (lo === '/') {
		return left.right.value <= right.value;
	}
	else {
		return true;
	}
}

function make (a, b, generation, addExpr) {
	var avalue = a.value;
	var bvalue = b.value;

	if (isNormalizedAdd(a, b)) {
		addExpr(new Add().init(a, b, generation));
	}
	else if (isNormalizedAdd(b, a)) {
		addExpr(new Add().init(b, a, generation));
	}

	if (avalue !== 1 && bvalue !== 1) {
		if (isNormalizedMul(a, b)) {
			addExpr(new Mul().init(a, b, generation));
		}
		else if (isNormalizedMul(b, a)) {
			addExpr(new Mul().init(b, a, generation));
		}
	}

	if (avalue > bvalue) {
		if (avalue - bvalue !== bvalue && isNormalizedSub(a, b)) {
			addExpr(new Sub().init(a, b, generation));
		}

		if (bvalue !== 1 && avalue % bvalue === 0 && avalue / bvalue !== bvalue && isNormalizedDiv(a, b)) {
			addExpr(new Div().init(a, b, generation));
		}
	}
	else if (bvalue > avalue) {
		if (bvalue - avalue !== avalue && isNormalizedSub(b, a)) {
			addExpr(new Sub().init(b, a, generation));
		}

		if (avalue !== 1 && bvalue % avalue === 0 && bvalue / avalue !== avalue && isNormalizedDiv(b, a)) {
			addExpr(new Div().init(b, a, generation));
		}
	}
	else if (bvalue !== 1) {
		if (isNormalizedDiv(a, b)) {
			addExpr(new Div().init(a, b, generation));
		}
		else if (isNormalizedDiv(b, a)) {
			addExpr(new Div().init(b, a, generation));
		}
	}
}

function make_half (a, b, generation, addExpr) {
	var avalue = a.value;
	var bvalue = b.value;

	if (isNormalizedAdd(a, b)) {
		addExpr(new Add().init(a, b, generation));
	}

	if (avalue !== 1 && bvalue !== 1) {
		if (isNormalizedMul(a, b)) {
			addExpr(new Mul().init(a, b, generation));
		}
	}

	if (avalue > bvalue) {
		if (avalue - bvalue !== bvalue && isNormalizedSub(a, b)) {
			addExpr(new Sub().init(a, b, generation));
		}

		if (bvalue !== 1 && avalue % bvalue === 0 && avalue / bvalue !== bvalue && isNormalizedDiv(a, b)) {
			addExpr(new Div().init(a, b, generation));
		}
	}
	else if (avalue === bvalue && bvalue !== 1) {
		if (isNormalizedDiv(a, b)) {
			addExpr(new Div().init(a, b, generation));
		}
	}
}

function solutions (target, numbers, cb) {
	var numcnt = numbers.length;
	var full_usage = ~(~0 << numcnt);
	var generation = 0;
	var segments = new Array(full_usage);
	for (var i = 0; i < segments.length; ++ i) {
		segments[i] = [];
	}

	var exprs = [];
	var has_single_number_solution = false;
	for (var i = 0; i < numbers.length; ++ i) {
		var num = numbers[i];
		var expr = new Val().init(num, i, generation);
		if (num === target) {
			if (!has_single_number_solution) {
				has_single_number_solution = true;
				cb(expr);
			}
		}
		else {
			exprs.push(expr);
			segments[expr.used - 1].push(expr);
		}
	}

	var uniq_solutions = {};

	function addExpr (expr) {
		if (expr.value === target) {
			if (uniq_solutions[expr.id] !== true) {
				uniq_solutions[expr.id] = true;
				cb(expr);
			}
		}
		else if (expr.used !== full_usage) {
			exprs.push(expr);
			segments[expr.used - 1].push(expr);
		}
	}

	var lower = 0;
	var upper = numcnt;
	while (lower < upper) {
		var prev_generation = generation ++;
		for (var b = lower; b < upper; ++ b) {
			var bexpr = exprs[b];
			var bused = bexpr.used;

			for (var aused = 1; aused <= segments.length; ++ aused) {
				if ((bused & aused) === 0) {
					var segment = segments[aused - 1];
					for (var i = 0; i < segment.length; ++ i) {
						var aexpr = segment[i];

						if (aexpr.generation === prev_generation) {
							make_half(aexpr, bexpr, generation, addExpr);
						}
						else {
							make(aexpr, bexpr, generation, addExpr);
						}
					}
				}
			}
		}

		lower = upper;
		upper = exprs.length;
	}
}

function main (args) {
	if (args.length < 3) {
		throw new TypeError("not enough arguments");
	}
	var target = parseInt(args[1], 10);
	if (isNaN(target)) {
		throw new TypeError("target is not a number");
	}
	if (target < 0) {
		throw new TypeError("target musst not be negative");
	}
	var numbers = args.slice(2).map(function (arg) {
		var num = parseInt(arg);
		if (isNaN(num)) {
			throw new TypeError("argument is not a number: "+arg);
		}
		if (num <= 0) {
			throw new TypeError("illegal argument value: "+arg);
		}
		return num;
	});
	if (numbers.length > 32) {
		throw new TypeError("only up to 32 numbers supported");
	}
	numbers.sort(function (lhs, rhs) { return lhs - rhs; });

	console.log("target  = "+target);
	console.log("numbers = ["+numbers.join(', ')+"]");

	console.log("solutions:");
	var i = 1;
	solutions(target, numbers, function (expr) {
		console.log(i+": "+expr.toString());
		++ i;
	});
}

if (typeof(require) !== 'undefined' &&
	typeof(module)  !== 'undefined' &&
	typeof(process) !== 'undefined' &&
	require.main === module) {
	main(process.argv.slice(1));
}
else if (typeof(exports) !== 'undefined') {
	exports.numbers = numbers;
}
