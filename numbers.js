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


function BinExpr () {}

BinExpr.prototype = new Expr();

BinExpr.prototype.initBinExpr = function (left,right,value,op) {
	this.left  = left;
	this.right = right;
	this.value = value;
	this.op    = op;
	this.used  = left.used | right.used;
	this.id    = this.toId();
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

Add.prototype = new BinExpr();

Add.prototype.precedence = 0;

Add.prototype.init = function (left,right) {
	return this.initBinExpr(left,right,left.value + right.value,'+');
};


function Sub () {}

Sub.prototype = new BinExpr();

Sub.prototype.precedence = 1;

Sub.prototype.init = function (left,right) {
	return this.initBinExpr(left,right,left.value - right.value,'-');
};


function Mul () {}

Mul.prototype = new BinExpr();

Mul.prototype.precedence = 3;

Mul.prototype.init = function (left,right) {
	return this.initBinExpr(left,right,left.value * right.value,'*');
};


function Div () {}

Div.prototype = new BinExpr();

Div.prototype.precedence = 2;

Div.prototype.init = function (left,right) {
	return this.initBinExpr(left,right,left.value / right.value,'/');
};


function Val () {}

Val.prototype = new Expr();

Val.prototype.precedence = 4;

Val.prototype.init = function (value,index) {
	this.value = value;
	this.index = index;
	this.op    = '$';
	this.used  = 1 << index;
	this.id    = this.toId();
	return this;
};

Val.prototype.toString = function () {
	return String(this.value);
};

Val.prototype.toId = Val.prototype.toStringUnder = Val.prototype.toString;


function isNormalizedAdd (left,right) {
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

function isNormalizedSub (left,right) {
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

function isNormalizedMul (left,right) {
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

function isNormalizedDiv (left,right) {
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

function make (a,b,cb) {
	if (isNormalizedAdd(a,b)) {
		cb(new Add().init(a,b));
	}
	else if (isNormalizedAdd(b,a)) {
		cb(new Add().init(b,a));
	}

	if (a.value !== 1 && b.value !== 1) {
		if (isNormalizedMul(a,b)) {
			cb(new Mul().init(a,b));
		}
		else if (isNormalizedMul(b,a)) {
			cb(new Mul().init(b,a));
		}
	}

	if (a.value > b.value) {
		if (isNormalizedSub(a,b)) {
			cb(new Sub().init(a,b));
		}

		if (b.value !== 1 && a.value % b.value === 0 && isNormalizedDiv(a,b)) {
			cb(new Div().init(a,b));
		}
	}
	else if (b.value > a.value) {
		if (isNormalizedSub(b,a)) {
			cb(new Sub().init(b,a));
		}

		if (a.value !== 1 && b.value % a.value === 0 && isNormalizedDiv(b,a)) {
			cb(new Div().init(b,a));
		}
	}
	else if (b.value !== 1) {
		if (isNormalizedDiv(a,b)) {
			cb(new Div().init(a,b));
		}
		else if (isNormalizedDiv(b,a)) {
			cb(new Div().init(b,a));
		}
	}
}

function solutions (target,numbers,cb) {
	var numcnt = numbers.length;
	var full_usage = ~(~0 << numcnt);
	var exprs = numbers.map(function (num,i) {
		return new Val().init(num,i);
	});

	for (var i = 0; i < exprs.length; ++ i) {
		var expr = exprs[i];
		if (expr.value === target) {
			if (!cb(expr)) return false;
			break;
		}
	}

	var uniq_solutions = {};

	var lower = 0;
	var upper = numcnt;
	while (lower < upper) {
		for (var b = lower; b < upper; ++ b) {
			var bexpr = exprs[b];

			for (var a = 0; a < b; ++ a) {
				var aexpr = exprs[a];

				if (!(aexpr.used & bexpr.used)) {
					var hasroom = (aexpr.used | bexpr.used) !== full_usage;
					
					make(aexpr,bexpr,function (expr) {
						var issolution = expr.value === target;
						if (hasroom && !issolution) {
							exprs.push(expr);
						}
						if (issolution) {
							if (uniq_solutions[expr.id] !== true) {
								uniq_solutions[expr.id] = true;
								cb(expr);
							}
						}
					});
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
	var target = parseInt(args[1],10);
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
	numbers.sort(function (lhs,rhs) { return lhs - rhs; });

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
