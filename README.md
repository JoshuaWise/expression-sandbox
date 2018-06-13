# expression-sandbox [![Build Status](https://travis-ci.org/JoshuaWise/expression-sandbox.svg?branch=master)](https://travis-ci.org/JoshuaWise/expression-sandbox)
This lets you compile and run someone else's arbitrary JavaScript safely within your own JavaScript program.

**UPDATE:**

This was more of a fun/experimental project. If anyone would like to take over the repo, just ask. Otherwise, it will remain archived.

## Installation
```
npm install --save expression-sandbox
```

## Usage
```js
var compiler = require('expression-sandbox');
var code = compiler('Math.round(a + b / 3)');

var result = code({a: 7, b: 5, Math});
console.log(result); // => 9
```

## What kinds of things are protected against?
If you don't pass anything into the sandbox context, then you're protected EVERYWHERE!

From inside the sandbox...
* You can't modify anything that wasn't created in the sandbox.
	* you can't modify native prototypes
	* you can't modify any object that's reachable from the native prototypes
	* you can't modify anything that was passed into the sandbox
	* you can't modify the sandbox context object itself
* You can't access the global object.
	* This is specifically forbidden. You're not allowed to access it even if it's passed into a sandbox explicitly
* You can't compile code with `Function` or `eval`.
* You can't access properties that start with `_` on objects that are passed into the sandbox.
* You can't access any scope anywhere except for what is specifically passed into the sandbox. Anything passed into the sandbox can be accessed, but not modified.
* You can only return primitive values.
	* You can't return objects
	* You can't return functions

## What kinds of things are NOT protected against?

Any sensitive information that is passed into the sandbox can be accessed by the unsecure code (unless that information is behind a property that starts with `_`)

## Am I wrong?

If you think there are vulnerabilities in the sandbox that I didn't think of, please create a Github issue to bring them to my attention.

## Caveats

This package replaces some built-in objects with [Proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy). In rare cases, this can cause odd behvaior with with `===` operator, if you cache one of these objects before this package is loaded. For this reason, it is recommended that this package is loaded before any other JavaScript code runs.

There's one more caveat.

If you pass an object into a sandbox, and then you pass that object into a function that was created *outside* the sandbox, the function will receive a proxy of the original object. To test if that proxy represents a specific non-proxy object, you can use `compiler.equals()`, as shown below.

```js
var compiler = require('expression-sandbox');
var obj = {};

function badTest(a) {
	return a === obj;
}

function goodTest(a) {
	return compiler.equals(a, obj);
}

var context = {obj, badTest, goodTest};
compiler('badTest(obj)')(context); // Returns false
compiler('goodTest(obj)')(context); // Returns true
```

But don't worry, 99% of the time this issue will never come up.

## Why the fork?

The opinions behind [nx-compile](https://github.com/RisingStack/nx-compile) differ from the opinions behind [expression-sandbox](https://github.com/JoshuaWise/expression-sandbox). For example, `expression-sandbox` is not interested in providing a non-secure version of itself. The "small modules" rule suggests that such functionality should be in its own module. Additionally, `expression-sandbox` aims to secure *anything* you put into the sandbox—not just globals and native prototypes. Finally, `expression-sandbox` keeps its independence from [nx-framework](https://github.com/RisingStack/nx-framework), to be as generic as possible.

