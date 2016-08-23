'use strict'
var readonlyProxies = new WeakMap
var proxySources = new WeakMap
var currentSandbox = undefined
var GLOBAL = new Function('return this')()

function compileExpression(src) {
	if (typeof src !== 'string') {
		throw new TypeError('Expected argument to be a string.')
	}
	
	// "use strict" does not improve security, it is only added for convenience
	var code = new Function('sandbox', 'with (sandbox) {return (function () {"use strict"; return ' + src + '}).call(this)}')
	
	return function (sandbox) {
		if (!isObject(sandbox)) {
			throw new TypeError('Expected argument to be an object or function.')
		}
		var sandboxProxy = getProxy(sandbox)
		var result
		
		currentSandbox = sandbox
		try {
			result = code.call(sandboxProxy, sandboxProxy)
		} finally {
			currentSandbox = undefined
		}
		return isObject(result) && proxySources.get(result) || result
	}
}
module.exports = compileExpression

var traps = {
	get: function (target, key, receiver) {
		if (currentSandbox) {
			if (key === Symbol.unscopables && target === currentSandbox) {
				return undefined
			}
			if (!notPrivate(key)) {
				return undefined
			}
			return getProxyOrPrimitive(Reflect.get(target, key, receiver))
		}
		return Reflect.get(target, key, receiver)
	},
	set: function (target, key, value, receiver) {
		if (currentSandbox) {
			throw new TypeError('You cannot set properties on a sandboxed object.')
		}
		return Reflect.set(target, key, value, receiver)
	},
	has: function (target, key) {
		if (currentSandbox) {
			if (target === currentSandbox) {
				return true
			}
			if (!notPrivate(key)) {
				return false
			}
			return getProxyOrPrimitive(Reflect.has(target, key))
		}
		return Reflect.has(target, key)
	},
	getPrototypeOf: function (target) {
		if (currentSandbox) {
			return getProxyOrPrimitive(Reflect.getPrototypeOf(target))
		}
		return Reflect.getPrototypeOf(target)
	},
	setPrototypeOf: function (target, proto) {
		if (currentSandbox) {
			throw new TypeError('You cannot set the prototype of a sandboxed object.')
		}
		return Reflect.setPrototypeOf(target, proto)
	},
	isExtensible: function (target) {
		if (currentSandbox) {
			return getProxyOrPrimitive(Reflect.isExtensible(target))
		}
		return Reflect.isExtensible(target)
	},
	preventExtensions: function (target) {
		if (currentSandbox) {
			throw new TypeError('You cannot change the extensibility of a sandboxed object.')
		}
		return Reflect.preventExtensions(target)
	},
	getOwnPropertyDescriptor: function (target, key) {
		if (currentSandbox) {
			if (key === Symbol.unscopables && target === currentSandbox) {
				return undefined
			}
			if (!notPrivate(key)) {
				return undefined
			}
			return getProxyOrPrimitive(Reflect.getOwnPropertyDescriptor(target, key))
		}
		return Reflect.getOwnPropertyDescriptor(target, key)
	},
	defineProperty: function (target, key, descriptor) {
		if (currentSandbox) {
			throw new TypeError('You cannot define properties on a sandboxed object.')
		}
		return Reflect.defineProperty(target, key, descriptor)
	},
	deleteProperty: function (target, key) {
		if (currentSandbox) {
			throw new TypeError('You cannot delete properties on a sandboxed object.')
		}
		return Reflect.deleteProperty(target, key)
	},
	ownKeys: function (target) {
		if (currentSandbox) {
			return getProxyOrPrimitive(Reflect.ownKeys(target).filter(notPrivate))
		}
		return Reflect.ownKeys(target)
	},
	apply: function (target, thisArg, argumentsList) {
		if (currentSandbox) {
			return getProxyOrPrimitive(Reflect.apply(target, thisArg, argumentsList))
		}
		return Reflect.apply(target, thisArg, argumentsList)
	},
	construct: function (target, argumentsList, newTarget) {
		if (currentSandbox) {
			return getProxyOrPrimitive(Reflect.construct(target, argumentsList, newTarget))
		}
		return Reflect.construct(target, argumentsList, newTarget)
	}
}

function isObject(value) {
	return typeof value === 'function' || (value !== null && typeof value === 'object')
}

function getProxyOrPrimitive(value) {
	if (isObject(value)) {
		return safeObjects.indexOf(value) >= 0 ? value : getProxy(value)
	}
	return value
}

function getProxy(value, hideOriginal) {
	if (value === GLOBAL) {
		throw new TypeError('The global object is forbidden from entering a sandboxed context.')
	}
	var proxy = readonlyProxies.get(value)
	if (typeof proxy === 'undefined') {
		proxy = new Proxy(value, traps)
		readonlyProxies.set(hideOriginal ? proxy : value, proxy)
		proxySources.set(proxy, hideOriginal ? proxy : value)
	}
	return proxy
}

function notPrivate(key) {
	return typeof key !== 'string' || key[0] !== '_'
}

// Freeze and proxy anything that is accessible through JavaScript syntax alone
// This should include any value that you can get from JavaScript syntax itself.
// For example:
//     "my string".foobar
//     try {throw 1} catch (err) {err.foobar}
// Symbols are included here because they are not protected by our proxying
// because they are primitives.
var safeObjects = require('./lib/make-safe')([
	Boolean.prototype,
	Number.prototype,
	String.prototype,
	Symbol.prototype,
	Function.prototype,
	Object.prototype,
	Array.prototype,
	RegExp.prototype,
	Error.prototype,
	EvalError.prototype,
	RangeError.prototype,
	ReferenceError.prototype,
	SyntaxError.prototype,
	TypeError.prototype,
	URIError.prototype,
	Promise.prototype
], isObject, getProxy)
