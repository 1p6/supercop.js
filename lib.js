// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = typeof window === 'object';
// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) { var success = enlargeMemory(); if (!success) { DYNAMICTOP = ret;  return 0; } }; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}



Module["Runtime"] = Runtime;



//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;

function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module["setValue"] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module["getValue"] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module["allocate"] = allocate;

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if ((typeof _sbrk !== 'undefined' && !_sbrk.called) || !runtimeInitialized) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}
Module["getMemory"] = getMemory;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module["AsciiToString"] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

function UTF8ArrayToString(u8Array, idx) {
  var u0, u1, u2, u3, u4, u5;

  var str = '';
  while (1) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    u0 = u8Array[idx++];
    if (!u0) return str;
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    u1 = u8Array[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    u2 = u8Array[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u3 = u8Array[idx++] & 63;
      if ((u0 & 0xF8) == 0xF0) {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
      } else {
        u4 = u8Array[idx++] & 63;
        if ((u0 & 0xFC) == 0xF8) {
          u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
        } else {
          u5 = u8Array[idx++] & 63;
          u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
        }
      }
    }
    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}
Module["UTF8ToString"] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module["UTF16ToString"] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF16"] = stringToUTF16;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}
Module["lengthBytesUTF16"] = lengthBytesUTF16;

function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module["UTF32ToString"] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF32"] = stringToUTF32;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}
Module["lengthBytesUTF32"] = lengthBytesUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module["stackTrace"] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;

function alignMemoryPage(x) {
  if (x % 4096 > 0) {
    x += (4096 - (x % 4096));
  }
  return x;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk


function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}

function enlargeMemory() {
  abortOnCannotGrowMemory();
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer;



buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);


// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module["addOnInit"] = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module["intArrayToString"] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[((buffer++)>>0)]=array[i];
  }
}
Module["writeArrayToMemory"] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module["removeRunDependency"] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;



// === Body ===

var ASM_CONSTS = [];




STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 34144;
  /* global initializers */  __ATINIT__.push();
  

/* memory initializer */ allocate([34,174,40,215,152,47,138,66,205,101,239,35,145,68,55,113,47,59,77,236,207,251,192,181,188,219,137,129,165,219,181,233,56,181,72,243,91,194,86,57,25,208,5,182,241,17,241,89,155,79,25,175,164,130,63,146,24,129,109,218,213,94,28,171,66,2,3,163,152,170,7,216,190,111,112,69,1,91,131,18,140,178,228,78,190,133,49,36,226,180,255,213,195,125,12,85,111,137,123,242,116,93,190,114,177,150,22,59,254,177,222,128,53,18,199,37,167,6,220,155,148,38,105,207,116,241,155,193,210,74,241,158,193,105,155,228,227,37,79,56,134,71,190,239,181,213,140,139,198,157,193,15,101,156,172,119,204,161,12,36,117,2,43,89,111,44,233,45,131,228,166,110,170,132,116,74,212,251,65,189,220,169,176,92,181,83,17,131,218,136,249,118,171,223,102,238,82,81,62,152,16,50,180,45,109,198,49,168,63,33,251,152,200,39,3,176,228,14,239,190,199,127,89,191,194,143,168,61,243,11,224,198,37,167,10,147,71,145,167,213,111,130,3,224,81,99,202,6,112,110,14,10,103,41,41,20,252,47,210,70,133,10,183,39,38,201,38,92,56,33,27,46,237,42,196,90,252,109,44,77,223,179,149,157,19,13,56,83,222,99,175,139,84,115,10,101,168,178,119,60,187,10,106,118,230,174,237,71,46,201,194,129,59,53,130,20,133,44,114,146,100,3,241,76,161,232,191,162,1,48,66,188,75,102,26,168,145,151,248,208,112,139,75,194,48,190,84,6,163,81,108,199,24,82,239,214,25,232,146,209,16,169,101,85,36,6,153,214,42,32,113,87,133,53,14,244,184,209,187,50,112,160,106,16,200,208,210,184,22,193,164,25,83,171,65,81,8,108,55,30,153,235,142,223,76,119,72,39,168,72,155,225,181,188,176,52,99,90,201,197,179,12,28,57,203,138,65,227,74,170,216,78,115,227,99,119,79,202,156,91,163,184,178,214,243,111,46,104,252,178,239,93,238,130,143,116,96,47,23,67,111,99,165,120,114,171,240,161,20,120,200,132,236,57,100,26,8,2,199,140,40,30,99,35,250,255,190,144,233,189,130,222,235,108,80,164,21,121,198,178,247,163,249,190,43,83,114,227,242,120,113,198,156,97,38,234,206,62,39,202,7,194,192,33,199,184,134,209,30,235,224,205,214,125,218,234,120,209,110,238,127,79,125,245,186,111,23,114,170,103,240,6,166,152,200,162,197,125,99,10,174,13,249,190,4,152,63,17,27,71,28,19,53,11,113,27,132,125,4,35,245,119,219,40,147,36,199,64,123,171,202,50,188,190,201,21,10,190,158,60,76,13,16,156,196,103,29,67,182,66,62,203,190,212,197,76,42,126,101,252,156,41,127,89,236,250,214,58,171,111,203,95,23,88,71,74,140,25,68,108,133,59,140,1,189,241,36,255,248,37,195,1,96,220,55,0,183,76,62,255,195,66,61,0,50,76,164,1,225,164,76,255,76,61,163,255,117,62,31,0,81,145,64,255,118,65,14,0,162,115,214,255,6,138,46,0,124,230,244,255,10,138,143,0,52,26,194,0,184,244,76,0,129,143,41,1,190,244,19,255,123,170,122,255,98,129,68,0,121,213,147,0,86,101,30,255,161,103,155,0,140,89,67,255,239,229,190,1,67,11,181,0,198,240,137,254,238,69,188,255,67,151,238,0,19,42,108,255,229,85,113,1,50,68,135,255,17,106,9,0,50,103,1,255,80,1,168,1,35,152,30,255,16,168,185,1,56,89,232,255,101,210,252,0,41,250,71,0,204,170,79,255,14,46,239,255,80,77,239,0,189,214,75,255,17,141,249,0,38,80,76,255,190,85,117,0,86,228,170,0,156,216,208,1,195,207,164,255,150,66,76,255,175,225,16,255,141,80,98,1,76,219,242,0,198,162,114,0,46,218,152,0,155,43,241,254,155,160,104,255,51,187,165,0,2,17,175,0,66,84,160,1,247,58,30,0,35,65,53,254,69,236,191,0,45,134,245,1,163,123,221,0,32,110,20,255,52,23,165,0,186,214,71,0,233,176,96,0,242,239,54,1,57,89,138,0,83,0,84,255,136,160,100,0,92,142,120,254,104,124,190,0,181,177,62,255,250,41,85,0,152,130,42,1,96,252,246,0,151,151,63,254,239,133,62,0,32,56,156,0,45,167,189,255,142,133,179,1,131,86,211,0,187,179,150,254,250,170,14,255,210,163,78,0,37,52,151,0,99,77,26,0,238,156,213,255,213,192,209,1,73,46,84,0,20,65,41,1,54,206,79,0,201,131,146,254,170,111,24,255,177,33,50,254,171,38,203,255,78,247,116,0,209,221,153,0,133,128,178,1,58,44,25,0,201,39,59,1,189,19,252,0,49,229,210,1,117,187,117,0,181,179,184,1,0,114,219,0,48,94,147,0,245,41,56,0,125,13,204,254,244,173,119,0,44,221,32,254,84,234,20,0,249,160,198,1,236,126,234,255,47,99,168,254,170,226,153,255,102,179,216,0,226,141,122,255,122,66,153,254,182,245,134,0,227,228,25,1,214,57,235,255,216,173,56,255,181,231,210,0,119,128,157,255,129,95,136,255,110,126,51,0,2,169,183,255,7,130,98,254,69,176,94,255,116,4,227,1,217,242,145,255,202,173,31,1,105,1,39,255,46,175,69,0,228,47,58,255,215,224,69,254,207,56,69,255,16,254,139,255,23,207,212,255,202,20,126,255,95,213,96,255,9,176,33,0,200,5,207,255,241,42,128,254,35,33,192,255,248,229,196,1,129,17,120,0,251,103,151,255,7,52,112,255,140,56,66,255,40,226,245,255,217,70,37,254,172,214,9,255,72,67,134,1,146,192,214,255,44,38,112,0,68,184,75,255,206,90,251,0,149,235,141,0,181,170,58,0,116,244,239,0,92,157,2,0,102,173,98,0,233,137,96,1,127,49,203,0,5,155,148,0,23,148,9,255,211,122,12,0,34,134,26,255,219,204,136,0,134,8,41,255,224,83,43,254,85,25,247,0,109,127,0,254,169,136,48,0,238,119,219,255,231,173,213,0,206,18,254,254,8,186,7,255,126,9,7,1,111,42,72,0,111,52,236,254,96,63,141,0,147,191,127,254,205,78,192,255,14,106,237,1,187,219,76,0,175,243,187,254,105,89,173,0,85,25,89,1,162,243,148,0,2,118,209,254,33,158,9,0,139,163,46,255,93,70,40,0,108,42,142,254,111,252,142,255,155,223,144,0,51,229,167,255,73,252,155,255,94,116,12,255,152,160,218,255,156,238,37,255,179,234,207,255,197,0,179,255,154,164,141,0,225,196,104,0,10,35,25,254,209,212,242,255,97,253,222,254,184,101,229,0,222,18,127,1,164,136,135,255,30,207,140,254,146,97,243,0,129,192,26,254,201,84,33,255,111,10,78,255,147,81,178,255,4,4,24,0,161,238,215,255,6,141,33,0,53,215,14,255,41,181,208,255,231,139,157,0,179,203,221,255,255,185,113,0,189,226,172,255,113,66,214,255,202,62,45,255,102,64,8,255,78,174,16,254,133,117,68,255,89,241,178,254,10,229,166,255,123,221,42,254,30,20,212,0,82,128,3,0,48,209,243,0,119,121,64,255,50,227,156,255,0,110,197,1,103,27,144,0,182,120,89,255,133,114,211,0,189,110,21,255,15,10,106,0,41,192,1,0,152,232,121,255,188,60,160,255,153,113,206,255,0,183,226,254,180,13,72,255,176,160,14,254,211,201,134,255,158,24,143,0,127,105,53,0,96,12,189,0,167,215,251,255,159,76,128,254,106,101,225,255,30,252,4,0,146,12,174,0,133,59,140,1,189,241,36,255,248,37,195,1,96,220,55,0,183,76,62,255,195,66,61,0,50,76,164,1,225,164,76,255,76,61,163,255,117,62,31,0,81,145,64,255,118,65,14,0,162,115,214,255,6,138,46,0,124,230,244,255,10,138,143,0,52,26,194,0,184,244,76,0,129,143,41,1,190,244,19,255,123,170,122,255,98,129,68,0,121,213,147,0,86,101,30,255,161,103,155,0,140,89,67,255,239,229,190,1,67,11,181,0,198,240,137,254,238,69,188,255,234,113,60,255,37,255,57,255,69,178,182,254,128,208,179,0,118,26,125,254,3,7,214,255,241,50,77,255,85,203,197,255,211,135,250,255,25,48,100,255,187,213,180,254,17,88,105,0,83,209,158,1,5,115,98,0,4,174,60,254,171,55,110,255,217,181,17,255,20,188,170,0,146,156,102,254,87,214,174,255,114,122,155,1,233,44,170,0,127,8,239,1,214,236,234,0,175,5,219,0,49,106,61,255,6,66,208,255,2,106,110,255,81,234,19,255,215,107,192,255,67,151,238,0,19,42,108,255,229,85,113,1,50,68,135,255,17,106,9,0,50,103,1,255,80,1,168,1,35,152,30,255,16,168,185,1,56,89,232,255,101,210,252,0,41,250,71,0,204,170,79,255,14,46,239,255,80,77,239,0,189,214,75,255,17,141,249,0,38,80,76,255,190,85,117,0,86,228,170,0,156,216,208,1,195,207,164,255,150,66,76,255,175,225,16,255,141,80,98,1,76,219,242,0,198,162,114,0,46,218,152,0,155,43,241,254,155,160,104,255,178,9,252,254,100,110,212,0,14,5,167,0,233,239,163,255,28,151,157,1,101,146,10,255,254,158,70,254,71,249,228,0,88,30,50,0,68,58,160,255,191,24,104,1,129,66,129,255,192,50,85,255,8,179,138,255,38,250,201,0,115,80,160,0,131,230,113,0,125,88,147,0,90,68,199,0,253,76,158,0,28,255,118,0,113,250,254,0,66,75,46,0,230,218,43,0,229,120,186,1,148,68,43,0,136,124,238,1,187,107,197,255,84,53,246,255,51,116,254,255,51,187,165,0,2,17,175,0,66,84,160,1,247,58,30,0,35,65,53,254,69,236,191,0,45,134,245,1,163,123,221,0,32,110,20,255,52,23,165,0,186,214,71,0,233,176,96,0,242,239,54,1,57,89,138,0,83,0,84,255,136,160,100,0,92,142,120,254,104,124,190,0,181,177,62,255,250,41,85,0,152,130,42,1,96,252,246,0,151,151,63,254,239,133,62,0,32,56,156,0,45,167,189,255,142,133,179,1,131,86,211,0,187,179,150,254,250,170,14,255,68,113,21,255,222,186,59,255,66,7,241,1,69,6,72,0,86,156,108,254,55,167,89,0,109,52,219,254,13,176,23,255,196,44,106,255,239,149,71,255,164,140,125,255,159,173,1,0,51,41,231,0,145,62,33,0,138,111,93,1,185,83,69,0,144,115,46,0,97,151,16,255,24,228,26,0,49,217,226,0,113,75,234,254,193,153,12,255,182,48,96,255,14,13,26,0,128,195,249,254,69,193,59,0,132,37,81,254,125,106,60,0,214,240,169,1,164,227,66,0,210,163,78,0,37,52,151,0,99,77,26,0,238,156,213,255,213,192,209,1,73,46,84,0,20,65,41,1,54,206,79,0,201,131,146,254,170,111,24,255,177,33,50,254,171,38,203,255,78,247,116,0,209,221,153,0,133,128,178,1,58,44,25,0,201,39,59,1,189,19,252,0,49,229,210,1,117,187,117,0,181,179,184,1,0,114,219,0,48,94,147,0,245,41,56,0,125,13,204,254,244,173,119,0,44,221,32,254,84,234,20,0,249,160,198,1,236,126,234,255,143,62,221,0,129,89,214,255,55,139,5,254,68,20,191,255,14,204,178,1,35,195,217,0,47,51,206,1,38,246,165,0,206,27,6,254,158,87,36,0,217,52,146,255,125,123,215,255,85,60,31,255,171,13,7,0,218,245,88,254,252,35,60,0,55,214,160,255,133,101,56,0,224,32,19,254,147,64,234,0,26,145,162,1,114,118,125,0,248,252,250,0,101,94,196,255,198,141,226,254,51,42,182,0,135,12,9,254,109,172,210,255,197,236,194,1,241,65,154,0,48,156,47,255,153,67,55,255,218,165,34,254,74,180,179,0,218,66,71,1,88,122,99,0,212,181,219,255,92,42,231,255,239,0,154,0,245,77,183,255,94,81,170,1,18,213,216,0,171,93,71,0,52,94,248,0,18,151,161,254,197,209,66,255,174,244,15,254,162,48,183,0,49,61,240,254,182,93,195,0,199,228,6,1,200,5,17,255,137,45,237,255,108,148,4,0,90,79,237,255,39,63,77,255,53,82,207,1,142,22,118,255,101,232,18,1,92,26,67,0,5,200,88,255,33,168,138,255,149,225,72,0,2,209,27,255,44,245,168,1,220,237,17,255,30,211,105,254,141,238,221,0,128,80,245,254,111,254,14,0,222,95,190,1,223,9,241,0,146,76,212,255,108,205,104,255,63,117,153,0,144,69,48,0,35,228,111,0,192,33,193,255,112,214,190,254,115,152,151,0,23,102,88,0,51,74,248,0,226,199,143,254,204,162,101,255,208,97,189,1,245,104,18,0,230,246,30,255,23,148,69,0,110,88,52,254,226,181,89,255,208,47,90,254,114,161,80,255,33,116,248,0,179,152,87,255,69,144,177,1,88,238,26,255,58,32,113,1,1,77,69,0,59,121,52,255,152,238,83,0,52,8,193,0,231,39,233,255,199,34,138,0,222,68,173,0,91,57,242,254,220,210,127,255,192,7,246,254,151,35,187,0,195,236,165,0,111,93,206,0,212,247,133,1,154,133,209,255,155,231,10,0,64,78,38,0,122,249,100,1,30,19,97,255,62,91,249,1,248,133,77,0,197,63,168,254,116,10,82,0,184,236,113,254,212,203,194,255,61,100,252,254,36,5,202,255,119,91,153,255,129,79,29,0,103,103,171,254,237,215,111,255,216,53,69,0,239,240,23,0,194,149,221,255,38,225,222,0,232,255,180,254,118,82,133,255,57,209,177,1,139,232,133,0,158,176,46,254,194,115,46,0,88,247,229,1,28,103,191,0,221,222,175,254,149,235,44,0,151,228,25,254,218,105,103,0,142,85,210,0,149,129,190,255,213,65,94,254,117,134,224,255,82,198,117,0,157,221,220,0,163,101,36,0,197,114,37,0,104,172,166,254,11,182,0,0,81,72,188,255,97,188,16,255,69,6,10,0,199,147,145,255,8,9,115,1,65,214,175,255,217,173,209,0,80,127,166,0,247,229,4,254,167,183,124,255,90,28,204,254,175,59,240,255,11,41,248,1,108,40,51,255,144,177,195,254,150,250,126,0,138,91,65,1,120,60,222,255,245,193,239,0,29,214,189,255,128,2,25,0,80,154,162,0,77,220,107,1,234,205,74,255,54,166,103,255,116,72,9,0,228,94,47,255,30,200,25,255,35,214,89,255,61,176,140,255,83,226,163,255,75,130,172,0,128,38,17,0,95,137,152,255,215,124,159,1,79,93,0,0,148,82,157,254,195,130,251,255,40,202,76,255,251,126,224,0,157,99,62,254,207,7,225,255,96,68,195,0,140,186,157,255,131,19,231,255,42,128,254,0,52,219,61,254,102,203,72,0,141,7,11,255,186,164,213,0,31,122,119,0,133,242,145,0,208,252,232,255,91,213,182,255,143,4,250,254,249,215,74,0,165,30,111,1,171,9,223,0,229,123,34,1,92,130,26,255,77,155,45,1,195,139,28,255,59,224,78,0,136,17,247,0,108,121,32,0,79,250,189,255,96,227,252,254,38,241,62,0,62,174,125,255,155,111,93,255,10,230,206,1,97,197,40,255,0,49,57,254,65,250,13,0,18,251,150,255,220,109,210,255,5,174,166,254,44,129,189,0,235,35,147,255,37,247,141,255,72,141,4,255,103,107,255,0,247,90,4,0,53,44,42,0,2,30,240,0,4,59,63,0,88,78,36,0,113,167,180,0,190,71,193,255,199,158,164,255,58,8,172,0,77,33,12,0,65,63,3,0,153,77,33,255,172,254,102,1,228,221,4,255,87,30,254,1,146,41,86,255,138,204,239,254,108,141,17,255,187,242,135,0,210,208,127,0,68,45,14,254,73,96,62,0,81,60,24,255,170,6,36,255,3,249,26,0,35,213,109,0,22,129,54,255,21,35,225,255,234,61,56,255,58,217,6,0,143,124,88,0,236,126,66,0,209,38,183,255,34,238,6,255,174,145,102,0,95,22,211,0,196,15,153,254,46,84,232,255,117,34,146,1,231,250,74,255,27,134,100,1,92,187,195,255,170,198,112,0,120,28,42,0,209,70,67,0,29,81,31,0,29,168,100,1,169,173,160,0,107,35,117,0,62,96,59,255,81,12,69,1,135,239,190,255,220,252,18,0,163,220,58,255,137,137,188,255,83,102,109,0,96,6,76,0,234,222,210,255,185,174,205,1,60,158,213,255,13,241,214,0,172,129,140,0,93,104,242,0,192,156,251,0,43,117,30,0,225,81,158,0,127,232,218,0,226,28,203,0,233,27,151,255,117,43,5,255,242,14,47,255,33,20,6,0,137,251,44,254,27,31,245,255,183,214,125,254,40,121,149,0,186,158,213,255,89,8,227,0,69,88,0,254,203,135,225,0,201,174,203,0,147,71,184,0,18,121,41,254,94,5,78,0,224,214,240,254,36,5,180,0,251,135,231,1,163,138,212,0,210,249,116,254,88,129,187,0,19,8,49,254,62,14,144,255,159,76,211,0,214,51,82,0,109,117,228,254,103,223,203,255,75,252,15,1,154,71,220,255,23,13,91,1,141,168,96,255,181,182,133,0,250,51,55,0,234,234,212,254,175,63,158,0,39,240,52,1,158,189,36,255,213,40,85,1,32,180,247,255,19,102,26,1,84,24,97,255,69,21,222,0,148,139,122,255,220,213,235,1,232,203,255,0,121,57,147,0,227,7,154,0,53,22,147,1,72,1,225,0,82,134,48,254,83,60,157,255,145,72,169,0,34,103,239,0,198,233,47,0,116,19,4,255,184,106,9,255,183,129,83,0,36,176,230,1,34,103,72,0,219,162,134,0,245,42,158,0,32,149,96,254,165,44,144,0,202,239,72,254,215,150,5,0,42,66,36,1,132,215,175,0,86,174,86,255,26,197,156,255,49,232,135,254,103,182,82,0,253,128,176,1,153,178,122,0,245,250,10,0,236,24,178,0,137,106,132,0,40,29,41,0,50,30,152,255,124,105,38,0,230,191,75,0,143,43,170,0,44,131,20,255,44,13,23,255,237,255,155,1,159,109,100,255,112,181,24,255,104,220,108,0,55,211,131,0,99,12,213,255,152,151,145,255,238,5,159,0,97,155,8,0,33,108,81,0,1,3,103,0,62,109,34,255,250,155,180,0,32,71,195,255,38,70,145,1,159,95,245,0,69,229,101,1,136,28,240,0,79,224,25,0,78,110,121,255,248,168,124,0,187,128,247,0,2,147,235,254,79,11,132,0,70,58,12,1,181,8,163,255,79,137,133,255,37,170,11,255,141,243,85,255,176,231,215,255,204,150,164,255,239,215,39,255,46,87,156,254,8,163,88,255,172,34,232,0,66,44,102,255,27,54,41,254,236,99,87,255,41,123,169,1,52,114,43,0,117,134,40,0,155,134,26,0,231,207,91,254,35,132,38,255,19,102,125,254,36,227,133,255,118,3,113,255,29,13,124,0,152,96,74,1,88,146,206,255,167,191,220,254,162,18,88,255,182,100,23,0,31,117,52,0,81,46,106,1,12,2,7,0,69,80,201,1,209,246,172,0,12,48,141,1,224,211,88,0,116,226,159,0,122,98,130,0,65,236,234,1,225,226,9,255,207,226,123,1,89,214,59,0,112,135,88,1,90,244,203,255,49,11,38,1,129,108,186,0,89,112,15,1,101,46,204,255,127,204,45,254,79,255,221,255,51,73,18,255,127,42,101,255,241,21,202,0,160,227,7,0,105,50,236,0,79,52,197,255,104,202,208,1,180,15,16,0,101,197,78,255,98,77,203,0,41,185,241,1,35,193,124,0,35,155,23,255,207,53,192,0,11,125,163,1,249,158,185,255,4,131,48,0,21,93,111,255,61,121,231,1,69,200,36,255,185,48,185,255,111,238,21,255,39,50,25,255,99,215,163,255,87,212,30,255,164,147,5,255,128,6,35,1,108,223,110,255,194,76,178,0,74,101,180,0,243,47,48,0,174,25,43,255,82,173,253,1,54,114,192,255,40,55,91,0,215,108,176,255,11,56,7,0,224,233,76,0,209,98,202,254,242,25,125,0,44,193,93,254,203,8,177,0,135,176,19,0,112,71,213,255,206,59,176,1,4,67,26,0,14,143,213,254,42,55,208,255,60,67,120,0,193,21,163,0,99,164,115,0,10,20,118,0,156,212,222,254,160,7,217,255,114,245,76,1,117,59,123,0,176,194,86,254,213,15,176,0,78,206,207,254,213,129,59,0,233,251,22,1,96,55,152,255,236,255,15,255,197,89,84,255,93,149,133,0,174,160,113,0,234,99,169,255,152,116,88,0,144,164,83,255,95,29,198,255,34,47,15,255,99,120,134,255,5,236,193,0,249,247,126,255,147,187,30,0,50,230,117,255,108,217,219,255,163,81,166,255,72,25,169,254,155,121,79,255,28,155,89,254,7,126,17,0,147,65,33,1,47,234,253,0,26,51,18,0,105,83,199,255,163,196,230,0,113,248,164,0,226,254,218,0,189,209,203,255,164,247,222,254,255,35,165,0,4,188,243,1,127,179,71,0,37,237,254,255,100,186,240,0,5,57,71,254,103,72,73,255,244,18,81,254,229,210,132,255,238,6,180,255,11,229,174,255,227,221,192,1,17,49,28,0,163,215,196,254,9,118,4,255,51,240,71,0,113,129,109,255,76,240,231,0,188,177,127,0,125,71,44,1,26,175,243,0,94,169,25,254,27,230,29,0,15,139,119,1,168,170,186,255,172,197,76,255,252,75,188,0,137,124,196,0,72,22,96,255,45,151,249,1,220,145,100,0,64,192,159,255,120,239,226,0,129,178,146,0,0,192,125,0,235,138,234,0,183,157,146,0,83,199,192,255,184,172,72,255,73,225,128,0,77,6,250,255,186,65,67,0,104,246,207,0,188,32,138,255,218,24,242,0,67,138,81,254,237,129,121,255,20,207,150,1,41,199,16,255,6,20,128,0,159,118,5,0,181,16,143,255,220,38,15,0,23,64,147,254,73,26,13,0,87,228,57,1,204,124,128,0,43,24,223,0,219,99,199,0,22,75,20,255,19,27,126,0,157,62,215,0,110,29,230,0,179,167,255,1,54,252,190,0,221,204,182,254,179,158,65,255,81,157,3,0,194,218,159,0,170,223,0,0,224,11,32,255,38,197,98,0,168,164,37,0,23,88,7,1,164,186,110,0,96,36,134,0,234,242,229,0,250,121,19,0,242,254,112,255,3,47,94,1,9,239,6,255,81,134,153,254,214,253,168,255,67,124,224,0,245,95,74,0,28,30,44,254,1,109,220,255,178,89,89,0,252,36,76,0,24,198,46,255,76,77,111,0,134,234,136,255,39,94,29,0,185,72,234,255,70,68,135,255,231,102,7,254,77,231,140,0,167,47,58,1,148,97,118,255,16,27,225,1,166,206,143,255,110,178,214,255,180,131,162,0,143,141,225,1,13,218,78,255,114,153,33,1,98,104,204,0,175,114,117,1,167,206,75,0,202,196,83,1,58,64,67,0,138,47,111,1,196,247,128,255,137,224,224,254,158,112,207,0,154,100,255,1,134,37,107,0,198,128,79,255,127,209,155,255,163,254,185,254,60,14,243,0,31,219,112,254,29,217,65,0,200,13,116,254,123,60,196,255,224,59,184,254,242,89,196,0,123,16,75,254,149,16,206,0,69,254,48,1,231,116,223,255,209,160,65,1,200,80,98,0,37,194,184,254,148,63,34,0,139,240,65,255,217,144,132,255,56,38,45,254,199,120,210,0,108,177,166,255,160,222,4,0,220,126,119,254,165,107,160,255,82,220,248,1,241,175,136,0,144,141,23,255,169,138,84,0,160,137,78,255,226,118,80,255,52,27,132,255,63,96,139,255,152,250,39,0,188,155,15,0,232,51,150,254,40,15,232,255,240,229,9,255,137,175,27,255,75,73,97,1,218,212,11,0,135,5,162,1,107,185,213,0,2,249,107,255,40,242,70,0,219,200,25,0,25,157,13,0,67,82,80,255,196,249,23,255,145,20,149,0,50,72,146,0,94,76,148,1,24,251,65,0,31,192,23,0,184,212,201,255,123,233,162,1,247,173,72,0,162,87,219,254,126,134,89,0,159,11,12,254,166,105,29,0,73,27,228,1,113,120,183,255,66,163,109,1,212,143,11,255,159,231,168,1,255,128,90,0,57,14,58,254,89,52,10,255,253,8,163,1,0,145,210,255,10,129,85,1,46,181,27,0,103,136,160,254,126,188,209,255,34,35,111,0,215,219,24,255,212,11,214,254,101,5,118,0,232,197,133,255,223,167,109,255,237,80,86,255,70,139,94,0,158,193,191,1,155,15,51,255,15,190,115,0,78,135,207,255,249,10,27,1,181,125,233,0,95,172,13,254,170,213,161,255,39,236,138,255,95,93,87,255,190,128,95,0,125,15,206,0,166,150,159,0,227,15,158,255,206,158,120,255,42,141,128,0,101,178,120,1,156,109,131,0,218,14,44,254,247,168,206,255,212,112,28,0,112,17,228,255,90,16,37,1,197,222,108,0,254,207,83,255,9,90,243,255,243,244,172,0,26,88,115,255,205,116,122,0,191,230,193,0,180,100,11,1,217,37,96,255,154,78,156,0,235,234,31,255,206,178,178,255,149,192,251,0,182,250,135,0,246,22,105,0,124,193,109,255,2,210,149,255,169,17,170,0,0,96,110,255,117,9,8,1,50,123,40,255,193,189,99,0,34,227,160,0,48,80,70,254,211,51,236,0,45,122,245,254,44,174,8,0,173,37,233,255,158,65,171,0,122,69,215,255,90,80,2,255,131,106,96,254,227,114,135,0,205,49,119,254,176,62,64,255,82,51,17,255,241,20,243,255,130,13,8,254,128,217,243,255,162,27,1,254,90,118,241,0,246,198,246,255,55,16,118,255,200,159,157,0,163,17,1,0,140,107,121,0,85,161,118,255,38,0,149,0,156,47,238,0,9,166,166,1,75,98,181,255,50,74,25,0,66,15,47,0,139,225,159,0,76,3,142,255,14,238,184,0,11,207,53,255,183,192,186,1,171,32,174,255,191,76,221,1,247,170,219,0,25,172,50,254,217,9,233,0,203,126,68,255,183,92,48,0,127,167,183,1,65,49,254,0,16,63,127,1,254,21,170,255,59,224,127,254,22,48,63,255,27,78,130,254,40,195,29,0,250,132,112,254,35,203,144,0,104,169,168,0,207,253,30,255,104,40,38,254,94,228,88,0,206,16,128,255,212,55,122,255,223,22,234,0,223,197,127,0,253,181,181,1,145,102,118,0,236,153,36,255,212,217,72,255,20,38,24,254,138,62,62,0,152,140,4,0,230,220,99,255,1,21,212,255,148,201,231,0,244,123,9,254,0,171,210,0,51,58,37,255,1,255,14,255,244,183,145,254,0,242,166,0,22,74,132,0,121,216,41,0,95,195,114,254,133,24,151,255,156,226,231,255,247,5,77,255,246,148,115,254,225,92,81,255,222,80,246,254,170,123,89,255,74,199,141,0,29,20,8,255,138,136,70,255,93,75,92,0,221,147,49,254,52,126,226,0,229,124,23,0,46,9,181,0,205,64,52,1,131,254,28,0,151,158,212,0,131,64,78,0,206,25,171,0,0,230,139,0,191,253,110,254,103,247,167,0,64,40,40,1,42,165,241,255,59,75,228,254,124,243,189,255,196,92,178,255,130,140,86,255,141,89,56,1,147,198,5,255,203,248,158,254,144,162,141,0,11,172,226,0,130,42,21,255,1,167,143,255,144,36,36,255,48,88,164,254,168,170,220,0,98,71,214,0,91,208,79,0,159,76,201,1,166,42,214,255,69,255,0,255,6,128,125,255,190,1,140,0,146,83,218,255,215,238,72,1,122,127,53,0,189,116,165,255,84,8,66,255,214,3,208,255,213,110,133,0,195,168,44,1,158,231,69,0,162,64,200,254,91,58,104,0,182,58,187,254,249,228,136,0,203,134,76,254,99,221,233,0,75,254,214,254,80,69,154,0,64,152,248,254,236,136,202,255,157,105,153,254,149,175,20,0,22,35,19,255,124,121,233,0,186,250,198,254,132,229,139,0,137,80,174,255,165,125,68,0,144,202,148,254,235,239,248,0,135,184,118,0,101,94,17,255,122,72,70,254,69,130,146,0,127,222,248,1,69,127,118,255,30,82,215,254,188,74,19,255,229,167,194,254,117,25,66,255,65,234,56,254,213,22,156,0,151,59,93,254,45,28,27,255,186,126,164,255,32,6,239,0,127,114,99,1,219,52,2,255,99,96,166,254,62,190,126,255,108,222,168,1,75,226,174,0,230,226,199,0,60,117,218,255,252,248,20,1,214,188,204,0,31,194,134,254,123,69,192,255,169,173,36,254,55,98,91,0,223,42,102,254,137,1,102,0,157,90,25,0,239,122,64,255,252,6,233,0,7,54,20,255,82,116,174,0,135,37,54,255,15,186,125,0,227,112,175,255,100,180,225,255,42,237,244,255,244,173,226,254,248,18,33,0,171,99,150,255,74,235,50,255,117,82,32,254,106,168,237,0,207,109,208,1,228,9,186,0,135,60,169,254,179,92,143,0,244,170,104,255,235,45,124,255,70,99,186,0,117,137,183,0,224,31,215,0,40,9,100,0,26,16,95,1,68,217,87,0,8,151,20,255,26,100,58,255,176,165,203,1,52,118,70,0,7,32,254,254,244,254,245,255,167,144,194,255,125,113,23,255,176,121,181,0,136,84,209,0,138,6,30,255,89,48,28,0,33,155,14,255,25,240,154,0,141,205,109,1,70,115,62,255,20,40,107,254,138,154,199,255,94,223,226,255,157,171,38,0,163,177,25,254,45,118,3,255,14,222,23,1,209,190,81,255,118,123,232,1,13,213,101,255,123,55,123,254,27,246,165,0,50,99,76,255,140,214,32,255,97,65,67,255,24,12,28,0,174,86,78,1,64,247,96,0,160,135,67,0,66,55,243,255,147,204,96,255,26,6,33,255,98,51,83,1,153,213,208,255,2,184,54,255,25,218,11,0,49,67,246,254,18,149,72,255,13,25,72,0,42,79,214,0,42,4,38,1,27,139,144,255,149,187,23,0,18,164,132,0,245,84,184,254,120,198,104,255,126,218,96,0,56,117,234,255,13,29,214,254,68,47,10,255,167,154,132,254,152,38,198,0,66,178,89,255,200,46,171,255,13,99,83,255,210,187,253,255,170,45,42,1,138,209,124,0,214,162,141,0,12,230,156,0,102,36,112,254,3,147,67,0,52,215,123,255,233,171,54,255,98,137,62,0,247,218,39,255,231,218,236,0,247,191,127,0,195,146,84,0,165,176,92,255,19,212,94,255,17,74,227,0,88,40,153,1,198,147,1,255,206,67,245,254,240,3,218,255,61,141,213,255,97,183,106,0,195,232,235,254,95,86,154,0,209,48,205,254,118,209,241,255,240,120,223,1,213,29,159,0,163,127,147,255,13,218,93,0,85,24,68,254,70,20,80,255,189,5,140,1,82,97,254,255,99,99,191,255,132,84,133,255,107,218,116,255,112,122,46,0,105,17,32,0,194,160,63,255,68,222,39,1,216,253,92,0,177,105,205,255,149,201,195,0,42,225,11,255,40,162,115,0,9,7,81,0,165,218,219,0,180,22,0,254,29,146,252,255,146,207,225,1,180,135,96,0,31,163,112,0,177,11,219,255,133,12,193,254,43,78,50,0,65,113,121,1,59,217,6,255,110,94,24,1,112,172,111,0,7,15,96,0,36,85,123,0,71,150,21,255,208,73,188,0,192,11,167,1,213,245,34,0,9,230,92,0,162,142,39,255,215,90,27,0,98,97,89,0,94,79,211,0,90,157,240,0,95,220,126,1,102,176,226,0,36,30,224,254,35,31,127,0,231,232,115,1,85,83,130,0,210,73,245,255,47,143,114,255,68,65,197,0,59,72,62,255,183,133,173,254,93,121,118,255,59,177,81,255,234,69,173,255,205,128,177,0,220,244,51,0,26,244,209,1,73,222,77,255,163,8,96,254,150,149,211,0,158,254,203,1,54,127,139,0,161,224,59,0,4,109,22,255,222,42,45,255,208,146,102,255,236,142,187,0,50,205,245,255,10,74,89,254,48,79,142,0,222,76,130,255,30,166,63,0,236,12,13,255,49,184,244,0,187,113,102,0,218,101,253,0,153,57,182,254,32,150,42,0,25,198,146,1,237,241,56,0,140,68,5,0,91,164,172,255,78,145,186,254,67,52,205,0,219,207,129,1,109,115,17,0,54,143,58,1,21,248,120,255,179,255,30,0,193,236,66,255,1,255,7,255,253,192,48,255,19,69,217,1,3,214,0,255,64,101,146,1,223,125,35,255,235,73,179,255,249,167,226,0,225,175,10,1,97,162,58,0,106,112,171,1,84,172,5,255,133,140,178,255,134,245,142,0,97,90,125,255,186,203,185,255,223,77,23,255,192,92,106,0,15,198,115,255,217,152,248,0,171,178,120,255,228,134,53,0,176,54,193,1,250,251,53,0,213,10,100,1,34,199,106,0,151,31,244,254,172,224,87,255,14,237,23,255,253,85,26,255,127,39,116,255,172,104,100,0,251,14,70,255,212,208,138,255,253,211,250,0,176,49,165,0,15,76,123,255,37,218,160,255,92,135,16,1,10,126,114,255,70,5,224,255,247,249,141,0,68,20,60,1,241,210,189,255,195,217,187,1,151,3,113,0,151,92,174,0,231,62,178,255,219,183,225,0,23,23,33,255,205,181,80,0,57,184,248,255,67,180,1,255,90,123,93,255,39,0,162,255,96,248,52,255,84,66,140,0,34,127,228,255,194,138,7,1,166,110,188,0,21,17,155,1,154,190,198,255,214,80,59,255,18,7,143,0,72,29,226,1,199,217,249,0,232,161,71,1,149,190,201,0,217,175,95,254,113,147,67,255,138,143,199,255,127,204,1,0,29,182,83,1,206,230,155,255,186,204,60,0,10,125,85,255,232,96,25,255,255,89,247,255,213,254,175,1,232,193,81,0,28,43,156,254,12,69,8,0,147,24,248,0,18,198,49,0,134,60,35,0,118,246,18,255,49,88,254,254,228,21,186,255,182,65,112,1,219,22,1,255,22,126,52,255,189,53,49,255,112,25,143,0,38,127,55,255,226,101,163,254,208,133,61,255,137,69,174,1,190,118,145,255,60,98,219,255,217,13,245,255,250,136,10,0,84,254,226,0,201,31,125,1,240,51,251,255,31,131,130,255,2,138,50,255,215,215,177,1,223,12,238,255,252,149,56,255,124,91,68,255,72,126,170,254,119,255,100,0,130,135,232,255,14,79,178,0,250,131,197,0,138,198,208,0,121,216,139,254,119,18,36,255,29,193,122,0,16,42,45,255,213,240,235,1,230,190,169,255,198,35,228,254,110,173,72,0,214,221,241,255,56,148,135,0,192,117,78,254,141,93,207,255,143,65,149,0,21,18,98,255,95,44,244,1,106,191,77,0,254,85,8,254,214,110,176,255,73,173,19,254,160,196,199,255,237,90,144,0,193,172,113,255,200,155,136,254,228,90,221,0,137,49,74,1,164,221,215,255,209,189,5,255,105,236,55,255,42,31,129,1,193,255,236,0,46,217,60,0,138,88,187,255,226,82,236,255,81,69,151,255,142,190,16,1,13,134,8,0,127,122,48,255,81,64,156,0,171,243,139,0,237,35,246,0,122,143,193,254,212,122,146,0,95,41,255,1,87,132,77,0,4,212,31,0,17,31,78,0,39,45,173,254,24,142,217,255,95,9,6,255,227,83,6,0,98,59,130,254,62,30,33,0,8,115,211,1,162,97,128,255,7,184,23,254,116,28,168,255,248,138,151,255,98,244,240,0,186,118,130,0,114,248,235,255,105,173,200,1,160,124,71,255,94,36,164,1,175,65,146,255,238,241,170,254,202,198,197,0,228,71,138,254,45,246,109,255,194,52,158,0,133,187,176,0,83,252,154,254,89,189,221,255,170,73,252,0,148,58,125,0,36,68,51,254,42,69,177,255,168,76,86,255,38,100,204,255,38,53,35,0,175,19,97,0,225,238,253,255,81,81,135,0,210,27,255,254,235,73,107,0,8,207,115,0,82,127,136,0,84,99,21,254,207,19,136,0,100,164,101,0,80,208,77,255,132,207,237,255,15,3,15,255,33,166,110,0,156,95,85,255,37,185,111,1,150,106,35,255,166,151,76,0,114,87,135,255,159,194,64,0,12,122,31,255,232,7,101,254,173,119,98,0,154,71,220,254,191,57,53,255,168,232,160,255,224,32,99,255,218,156,165,0,151,153,163,0,217,13,148,1,197,113,89,0,149,28,161,254,207,23,30,0,105,132,227,255,54,230,94,255,133,173,204,255,92,183,157,255,88,144,252,254,102,33,90,0,159,97,3,0,181,218,155,255,240,114,119,0,106,214,53,255,165,190,115,1,152,91,225,255,88,106,44,255,208,61,113,0,151,52,124,0,191,27,156,255,110,54,236,1,14,30,166,255,39,127,207,1,229,199,28,0,188,228,188,254,100,157,235,0,246,218,183,1,107,22,193,255,206,160,95,0,76,239,147,0,207,161,117,0,51,166,2,255,52,117,10,254,73,56,227,255,152,193,225,0,132,94,136,255,101,191,209,0,32,107,229,255,198,43,180,1,100,210,118,0,114,67,153,255,23,88,26,255,89,154,92,1,220,120,140,255,144,114,207,255,252,115,250,255,34,206,72,0,138,133,127,255,8,178,124,1,87,75,97,0,15,229,92,254,240,67,131,255,118,123,227,254,146,120,104,255,145,213,255,1,129,187,70,255,219,119,54,0,1,19,173,0,45,150,148,1,248,83,72,0,203,233,169,1,142,107,56,0,247,249,38,1,45,242,80,255,30,233,103,0,96,82,70,0,23,201,111,0,81,39,30,255,161,183,78,255,194,234,33,255,68,227,140,254,216,206,116,0,70,27,235,255,104,144,79,0,164,230,93,254,214,135,156,0,154,187,242,254,188,20,131,255,36,109,174,0,159,112,241,0,5,110,149,1,36,165,218,0,166,29,19,1,178,46,73,0,93,43,32,254,248,189,237,0,102,155,141,0,201,93,195,255,241,139,253,255,15,111,98,255,108,65,163,254,155,79,190,255,73,174,193,254,246,40,48,255,107,88,11,254,202,97,85,255,253,204,18,255,113,242,66,0,110,160,194,254,208,18,186,0,81,21,60,0,188,104,167,255,124,166,97,254,210,133,142,0,56,242,137,254,41,111,130,0,111,151,58,1,111,213,141,255,183,172,241,255,38,6,196,255,185,7,123,255,46,11,246,0,245,105,119,1,15,2,161,255,8,206,45,255,18,202,74,255,83,124,115,1,212,141,157,0,83,8,209,254,139,15,232,255,172,54,173,254,50,247,132,0,214,189,213,0,144,184,105,0,223,254,248,0,255,147,240,255,23,188,72,0,7,51,54,0,188,25,180,254,220,180,0,255,83,160,20,0,163,189,243,255,58,209,194,255,87,73,60,0,106,24,49,0,245,249,220,0,22,173,167,0,118,11,195,255,19,126,237,0,110,159,37,255,59,82,47,0,180,187,86,0,188,148,208,1,100,37,133,255,7,112,193,0,129,188,156,255,84,106,129,255,133,225,202,0,14,236,111,255,40,20,101,0,172,172,49,254,51,54,74,255,251,185,184,255,93,155,224,255,180,249,224,1,230,178,146,0,72,57,54,254,178,62,184,0,119,205,72,0,185,239,253,255,61,15,218,0,196,67,56,255,234,32,171,1,46,219,228,0,208,108,234,255,20,63,232,255,165,53,199,1,133,228,5,255,52,205,107,0,74,238,140,255,150,156,219,254,239,172,178,255,251,189,223,254,32,142,211,255,218,15,138,1,241,196,80,0,28,36,98,254,22,234,199,0,61,237,220,255,246,57,37,0,142,17,142,255,157,62,26,0,43,238,95,254,3,217,6,255,213,25,240,1,39,220,174,255,154,205,48,254,19,13,192,255,244,34,54,254,140,16,155,0,240,181,5,254,155,193,60,0,166,128,4,255,36,145,56,255,150,240,219,0,120,51,145,0,82,153,42,1,140,236,146,0,107,92,248,1,189,10,3,0,63,136,242,0,211,39,24,0,19,202,161,1,173,27,186,255,210,204,239,254,41,209,162,255,182,254,159,255,172,116,52,0,195,103,222,254,205,69,59,0,53,22,41,1,218,48,194,0,80,210,242,0,210,188,207,0,187,161,161,254,216,17,1,0,136,225,113,0,250,184,63,0,223,30,98,254,77,168,162,0,59,53,175,0,19,201,10,255,139,224,194,0,147,193,154,255,212,189,12,254,1,200,174,255,50,133,113,1,94,179,90,0,173,182,135,0,94,177,113,0,43,89,215,255,136,252,106,255,123,134,83,254,5,245,66,255,82,49,39,1,220,2,224,0,97,129,177,0,77,59,89,0,61,29,155,1,203,171,220,255,92,78,139,0,145,33,181,255,169,24,141,1,55,150,179,0,139,60,80,255,218,39,97,0,2,147,107,255,60,248,72,0,173,230,47,1,6,83,182,255,16,105,162,254,137,212,81,255,180,184,134,1,39,222,164,255,221,105,251,1,239,112,125,0,63,7,97,0,63,104,227,255,148,58,12,0,90,60,224,255,84,212,252,0,79,215,168,0,248,221,199,1,115,121,1,0,36,172,120,0,32,162,187,255,57,107,49,255,147,42,21,0,106,198,43,1,57,74,87,0,126,203,81,255,129,135,195,0,140,31,177,0,221,139,194,0,3,222,215,0,131,68,231,0,177,86,178,254,124,151,180,0,184,124,38,1,70,163,17,0,249,251,181,1,42,55,227,0,226,161,44,0,23,236,110,0,51,149,142,1,93,5,236,0,218,183,106,254,67,24,77,0,40,245,209,255,222,121,153,0,165,57,30,0,83,125,60,0,70,38,82,1,229,6,188,0,109,222,157,255,55,118,63,255,205,151,186,0,227,33,149,255,254,176,246,1,227,177,227,0,34,106,163,254,176,43,79,0,106,95,78,1,185,241,122,255,185,14,61,0,36,1,202,0,13,178,162,255,247,11,132,0,161,230,92,1,65,1,185,255,212,50,165,1,141,146,64,255,158,242,218,0,21,164,125,0,213,139,122,1,67,71,87,0,203,158,178,1,151,92,43,0,152,111,5,255,39,3,239,255,217,255,250,255,176,63,71,255,74,245,77,1,250,174,18,255,34,49,227,255,246,46,251,255,154,35,48,1,125,157,61,255,106,36,78,255,97,236,153,0,136,187,120,255,113,134,171,255,19,213,217,254,216,94,209,255,252,5,61,0,94,3,202,0,3,26,183,255,64,191,43,255,30,23,21,0,129,141,77,255,102,120,7,1,194,76,140,0,188,175,52,255,17,81,148,0,232,86,55,1,225,48,172,0,134,42,42,255,238,50,47,0,169,18,254,0,20,147,87,255,14,195,239,255,69,247,23,0,238,229,128,255,177,49,112,0,168,98,251,255,121,71,248,0,243,8,145,254,246,227,153,255,219,169,177,254,251,139,165,255,12,163,185,255,164,40,171,255,153,159,27,254,243,109,91,255,222,24,112,1,18,214,231,0,107,157,181,254,195,147,0,255,194,99,104,255,89,140,190,255,177,66,126,254,106,185,66,0,49,218,31,0,252,174,158,0,188,79,230,1,238,41,224,0,212,234,8,1,136,11,181,0,166,117,83,255,68,195,94,0,46,132,201,0,240,152,88,0,164,57,69,254,160,224,42,255,59,215,67,255,119,195,141,255,36,180,121,254,207,47,8,255,174,210,223,0,101,197,68,255,255,82,141,1,250,137,233,0,97,86,133,1,16,80,69,0,132,131,159,0,116,93,100,0,45,141,139,0,152,172,157,255,90,43,91,0,71,153,46,0,39,16,112,255,217,136,97,255,220,198,25,254,177,53,49,0,222,88,134,255,128,15,60,0,207,192,169,255,192,116,209,255,106,78,211,1,200,213,183,255,7,12,122,254,222,203,60,255,33,110,199,254,251,106,117,0,228,225,4,1,120,58,7,255,221,193,84,254,112,133,27,0,189,200,201,255,139,135,150,0,234,55,176,255,61,50,65,0,152,108,169,255,220,85,1,255,112,135,227,0,162,26,186,0,207,96,185,254,244,136,107,0,93,153,50,1,198,97,151,0,110,11,86,255,143,117,174,255,115,212,200,0,5,202,183,0,237,164,10,254,185,239,62,0,236,120,18,254,98,123,99,255,168,201,194,254,46,234,214,0,191,133,49,255,99,169,119,0,190,187,35,1,115,21,45,255,249,131,72,0,112,6,123,255,214,49,181,254,166,233,34,0,92,197,102,254,253,228,205,255,3,59,201,1,42,98,46,0,219,37,35,255,169,195,38,0,94,124,193,1,156,43,223,0,95,72,133,254,120,206,191,0,122,197,239,255,177,187,79,255,254,46,2,1,250,167,190,0,84,129,19,0,203,113,166,255,249,31,189,254,72,157,202,255,208,71,73,255,207,24,72,0,10,16,18,1,210,81,76,255,88,208,192,255,126,243,107,255,238,141,120,255,199,121,234,255,137,12,59,255,36,220,123,255,148,179,60,254,240,12,29,0,66,0,97,1,36,30,38,255,115,1,93,255,96,103,231,255,197,158,59,1,192,164,240,0,202,202,57,255,24,174,48,0,89,77,155,1,42,76,215,0,244,151,233,0,23,48,81,0,239,127,52,254,227,130,37,255,248,116,93,1,124,132,118,0,173,254,192,1,6,235,83,255,110,175,231,1,251,28,182], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
/* memory initializer */ allocate([129,249,93,254,84,184,128,0,76,181,62,0,175,128,186,0,100,53,136,254,109,29,226,0,221,233,58,1,20,99,74,0,0,22,160,0,134,13,21,0,9,52,55,255,17,89,140,0,175,34,59,0,84,165,119,255,224,226,234,255,7,72,166,255,123,115,255,1,18,214,246,0,250,7,71,1,217,220,185,0,212,35,76,255,38,125,175,0,189,97,210,0,114,238,44,255,41,188,169,254,45,186,154,0,81,92,22,0,132,160,193,0,121,208,98,255,13,81,44,255,203,156,82,0,71,58,21,255,208,114,191,254,50,38,147,0,154,216,195,0,101,25,18,0,60,250,215,255,233,132,235,255,103,175,142,1,16,14,92,0,141,31,110,254,238,241,45,255,153,217,239,1,97,168,47,255,249,85,16,1,28,175,62,255,57,254,54,0,222,231,126,0,166,45,117,254,18,189,96,255,228,76,50,0,200,244,94,0,198,152,120,1,68,34,69,255,12,65,160,254,101,19,90,0,167,197,120,255,68,54,185,255,41,218,188,0,113,168,48,0,88,105,189,1,26,82,32,255,185,93,164,1,228,240,237,255,66,182,53,0,171,197,92,255,107,9,233,1,199,120,144,255,78,49,10,255,109,170,105,255,90,4,31,255,28,244,113,255,74,58,11,0,62,220,246,255,121,154,200,254,144,210,178,255,126,57,129,1,43,250,14,255,101,111,28,1,47,86,241,255,61,70,150,255,53,73,5,255,30,26,158,0,209,26,86,0,138,237,74,0,164,95,188,0,142,60,29,254,162,116,248,255,187,175,160,0,151,18,16,0,209,111,65,254,203,134,39,255,88,108,49,255,131,26,71,255,221,27,215,254,104,105,93,255,31,236,31,254,135,0,211,255,143,127,110,1,212,73,229,0,233,67,167,254,195,1,208,255,132,17,221,255,51,217,90,0,67,235,50,255,223,210,143,0,179,53,130,1,233,106,198,0,217,173,220,255,112,229,24,255,175,154,93,254,71,203,246,255,48,66,133,255,3,136,230,255,23,221,113,254,235,111,213,0,170,120,95,254,251,221,2,0,45,130,158,254,105,94,217,255,242,52,180,254,213,68,45,255,104,38,28,0,244,158,76,0,161,200,96,255,207,53,13,255,187,67,148,0,170,54,248,0,119,162,178,255,83,20,11,0,42,42,192,1,146,159,163,255,183,232,111,0,77,229,21,255,71,53,143,0,27,76,34,0,246,136,47,255,219,39,182,255,92,224,201,1,19,142,14,255,69,182,241,255,163,118,245,0,9,109,106,1,170,181,247,255,78,47,238,255,84,210,176,255,213,107,139,0,39,38,11,0,72,21,150,0,72,130,69,0,205,77,155,254,142,133,21,0,71,111,172,254,226,42,59,255,179,0,215,1,33,128,241,0,234,252,13,1,184,79,8,0,110,30,73,255,246,141,189,0,170,207,218,1,74,154,69,255,138,246,49,255,155,32,100,0,125,74,105,255,90,85,61,255,35,229,177,255,62,125,193,255,153,86,188,1,73,120,212,0,209,123,246,254,135,209,38,255,151,58,44,1,92,69,214,255,14,12,88,255,252,153,166,255,253,207,112,255,60,78,83,255,227,124,110,0,180,96,252,255,53,117,33,254,164,220,82,255,41,1,27,255,38,164,166,255,164,99,169,254,61,144,70,255,192,166,18,0,107,250,66,0,197,65,50,0,1,179,18,255,255,104,1,255,43,153,35,255,80,111,168,0,110,175,168,0,41,105,45,255,219,14,205,255,164,233,140,254,43,1,118,0,233,67,195,0,178,82,159,255,138,87,122,255,212,238,90,255,144,35,124,254,25,140,164,0,251,215,44,254,133,70,107,255,101,227,80,254,92,169,55,0,215,42,49,0,114,180,85,255,33,232,27,1,172,213,25,0,62,176,123,254,32,133,24,255,225,191,62,0,93,70,153,0,181,42,104,1,22,191,224,255,200,200,140,255,249,234,37,0,149,57,141,0,195,56,208,255,254,130,70,255,32,173,240,255,29,220,199,0,110,100,115,255,132,229,249,0,228,233,223,255,37,216,209,254,178,177,209,255,183,45,165,254,224,97,114,0,137,97,168,255,225,222,172,0,165,13,49,1,210,235,204,255,252,4,28,254,70,160,151,0,232,190,52,254,83,248,93,255,62,215,77,1,175,175,179,255,160,50,66,0,121,48,208,0,63,169,209,255,0,210,200,0,224,187,44,1,73,162,82,0,9,176,143,255,19,76,193,255,29,59,167,1,24,43,154,0,28,190,190,0,141,188,129,0,232,235,203,255,234,0,109,255,54,65,159,0,60,88,232,255,121,253,150,254,252,233,131,255,198,110,41,1,83,77,71,255,200,22,59,254,106,253,242,255,21,12,207,255,237,66,189,0,90,198,202,1,225,172,127,0,53,22,202,0,56,230,132,0,1,86,183,0,109,190,42,0,243,68,174,1,109,228,154,0,200,177,122,1,35,160,183,255,177,48,85,255,90,218,169,255,248,152,78,0,202,254,110,0,6,52,43,0,142,98,65,255,63,145,22,0,70,106,93,0,232,138,107,1,110,179,61,255,211,129,218,1,242,209,92,0,35,90,217,1,182,143,106,255,116,101,217,255,114,250,221,255,173,204,6,0,60,150,163,0,73,172,44,255,239,110,80,255,237,76,153,254,161,140,249,0,149,232,229,0,133,31,40,255,174,164,119,0,113,51,214,0,129,228,2,254,64,34,243,0,107,227,244,255,174,106,200,255,84,153,70,1,50,35,16,0,250,74,216,254,236,189,66,255,153,249,13,0,230,178,4,255,221,41,238,0,118,227,121,255,94,87,140,254,254,119,92,0,73,239,246,254,117,87,128,0,19,211,145,255,177,46,252,0,229,91,246,1,69,128,247,255,202,77,54,1,8,11,9,255,153,96,166,0,217,214,173,255,134,192,2,1,0,207,0,0,189,174,107,1,140,134,100,0,158,193,243,1,182,102,171,0,235,154,51,0,142,5,123,255,60,168,89,1,217,14,92,255,19,214,5,1,211,167,254,0,44,6,202,254,120,18,236,255,15,113,184,255,184,223,139,0,40,177,119,254,182,123,90,255,176,165,176,0,247,77,194,0,27,234,120,0,231,0,214,255,59,39,30,0,125,99,145,255,150,68,68,1,141,222,248,0,153,123,210,255,110,127,152,255,229,33,214,1,135,221,197,0,137,97,2,0,12,143,204,255,81,41,188,0,115,79,130,255,94,3,132,0,152,175,187,255,124,141,10,255,126,192,179,255,11,103,198,0,149,6,45,0,219,85,187,1,230,18,178,255,72,182,152,0,3,198,184,255,128,112,224,1,97,161,230,0,254,99,38,255,58,159,197,0,151,66,219,0,59,69,143,255,185,112,249,0,119,136,47,255,123,130,132,0,168,71,95,255,113,176,40,1,232,185,173,0,207,93,117,1,68,157,108,255,102,5,147,254,49,97,33,0,89,65,111,254,247,30,163,255,124,217,221,1,102,250,216,0,198,174,75,254,57,55,18,0,227,5,236,1,229,213,173,0,201,109,218,1,49,233,239,0,30,55,158,1,25,178,106,0,155,111,188,1,94,126,140,0,215,31,238,1,77,240,16,0,213,242,25,1,38,71,168,0,205,186,93,254,49,211,140,255,219,0,180,255,134,118,165,0,160,147,134,255,110,186,35,255,198,243,42,0,243,146,119,0,134,235,163,1,4,241,135,255,193,46,193,254,103,180,79,255,225,4,184,254,242,118,130,0,146,135,176,1,234,111,30,0,69,66,213,254,41,96,123,0,121,94,42,255,178,191,195,255,46,130,42,0,117,84,8,255,233,49,214,254,238,122,109,0,6,71,89,1,236,211,123,0,244,13,48,254,119,148,14,0,114,28,86,255,75,237,25,255,145,229,16,254,129,100,53,255,134,150,120,254,168,157,50,0,23,72,104,255,224,49,14,0,255,123,22,255,151,185,151,255,170,80,184,1,134,182,20,0,41,100,101,1,153,33,16,0,76,154,111,1,86,206,234,255,192,160,164,254,165,123,93,255,1,216,164,254,67,17,175,255,169,11,59,255,158,41,61,255,73,188,14,255,195,6,137,255,22,147,29,255,20,103,3,255,246,130,227,255,122,40,128,0,226,47,24,254,35,36,32,0,152,186,183,255,69,202,20,0,195,133,195,0,222,51,247,0,169,171,94,1,183,0,160,255,64,205,18,1,156,83,15,255,197,58,249,254,251,89,110,255,50,10,88,254,51,43,216,0,98,242,198,1,245,151,113,0,171,236,194,1,197,31,199,255,229,81,38,1,41,59,20,0,253,104,230,0,152,93,14,255,246,242,146,254,214,169,240,255,240,102,108,254,160,167,236,0,154,218,188,0,150,233,202,255,27,19,250,1,2,71,133,255,175,12,63,1,145,183,198,0,104,120,115,255,130,251,247,0,17,212,167,255,62,123,132,255,247,100,189,0,155,223,152,0,143,197,33,0,155,59,44,255,150,93,240,1,127,3,87,255,95,71,207,1,167,85,1,255,188,152,116,255,10,23,23,0,137,195,93,1,54,98,97,0,240,0,168,255,148,188,127,0,134,107,151,0,76,253,171,0,90,132,192,0,146,22,54,0,224,66,54,254,230,186,229,255,39,182,196,0,148,251,130,255,65,131,108,254,128,1,160,0,169,49,167,254,199,254,148,255,251,6,131,0,187,254,129,255,85,82,62,0,178,23,58,255,254,132,5,0,164,213,39,0,134,252,146,254,37,53,81,255,155,134,82,0,205,167,238,255,94,45,180,255,132,40,161,0,254,111,112,1,54,75,217,0,179,230,221,1,235,94,191,255,23,243,48,1,202,145,203,255,39,118,42,255,117,141,253,0,254,0,222,0,43,251,50,0,54,169,234,1,80,68,208,0,148,203,243,254,145,7,135,0,6,254,0,0,252,185,127,0,98,8,129,255,38,35,72,255,211,36,220,1,40,26,89,0,168,64,197,254,3,222,239,255,2,83,215,254,180,159,105,0,58,115,194,0,186,116,106,255,229,247,219,255,129,118,193,0,202,174,183,1,166,161,72,0,201,107,147,254,237,136,74,0,233,230,106,1,105,111,168,0,64,224,30,1,1,229,3,0,102,151,175,255,194,238,228,255,254,250,212,0,187,237,121,0,67,251,96,1,197,30,11,0,183,95,204,0,205,89,138,0,64,221,37,1,255,223,30,255,178,48,211,255,241,200,90,255,167,209,96,255,57,130,221,0,46,114,200,255,61,184,66,0,55,182,24,254,110,182,33,0,171,190,232,255,114,94,31,0,18,221,8,0,47,231,254,0,255,112,83,0,118,15,215,255,173,25,40,254,192,193,31,255,238,21,146,255,171,193,118,255,101,234,53,254,131,212,112,0,89,192,107,1,8,208,27,0,181,217,15,255,231,149,232,0,140,236,126,0,144,9,199,255,12,79,181,254,147,182,202,255,19,109,182,255,49,212,225,0,74,163,203,0,175,233,148,0,26,112,51,0,193,193,9,255,15,135,249,0,150,227,130,0,204,0,219,1,24,242,205,0,238,208,117,255,22,244,112,0,26,229,34,0,37,80,188,255,38,45,206,254,240,90,225,255,29,3,47,255,42,224,76,0,186,243,167,0,32,132,15,255,5,51,125,0,139,135,24,0,6,241,219,0,172,229,133,255,246,214,50,0,231,11,207,255,191,126,83,1,180,163,170,255,245,56,24,1,178,164,211,255,3,16,202,1,98,57,118,255,141,131,89,254,33,51,24,0,243,149,91,255,253,52,14,0,35,169,67,254,49,30,88,255,179,27,36,255,165,140,183,0,58,189,151,0,88,31,0,0,75,169,66,0,66,101,199,255,24,216,199,1,121,196,26,255,14,79,203,254,240,226,81,255,94,28,10,255,83,193,240,255,204,193,131,255,94,15,86,0,218,40,157,0,51,193,209,0,0,242,177,0,102,185,247,0,158,109,116,0,38,135,91,0,223,175,149,0,220,66,1,255,86,60,232,0,25,96,37,255,225,122,162,1,215,187,168,255,158,157,46,0,56,171,162,0,232,240,101,1,122,22,9,0,51,9,21,255,53,25,238,255,217,30,232,254,125,169,148,0,13,232,102,0,148,9,37,0,165,97,141,1,228,131,41,0,222,15,243,255,254,18,17,0,6,60,237,1,106,3,113,0,59,132,189,0,92,112,30,0,105,208,213,0,48,84,179,255,187,121,231,254,27,216,109,255,162,221,107,254,73,239,195,255,250,31,57,255,149,135,89,255,185,23,115,1,3,163,157,255,18,112,250,0,25,57,187,255,161,96,164,0,47,16,243,0,12,141,251,254,67,234,184,255,41,18,161,0,175,6,96,255,160,172,52,254,24,176,183,255,198,193,85,1,124,121,137,255,151,50,114,255,220,203,60,255,207,239,5,1,0,38,107,255,55,238,94,254,70,152,94,0,213,220,77,1,120,17,69,255,85,164,190,255,203,234,81,0,38,49,37,254,61,144,124,0,137,78,49,254,168,247,48,0,95,164,252,0,105,169,135,0,253,228,134,0,64,166,75,0,81,73,20,255,207,210,10,0,234,106,150,255,94,34,90,255,254,159,57,254,220,133,99,0,139,147,180,254,24,23,185,0,41,57,30,255,189,97,76,0,65,187,223,255,224,172,37,255,34,62,95,1,231,144,240,0,77,106,126,254,64,152,91,0,29,98,155,0,226,251,53,255,234,211,5,255,144,203,222,255,164,176,221,254,5,231,24,0,179,122,205,0,36,1,134,255,125,70,151,254,97,228,252,0,172,129,23,254,48,90,209,255,150,224,82,1,84,134,30,0,241,196,46,0,103,113,234,255,46,101,121,254,40,124,250,255,135,45,242,254,9,249,168,255,140,108,131,255,143,163,171,0,50,173,199,255,88,222,142,255,200,95,158,0,142,192,163,255,7,117,135,0,111,124,22,0,236,12,65,254,68,38,65,255,227,174,254,0,244,245,38,0,240,50,208,255,161,63,250,0,60,209,239,0,122,35,19,0,14,33,230,254,2,159,113,0,106,20,127,255,228,205,96,0,137,210,174,254,180,212,144,255,89,98,154,1,34,88,139,0,167,162,112,1,65,110,197,0,241,37,169,0,66,56,131,255,10,201,83,254,133,253,187,255,177,112,45,254,196,251,0,0,196,250,151,255,238,232,214,255,150,209,205,0,28,240,118,0,71,76,83,1,236,99,91,0,42,250,131,1,96,18,64,255,118,222,35,0,113,214,203,255,122,119,184,255,66,19,36,0,204,64,249,0,146,89,139,0,134,62,135,1,104,233,101,0,188,84,26,0,49,249,129,0,208,214,75,255,207,130,77,255,115,175,235,0,171,2,137,255,175,145,186,1,55,245,135,255,154,86,181,1,100,58,246,255,109,199,60,255,82,204,134,255,215,49,230,1,140,229,192,255,222,193,251,255,81,136,15,255,179,149,162,255,23,39,29,255,7,95,75,254,191,81,222,0,241,81,90,255,107,49,201,255,244,211,157,0,222,140,149,255,65,219,56,254,189,246,90,255,178,59,157,1,48,219,52,0,98,34,215,0,28,17,187,255,175,169,24,0,92,79,161,255,236,200,194,1,147,143,234,0,229,225,7,1,197,168,14,0,235,51,53,1,253,120,174,0,197,6,168,255,202,117,171,0,163,21,206,0,114,85,90,255,15,41,10,255,194,19,99,0,65,55,216,254,162,146,116,0,50,206,212,255,64,146,29,255,158,158,131,1,100,165,130,255,172,23,129,255,125,53,9,255,15,193,18,1,26,49,11,255,181,174,201,1,135,201,14,255,100,19,149,0,219,98,79,0,42,99,143,254,96,0,48,255,197,249,83,254,104,149,79,255,235,110,136,254,82,128,44,255,65,41,36,254,88,211,10,0,187,121,187,0,98,134,199,0,171,188,179,254,210,11,238,255,66,123,130,254,52,234,61,0,48,113,23,254,6,86,120,255,119,178,245,0,87,129,201,0,242,141,209,0,202,114,85,0,148,22,161,0,103,195,48,0,25,49,171,255,138,67,130,0,182,73,122,254,148,24,130,0,211,229,154,0,32,155,158,0,84,105,61,0,177,194,9,255,166,89,86,1,54,83,187,0,249,40,117,255,109,3,215,255,53,146,44,1,63,47,179,0,194,216,3,254,14,84,136,0,136,177,13,255,72,243,186,255,117,17,125,255,211,58,211,255,93,79,223,0,90,88,245,255,139,209,111,255,70,222,47,0,10,246,79,255,198,217,178,0,227,225,11,1,78,126,179,255,62,43,126,0,103,148,35,0,129,8,165,254,245,240,148,0,61,51,142,0,81,208,134,0,15,137,115,255,211,119,236,255,159,245,248,255,2,134,136,255,230,139,58,1,160,164,254,0,114,85,141,255,49,166,182,255,144,70,84,1,85,182,7,0,46,53,93,0,9,166,161,255,55,162,178,255,45,184,188,0,146,28,44,254,169,90,49,0,120,178,241,1,14,123,127,255,7,241,199,1,189,66,50,255,198,143,101,254,189,243,135,255,141,24,24,254,75,97,87,0,118,251,154,1,237,54,156,0,171,146,207,255,131,196,246,255,136,64,113,1,151,232,57,0,240,218,115,0,49,61,27,255,64,129,73,1,252,169,27,255,40,132,10,1,90,201,193,255,252,121,240,1,186,206,41,0,43,198,97,0,145,100,183,0,204,216,80,254,172,150,65,0,249,229,196,254,104,123,73,255,77,104,96,254,130,180,8,0,104,123,57,0,220,202,229,255,102,249,211,0,86,14,232,255,182,78,209,0,239,225,164,0,106,13,32,255,120,73,17,255,134,67,233,0,83,254,181,0,183,236,112,1,48,64,131,255,241,216,243,255,65,193,226,0,206,241,100,254,100,134,166,255,237,202,197,0,55,13,81,0,32,124,102,255,40,228,177,0,118,181,31,1,231,160,134,255,119,187,202,0,0,142,60,255,128,38,189,255,166,201,150,0,207,120,26,1,54,184,172,0,12,242,204,254,133,66,230,0,34,38,31,1,184,112,80,0,32,51,165,254,191,243,55,0,58,73,146,254,155,167,205,255,100,104,152,255,197,254,207,255,173,19,247,0,238,10,202,0,239,151,242,0,94,59,39,255,240,29,102,255,10,92,154,255,229,84,219,255,161,129,80,0,208,90,204,1,240,219,174,255,158,102,145,1,53,178,76,255,52,108,168,1,83,222,107,0,211,36,109,0,118,58,56,0,8,29,22,0,237,160,199,0,170,209,157,0,137,71,47,0,143,86,32,0,198,242,2,0,212,48,136,1,92,172,186,0,230,151,105,1,96,191,229,0,138,80,191,254,240,216,130,255,98,43,6,254,168,196,49,0,253,18,91,1,144,73,121,0,61,146,39,1,63,104,24,255,184,165,112,254,126,235,98,0,80,213,98,255,123,60,87,255,82,140,245,1,223,120,173,255,15,198,134,1,206,60,239,0,231,234,92,255,33,238,19,255,165,113,142,1,176,119,38,0,160,43,166,254,239,91,105,0,107,61,194,1,25,4,68,0,15,139,51,0,164,132,106,255,34,116,46,254,168,95,197,0,137,212,23,0,72,156,58,0,137,112,69,254,150,105,154,255,236,201,157,0,23,212,154,255,136,82,227,254,226,59,221,255,95,149,192,0,81,118,52,255,33,43,215,1,14,147,75,255,89,156,121,254,14,18,79,0,147,208,139,1,151,218,62,255,156,88,8,1,210,184,98,255,20,175,123,255,102,83,229,0,220,65,116,1,150,250,4,255,92,142,220,255,34,247,66,255,204,225,179,254,151,81,151,0,71,40,236,255,138,63,62,0,6,79,240,255,183,185,181,0,118,50,27,0,63,227,192,0,123,99,58,1,50,224,155,255,17,225,223,254,220,224,77,255,14,44,123,1,141,128,175,0,248,212,200,0,150,59,183,255,147,97,29,0,150,204,181,0,253,37,71,0,145,85,119,0,154,200,186,0,2,128,249,255,83,24,124,0,14,87,143,0,168,51,245,1,124,151,231,255,208,240,197,1,124,190,185,0,48,58,246,0,20,233,232,0,125,18,98,255,13,254,31,255,245,177,130,255,108,142,35,0,171,125,242,254,140,12,34,255,165,161,162,0,206,205,101,0,247,25,34,1,100,145,57,0,39,70,57,0,118,204,203,255,242,0,162,0,165,244,30,0,198,116,226,0,128,111,153,255,140,54,182,1,60,122,15,255,155,58,57,1,54,50,198,0,171,211,29,255,107,138,167,255,173,107,199,255,109,161,193,0,89,72,242,255,206,115,89,255,250,254,142,254,177,202,94,255,81,89,50,0,7,105,66,255,25,254,255,254,203,64,23,255,79,222,108,255,39,249,75,0,241,124,50,0,239,152,133,0,221,241,105,0,147,151,98,0,213,161,121,254,242,49,137,0,233,37,249,254,42,183,27,0,184,119,230,255,217,32,163,255,208,251,228,1,137,62,131,255,79,64,9,254,94,48,113,0,17,138,50,254,193,255,22,0,247,18,197,1,67,55,104,0,16,205,95,255,48,37,66,0,55,156,63,1,64,82,74,255,200,53,71,254,239,67,125,0,26,224,222,0,223,137,93,255,30,224,202,255,9,220,132,0,198,38,235,1,102,141,86,0,60,43,81,1,136,28,26,0,233,36,8,254,207,242,148,0,164,162,63,0,51,46,224,255,114,48,79,255,9,175,226,0,222,3,193,255,47,160,232,255,255,93,105,254,14,42,230,0,26,138,82,1,208,43,244,0,27,39,38,255,98,208,127,255,64,149,182,255,5,250,209,0,187,60,28,254,49,25,218,255,169,116,205,255,119,18,120,0,156,116,147,255,132,53,109,255,13,10,202,0,110,83,167,0,157,219,137,255,6,3,130,255,50,167,30,255,60,159,47,255,129,128,157,254,94,3,189,0,3,166,68,0,83,223,215,0,150,90,194,1,15,168,65,0,227,83,51,255,205,171,66,255,54,187,60,1,152,102,45,255,119,154,225,0,240,247,136,0,100,197,178,255,139,71,223,255,204,82,16,1,41,206,42,255,156,192,221,255,216,123,244,255,218,218,185,255,187,186,239,255,252,172,160,255,195,52,22,0,144,174,181,254,187,100,115,255,211,78,176,255,27,7,193,0,147,213,104,255,90,201,10,255,80,123,66,1,22,33,186,0,1,7,99,254,30,206,10,0,229,234,5,0,53,30,210,0,138,8,220,254,71,55,167,0,72,225,86,1,118,190,188,0,254,193,101,1,171,249,172,255,94,158,183,254,93,2,108,255,176,93,76,255,73,99,79,255,74,64,129,254,246,46,65,0,99,241,127,254,246,151,102,255,44,53,208,254,59,102,234,0,154,175,164,255,88,242,32,0,111,38,1,0,255,182,190,255,115,176,15,254,169,60,129,0,122,237,241,0,90,76,63,0,62,74,120,255,122,195,110,0,119,4,178,0,222,242,210,0,130,33,46,254,156,40,41,0,167,146,112,1,49,163,111,255,121,176,235,0,76,207,14,255,3,25,198,1,41,235,213,0,85,36,214,1,49,92,109,255,200,24,30,254,168,236,195,0,145,39,124,1,236,195,149,0,90,36,184,255,67,85,170,255,38,35,26,254,131,124,68,255,239,155,35,255,54,201,164,0,196,22,117,255,49,15,205,0,24,224,29,1,126,113,144,0,117,21,182,0,203,159,141,0,223,135,77,0,176,230,176,255,190,229,215,255,99,37,181,255,51,21,138,255,25,189,89,255,49,48,165,254,152,45,247,0,170,108,222,0,80,202,5,0,27,69,103,254,204,22,129,255,180,252,62,254,210,1,91,255,146,110,254,255,219,162,28,0,223,252,213,1,59,8,33,0,206,16,244,0,129,211,48,0,107,160,208,0,112,59,209,0,109,77,216,254,34,21,185,255,246,99,56,255,179,139,19,255,185,29,50,255,84,89,19,0,74,250,98,255,225,42,200,255,192,217,205,255,210,16,167,0,99,132,95,1,43,230,57,0,254,11,203,255,99,188,63,255,119,193,251,254,80,105,54,0,232,181,189,1,183,69,112,255,208,171,165,255,47,109,180,255,123,83,165,0,146,162,52,255,154,11,4,255,151,227,90,255,146,137,97,254,61,233,41,255,94,42,55,255,108,164,236,0,152,68,254,0,10,140,131,255,10,106,79,254,243,158,137,0,67,178,66,254,177,123,198,255,15,62,34,0,197,88,42,255,149,95,177,255,152,0,198,255,149,254,113,255,225,90,163,255,125,217,247,0,18,17,224,0,128,66,120,254,192,25,9,255,50,221,205,0,49,212,70,0,233,255,164,0,2,209,9,0,221,52,219,254,172,224,244,255,94,56,206,1,242,179,2,255,31,91,164,1,230,46,138,255,189,230,220,0,57,47,61,255,111,11,157,0,177,91,152,0,28,230,98,0,97,87,126,0,198,89,145,255,167,79,107,0,249,77,160,1,29,233,230,255,150,21,86,254,60,11,193,0,151,37,36,254,185,150,243,255,228,212,83,1,172,151,180,0,201,169,155,0,244,60,234,0,142,235,4,1,67,218,60,0,192,113,75,1,116,243,207,255,65,172,155,0,81,30,156,255,80,72,33,254,18,231,109,255,142,107,21,254,125,26,132,255,176,16,59,255,150,201,58,0,206,169,201,0,208,121,226,0,40,172,14,255,150,61,94,255,56,57,156,255,141,60,145,255,45,108,149,255,238,145,155,255,209,85,31,254,192,12,210,0,99,98,93,254,152,16,151,0,225,185,220,0,141,235,44,255,160,172,21,254,71,26,31,255,13,64,93,254,28,56,198,0,177,62,248,1,182,8,241,0,166,101,148,255,78,81,133,255,129,222,215,1,188,169,129,255,232,7,97,0,49,112,60,255,217,229,251,0,119,108,138,0,39,19,123,254,131,49,235,0,132,84,145,0,130,230,148,255,25,74,187,0,5,245,54,255,185,219,241,1,18,194,228,255,241,202,102,0,105,113,202,0,155,235,79,0,21,9,178,255,156,1,239,0,200,148,61,0,115,247,210,255,49,221,135,0,58,189,8,1,35,46,9,0,81,65,5,255,52,158,185,255,125,116,46,255,74,140,13,255,210,92,172,254,147,23,71,0,217,224,253,254,115,108,180,255,145,58,48,254,219,177,24,255,156,255,60,1,154,147,242,0,253,134,87,0,53,75,229,0,48,195,222,255,31,175,50,255,156,210,120,255,208,35,222,255,18,248,179,1,2,10,101,255,157,194,248,255,158,204,101,255,104,254,197,255,79,62,4,0,178,172,101,1,96,146,251,255,65,10,156,0,2,137,165,255,116,4,231,0,242,215,1,0,19,35,29,255,43,161,79,0,59,149,246,1,251,66,176,0,200,33,3,255,80,110,142,255,195,161,17,1,228,56,66,255,123,47,145,254,132,4,164,0,67,174,172,0,25,253,114,0,87,97,87,1,250,220,84,0,96,91,200,255,37,125,59,0,19,65,118,0,161,52,241,255,237,172,6,255,176,191,255,255,1,65,130,254,223,190,230,0,101,253,231,255,146,35,109,0,250,29,77,1,49,0,19,0,123,90,155,1,22,86,32,255,218,213,65,0,111,93,127,0,60,93,169,255,8,127,182,0,17,186,14,254,253,137,246,255,213,25,48,254,76,238,0,255,248,92,70,255,99,224,139,0,184,9,255,1,7,164,208,0,205,131,198,1,87,214,199,0,130,214,95,0,221,149,222,0,23,38,171,254,197,110,213,0,43,115,140,254,215,177,118,0,96,52,66,1,117,158,237,0,14,64,182,255,46,63,174,255,158,95,190,255,225,205,177,255,43,5,142,255,172,99,212,255,244,187,147,0,29,51,153,255,228,116,24,254,30,101,207,0,19,246,150,255,134,231,5,0,125,134,226,1,77,65,98,0,236,130,33,255,5,110,62,0,69,108,127,255,7,113,22,0,145,20,83,254,194,161,231,255,131,181,60,0,217,209,177,255,229,148,212,254,3,131,184,0,117,177,187,1,28,14,31,255,176,102,80,0,50,84,151,255,125,31,54,255,21,157,133,255,19,179,139,1,224,232,26,0,34,117,170,255,167,252,171,255,73,141,206,254,129,250,35,0,72,79,236,1,220,229,20,255,41,202,173,255,99,76,238,255,198,22,224,255,108,198,195,255,36,141,96,1,236,158,59,255,106,100,87,0,110,226,2,0,227,234,222,0,154,93,119,255,74,112,164,255,67,91,2,255,21,145,33,255,102,214,137,255,175,230,103,254,163,246,166,0,93,247,116,254,167,224,28,255,220,2,57,1,171,206,84,0,123,228,17,255,27,120,119,0,119,11,147,1,180,47,225,255,104,200,185,254,165,2,114,0,77,78,212,0,45,154,177,255,24,196,121,254,82,157,182,0,90,16,190,1,12,147,197,0,95,239,152,255,11,235,71,0,86,146,119,255,172,134,214,0,60,131,196,0,161,225,129,0,31,130,120,254,95,200,51,0,105,231,210,255,58,9,148,255,43,168,221,255,124,237,142,0,198,211,50,254,46,245,103,0,164,248,84,0,152,70,208,255,180,117,177,0,70,79,185,0,243,74,32,0,149,156,207,0,197,196,161,1,245,53,239,0,15,93,246,254,139,240,49,255,196,88,36,255,162,38,123,0,128,200,157,1,174,76,103,255,173,169,34,254,216,1,171,255,114,51,17,0,136,228,194,0,110,150,56,254,106,246,159,0,19,184,79,255,150,77,240,255,155,80,162,0,0,53,169,255,29,151,86,0,68,94,16,0,92,7,110,254,98,117,149,255,249,77,230,255,253,10,140,0,214,124,92,254,35,118,235,0,89,48,57,1,22,53,166,0,184,144,61,255,179,255,194,0,214,248,61,254,59,110,246,0,121,21,81,254,166,3,228,0,106,64,26,255,69,232,134,255,242,220,53,254,46,220,85,0,113,149,247,255,97,179,103,255,190,127,11,0,135,209,182,0,95,52,129,1,170,144,206,255,122,200,204,255,168,100,146,0,60,144,149,254,70,60,40,0,122,52,177,255,246,211,101,255,174,237,8,0,7,51,120,0,19,31,173,0,126,239,156,255,143,189,203,0,196,128,88,255,233,133,226,255,30,125,173,255,201,108,50,0,123,100,59,255,254,163,3,1,221,148,181,255,214,136,57,254,222,180,137,255,207,88,54,255,28,33,251,255,67,214,52,1,210,208,100,0,81,170,94,0,145,40,53,0,224,111,231,254,35,28,244,255,226,199,195,254,238,17,230,0,217,217,164,254,169,157,221,0,218,46,162,1,199,207,163,255,108,115,162,1,14,96,187,255,118,60,76,0,184,159,152,0,209,231,71,254,42,164,186,255,186,153,51,254,221,171,182,255,162,142,173,0,235,47,193,0,7,139,16,1,95,164,64,255,16,221,166,0,219,197,16,0,132,29,44,255,100,69,117,255,60,235,88,254,40,81,173,0,71,190,61,255,187,88,157,0,231,11,23,0,237,117,164,0,225,168,223,255,154,114,116,255,163,152,242,1,24,32,170,0,125,98,113,254,168,19,76,0,17,157,220,254,155,52,5,0,19,111,161,255,71,90,252,255,173,110,240,0,10,198,121,255,253,255,240,255,66,123,210,0,221,194,215,254,121,163,17,255,225,7,99,0,190,49,182,0,115,9,133,1,232,26,138,255,213,68,132,0,44,119,122,255,179,98,51,0,149,90,106,0,71,50,230,255,10,153,118,255,177,70,25,0,165,87,205,0,55,138,234,0,238,30,97,0,113,155,207,0,98,153,127,0,34,107,219,254,117,114,172,255,76,180,255,254,242,57,179,255,221,34,172,254,56,162,49,255,83,3,255,255,113,221,189,255,188,25,228,254,16,88,89,255,71,28,198,254,22,17,149,255,243,121,254,255,107,202,99,255,9,206,14,1,220,47,153,0,107,137,39,1,97,49,194,255,149,51,197,254,186,58,11,255,107,43,232,1,200,6,14,255,181,133,65,254,221,228,171,255,123,62,231,1,227,234,179,255,34,189,212,254,244,187,249,0,190,13,80,1,130,89,1,0,223,133,173,0,9,222,198,255,66,127,74,0,167,216,93,255,155,168,198,1,66,145,0,0,68,102,46,1,172,90,154,0,216,128,75,255,160,40,51,0,158,17,27,1,124,240,49,0,236,202,176,255,151,124,192,255,38,193,190,0,95,182,61,0,163,147,124,255,255,165,51,255,28,40,17,254,215,96,78,0,86,145,218,254,31,36,202,255,86,9,5,0,111,41,200,255,237,108,97,0,57,62,44,0,117,184,15,1,45,241,116,0,152,1,220,255,157,165,188,0,250,15,131,1,60,44,125,255,65,220,251,255,75,50,184,0,53,90,128,255,231,80,194,255,136,129,127,1,21,18,187,255,45,58,161,255,71,147,34,0,174,249,11,254,35,141,29,0,239,68,177,255,115,110,58,0,238,190,177,1,87,245,166,255,190,49,247,255,146,83,184,255,173,14,39,255,146,215,104,0,142,223,120,0,149,200,155,255,212,207,145,1,16,181,217,0,173,32,87,255,255,35,181,0,119,223,161,1,200,223,94,255,70,6,186,255,192,67,85,255,50,169,152,0,144,26,123,255,56,243,179,254,20,68,136,0,39,140,188,254,253,208,5,255,200,115,135,1,43,172,229,255,156,104,187,0,151,251,167,0,52,135,23,0,151,153,72,0,147,197,107,254,148,158,5,255,238,143,206,0,126,153,137,255,88,152,197,254,7,68,167,0,252,159,165,255,239,78,54,255,24,63,55,255,38,222,94,0,237,183,12,255,206,204,210,0,19,39,246,254,30,74,231,0,135,108,29,1,179,115,0,0,117,118,116,1,132,6,252,255,145,129,161,1,105,67,141,0,82,37,226,255,238,226,228,255,204,214,129,254,162,123,100,255,185,121,234,0,45,108,231,0,66,8,56,255,132,136,128,0,172,224,66,254,175,157,188,0,230,223,226,254,242,219,69,0,184,14,119,1,82,162,56,0,114,123,20,0,162,103,85,255,49,239,99,254,156,135,215,0,111,255,167,254,39,196,214,0,144,38,79,1,249,168,125,0,155,97,156,255,23,52,219,255,150,22,144,0,44,149,165,255,40,127,183,0,196,77,233,255,118,129,210,255,170,135,230,255,214,119,198,0,233,240,35,0,253,52,7,255,117,102,48,255,21,204,154,255,179,136,177,255,23,2,3,1,149,130,89,255,252,17,159,1,70,60,26,0,144,107,17,0,180,190,60,255,56,182,59,255,110,71,54,255,198,18,129,255,149,224,87,255,223,21,152,255,138,22,182,255,250,156,205,0,236,45,208,255,79,148,242,1,101,70,209,0,103,78,174,0,101,144,172,255,152,136,237,1,191,194,136,0,113,80,125,1,152,4,141,0,155,150,53,255,196,116,245,0,239,114,73,254,19,82,17,255,124,125,234,255,40,52,191,0,42,210,158,255,155,132,165,0,178,5,42,1,64,92,40,255,36,85,77,255,178,228,118,0,137,66,96,254,115,226,66,0,110,240,69,254,151,111,80,0,167,174,236,255,227,108,107,255,188,242,65,255,183,81,255,0,57,206,181,255,47,34,181,255,213,240,158,1,71,75,95,0,156,40,24,255,102,210,81,0,171,199,228,255,154,34,41,0,227,175,75,0,21,239,195,0,138,229,95,1,76,192,49,0,117,123,87,1,227,225,130,0,125,62,63,255,2,198,171,0,254,36,13,254,145,186,206,0,148,255,244,255,35,0,166,0,30,150,219,1,92,228,212,0,92,198,60,254,62,133,200,255,201,41,59,0,125,238,109,255,180,163,238,1,140,122,82,0,9,22,88,255,197,157,47,255,153,94,57,0,88,30,182,0,84,161,85,0,178,146,124,0,166,166,7,255,21,208,223,0,156,182,242,0,155,121,185,0,83,156,174,254,154,16,118,255,186,83,232,1,223,58,121,255,29,23,88,0,35,125,127,255,170,5,149,254,164,12,130,255,155,196,29,0,161,96,136,0,7,35,29,1,162,37,251,0,3,46,242,255,0,217,188,0,57,174,226,1,206,233,2,0,57,187,136,254,123,189,9,255,201,117,127,255,186,36,204,0,231,25,216,0,80,78,105,0,19,134,129,255,148,203,68,0,141,81,125,254,248,165,200,255,214,144,135,0,151,55,166,255,38,235,91,0,21,46,154,0,223,254,150,255,35,153,180,255,125,176,29,1,43,98,30,255,216,122,230,255,233,160,12,0,57,185,12,254,240,113,7,255,5,9,16,254,26,91,108,0,109,198,203,0,8,147,40,0,129,134,228,255,124,186,40,255,114,98,132,254,166,132,23,0,99,69,44,0,9,242,238,255,184,53,59,0,132,129,102,255,52,32,243,254,147,223,200,255,123,83,179,254,135,144,201,255,141,37,56,1,151,60,227,255,90,73,156,1,203,172,187,0,80,151,47,255,94,137,231,255,36,191,59,255,225,209,181,255,74,215,213,254,6,118,179,255,153,54,193,1,50,0,231,0,104,157,72,1,140,227,154,255,182,226,16,254,96,225,92,255,115,20,170,254,6,250,78,0,248,75,173,255,53,89,6,255,0,180,118,0,72,173,1,0,64,8,206,1,174,133,223,0,185,62,133,255,214,11,98,0,197,31,208,0,171,167,244,255,22,231,181,1,150,218,185,0,247,169,97,1,165,139,247,255,47,120,149,1,103,248,51,0,60,69,28,254,25,179,196,0,124,7,218,254,58,107,81,0,184,233,156,255,252,74,36,0,118,188,67,0,141,95,53,255,222,94,165,254,46,61,53,0,206,59,115,255,47,236,250,255,74,5,32,1,129,154,238,255,106,32,226,0,121,187,61,255,3,166,241,254,67,170,172,255,29,216,178,255,23,201,252,0,253,110,243,0,200,125,57,0,109,192,96,255,52,115,238,0,38,121,243,255,201,56,33,0,194,118,130,0,75,96,25,255,170,30,230,254,39,63,253,0,36,45,250,255,251,1,239,0,160,212,92,1,45,209,237,0,243,33,87,254,237,84,201,255,212,18,157,254,212,99,127,255,217,98,16,254,139,172,239,0,168,201,130,255,143,193,169,255,238,151,193,1,215,104,41,0,239,61,165,254,2,3,242,0,22,203,177,254,177,204,22,0,149,129,213,254,31,11,41,255,0,159,121,254,160,25,114,255,162,80,200,0,157,151,11,0,154,134,78,1,216,54,252,0,48,103,133,0,105,220,197,0,253,168,77,254,53,179,23,0,24,121,240,1,255,46,96,255,107,60,135,254,98,205,249,255,63,249,119,255,120,59,211,255,114,180,55,254,91,85,237,0,149,212,77,1,56,73,49,0,86,198,150,0,93,209,160,0,69,205,182,255,244,90,43,0,20,36,176,0,122,116,221,0,51,167,39,1,231,1,63,255,13,197,134,0,3,209,34,255,135,59,202,0,167,100,78,0,47,223,76,0,185,60,62,0,178,166,123,1,132,12,161,255,61,174,43,0,195,69,144,0,127,47,191,1,34,44,78,0,57,234,52,1,255,22,40,255,246,94,146,0,83,228,128,0,60,78,224,255,0,96,210,255,153,175,236,0,159,21,73,0,180,115,196,254,131,225,106,0,255,167,134,0,159,8,112,255,120,68,194,255,176,196,198,255,118,48,168,255,93,169,1,0,112,200,102,1,74,24,254,0,19,141,4,254,142,62,63,0,131,179,187,255,77,156,155,255,119,86,164,0,170,208,146,255,208,133,154,255,148,155,58,255,162,120,232,254,252,213,155,0,241,13,42,0,94,50,131,0,179,170,112,0,140,83,151,255,55,119,84,1,140,35,239,255,153,45,67,1,236,175,39,0,54,151,103,255,158,42,65,255,196,239,135,254,86,53,203,0,149,97,47,254,216,35,17,255,70,3,70,1,103,36,90,255,40,26,173,0,184,48,13,0,163,219,217,255,81,6,1,255,221,170,108,254,233,208,93,0,100,201,249,254,86,36,35,255,209,154,30,1,227,201,251,255,2,189,167,254,100,57,3,0,13,128,41,0,197,100,75,0,150,204,235,255,145,174,59,0,120,248,149,255,85,55,225,0,114,210,53,254,199,204,119,0,14,247,74,1,63,251,129,0,67,104,151,1,135,130,80,0,79,89,55,255,117,230,157,255,25,96,143,0,213,145,5,0,69,241,120,1,149,243,95,255,114,42,20,0,131,72,2,0,154,53,20,255,73,62,109,0,196,102,152,0,41,12,204,255,122,38,11,1,250,10,145,0,207,125,148,0,246,244,222,255,41,32,85,1,112,213,126,0,162,249,86,1,71,198,127,255,81,9,21,1,98,39,4,255,204,71,45,1,75,111,137,0,234,59,231,0,32,48,95,255,204,31,114,1,29,196,181,255,51,241,167,254,93,109,142,0,104,144,45,0,235,12,181,255,52,112,164,0,76,254,202,255,174,14,162,0,61,235,147,255,43,64,185,254,233,125,217,0,243,88,167,254,74,49,8,0,156,204,66,0,124,214,123,0,38,221,118,1,146,112,236,0,114,98,177,0,151,89,199,0,87,197,112,0,185,149,161,0,44,96,165,0,248,179,20,255,188,219,216,254,40,62,13,0,243,142,141,0,229,227,206,255,172,202,35,255,117,176,225,255,82,110,38,1,42,245,14,255,20,83,97,0,49,171,10,0,242,119,120,0,25,232,61,0,212,240,147,255,4,115,56,255,145,17,239,254,202,17,251,255,249,18,245,255,99,117,239,0,184,4,179,255,246,237,51,255,37,239,137,255,166,112,166,255,81,188,33,255,185,250,142,255,54,187,173,0,208,112,201,0,246,43,228,1,104,184,88,255,212,52,196,255,51,117,108,255,254,117,155,0,46,91,15,255,87,14,144,255,87,227,204,0,83,26,83,1,159,76,227,0,159,27,213,1,24,151,108,0,117,144,179,254,137,209,82,0,38,159,10,0,115,133,201,0,223,182,156,1,110,196,93,255,57,60,233,0,5,167,105,255,154,197,164,0,96,34,186,255,147,133,37,1,220,99,190,0,1,167,84,255,20,145,171,0,194,197,251,254,95,78,133,255,252,248,243,255,225,93,131,255,187,134,196,255,216,153,170,0,20,118,158,254,140,1,118,0,86,158,15,1,45,211,41,255,147,1,100,254,113,116,76,255,211,127,108,1,103,15,48,0,193,16,102,1,69,51,95,255,107,128,157,0,137,171,233,0,90,124,144,1,106,161,182,0,175,76,236,1,200,141,172,255,163,58,104,0,233,180,52,255,240,253,14,255,162,113,254,255,38,239,138,254,52,46,166,0,241,101,33,254,131,186,156,0,111,208,62,255,124,94,160,255,31,172,254,0,112,174,56,255,188,99,27,255,67,138,251,0,125,58,128,1,156,152,174,255,178,12,247,255,252,84,158,0,82,197,14,254,172,200,83,255,37,39,46,1,106,207,167,0,24,189,34,0,131,178,144,0,206,213,4,0,161,226,210,0,72,51,105,255,97,45,187,255,78,184,223,255,176,29,251,0,79,160,86,255,116,37,178,0,82,77,213,1,82,84,141,255,226,101,212,1,175,88,199,255,245,94,247,1,172,118,109,255,166,185,190,0,131,181,120,0,87,254,93,255,134,240,73,255,32,245,143,255,139,162,103,255,179,98,18,254,217,204,112,0,147,223,120,255,53,10,243,0,166,140,150,0,125,80,200,255,14,109,219,255,91,218,1,255,252,252,47,254,109,156,116,255,115,49,127,1,204,87,211,255,148,202,217,255,26,85,249,255,14,245,134,1,76,89,169,255,242,45,230,0,59,98,172,255,114,73,132,254,78,155,49,255,158,126,84,0,49,175,43,255,16,182,84,255,157,103,35,0,104,193,109,255,67,221,154,0,201,172,1,254,8,162,88,0,165,1,29,255,125,155,229,255,30,154,220,1,103,239,92,0,220,1,109,255,202,198,1,0,94,2,142,1,36,54,44,0,235,226,158,255,170,251,214,255,185,77,9,0,97,74,242,0,219,163,149,255,240,35,118,255,223,114,88,254,192,199,3,0,106,37,24,255,201,161,118,255,97,89,99,1,224,58,103,255,101,199,147,254,222,60,99,0,234,25,59,1,52,135,27,0,102,3,91,254,168,216,235,0,229,232,136,0,104,60,129,0,46,168,238,0,39,191,67,0,75,163,47,0,143,97,98,255,56,216,168,1,168,233,252,255,35,111,22,255,92,84,43,0,26,200,87,1,91,253,152,0,202,56,70,0,142,8,77,0,80,10,175,1,252,199,76,0,22,110,82,255,129,1,194,0,11,128,61,1,87,14,145,255,253,222,190,1,15,72,174,0,85,163,86,254,58,99,44,255,45,24,188,254,26,205,15,0,19,229,210,254,248,67,195,0,99,71,184,0,154,199,37,255,151,243,121,255,38,51,75,255,201,85,130,254,44,65,250,0,57,147,243,254,146,43,59,255,89,28,53,0,33,84,24,255,179,51,18,254,189,70,83,0,11,156,179,1,98,134,119,0,158,111,111,0,119,154,73,255,200,63,140,254,45,13,13,255,154,192,2,254,81,72,42,0,46,160,185,254,44,112,6,0,146,215,149,1,26,176,104,0,68,28,87,1,236,50,153,255,179,128,250,254,206,193,191,255,166,92,137,254,53,40,239,0,210,1,204,254,168,173,35,0,141,243,45,1,36,50,109,255,15,242,194,255,227,159,122,255,176,175,202,254,70,57,72,0,40,223,56,0,208,162,58,255,183,98,93,0,15,111,12,0,30,8,76,255,132,127,246,255,45,242,103,0,69,181,15,255,10,209,30,0,3,179,121,0,241,232,218,1,123,199,88,255,2,210,202,1,188,130,81,255,94,101,208,1,103,36,45,0,76,193,24,1,95,26,241,255,165,162,187,0,36,114,140,0,202,66,5,255,37,56,147,0,152,11,243,1,127,85,232,255,250,135,212,1,185,177,113,0,90,220,75,255,69,248,146,0,50,111,50,0,92,22,80,0,244,36,115,254,163,100,82,255], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+10240);
/* memory initializer */ allocate([25,193,6,1,127,61,36,0,253,67,30,254,65,236,170,255,161,17,215,254,63,175,140,0,55,127,4,0,79,112,233,0,109,160,40,0,143,83,7,255,65,26,238,255,217,169,140,255,78,94,189,255,0,147,190,255,147,71,186,254,106,77,127,255,233,157,233,1,135,87,237,255,208,13,236,1,155,109,36,255,180,100,218,0,180,163,18,0,190,110,9,1,17,63,123,255,179,136,180,255,165,123,123,255,144,188,81,254,71,240,108,255,25,112,11,255,227,218,51,255,167,50,234,255,114,79,108,255,31,19,115,255,183,240,99,0,227,87,143,255,72,217,248,255,102,169,95,1,129,149,149,0,238,133,12,1,227,204,35,0,208,115,26,1,102,8,234,0,112,88,143,1,144,249,14,0,240,158,172,254,100,112,119,0,194,141,153,254,40,56,83,255,121,176,46,0,42,53,76,255,158,191,154,0,91,209,92,0,173,13,16,1,5,72,226,255,204,254,149,0,80,184,207,0,100,9,122,254,118,101,171,255,252,203,0,254,160,207,54,0,56,72,249,1,56,140,13,255,10,64,107,254,91,101,52,255,225,181,248,1,139,255,132,0,230,145,17,0,233,56,23,0,119,1,241,255,213,169,151,255,99,99,9,254,185,15,191,255,173,103,109,1,174,13,251,255,178,88,7,254,27,59,68,255,10,33,2,255,248,97,59,0,26,30,146,1,176,147,10,0,95,121,207,1,188,88,24,0,185,94,254,254,115,55,201,0,24,50,70,0,120,53,6,0,142,66,146,0,228,226,249,255,104,192,222,1,173,68,219,0,162,184,36,255,143,102,137,255,157,11,23,0,125,45,98,0,235,93,225,254,56,112,160,255,70,116,243,1,153,249,55,255,129,39,17,1,241,80,244,0,87,69,21,1,94,228,73,255,78,66,65,255,194,227,231,0,61,146,87,255,173,155,23,255,112,116,219,254,216,38,11,255,131,186,133,0,94,212,187,0,100,47,91,0,204,254,175,255,222,18,215,254,173,68,108,255,227,228,79,255,38,221,213,0,163,227,150,254,31,190,18,0,160,179,11,1,10,90,94,255,220,174,88,0,163,211,229,255,199,136,52,0,130,95,221,255,140,188,231,254,139,113,128,255,117,171,236,254,49,220,20,255,59,20,171,255,228,109,188,0,20,225,32,254,195,16,174,0,227,254,136,1,135,39,105,0,150,77,206,255,210,238,226,0,55,212,132,254,239,57,124,0,170,194,93,255,249,16,247,255,24,151,62,255,10,151,10,0,79,139,178,255,120,242,202,0,26,219,213,0,62,125,35,255,144,2,108,255,230,33,83,255,81,45,216,1,224,62,17,0,214,217,125,0,98,153,153,255,179,176,106,254,131,93,138,255,109,62,36,255,178,121,32,255,120,252,70,0,220,248,37,0,204,88,103,1,128,220,251,255,236,227,7,1,106,49,198,255,60,56,107,0,99,114,238,0,220,204,94,1,73,187,1,0,89,154,34,0,78,217,165,255,14,195,249,255,9,230,253,255,205,135,245,0,26,252,7,255,84,205,27,1,134,2,112,0,37,158,32,0,231,91,237,255,191,170,204,255,152,7,222,0,109,192,49,0,193,166,146,255,232,19,181,255,105,142,52,255,103,16,27,1,253,200,165,0,195,217,4,255,52,189,144,255,123,155,160,254,87,130,54,255,78,120,61,255,14,56,41,0,25,41,125,255,87,168,245,0,214,165,70,0,212,169,6,255,219,211,194,254,72,93,164,255,197,33,103,255,43,142,141,0,131,225,172,0,244,105,28,0,68,68,225,0,136,84,13,255,130,57,40,254,139,77,56,0,84,150,53,0,54,95,157,0,144,13,177,254,95,115,186,0,117,23,118,255,244,166,241,255,11,186,135,0,178,106,203,255,97,218,93,0,43,253,45,0,164,152,4,0,139,118,239,0,96,1,24,254,235,153,211,255,168,110,20,255,50,239,176,0,114,41,232,0,193,250,53,0,254,160,111,254,136,122,41,255,97,108,67,0,215,152,23,255,140,209,212,0,42,189,163,0,202,42,50,255,106,106,189,255,190,68,217,255,233,58,117,0,229,220,243,1,197,3,4,0,37,120,54,254,4,156,134,255,36,61,171,254,165,136,100,255,212,232,14,0,90,174,10,0,216,198,65,255,12,3,64,0,116,113,115,255,248,103,8,0,231,125,18,255,160,28,197,0,30,184,35,1,223,73,249,255,123,20,46,254,135,56,37,255,173,13,229,1,119,161,34,255,245,61,73,0,205,125,112,0,137,104,134,0,217,246,30,255,237,142,143,0,65,159,102,255,108,164,190,0,219,117,173,255,34,37,120,254,200,69,80,0,31,124,218,254,74,27,160,255,186,154,199,255,71,199,252,0,104,81,159,1,17,200,39,0,211,61,192,1,26,238,91,0,148,217,12,0,59,91,213,255,11,81,183,255,129,230,122,255,114,203,145,1,119,180,66,255,72,138,180,0,224,149,106,0,119,82,104,255,208,140,43,0,98,9,182,255,205,101,134,255,18,101,38,0,95,197,166,255,203,241,147,0,62,208,145,255,133,246,251,0,2,169,14,0,13,247,184,0,142,7,254,0,36,200,23,255,88,205,223,0,91,129,52,255,21,186,30,0,143,228,210,1,247,234,248,255,230,69,31,254,176,186,135,255,238,205,52,1,139,79,43,0,17,176,217,254,32,243,67,0,242,111,233,0,44,35,9,255,227,114,81,1,4,71,12,255,38,105,191,0,7,117,50,255,81,79,16,0,63,68,65,255,157,36,110,255,77,241,3,255,226,45,251,1,142,25,206,0,120,123,209,1,28,254,238,255,5,128,126,255,91,222,215,255,162,15,191,0,86,240,73,0,135,185,81,254,44,241,163,0,212,219,210,255,112,162,155,0,207,101,118,0,168,72,56,255,196,5,52,0,72,172,242,255,126,22,157,255,146,96,59,255,162,121,152,254,140,16,95,0,195,254,200,254,82,150,162,0,119,43,145,254,204,172,78,255,166,224,159,0,104,19,237,255,245,126,208,255,226,59,213,0,117,217,197,0,152,72,237,0,220,31,23,254,14,90,231,255,188,212,64,1,60,101,246,255,85,24,86,0,1,177,109,0,146,83,32,1,75,182,192,0,119,241,224,0,185,237,27,255,184,101,82,1,235,37,77,255,253,134,19,0,232,246,122,0,60,106,179,0,195,11,12,0,109,66,235,1,125,113,59,0,61,40,164,0,175,104,240,0,2,47,187,255,50,12,141,0,194,139,181,255,135,250,104,0,97,92,222,255,217,149,201,255,203,241,118,255,79,151,67,0,122,142,218,255,149,245,239,0,138,42,200,254,80,37,97,255,124,112,167,255,36,138,87,255,130,29,147,255,241,87,78,255,204,97,19,1,177,209,22,255,247,227,127,254,99,119,83,255,212,25,198,1,16,179,179,0,145,77,172,254,89,153,14,255,218,189,167,0,107,233,59,255,35,33,243,254,44,112,112,255,161,127,79,1,204,175,10,0,40,21,138,254,104,116,228,0,199,95,137,255,133,190,168,255,146,165,234,1,183,99,39,0,183,220,54,254,255,222,133,0,162,219,121,254,63,239,6,0,225,102,54,255,251,18,246,0,4,34,129,1,135,36,131,0,206,50,59,1,15,97,183,0,171,216,135,255,101,152,43,255,150,251,91,0,38,145,95,0,34,204,38,254,178,140,83,255,25,129,243,255,76,144,37,0,106,36,26,254,118,144,172,255,68,186,229,255,107,161,213,255,46,163,68,255,149,170,253,0,187,17,15,0,218,160,165,255,171,35,246,1,96,13,19,0,165,203,117,0,214,107,192,255,244,123,177,1,100,3,104,0,178,242,97,255,251,76,130,255,211,77,42,1,250,79,70,255,63,244,80,1,105,101,246,0,61,136,58,1,238,91,213,0,14,59,98,255,167,84,77,0,17,132,46,254,57,175,197,255,185,62,184,0,76,64,207,0,172,175,208,254,175,74,37,0,138,27,211,254,148,125,194,0,10,89,81,0,168,203,101,255,43,213,209,1,235,245,54,0,30,35,226,255,9,126,70,0,226,125,94,254,156,117,20,255,57,248,112,1,230,48,64,255,164,92,166,1,224,214,230,255,36,120,143,0,55,8,43,255,251,1,245,1,106,98,165,0,74,107,106,254,53,4,54,255,90,178,150,1,3,120,123,255,244,5,89,1,114,250,61,255,254,153,82,1,77,15,17,0,57,238,90,1,95,223,230,0,236,52,47,254,103,148,164,255,121,207,36,1,18,16,185,255,75,20,74,0,187,11,101,0,46,48,129,255,22,239,210,255,77,236,129,255,111,77,204,255,61,72,97,255,199,217,251,255,42,215,204,0,133,145,201,255,57,230,146,1,235,100,198,0,146,73,35,254,108,198,20,255,182,79,210,255,82,103,136,0,246,108,176,0,34,17,60,255,19,74,114,254,168,170,78,255,157,239,20,255,149,41,168,0,58,121,28,0,79,179,134,255,231,121,135,255,174,209,98,255,243,122,190,0,171,166,205,0,212,116,48,0,29,108,66,255,162,222,182,1,14,119,21,0,213,39,249,255,254,223,228,255,183,165,198,0,133,190,48,0,124,208,109,255,119,175,85,255,9,209,121,1,48,171,189,255,195,71,134,1,136,219,51,255,182,91,141,254,49,159,72,0,35,118,245,255,112,186,227,255,59,137,31,0,137,44,163,0,114,103,60,254,8,213,150,0,162,10,113,255,194,104,72,0,220,131,116,255,178,79,92,0,203,250,213,254,93,193,189,255,130,255,34,254,212,188,151,0,136,17,20,255,20,101,83,255,212,206,166,0,229,238,73,255,151,74,3,255,168,87,215,0,155,188,133,255,166,129,73,0,240,79,133,255,178,211,81,255,203,72,163,254,193,168,165,0,14,164,199,254,30,255,204,0,65,72,91,1,166,74,102,255,200,42,0,255,194,113,227,255,66,23,208,0,229,216,100,255,24,239,26,0,10,233,62,255,123,10,178,1,26,36,174,255,119,219,199,1,45,163,190,0,16,168,42,0,166,57,198,255,28,26,26,0,126,165,231,0,251,108,100,255,61,229,121,255,58,118,138,0,76,207,17,0,13,34,112,254,89,16,168,0,37,208,105,255,35,201,215,255,40,106,101,254,6,239,114,0,40,103,226,254,246,127,110,255,63,167,58,0,132,240,142,0,5,158,88,255,129,73,158,255,94,89,146,0,230,54,146,0,8,45,173,0,79,169,1,0,115,186,247,0,84,64,131,0,67,224,253,255,207,189,64,0,154,28,81,1,45,184,54,255,87,212,224,255,0,96,73,255,129,33,235,1,52,66,80,255,251,174,155,255,4,179,37,0,234,164,93,254,93,175,253,0,198,69,87,255,224,106,46,0,99,29,210,0,62,188,114,255,44,234,8,0,169,175,247,255,23,109,137,255,229,182,39,0,192,165,94,254,245,101,217,0,191,88,96,0,196,94,99,255,106,238,11,254,53,126,243,0,94,1,101,255,46,147,2,0,201,124,124,255,141,12,218,0,13,166,157,1,48,251,237,255,155,250,124,255,106,148,146,255,182,13,202,0,28,61,167,0,217,152,8,254,220,130,45,255,200,230,255,1,55,65,87,255,93,191,97,254,114,251,14,0,32,105,92,1,26,207,141,0,24,207,13,254,21,50,48,255,186,148,116,255,211,43,225,0,37,34,162,254,164,210,42,255,68,23,96,255,182,214,8,255,245,117,137,255,66,195,50,0,75,12,83,254,80,140,164,0,9,165,36,1,228,110,227,0,241,17,90,1,25,52,212,0,6,223,12,255,139,243,57,0,12,113,75,1,246,183,191,255,213,191,69,255,230,15,142,0,1,195,196,255,138,171,47,255,64,63,106,1,16,169,214,255,207,174,56,1,88,73,133,255,182,133,140,0,177,14,25,255,147,184,53,255,10,227,161,255,120,216,244,255,73,77,233,0,157,238,139,1,59,65,233,0,70,251,216,1,41,184,153,255,32,203,112,0,146,147,253,0,87,101,109,1,44,82,133,255,244,150,53,255,94,152,232,255,59,93,39,255,88,147,220,255,78,81,13,1,32,47,252,255,160,19,114,255,93,107,39,255,118,16,211,1,185,119,209,255,227,219,127,254,88,105,236,255,162,110,23,255,36,166,110,255,91,236,221,255,66,234,116,0,111,19,244,254,10,233,26,0,32,183,6,254,2,191,242,0,218,156,53,254,41,60,70,255,168,236,111,0,121,185,126,255,238,142,207,255,55,126,52,0,220,129,208,254,80,204,164,255,67,23,144,254,218,40,108,255,127,202,164,0,203,33,3,255,2,158,0,0,37,96,188,255,192,49,74,0,109,4,0,0,111,167,10,254,91,218,135,255,203,66,173,255,150,194,226,0,201,253,6,255,174,102,121,0,205,191,110,0,53,194,4,0,81,40,45,254,35,102,143,255,12,108,198,255,16,27,232,255,252,71,186,1,176,110,114,0,142,3,117,1,113,77,142,0,19,156,197,1,92,47,252,0,53,232,22,1,54,18,235,0,46,35,189,255,236,212,129,0,2,96,208,254,200,238,199,255,59,175,164,255,146,43,231,0,194,217,52,255,3,223,12,0,138,54,178,254,85,235,207,0,232,207,34,0,49,52,50,255,166,113,89,255,10,45,216,255,62,173,28,0,111,165,246,0,118,115,91,255,128,84,60,0,167,144,203,0,87,13,243,0,22,30,228,1,177,113,146,255,129,170,230,254,252,153,129,255,145,225,43,0,70,231,5,255,122,105,126,254,86,246,148,255,110,37,154,254,209,3,91,0,68,145,62,0,228,16,165,255,55,221,249,254,178,210,91,0,83,146,226,254,69,146,186,0,93,210,104,254,16,25,173,0,231,186,38,0,189,122,140,255,251,13,112,255,105,110,93,0,251,72,170,0,192,23,223,255,24,3,202,1,225,93,228,0,153,147,199,254,109,170,22,0,248,101,246,255,178,124,12,255,178,254,102,254,55,4,65,0,125,214,180,0,183,96,147,0,45,117,23,254,132,191,249,0,143,176,203,254,136,183,54,255,146,234,177,0,146,101,86,255,44,123,143,1,33,209,152,0,192,90,41,254,83,15,125,255,213,172,82,0,215,169,144,0,16,13,34,0,32,209,100,255,84,18,249,1,197,17,236,255,217,186,230,0,49,160,176,255,111,118,97,255,237,104,235,0,79,59,92,254,69,249,11,255,35,172,74,1,19,118,68,0,222,124,165,255,180,66,35,255,86,174,246,0,43,74,111,255,126,144,86,255,228,234,91,0,242,213,24,254,69,44,235,255,220,180,35,0,8,248,7,255,102,47,92,255,240,205,102,255,113,230,171,1,31,185,201,255,194,246,70,255,122,17,187,0,134,70,199,255,149,3,150,255,117,63,103,0,65,104,123,255,212,54,19,1,6,141,88,0,83,134,243,255,136,53,103,0,169,27,180,0,177,49,24,0,111,54,167,0,195,61,215,255,31,1,108,1,60,42,70,0,185,3,162,255,194,149,40,255,246,127,38,254,190,119,38,255,61,119,8,1,96,161,219,255,42,203,221,1,177,242,164,255,245,159,10,0,116,196,0,0,5,93,205,254,128,127,179,0,125,237,246,255,149,162,217,255,87,37,20,254,140,238,192,0,9,9,193,0,97,1,226,0,29,38,10,0,0,136,63,255,229,72,210,254,38,134,92,255,78,218,208,1,104,36,84,255,12,5,193,255,242,175,61,255,191,169,46,1,179,147,147,255,113,190,139,254,125,172,31,0,3,75,252,254,215,36,15,0,193,27,24,1,255,69,149,255,110,129,118,0,203,93,249,0,138,137,64,254,38,70,6,0,153,116,222,0,161,74,123,0,193,99,79,255,118,59,94,255,61,12,43,1,146,177,157,0,46,147,191,0,16,255,38,0,11,51,31,1,60,58,98,255,111,194,77,1,154,91,244,0,140,40,144,1,173,10,251,0,203,209,50,254,108,130,78,0,228,180,90,0,174,7,250,0,31,174,60,0,41,171,30,0,116,99,82,255,118,193,139,255,187,173,198,254,218,111,56,0,185,123,216,0,249,158,52,0,52,180,93,255,201,9,91,255,56,45,166,254,132,155,203,255,58,232,110,0,52,211,89,255,253,0,162,1,9,87,183,0,145,136,44,1,94,122,245,0,85,188,171,1,147,92,198,0,0,8,104,0,30,95,174,0,221,230,52,1,247,247,235,255,137,174,53,255,35,21,204,255,71,227,214,1,232,82,194,0,11,48,227,255,170,73,184,255,198,251,252,254,44,112,34,0,131,101,131,255,72,168,187,0,132,135,125,255,138,104,97,255,238,184,168,255,243,104,84,255,135,216,226,255,139,144,237,0,188,137,150,1,80,56,140,255,86,169,167,255,194,78,25,255,220,17,180,255,17,13,193,0,117,137,212,255,141,224,151,0,49,244,175,0,193,99,175,255,19,99,154,1,255,65,62,255,156,210,55,255,242,244,3,255,250,14,149,0,158,88,217,255,157,207,134,254,251,232,28,0,46,156,251,255,171,56,184,255,239,51,234,0,142,138,131,255,25,254,243,1,10,201,194,0,63,97,75,0,210,239,162,0,192,200,31,1,117,214,243,0,24,71,222,254,54,40,232,255,76,183,111,254,144,14,87,255,214,79,136,255,216,196,212,0,132,27,140,254,131,5,253,0,124,108,19,255,28,215,75,0,76,222,55,254,233,182,63,0,68,171,191,254,52,111,222,255,10,105,77,255,80,170,235,0,143,24,88,255,45,231,121,0,148,129,224,1,61,246,84,0,253,46,219,255,239,76,33,0,49,148,18,254,230,37,69,0,67,134,22,254,142,155,94,0,31,157,211,254,213,42,30,255,4,228,247,254,252,176,13,255,39,0,31,254,241,244,255,255,170,45,10,254,253,222,249,0,222,114,132,0,255,47,6,255,180,163,179,1,84,94,151,255,89,209,82,254,229,52,169,255,213,236,0,1,214,56,228,255,135,119,151,255,112,201,193,0,83,160,53,254,6,151,66,0,18,162,17,0,233,97,91,0,131,5,78,1,181,120,53,255,117,95,63,255,237,117,185,0,191,126,136,255,144,119,233,0,183,57,97,1,47,201,187,255,167,165,119,1,45,100,126,0,21,98,6,254,145,150,95,255,120,54,152,0,209,98,104,0,143,111,30,254,184,148,249,0,235,216,46,0,248,202,148,255,57,95,22,0,242,225,163,0,233,247,232,255,71,171,19,255,103,244,49,255,84,103,93,255,68,121,244,1,82,224,13,0,41,79,43,255,249,206,167,255,215,52,21,254,192,32,22,255,247,111,60,0,101,74,38,255,22,91,84,254,29,28,13,255,198,231,215,254,244,154,200,0,223,137,237,0,211,132,14,0,95,64,206,255,17,62,247,255,233,131,121,1,93,23,77,0,205,204,52,254,81,189,136,0,180,219,138,1,143,18,94,0,204,43,140,254,188,175,219,0,111,98,143,255,151,63,162,255,211,50,71,254,19,146,53,0,146,45,83,254,178,82,238,255,16,133,84,255,226,198,93,255,201,97,20,255,120,118,35,255,114,50,231,255,162,229,156,255,211,26,12,0,114,39,115,255,206,212,134,0,197,217,160,255,116,129,94,254,199,215,219,255,75,223,249,1,253,116,181,255,232,215,104,255,228,130,246,255,185,117,86,0,14,5,8,0,239,29,61,1,237,87,133,255,125,146,137,254,204,168,223,0,46,168,245,0,154,105,22,0,220,212,161,255,107,69,24,255,137,218,181,255,241,84,198,255,130,122,211,255,141,8,153,255,190,177,118,0,96,89,178,0,255,16,48,254,122,96,105,255,117,54,232,255,34,126,105,255,204,67,166,0,232,52,138,255,211,147,12,0,25,54,7,0,44,15,215,254,51,236,45,0,190,68,129,1,106,147,225,0,28,93,45,254,236,141,15,255,17,61,161,0,220,115,192,0,236,145,24,254,111,168,169,0,224,58,63,255,127,164,188,0,82,234,75,1,224,158,134,0,209,68,110,1,217,166,217,0,70,225,166,1,187,193,143,255,16,7,88,255,10,205,140,0,117,192,156,1,17,56,38,0,27,124,108,1,171,215,55,255,95,253,212,0,155,135,168,255,246,178,153,254,154,68,74,0,232,61,96,254,105,132,59,0,33,76,199,1,189,176,130,255,9,104,25,254,75,198,102,255,233,1,112,0,108,220,20,255,114,230,70,0,140,194,133,255,57,158,164,254,146,6,80,255,169,196,97,1,85,183,130,0,70,158,222,1,59,237,234,255,96,25,26,255,232,175,97,255,11,121,248,254,88,35,194,0,219,180,252,254,74,8,227,0,195,227,73,1,184,110,161,255,49,233,164,1,128,53,47,0,82,14,121,255,193,190,58,0,48,174,117,255,132,23,32,0,40,10,134,1,22,51,25,255,240,11,176,255,110,57,146,0,117,143,239,1,157,101,118,255,54,84,76,0,205,184,18,255,47,4,72,255,78,112,85,255,193,50,66,1,93,16,52,255,8,105,134,0,12,109,72,255,58,156,251,0,144,35,204,0,44,160,117,254,50,107,194,0,1,68,165,255,111,110,162,0,158,83,40,254,76,214,234,0,58,216,205,255,171,96,147,255,40,227,114,1,176,227,241,0,70,249,183,1,136,84,139,255,60,122,247,254,143,9,117,255,177,174,137,254,73,247,143,0,236,185,126,255,62,25,247,255,45,64,56,255,161,244,6,0,34,57,56,1,105,202,83,0,128,147,208,0,6,103,10,255,74,138,65,255,97,80,100,255,214,174,33,255,50,134,74,255,110,151,130,254,111,84,172,0,84,199,75,254,248,59,112,255,8,216,178,1,9,183,95,0,238,27,8,254,170,205,220,0,195,229,135,0,98,76,237,255,226,91,26,1,82,219,39,255,225,190,199,1,217,200,121,255,81,179,8,255,140,65,206,0,178,207,87,254,250,252,46,255,104,89,110,1,253,189,158,255,144,214,158,255,160,245,54,255,53,183,92,1,21,200,194,255,146,33,113,1,209,1,255,0,235,106,43,255,167,52,232,0,157,229,221,0,51,30,25,0,250,221,27,1,65,147,87,255,79,123,196,0,65,196,223,255,76,44,17,1,85,241,68,0,202,183,249,255,65,212,212,255,9,33,154,1,71,59,80,0,175,194,59,255,141,72,9,0,100,160,244,0,230,208,56,0,59,25,75,254,80,194,194,0,18,3,200,254,160,159,115,0,132,143,247,1,111,93,57,255,58,237,11,1,134,222,135,255,122,163,108,1,123,43,190,255,251,189,206,254,80,182,72,255,208,246,224,1,17,60,9,0,161,207,38,0,141,109,91,0,216,15,211,255,136,78,110,0,98,163,104,255,21,80,121,255,173,178,183,1,127,143,4,0,104,60,82,254,214,16,13,255,96,238,33,1,158,148,230,255,127,129,62,255,51,255,210,255,62,141,236,254,157,55,224,255,114,39,244,0,192,188,250,255,228,76,53,0,98,84,81,255,173,203,61,254,147,50,55,255,204,235,191,0,52,197,244,0,88,43,211,254,27,191,119,0,188,231,154,0,66,81,161,0,92,193,160,1,250,227,120,0,123,55,226,0,184,17,72,0,133,168,10,254,22,135,156,255,41,25,103,255,48,202,58,0,186,149,81,255,188,134,239,0,235,181,189,254,217,139,188,255,74,48,82,0,46,218,229,0,189,253,251,0,50,229,12,255,211,141,191,1,128,244,25,255,169,231,122,254,86,47,189,255,132,183,23,255,37,178,150,255,51,137,253,0,200,78,31,0,22,105,50,0,130,60,0,0,132,163,91,254,23,231,187,0,192,79,239,0,157,102,164,255,192,82,20,1,24,181,103,255,240,9,234,0,1,123,164,255,133,233,0,255,202,242,242,0,60,186,245,0,241,16,199,255,224,116,158,254,191,125,91,255,224,86,207,0,121,37,231,255,227,9,198,255,15,153,239,255,121,232,217,254,75,112,82,0,95,12,57,254,51,214,105,255,148,220,97,1,199,98,36,0,156,209,12,254,10,212,52,0,217,180,55,254,212,170,232,255,216,20,84,255,157,250,135,0,157,99,127,254,1,206,41,0,149,36,70,1,54,196,201,255,87,116,0,254,235,171,150,0,27,163,234,0,202,135,180,0,208,95,0,254,123,156,93,0,183,62,75,0,137,235,182,0,204,225,255,255,214,139,210,255,2,115,8,255,29,12,111,0,52,156,1,0,253,21,251,255,37,165,31,254,12,130,211,0,106,18,53,254,42,99,154,0,14,217,61,254,216,11,92,255,200,197,112,254,147,38,199,0,36,252,120,254,107,169,77,0,1,123,159,255,207,75,102,0,163,175,196,0,44,1,240,0,120,186,176,254,13,98,76,255,237,124,241,255,232,146,188,255,200,96,224,0,204,31,41,0,208,200,13,0,21,225,96,255,175,156,196,0,247,208,126,0,62,184,244,254,2,171,81,0,85,115,158,0,54,64,45,255,19,138,114,0,135,71,205,0,227,47,147,1,218,231,66,0,253,209,28,0,244,15,173,255,6,15,118,254,16,150,208,255,185,22,50,255,86,112,207,255,75,113,215,1,63,146,43,255,4,225,19,254,227,23,62,255,14,255,214,254,45,8,205,255,87,197,151,254,210,82,215,255,245,248,247,255,128,248,70,0,225,247,87,0,90,120,70,0,213,245,92,0,13,133,226,0,47,181,5,1,92,163,105,255,6,30,133,254,232,178,61,255,230,149,24,255,18,49,158,0,228,100,61,254,116,243,251,255,77,75,92,1,81,219,147,255,76,163,254,254,141,213,246,0,232,37,152,254,97,44,100,0,201,37,50,1,212,244,57,0,174,171,183,255,249,74,112,0,166,156,30,0,222,221,97,255,243,93,73,254,251,101,100,255,216,217,93,255,254,138,187,255,142,190,52,255,59,203,177,255,200,94,52,0,115,114,158,255,165,152,104,1,126,99,226,255,118,157,244,1,107,200,16,0,193,90,229,0,121,6,88,0,156,32,93,254,125,241,211,255,14,237,157,255,165,154,21,255,184,224,22,255,250,24,152,255,113,77,31,0,247,171,23,255,237,177,204,255,52,137,145,255,194,182,114,0,224,234,149,0,10,111,103,1,201,129,4,0,238,142,78,0,52,6,40,255,110,213,165,254,60,207,253,0,62,215,69,0,96,97,0,255,49,45,202,0,120,121,22,255,235,139,48,1,198,45,34,255,182,50,27,1,131,210,91,255,46,54,128,0,175,123,105,255,198,141,78,254,67,244,239,255,245,54,103,254,78,38,242,255,2,92,249,254,251,174,87,255,139,63,144,0,24,108,27,255,34,102,18,1,34,22,152,0,66,229,118,254,50,143,99,0,144,169,149,1,118,30,152,0,178,8,121,1,8,159,18,0,90,101,230,255,129,29,119,0,68,36,11,1,232,183,55,0,23,255,96,255,161,41,193,255,63,139,222,0,15,179,243,0,255,100,15,255,82,53,135,0,137,57,149,1,99,240,170,255,22,230,228,254,49,180,82,255,61,82,43,0,110,245,217,0,199,125,61,0,46,253,52,0,141,197,219,0,211,159,193,0,55,121,105,254,183,20,129,0,169,119,170,255,203,178,139,255,135,40,182,255,172,13,202,255,65,178,148,0,8,207,43,0,122,53,127,1,74,161,48,0,227,214,128,254,86,11,243,255,100,86,7,1,245,68,134,255,61,43,21,1,152,84,94,255,190,60,250,254,239,118,232,255,214,136,37,1,113,76,107,255,93,104,100,1,144,206,23,255,110,150,154,1,228,103,185,0,218,49,50,254,135,77,139,255,185,1,78,0,0,161,148,255,97,29,233,255,207,148,149,255,160,168,0,0,91,128,171,255,6,28,19,254,11,111,247,0,39,187,150,255,138,232,149,0,117,62,68,255,63,216,188,255,235,234,32,254,29,57,160,255,25,12,241,1,169,60,191,0,32,131,141,255,237,159,123,255,94,197,94,254,116,254,3,255,92,179,97,254,121,97,92,255,170,112,14,0,21,149,248,0,248,227,3,0,80,96,109,0,75,192,74,1,12,90,226,255,161,106,68,1,208,114,127,255,114,42,255,254,74,26,74,255,247,179,150,254,121,140,60,0,147,70,200,255,214,40,161,255,161,188,201,255,141,65,135,255,242,115,252,0,62,47,202,0,180,149,255,254,130,55,237,0,165,17,186,255,10,169,194,0,156,109,218,255,112,140,123,255,104,128,223,254,177,142,108,255,121,37,219,255,128,77,18,255,111,108,23,1,91,192,75,0,174,245,22,255,4,236,62,255,43,64,153,1,227,173,254,0,237,122,132,1,127,89,186,255,142,82,128,254,252,84,174,0,90,179,177,1,243,214,87,255,103,60,162,255,208,130,14,255,11,130,139,0,206,129,219,255,94,217,157,255,239,230,230,255,116,115,159,254,164,107,95,0,51,218,2,1,216,125,198,255,140,202,128,254,11,95,68,255,55,9,93,254,174,153,6,255,204,172,96,0,69,160,110,0,213,38,49,254,27,80,213,0,118,125,114,0,70,70,67,255,15,142,73,255,131,122,185,255,243,20,50,254,130,237,40,0,210,159,140,1,197,151,65,255,84,153,66,0,195,126,90,0,16,238,236,1,118,187,102,255,3,24,133,255,187,69,230,0,56,197,92,1,213,69,94,255,80,138,229,1,206,7,230,0,222,111,230,1,91,233,119,255,9,89,7,1,2,98,1,0,148,74,133,255,51,246,180,255,228,177,112,1,58,189,108,255,194,203,237,254,21,209,195,0,147,10,35,1,86,157,226,0,31,163,139,254,56,7,75,255,62,90,116,0,181,60,169,0,138,162,212,254,81,167,31,0,205,90,112,255,33,112,227,0,83,151,117,1,177,224,73,255,174,144,217,255,230,204,79,255,22,77,232,255,114,78,234,0,224,57,126,254,9,49,141,0,242,147,165,1,104,182,140,255,167,132,12,1,123,68,127,0,225,87,39,1,251,108,8,0,198,193,143,1,121,135,207,255,172,22,70,0,50,68,116,255,101,175,40,255,248,105,233,0,166,203,7,0,110,197,218,0,215,254,26,254,168,226,253,0,31,143,96,0,11,103,41,0,183,129,203,254,100,247,74,255,213,126,132,0,210,147,44,0,199,234,27,1,148,47,181,0,155,91,158,1,54,105,175,255,2,78,145,254,102,154,95,0,128,207,127,254,52,124,236,255,130,84,71,0,221,243,211,0,152,170,207,0,222,106,199,0,183,84,94,254,92,200,56,255,138,182,115,1,142,96,146,0,133,136,228,0,97,18,150,0,55,251,66,0,140,102,4,0,202,103,151,0,30,19,248,255,51,184,207,0,202,198,89,0,55,197,225,254,169,95,249,255,66,65,68,255,188,234,126,0,166,223,100,1,112,239,244,0,144,23,194,0,58,39,182,0,244,44,24,254,175,68,179,255,152,118,154,1,176,162,130,0,217,114,204,254,173,126,78,255,33,222,30,255,36,2,91,255,2,143,243,0,9,235,215,0,3,171,151,1,24,215,245,255,168,47,164,254,241,146,207,0,69,129,180,0,68,243,113,0,144,53,72,254,251,45,14,0,23,110,168,0,68,68,79,255,110,70,95,254,174,91,144,255,33,206,95,255,137,41,7,255,19,187,153,254,35,255,112,255,9,145,185,254,50,157,37,0,11,112,49,1,102,8,190,255,234,243,169,1,60,85,23,0,74,39,189,0,116,49,239,0,173,213,210,0,46,161,108,255,159,150,37,0,196,120,185,255,34,98,6,255,153,195,62,255,97,230,71,255,102,61,76,0,26,212,236,255,164,97,16,0,198,59,146,0,163,23,196,0,56,24,61,0,181,98,193,0,251,147,229,255,98,189,24,255,46,54,206,255,234,82,246,0,183,103,38,1,109,62,204,0,10,240,224,0,146,22,117,255,142,154,120,0,69,212,35,0,208,99,118,1,121,255,3,255,72,6,194,0,117,17,197,255,125,15,23,0,154,79,153,0,214,94,197,255,185,55,147,255,62,254,78,254,127,82,153,0,110,102,63,255,108,82,161,255,105,187,212,1,80,138,39,0,60,255,93,255,72,12,186,0,210,251,31,1,190,167,144,255,228,44,19,254,128,67,232,0,214,249,107,254,136,145,86,255,132,46,176,0,189,187,227,255,208,22,140,0,217,211,116,0,50,81,186,254,139,250,31,0,30,64,198,1,135,155,100,0,160,206,23,254,187,162,211,255,16,188,63,0,254,208,49,0,85,84,191,0,241,192,242,255,153,126,145,1,234,162,162,255,230,97,216,1,64,135,126,0,190,148,223,1,52,0,43,255,28,39,189,1,64,136,238,0,175,196,185,0,98,226,213,255,127,159,244,1,226,175,60,0,160,233,142,1,180,243,207,255,69,152,89,1,31,101,21,0,144,25,164,254,139,191,209,0,91,25,121,0,32,147,5,0,39,186,123,255,63,115,230,255,93,167,198,255,143,213,220,255,179,156,19,255,25,66,122,0,214,160,217,255,2,45,62,255,106,79,146,254,51,137,99,255,87,100,231,255,175,145,232,255,101,184,1,255,174,9,125,0,82,37,161,1,36,114,141,255,48,222,142,255,245,186,154,0,5,174,221,254,63,114,155,255,135,55,160,1,80,31,135,0,126,250,179,1,236,218,45,0,20,28,145,1,16,147,73,0,249,189,132,1,17,189,192,255,223,142,198,255,72,20,15,255,250,53,237,254,15,11,18,0,27,211,113,254,213,107,56,255,174,147,146,255,96,126,48,0,23,193,109,1,37,162,94,0,199,157,249,254,24,128,187,255,205,49,178,254,93,164,42,255,43,119,235,1,88,183,237,255,218,210,1,255,107,254,42,0,230,10,99,255,162,0,226,0,219,237,91,0,129,178,203,0,208,50,95,254,206,208,95,255,247,191,89,254,110,234,79,255,165,61,243,0,20,122,112,255,246,246,185,254,103,4,123,0,233,99,230,1,219,91,252,255,199,222,22,255,179,245,233,255,211,241,234,0,111,250,192,255,85,84,136,0,101,58,50,255,131,173,156,254,119,45,51,255,118,233,16,254,242,90,214,0,94,159,219,1,3,3,234,255,98,76,92,254,80,54,230,0,5,228,231,254,53,24,223,255,113,56,118,1,20,132,1,255,171,210,236,0,56,241,158,255,186,115,19,255,8,229,174,0,48,44,0,1,114,114,166,255,6,73,226,255,205,89,244,0,137,227,75,1,248,173,56,0,74,120,246,254,119,3,11,255,81,120,198,255,136,122,98,255,146,241,221,1,109,194,78,255,223,241,70,1,214,200,169,255,97,190,47,255,47,103,174,255,99,92,72,254,118,233,180,255,193,35,233,254,26,229,32,255,222,252,198,0,204,43,71,255,199,84,172,0,134,102,190,0,111,238,97,254,230,40,230,0,227,205,64,254,200,12,225,0,166,25,222,0,113,69,51,255,143,159,24,0,167,184,74,0,29,224,116,254,158,208,233,0,193,116,126,255,212,11,133,255,22,58,140,1,204,36,51,255,232,30,43,0,235,70,181,255,64,56,146,254,169,18,84,255,226,1,13,255,200,50,176,255,52,213,245,254,168,209,97,0,191,71,55,0,34,78,156,0,232,144,58,1,185,74,189,0,186,142,149,254,64,69,127,255,161,203,147,255,176,151,191,0,136,231,203,254,163,182,137,0,161,126,251,254,233,32,66,0,68,207,66,0,30,28,37,0,93,114,96,1,254,92,247,255,44,171,69,0,202,119,11,255,188,118,50,1,255,83,136,255,71,82,26,0,70,227,2,0,32,235,121,1,181,41,154,0,71,134,229,254,202,255,36,0,41,152,5,0,154,63,73,255,34,182,124,0,121,221,150,255,26,204,213,1,41,172,87,0,90,157,146,255,109,130,20,0,71,107,200,255,243,102,189,0,1,195,145,254,46,88,117,0,8,206,227,0,191,110,253,255,109,128,20,254,134,85,51,255,137,177,112,1,216,34,22,255,131,16,208,255,121,149,170,0,114,19,23,1,166,80,31,255,113,240,122,0,232,179,250,0,68,110,180,254,210,170,119,0,223,108,164,255,207,79,233,255,27,229,226,254,209,98,81,255,79,68,7,0,131,185,100,0,170,29,162,255,17,162,107,255,57,21,11,1,100,200,181,255,127,65,166,1,165,134,204,0,104,167,168,0,1,164,79,0,146,135,59,1,70,50,128,255,102,119,13,254,227,6,135,0,162,142,179,255,160,100,222,0,27,224,219,1,158,93,195,255,234,141,137,0,16,24,125,255,238,206,47,255,97,17,98,255,116,110,12,255,96,115,77,0,91,227,232,255,248,254,79,255,92,229,6,254,88,198,139,0,206,75,129,0,250,77,206,255,141,244,123,1,138,69,220,0,32,151,6,1,131,167,22,255,237,68,167,254,199,189,150,0,163,171,138,255,51,188,6,255,95,29,137,254,148,226,179,0,181,107,208,255,134,31,82,255,151,101,45,255,129,202,225,0,224,72,147,0,48,138,151,255,195,64,206,254,237,218,158,0,106,29,137,254,253,189,233,255,103,15,17,255,194,97,255,0,178,45,169,254,198,225,155,0,39,48,117,255,135,106,115,0,97,38,181,0,150,47,65,255,83,130,229,254,246,38,129,0,92,239,154,254,91,99,127,0,161,111,33,255,238,217,242,255,131,185,195,255,213,191,158,255,41,150,218,0,132,169,131,0,89,84,252,1,171,70,128,255,163,248,203,254,1,50,180,255,124,76,85,1,251,111,80,0,99,66,239,255,154,237,182,255,221,126,133,254,74,204,99,255,65,147,119,255,99,56,167,255,79,248,149,255,116,155,228,255,237,43,14,254,69,137,11,255,22,250,241,1,91,122,143,255,205,249,243,0,212,26,60,255,48,182,176,1,48,23,191,255,203,121,152,254,45,74,213,255,62,90,18,254,245,163,230,255,185,106,116,255,83,35,159,0,12,33,2,255,80,34,62,0,16,87,174,255,173,101,85,0,202,36,81,254,160,69,204,255,64,225,187,0,58,206,94,0,86,144,47,0,229,86,245,0,63,145,190,1,37,5,39,0,109,251,26,0,137,147,234,0,162,121,145,255,144,116,206,255,197,232,185,255,183,190,140,255,73,12,254,255,139,20,242,255,170,90,239,255,97,66,187,255,245,181,135,254,222,136,52,0,245,5,51,254,203,47,78,0,152,101,216,0,73,23,125,0,254,96,33,1,235,210,73,255,43,209,88,1,7,129,109,0,122,104,228,254,170,242,203,0,242,204,135,255,202,28,233,255,65,6,127,0,159,144,71,0,100,140,95,0,78,150,13,0,251,107,118,1,182,58,125,255,1,38,108,255,141,189,209,255,8,155,125,1,113,163,91,255,121,79,190,255,134,239,108,255,76,47,248,0,163,228,239,0,17,111,10,0,88,149,75,255,215,235,239,0,167,159,24,255,47,151,108,255,107,209,188,0,233,231,99,254,28,202,148,255,174,35,138,255,110,24,68,255,2,69,181,0,107,102,82,0,102,237,7,0,92,36,237,255,221,162,83,1,55,202,6,255,135,234,135,255,24,250,222,0,65,94,168,254,245,248,210,255,167,108,201,254,255,161,111,0,205,8,254,0,136,13,116,0,100,176,132,255,43,215,126,255,177,133,130,255,158,79,148,0,67,224,37,1,12,206,21,255,62,34,110,1,237,104,175,255,80,132,111,255,142,174,72,0,84,229,180,254,105,179,140,0,64,248,15,255,233,138,16,0,245,67,123,254,218,121,212,255,63,95,218,1,213,133,137,255,143,182,82,255,48,28,11,0,244,114,141,1,209,175,76,255,157,181,150,255,186,229,3,255,164,157,111,1,231,189,139,0,119,202,190,255,218,106,64,255,68,235,63,254,96,26,172,255,187,47,11,1,215,18,251,255,81,84,89,0,68,58,128,0,94,113,5,1,92,129,208,255,97,15,83,254,9,28,188,0,239,9,164,0,60,205,152,0,192,163,98,255,184,18,60,0,217,182,139,0,109,59,120,255,4,192,251,0,169,210,240,255,37,172,92,254,148,211,245,255,179,65,52,0,253,13,115,0,185,174,206,1,114,188,149,255,237,90,173,0,43,199,192,255,88,108,113,0,52,35,76,0,66,25,148,255,221,4,7,255,151,241,114,255,190,209,232,0,98,50,199,0,151,150,213,255,18,74,36,1,53,40,7,0,19,135,65,255,26,172,69,0,174,237,85,0,99,95,41,0,3,56,16,0,39,160,177,255,200,106,218,254,185,68,84,255,91,186,61,254,67,143,141,255,13,244,166,255,99,114,198,0,199,110,163,255,193,18,186,0,124,239,246,1,110,68,22,0,2,235,46,1,212,60,107,0,105,42,105,1,14,230,152,0,7,5,131,0,141,104,154,255,213,3,6,0,131,228,162,255,179,100,28,1,231,123,85,255,206,14,223,1,253,96,230,0,38,152,149,1,98,137,122,0,214,205,3,255,226,152,179,255,6,133,137,0,158,69,140,255,113,162,154,255,180,243,172,255,27,189,115,255,143,46,220,255,213,134,225,255,126,29,69,0,188,43,137,1,242,70,9,0,90,204,255,255,231,170,147,0,23,56,19,254,56,125,157,255,48,179,218,255,79,182,253,255,38,212,191,1,41,235,124,0,96,151,28,0,135,148,190,0,205,249,39,254,52,96,136,255,212,44,136,255,67,209,131,255,252,130,23,255,219,128,20,255,198,129,118,0,108,101,11,0,178,5,146,1,62,7,100,255,181,236,94,254,28,26,164,0,76,22,112,255,120,102,79,0,202,192,229,1,200,176,215,0,41,64,244,255,206,184,78,0,167,45,63,1,160,35,0,255,59,12,142,255,204,9,144,255,219,94,229,1,122,27,112,0,189,105,109,255,64,208,74,255,251,127,55,1,2,226,198,0,44,76,209,0,151,152,77,255,210,23,46,1,201,171,69,255,44,211,231,0,190,37,224,255,245,196,62,255,169,181,222,255,34,211,17,0,119,241,197,255,229,35,152,1,21,69,40,255,178,226,161,0,148,179,193,0,219,194,254,1,40,206,51,255,231,92,250,1,67,153,170,0,21,148,241,0,170,69,82,255,121,18,231,255,92,114,3,0,184,62,230,0,225,201,87,255,146,96,162,255,181,242,220,0,173,187,221,1,226,62,170,255,56,126,217,1,117,13,227,255,179,44,239,0,157,141,155,255,144,221,83,0,235,209,208,0,42,17,165,1,251,81,133,0,124,245,201,254,97,211,24,255,83,214,166,0,154,36,9,255,248,47,127,0,90,219,140,255,161,217,38,254,212,147,63,255,66,84,148,1,207,3,1,0,230,134,89,1,127,78,122,255,224,155,1,255,82,136,74,0,178,156,208,255,186,25,49,255,222,3,210,1,229,150,190,255,85,162,52,255,41,84,141,255,73,123,84,254,93,17,150,0,119,19,28,1,32,22,215,255,28,23,204,255,142,241,52,255,228,52,125,0,29,76,207,0,215,167,250,254,175,164,230,0,55,207,105,1,109,187,245,255,161,44,220,1,41,101,128,255,167,16,94,0,93,214,107,255,118,72,0,254,80,61,234,255,121,175,125,0,139,169,251,0,97,39,147,254,250,196,49,255,165,179,110,254,223,70,187,255,22,142,125,1,154,179,138,255,118,176,42,1,10,174,153,0,156,92,102,0,168,13,161,255,143,16,32,0,250,197,180,255,203,163,44,1,87,32,36,0,161,153,20,255,123,252,15,0,25,227,80,0,60,88,142,0,17,22,201,1,154,205,77,255,39,63,47,0,8,122,141,0,128,23,182,254,204,39,19,255,4,112,29,255,23,36,140,255,210,234,116,254,53,50,63,255,121,171,104,255,160,219,94,0,87,82,14,254,231,42,5,0,165,139,127,254,86,78,38,0,130,60,66,254,203,30,45,255,46,196,122,1,249,53,162,255,136,143,103,254,215,210,114,0,231,7,160,254,169,152,42,255,111,45,246,0,142,131,135,255,131,71,204,255,36,226,11,0,0,28,242,255,225,138,213,255,247,46,216,254,245,3,183,0,108,252,74,1,206,26,48,255,205,54,246,255,211,198,36,255,121,35,50,0,52,216,202,255,38,139,129,254,242,73,148,0,67,231,141,255,42,47,204,0,78,116,25,1,4,225,191,255,6,147,228,0,58,88,177,0,122,165,229,255,252,83,201,255,224,167,96,1,177,184,158,255,242,105,179,1,248,198,240,0,133,66,203,1,254,36,47,0,45,24,115,255,119,62,254,0,196,225,186,254,123,141,172,0,26,85,41,255,226,111,183,0,213,231,151,0,4,59,7,255,238,138,148,0,66,147,33,255,31,246,141,255,209,141,116,255,104,112,31,0,88,161,172,0,83,215,230,254,47,111,151,0,45,38,52,1,132,45,204,0,138,128,109,254,233,117,134,255,243,190,173,254,241,236,240,0,82,127,236,254,40,223,161,255,110,182,225,255,123,174,239,0,135,242,145,1,51,209,154,0,150,3,115,254,217,164,252,255,55,156,69,1,84,94,255,255,232,73,45,1,20,19,212,255,96,197,59,254,96,251,33,0,38,199,73,1,64,172,247,255,117,116,56,255,228,17,18,0,62,138,103,1,246,229,164,255,244,118,201,254,86,32,159,255,109,34,137,1,85,211,186,0,10,193,193,254,122,194,177,0,122,238,102,255,162,218,171,0,108,217,161,1,158,170,34,0,176,47,155,1,181,228,11,255,8,156,0,0,16,75,93,0,206,98,255,1,58,154,35,0,12,243,184,254,67,117,66,255,230,229,123,0,201,42,110,0,134,228,178,254,186,108,118,255,58,19,154,255,82,169,62,255,114,143,115,1,239,196,50,255,173,48,193,255,147,2,84,255,150,134,147,254,95,232,73,0,109,227,52,254,191,137,10,0,40,204,30,254,76,52,97,255,164,235,126,0,254,124,188], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+20480);
/* memory initializer */ allocate([74,182,21,1,121,29,35,255,241,30,7,254,85,218,214,255,7,84,150,254,81,27,117,255,160,159,152,254,66,24,221,255,227,10,60,1,141,135,102,0,208,189,150,1,117,179,92,0,132,22,136,255,120,199,28,0,21,129,79,254,182,9,65,0,218,163,169,0,246,147,198,255,107,38,144,1,78,175,205,255,214,5,250,254,47,88,29,255,164,47,204,255,43,55,6,255,131,134,207,254,116,100,214,0,96,140,75,1,106,220,144,0,195,32,28,1,172,81,5,255,199,179,52,255,37,84,203,0,170,112,174,0,11,4,91,0,69,244,27,1,117,131,92,0,33,152,175,255,140,153,107,255,251,135,43,254,87,138,4,255,198,234,147,254,121,152,84,255,205,101,155,1,157,9,25,0,72,106,17,254,108,153,0,255,189,229,186,0,193,8,176,255,174,149,209,0,238,130,29,0,233,214,126,1,61,226,102,0,57,163,4,1,198,111,51,255,45,79,78,1,115,210,10,255,218,9,25,255,158,139,198,255,211,82,187,254,80,133,83,0,157,129,230,1,243,133,134,255,40,136,16,0,77,107,79,255,183,85,92,1,177,204,202,0,163,71,147,255,152,69,190,0,172,51,188,1,250,210,172,255,211,242,113,1,89,89,26,255,64,66,111,254,116,152,42,0,161,39,27,255,54,80,254,0,106,209,115,1,103,124,97,0,221,230,98,255,31,231,6,0,178,192,120,254,15,217,203,255,124,158,79,0,112,145,247,0,92,250,48,1,163,181,193,255,37,47,142,254,144,189,165,255,46,146,240,0,6,75,128,0,41,157,200,254,87,121,213,0,1,113,236,0,5,45,250,0,144,12,82,0,31,108,231,0,225,239,119,255,167,7,189,255,187,228,132,255,110,189,34,0,94,44,204,1,162,52,197,0,78,188,241,254,57,20,141,0,244,146,47,1,206,100,51,0,125,107,148,254,27,195,77,0,152,253,90,1,7,143,144,255,51,37,31,0,34,119,38,255,7,197,118,0,153,188,211,0,151,20,116,254,245,65,52,255,180,253,110,1,47,177,209,0,161,99,17,255,118,222,202,0,125,179,252,1,123,54,126,255,145,57,191,0,55,186,121,0,10,243,138,0,205,211,229,255,125,156,241,254,148,156,185,255,227,19,188,255,124,41,32,255,31,34,206,254,17,57,83,0,204,22,37,255,42,96,98,0,119,102,184,1,3,190,28,0,110,82,218,255,200,204,192,255,201,145,118,0,117,204,146,0,132,32,98,1,192,194,121,0,106,161,248,1,237,88,124,0,23,212,26,0,205,171,90,255,248,48,216,1,141,37,230,255,124,203,0,254,158,168,30,255,214,248,21,0,112,187,7,255,75,133,239,255,74,227,243,255,250,147,70,0,214,120,162,0,167,9,179,255,22,158,18,0,218,77,209,1,97,109,81,255,244,33,179,255,57,52,57,255,65,172,210,255,249,71,209,255,142,169,238,0,158,189,153,255,174,254,103,254,98,33,14,0,141,76,230,255,113,139,52,255,15,58,212,0,168,215,201,255,248,204,215,1,223,68,160,255,57,154,183,254,47,231,121,0,106,166,137,0,81,136,138,0,165,43,51,0,231,139,61,0,57,95,59,254,118,98,25,255,151,63,236,1,94,190,250,255,169,185,114,1,5,250,58,255,75,105,97,1,215,223,134,0,113,99,163,1,128,62,112,0,99,106,147,0,163,195,10,0,33,205,182,0,214,14,174,255,129,38,231,255,53,182,223,0,98,42,159,255,247,13,40,0,188,210,177,1,6,21,0,255,255,61,148,254,137,45,129,255,89,26,116,254,126,38,114,0,251,50,242,254,121,134,128,255,204,249,167,254,165,235,215,0,202,177,243,0,133,141,62,0,240,130,190,1,110,175,255,0,0,20,146,1,37,210,121,255,7,39,130,0,142,250,84,255,141,200,207,0,9,95,104,255,11,244,174,0,134,232,126,0,167,1,123,254,16,193,149,255,232,233,239,1,213,70,112,255,252,116,160,254,242,222,220,255,205,85,227,0,7,185,58,0,118,247,63,1,116,77,177,255,62,245,200,254,63,18,37,255,107,53,232,254,50,221,211,0,162,219,7,254,2,94,43,0,182,62,182,254,160,78,200,255,135,140,170,0,235,184,228,0,175,53,138,254,80,58,77,255,152,201,2,1,63,196,34,0,5,30,184,0,171,176,154,0,121,59,206,0,38,99,39,0,172,80,77,254,0,134,151,0,186,33,241,254,94,253,223,255,44,114,252,0,108,126,57,255,201,40,13,255,39,229,27,255,39,239,23,1,151,121,51,255,153,150,248,0,10,234,174,255,118,246,4,254,200,245,38,0,69,161,242,1,16,178,150,0,113,56,130,0,171,31,105,0,26,88,108,255,49,42,106,0,251,169,66,0,69,93,149,0,20,57,254,0,164,25,111,0,90,188,90,255,204,4,197,0,40,213,50,1,212,96,132,255,88,138,180,254,228,146,124,255,184,246,247,0,65,117,86,255,253,102,210,254,254,121,36,0,137,115,3,255,60,24,216,0,134,18,29,0,59,226,97,0,176,142,71,0,7,209,161,0,189,84,51,254,155,250,72,0,213,84,235,255,45,222,224,0,238,148,143,255,170,42,53,255,78,167,117,0,186,0,40,255,125,177,103,255,69,225,66,0,227,7,88,1,75,172,6,0,169,45,227,1,16,36,70,255,50,2,9,255,139,193,22,0,143,183,231,254,218,69,50,0,236,56,161,1,213,131,42,0,138,145,44,254,136,229,40,255,49,63,35,255,61,145,245,255,101,192,2,254,232,167,113,0,152,104,38,1,121,185,218,0,121,139,211,254,119,240,35,0,65,189,217,254,187,179,162,255,160,187,230,0,62,248,14,255,60,78,97,0,255,247,163,255,225,59,91,255,107,71,58,255,241,47,33,1,50,117,236,0,219,177,63,254,244,90,179,0,35,194,215,255,189,67,50,255,23,135,129,0,104,189,37,255,185,57,194,0,35,62,231,255,220,248,108,0,12,231,178,0,143,80,91,1,131,93,101,255,144,39,2,1,255,250,178,0,5,17,236,254,139,32,46,0,204,188,38,254,245,115,52,255,191,113,73,254,191,108,69,255,22,69,245,1,23,203,178,0,170,99,170,0,65,248,111,0,37,108,153,255,64,37,69,0,0,88,62,254,89,148,144,255,191,68,224,1,241,39,53,0,41,203,237,255,145,126,194,255,221,42,253,255,25,99,151,0,97,253,223,1,74,115,49,255,6,175,72,255,59,176,203,0,124,183,249,1,228,228,99,0,129,12,207,254,168,192,195,255,204,176,16,254,152,234,171,0,77,37,85,255,33,120,135,255,142,194,227,1,31,214,58,0,213,187,125,255,232,46,60,255,190,116,42,254,151,178,19,255,51,62,237,254,204,236,193,0,194,232,60,0,172,34,157,255,189,16,184,254,103,3,95,255,141,233,36,254,41,25,11,255,21,195,166,0,118,245,45,0,67,213,149,255,159,12,18,255,187,164,227,1,160,25,5,0,12,78,195,1,43,197,225,0,48,142,41,254,196,155,60,255,223,199,18,1,145,136,156,0,252,117,169,254,145,226,238,0,239,23,107,0,109,181,188,255,230,112,49,254,73,170,237,255,231,183,227,255,80,220,20,0,194,107,127,1,127,205,101,0,46,52,197,1,210,171,36,255,88,3,90,255,56,151,141,0,96,187,255,255,42,78,200,0,254,70,70,1,244,125,168,0,204,68,138,1,124,215,70,0,102,66,200,254,17,52,228,0,117,220,143,254,203,248,123,0,56,18,174,255,186,151,164,255,51,232,208,1,160,228,43,255,249,29,25,1,68,190,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,244,126,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,2,0,0,0,92,129,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,255,255,255,255], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+30720);





/* no memory initializer */
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


   
  Module["_bitshift64Ashr"] = _bitshift64Ashr;

   
  Module["_i64Subtract"] = _i64Subtract;

   
  Module["_i64Add"] = _i64Add;

   
  Module["_memset"] = _memset;

  function _pthread_cleanup_push(routine, arg) {
      __ATEXIT__.push(function() { Runtime.dynCall('vi', routine, [arg]) })
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

   
  Module["_bitshift64Lshr"] = _bitshift64Lshr;

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function _pthread_cleanup_pop() {
      assert(_pthread_cleanup_push.level == __ATEXIT__.length, 'cannot pop if something else added meanwhile!');
      __ATEXIT__.pop();
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

  function _abort() {
      Module['abort']();
    }

  function ___lock() {}

  function ___unlock() {}

  
  
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      return value;
    }
  
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty);
        },flush:function (stream) {
          stream.tty.ops.flush(stream.tty);
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              // we will read data by chunks of BUFSIZE
              var BUFSIZE = 256;
              var buf = new Buffer(BUFSIZE);
              var bytesRead = 0;
  
              var fd = process.stdin.fd;
              // Linux and Mac cannot use process.stdin.fd (which isn't set up as sync)
              var usingDevice = false;
              try {
                fd = fs.openSync('/dev/stdin', 'r');
                usingDevice = true;
              } catch (e) {}
  
              bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
  
              if (usingDevice) { fs.closeSync(fd); }
              if (bytesRead > 0) {
                result = buf.slice(0, bytesRead).toString('utf-8');
              } else {
                result = null;
              }
  
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }}};
  
  var MEMFS={ops_table:null,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap,
                msync: MEMFS.stream_ops.msync
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.buffer.byteLength which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function (node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function (node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function (node, newCapacity) {
        // If we are asked to expand the size of a file that already exists, revert to using a standard JS array to store the file
        // instead of a typed array. This makes resizing the array more flexible because we can just .push() elements at the back to
        // increase the size.
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
          node.contents = MEMFS.getFileDataAsRegularArray(node);
          node.usedBytes = node.contents.length; // We might be writing to a lazy-loaded file which had overridden this property, so force-reset it.
        }
  
        if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
          var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
          if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
          // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
          // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
          // avoid overshooting the allocation cap by a very large margin.
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity); // Allocate new storage.
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
          return;
        }
        // Not using a typed array to back the file storage. Use a standard JS array instead.
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0);
      },resizeFileStorage:function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) { // Can we just reuse the buffer we are given?
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
  
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else {
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position+length);
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < stream.node.usedBytes) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        },msync:function (stream, buffer, offset, length, mmapFlags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          if (mmapFlags & 2) {
            // MAP_PRIVATE calls need not to be synced back to underlying fs
            return 0;
          }
  
          var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          if (!fileStore.indexNames.contains('timestamp')) {
            fileStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function(e) {
            callback(this.error);
            e.preventDefault();
          };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.chmod(path, entry.mode);
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function(e) {
          done(this.error);
          e.preventDefault();
        };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        flags &= ~0100000 /*O_LARGEFILE*/; // Ignore this flag from musl, otherwise node.js fails to open the file.
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            path = fs.readlinkSync(path);
            path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
            return path;
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          if (length === 0) return 0; // node errors on 0 length reads
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          return position;
        }}};
  
  var WORKERFS={DIR_MODE:16895,FILE_MODE:33279,reader:null,mount:function (mount) {
        assert(ENVIRONMENT_IS_WORKER);
        if (!WORKERFS.reader) WORKERFS.reader = new FileReaderSync();
        var root = WORKERFS.createNode(null, '/', WORKERFS.DIR_MODE, 0);
        var createdParents = {};
        function ensureParent(path) {
          // return the parent node, creating subdirs as necessary
          var parts = path.split('/');
          var parent = root;
          for (var i = 0; i < parts.length-1; i++) {
            var curr = parts.slice(0, i+1).join('/');
            if (!createdParents[curr]) {
              createdParents[curr] = WORKERFS.createNode(parent, curr, WORKERFS.DIR_MODE, 0);
            }
            parent = createdParents[curr];
          }
          return parent;
        }
        function base(path) {
          var parts = path.split('/');
          return parts[parts.length-1];
        }
        // We also accept FileList here, by using Array.prototype
        Array.prototype.forEach.call(mount.opts["files"] || [], function(file) {
          WORKERFS.createNode(ensureParent(file.name), base(file.name), WORKERFS.FILE_MODE, 0, file, file.lastModifiedDate);
        });
        (mount.opts["blobs"] || []).forEach(function(obj) {
          WORKERFS.createNode(ensureParent(obj["name"]), base(obj["name"]), WORKERFS.FILE_MODE, 0, obj["data"]);
        });
        (mount.opts["packages"] || []).forEach(function(pack) {
          pack['metadata'].files.forEach(function(file) {
            var name = file.filename.substr(1); // remove initial slash
            WORKERFS.createNode(ensureParent(name), base(name), WORKERFS.FILE_MODE, 0, pack['blob'].slice(file.start, file.end));
          });
        });
        return root;
      },createNode:function (parent, name, mode, dev, contents, mtime) {
        var node = FS.createNode(parent, name, mode);
        node.mode = mode;
        node.node_ops = WORKERFS.node_ops;
        node.stream_ops = WORKERFS.stream_ops;
        node.timestamp = (mtime || new Date).getTime();
        assert(WORKERFS.FILE_MODE !== WORKERFS.DIR_MODE);
        if (mode === WORKERFS.FILE_MODE) {
          node.size = contents.size;
          node.contents = contents;
        } else {
          node.size = 4096;
          node.contents = {};
        }
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },node_ops:{getattr:function (node) {
          return {
            dev: 1,
            ino: undefined,
            mode: node.mode,
            nlink: 1,
            uid: 0,
            gid: 0,
            rdev: undefined,
            size: node.size,
            atime: new Date(node.timestamp),
            mtime: new Date(node.timestamp),
            ctime: new Date(node.timestamp),
            blksize: 4096,
            blocks: Math.ceil(node.size / 4096),
          };
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
        },lookup:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        },mknod:function (parent, name, mode, dev) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },rename:function (oldNode, newDir, newName) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },unlink:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },rmdir:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },readdir:function (node) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },symlink:function (parent, newName, oldPath) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },readlink:function (node) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          if (position >= stream.node.size) return 0;
          var chunk = stream.node.contents.slice(position, position + length);
          var ab = WORKERFS.reader.readAsArrayBuffer(chunk);
          buffer.set(new Uint8Array(ab), offset);
          return chunk.size;
        },write:function (stream, buffer, offset, length, position) {
          throw new FS.ErrnoError(ERRNO_CODES.EIO);
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.size;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},filesystems:null,handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
  
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); }
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); }
            }
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        var err = FS.nodePermissions(dir, 'x');
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0;
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          console.log("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return PATH.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var err = FS.mayOpen(node, flags);
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function (stream) {
        if (stream.getdents) stream.getdents = null; // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },msync:function (stream, buffer, offset, length, mmapFlags) {
        if (!stream || !stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },munmap:function (stream) {
        return 0;
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf, 0);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function(stream, buffer, offset, length, pos) { return length; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto !== 'undefined') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else if (ENVIRONMENT_IS_NODE) {
          // for nodejs
          random_device = function() { return require('crypto').randomBytes(1)[0]; };
        } else {
          // default for ES5 platforms
          random_device = function() { return (Math.random()*256)|0; };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createSpecialDirectories:function () {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount: function() {
            var node = FS.createNode('/proc/self', 'fd', 16384 | 0777, 73);
            node.node_ops = {
              lookup: function(parent, name) {
                var fd = +name;
                var stream = FS.getStream(fd);
                if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: function() { return stream.path } }
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          //Module.printErr(stackTrace()); // useful for debugging
          this.node = node;
          this.setErrno = function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
          'IDBFS': IDBFS,
          'NODEFS': NODEFS,
          'WORKERFS': WORKERFS,
        };
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        var fflush = Module['_fflush'];
        if (fflush) fflush(0);
        // close all of our streams
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperty(node, "usedBytes", {
            get: function() { return this.contents.length; }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency('cp ' + fullname); // might have several active requests for the same fullname
        function processData(byteArray) {
          function finish(byteArray) {
            if (preFinish) preFinish();
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency(dep);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency(dep);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency(dep);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};var SYSCALLS={DEFAULT_POLLMASK:5,mappings:{},umask:511,calculateAt:function (dirfd, path) {
        if (path[0] !== '/') {
          // relative path
          var dir;
          if (dirfd === -100) {
            dir = FS.cwd();
          } else {
            var dirstream = FS.getStream(dirfd);
            if (!dirstream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
            dir = dirstream.path;
          }
          path = PATH.join2(dir, path);
        }
        return path;
      },doStat:function (func, path, buf) {
        try {
          var stat = func(path);
        } catch (e) {
          if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
            // an error occurred while trying to look up the path; we should just report ENOTDIR
            return -ERRNO_CODES.ENOTDIR;
          }
          throw e;
        }
        HEAP32[((buf)>>2)]=stat.dev;
        HEAP32[(((buf)+(4))>>2)]=0;
        HEAP32[(((buf)+(8))>>2)]=stat.ino;
        HEAP32[(((buf)+(12))>>2)]=stat.mode;
        HEAP32[(((buf)+(16))>>2)]=stat.nlink;
        HEAP32[(((buf)+(20))>>2)]=stat.uid;
        HEAP32[(((buf)+(24))>>2)]=stat.gid;
        HEAP32[(((buf)+(28))>>2)]=stat.rdev;
        HEAP32[(((buf)+(32))>>2)]=0;
        HEAP32[(((buf)+(36))>>2)]=stat.size;
        HEAP32[(((buf)+(40))>>2)]=4096;
        HEAP32[(((buf)+(44))>>2)]=stat.blocks;
        HEAP32[(((buf)+(48))>>2)]=(stat.atime.getTime() / 1000)|0;
        HEAP32[(((buf)+(52))>>2)]=0;
        HEAP32[(((buf)+(56))>>2)]=(stat.mtime.getTime() / 1000)|0;
        HEAP32[(((buf)+(60))>>2)]=0;
        HEAP32[(((buf)+(64))>>2)]=(stat.ctime.getTime() / 1000)|0;
        HEAP32[(((buf)+(68))>>2)]=0;
        HEAP32[(((buf)+(72))>>2)]=stat.ino;
        return 0;
      },doMsync:function (addr, stream, len, flags) {
        var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
        FS.msync(stream, buffer, 0, len, flags);
      },doMkdir:function (path, mode) {
        // remove a trailing slash, if one - /a/b/ has basename of '', but
        // we want to create b in the context of this function
        path = PATH.normalize(path);
        if (path[path.length-1] === '/') path = path.substr(0, path.length-1);
        FS.mkdir(path, mode, 0);
        return 0;
      },doMknod:function (path, mode, dev) {
        // we don't want this in the JS API as it uses mknod to create all nodes.
        switch (mode & 61440) {
          case 32768:
          case 8192:
          case 24576:
          case 4096:
          case 49152:
            break;
          default: return -ERRNO_CODES.EINVAL;
        }
        FS.mknod(path, mode, dev);
        return 0;
      },doReadlink:function (path, buf, bufsize) {
        if (bufsize <= 0) return -ERRNO_CODES.EINVAL;
        var ret = FS.readlink(path);
        ret = ret.slice(0, Math.max(0, bufsize));
        writeStringToMemory(ret, buf, true);
        return ret.length;
      },doAccess:function (path, amode) {
        if (amode & ~7) {
          // need a valid mode
          return -ERRNO_CODES.EINVAL;
        }
        var node;
        var lookup = FS.lookupPath(path, { follow: true });
        node = lookup.node;
        var perms = '';
        if (amode & 4) perms += 'r';
        if (amode & 2) perms += 'w';
        if (amode & 1) perms += 'x';
        if (perms /* otherwise, they've just passed F_OK */ && FS.nodePermissions(node, perms)) {
          return -ERRNO_CODES.EACCES;
        }
        return 0;
      },doDup:function (path, flags, suggestFD) {
        var suggest = FS.getStream(suggestFD);
        if (suggest) FS.close(suggest);
        return FS.open(path, flags, 0, suggestFD, suggestFD).fd;
      },doReadv:function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          var curr = FS.read(stream, HEAP8,ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
          if (curr < len) break; // nothing more to read
        }
        return ret;
      },doWritev:function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          var curr = FS.write(stream, HEAP8,ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
        }
        return ret;
      },varargs:0,get:function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret;
      },getStreamFromFD:function () {
        var stream = FS.getStream(SYSCALLS.get());
        if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return stream;
      },getSocketFromFD:function () {
        var socket = SOCKFS.getSocket(SYSCALLS.get());
        if (!socket) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return socket;
      },getSocketAddress:function (allowNull) {
        var addrp = SYSCALLS.get(), addrlen = SYSCALLS.get();
        if (allowNull && addrp === 0) return null;
        var info = __read_sockaddr(addrp, addrlen);
        if (info.errno) throw new FS.ErrnoError(info.errno);
        info.addr = DNS.lookup_addr(info.addr) || info.addr;
        return info;
      },get64:function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function () {
        assert(SYSCALLS.get() === 0);
      }};function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 85: return totalMemory / PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 79:
          return 0;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) {
        var success = self.alloc(bytes);
        if (!success) return -1 >>> 0; // sbrk failure code
      }
      return ret;  // Previous break location.
    }

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      } else if (mode == 2 /*EM_TIMING_SETIMMEDIATE*/) {
        if (!window['setImmediate']) {
          // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
          var setImmediates = [];
          var emscriptenMainLoopMessageId = '__emcc';
          function Browser_setImmediate_messageHandler(event) {
            if (event.source === window && event.data === emscriptenMainLoopMessageId) {
              event.stopPropagation();
              setImmediates.shift()();
            }
          }
          window.addEventListener("message", Browser_setImmediate_messageHandler, true);
          window['setImmediate'] = function Browser_emulated_setImmediate(func) {
            setImmediates.push(func);
            window.postMessage(emscriptenMainLoopMessageId, "*");
          }
        }
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
          window['setImmediate'](Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'immediate';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (!noSetTiming) {
        if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
        else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
        Browser.mainLoop.scheduler();
      }
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true /* do not set timing and call scheduler, we will do it on the next lines */);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
          Browser.mainLoop.scheduler();
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas, vrDevice) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        Browser.vrDevice = vrDevice;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
        if (typeof Browser.vrDevice === 'undefined') Browser.vrDevice = null;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
  
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
  
        if (vrDevice) {
          canvasContainer.requestFullScreen({ vrDisplay: vrDevice });
        } else {
          canvasContainer.requestFullScreen();
        }
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },allowAsyncCallbacks:true,queuedAsyncCallbacks:[],pauseAsyncCallbacks:function () {
        Browser.allowAsyncCallbacks = false;
      },resumeAsyncCallbacks:function () { // marks future callbacks as ok to execute, and synchronously runs any remaining ones right now
        Browser.allowAsyncCallbacks = true;
        if (Browser.queuedAsyncCallbacks.length > 0) {
          var callbacks = Browser.queuedAsyncCallbacks;
          Browser.queuedAsyncCallbacks = [];
          callbacks.forEach(function(func) {
            func();
          });
        }
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } // drop it on the floor otherwise, next interval will kick in
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              var last = Browser.touches[touch.identifier];
              if (!last) last = coords;
              Browser.lastTouches[touch.identifier] = last;
              Browser.touches[touch.identifier] = coords;
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  function _pthread_self() {
      //FIXME: assumes only a single thread
      return 0;
    }

  function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      var offset = offset_low;
      assert(offset_high === 0);
      FS.llseek(stream, offset, whence);
      HEAP32[((result)>>2)]=stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      return SYSCALLS.doWritev(stream, iov, iovcnt);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall54(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // ioctl
      var stream = SYSCALLS.getStreamFromFD(), op = SYSCALLS.get();
      switch (op) {
        case 21505: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return 0;
        }
        case 21506: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          var argp = SYSCALLS.get();
          HEAP32[((argp)>>2)]=0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return -ERRNO_CODES.EINVAL; // not supported
        }
        case 21531: {
          var argp = SYSCALLS.get();
          return FS.ioctl(stream, op, argp);
        }
        default: abort('bad ioctl syscall ' + op);
      }
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
FS.staticInit();__ATINIT__.unshift(function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() });__ATMAIN__.push(function() { FS.ignorePermissions = false });__ATEXIT__.push(function() { FS.quit() });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;Module["FS_unlink"] = FS.unlink;
__ATINIT__.unshift(function() { TTY.init() });__ATEXIT__.push(function() { TTY.shutdown() });
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); var NODEJS_PATH = require("path"); NODEFS.staticInit(); }
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) { Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
  Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) { return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes) }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);


function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "invoke_ii": invoke_ii, "invoke_iiii": invoke_iiii, "invoke_vi": invoke_vi, "_pthread_cleanup_pop": _pthread_cleanup_pop, "___lock": ___lock, "_emscripten_set_main_loop": _emscripten_set_main_loop, "_pthread_self": _pthread_self, "___syscall6": ___syscall6, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_abort": _abort, "_sbrk": _sbrk, "_time": _time, "___setErrNo": ___setErrNo, "_emscripten_memcpy_big": _emscripten_memcpy_big, "___syscall54": ___syscall54, "___unlock": ___unlock, "___syscall140": ___syscall140, "_pthread_cleanup_push": _pthread_cleanup_push, "_sysconf": _sysconf, "___syscall146": ___syscall146, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8 };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'use asm';
  
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var cttz_i8=env.cttz_i8|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var invoke_ii=env.invoke_ii;
  var invoke_iiii=env.invoke_iiii;
  var invoke_vi=env.invoke_vi;
  var _pthread_cleanup_pop=env._pthread_cleanup_pop;
  var ___lock=env.___lock;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var _pthread_self=env._pthread_self;
  var ___syscall6=env.___syscall6;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _abort=env._abort;
  var _sbrk=env._sbrk;
  var _time=env._time;
  var ___setErrNo=env.___setErrNo;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var ___syscall54=env.___syscall54;
  var ___unlock=env.___unlock;
  var ___syscall140=env.___syscall140;
  var _pthread_cleanup_push=env._pthread_cleanup_push;
  var _sysconf=env._sysconf;
  var ___syscall146=env.___syscall146;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
  STACKTOP = (STACKTOP + 15)&-16;

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}
function establishStackSpace(stackBase, stackMax) {
  stackBase = stackBase|0;
  stackMax = stackMax|0;
  STACKTOP = stackBase;
  STACK_MAX = stackMax;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}

function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _create_keypair($public_key,$private_key,$seed) {
 $public_key = $public_key|0;
 $private_key = $private_key|0;
 $seed = $seed|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 _ed25519_create_keypair($public_key,$private_key,$seed);
 return;
}
function _sign($signature,$message,$message_len,$public_key,$private_key) {
 $signature = $signature|0;
 $message = $message|0;
 $message_len = $message_len|0;
 $public_key = $public_key|0;
 $private_key = $private_key|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 _ed25519_sign($signature,$message,$message_len,$public_key,$private_key);
 return;
}
function _verify($signature,$message,$message_len,$public_key) {
 $signature = $signature|0;
 $message = $message|0;
 $message_len = $message_len|0;
 $public_key = $public_key|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_ed25519_verify($signature,$message,$message_len,$public_key)|0);
 return ($0|0);
}
function _fe_0($h) {
 $h = $h|0;
 var dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 dest=$h; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 return;
}
function _fe_1($h) {
 $h = $h|0;
 var $0 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 HEAP32[$h>>2] = 1;
 $0 = ((($h)) + 4|0);
 dest=$0; stop=dest+36|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 return;
}
function _fe_add($h,$f,$g) {
 $h = $h|0;
 $f = $f|0;
 $g = $g|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $1 = ((($f)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($f)) + 8|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ((($f)) + 12|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ((($f)) + 16|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = ((($f)) + 20|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ((($f)) + 24|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = ((($f)) + 28|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = ((($f)) + 32|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = ((($f)) + 36|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = HEAP32[$g>>2]|0;
 $20 = ((($g)) + 4|0);
 $21 = HEAP32[$20>>2]|0;
 $22 = ((($g)) + 8|0);
 $23 = HEAP32[$22>>2]|0;
 $24 = ((($g)) + 12|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = ((($g)) + 16|0);
 $27 = HEAP32[$26>>2]|0;
 $28 = ((($g)) + 20|0);
 $29 = HEAP32[$28>>2]|0;
 $30 = ((($g)) + 24|0);
 $31 = HEAP32[$30>>2]|0;
 $32 = ((($g)) + 28|0);
 $33 = HEAP32[$32>>2]|0;
 $34 = ((($g)) + 32|0);
 $35 = HEAP32[$34>>2]|0;
 $36 = ((($g)) + 36|0);
 $37 = HEAP32[$36>>2]|0;
 $38 = (($19) + ($0))|0;
 $39 = (($21) + ($2))|0;
 $40 = (($23) + ($4))|0;
 $41 = (($25) + ($6))|0;
 $42 = (($27) + ($8))|0;
 $43 = (($29) + ($10))|0;
 $44 = (($31) + ($12))|0;
 $45 = (($33) + ($14))|0;
 $46 = (($35) + ($16))|0;
 $47 = (($37) + ($18))|0;
 HEAP32[$h>>2] = $38;
 $48 = ((($h)) + 4|0);
 HEAP32[$48>>2] = $39;
 $49 = ((($h)) + 8|0);
 HEAP32[$49>>2] = $40;
 $50 = ((($h)) + 12|0);
 HEAP32[$50>>2] = $41;
 $51 = ((($h)) + 16|0);
 HEAP32[$51>>2] = $42;
 $52 = ((($h)) + 20|0);
 HEAP32[$52>>2] = $43;
 $53 = ((($h)) + 24|0);
 HEAP32[$53>>2] = $44;
 $54 = ((($h)) + 28|0);
 HEAP32[$54>>2] = $45;
 $55 = ((($h)) + 32|0);
 HEAP32[$55>>2] = $46;
 $56 = ((($h)) + 36|0);
 HEAP32[$56>>2] = $47;
 return;
}
function _fe_cmov($f,$g,$b) {
 $f = $f|0;
 $g = $g|0;
 $b = $b|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $1 = ((($f)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($f)) + 8|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ((($f)) + 12|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ((($f)) + 16|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = ((($f)) + 20|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ((($f)) + 24|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = ((($f)) + 28|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = ((($f)) + 32|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = ((($f)) + 36|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = HEAP32[$g>>2]|0;
 $20 = ((($g)) + 4|0);
 $21 = HEAP32[$20>>2]|0;
 $22 = ((($g)) + 8|0);
 $23 = HEAP32[$22>>2]|0;
 $24 = ((($g)) + 12|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = ((($g)) + 16|0);
 $27 = HEAP32[$26>>2]|0;
 $28 = ((($g)) + 20|0);
 $29 = HEAP32[$28>>2]|0;
 $30 = ((($g)) + 24|0);
 $31 = HEAP32[$30>>2]|0;
 $32 = ((($g)) + 28|0);
 $33 = HEAP32[$32>>2]|0;
 $34 = ((($g)) + 32|0);
 $35 = HEAP32[$34>>2]|0;
 $36 = ((($g)) + 36|0);
 $37 = HEAP32[$36>>2]|0;
 $38 = $19 ^ $0;
 $39 = $21 ^ $2;
 $40 = $23 ^ $4;
 $41 = $25 ^ $6;
 $42 = $27 ^ $8;
 $43 = $29 ^ $10;
 $44 = $31 ^ $12;
 $45 = $33 ^ $14;
 $46 = $35 ^ $16;
 $47 = $37 ^ $18;
 $48 = (0 - ($b))|0;
 $49 = $38 & $48;
 $50 = $39 & $48;
 $51 = $40 & $48;
 $52 = $41 & $48;
 $53 = $42 & $48;
 $54 = $43 & $48;
 $55 = $44 & $48;
 $56 = $45 & $48;
 $57 = $46 & $48;
 $58 = $47 & $48;
 $59 = $49 ^ $0;
 HEAP32[$f>>2] = $59;
 $60 = $50 ^ $2;
 HEAP32[$1>>2] = $60;
 $61 = $51 ^ $4;
 HEAP32[$3>>2] = $61;
 $62 = $52 ^ $6;
 HEAP32[$5>>2] = $62;
 $63 = $53 ^ $8;
 HEAP32[$7>>2] = $63;
 $64 = $54 ^ $10;
 HEAP32[$9>>2] = $64;
 $65 = $55 ^ $12;
 HEAP32[$11>>2] = $65;
 $66 = $56 ^ $14;
 HEAP32[$13>>2] = $66;
 $67 = $57 ^ $16;
 HEAP32[$15>>2] = $67;
 $68 = $58 ^ $18;
 HEAP32[$17>>2] = $68;
 return;
}
function _fe_copy($h,$f) {
 $h = $h|0;
 $f = $f|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $1 = ((($f)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($f)) + 8|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ((($f)) + 12|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ((($f)) + 16|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = ((($f)) + 20|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ((($f)) + 24|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = ((($f)) + 28|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = ((($f)) + 32|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = ((($f)) + 36|0);
 $18 = HEAP32[$17>>2]|0;
 HEAP32[$h>>2] = $0;
 $19 = ((($h)) + 4|0);
 HEAP32[$19>>2] = $2;
 $20 = ((($h)) + 8|0);
 HEAP32[$20>>2] = $4;
 $21 = ((($h)) + 12|0);
 HEAP32[$21>>2] = $6;
 $22 = ((($h)) + 16|0);
 HEAP32[$22>>2] = $8;
 $23 = ((($h)) + 20|0);
 HEAP32[$23>>2] = $10;
 $24 = ((($h)) + 24|0);
 HEAP32[$24>>2] = $12;
 $25 = ((($h)) + 28|0);
 HEAP32[$25>>2] = $14;
 $26 = ((($h)) + 32|0);
 HEAP32[$26>>2] = $16;
 $27 = ((($h)) + 36|0);
 HEAP32[$27>>2] = $18;
 return;
}
function _fe_frombytes($h,$s) {
 $h = $h|0;
 $s = $s|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0;
 var $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0;
 var $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_load_4($s)|0);
 $1 = tempRet0;
 $2 = ((($s)) + 4|0);
 $3 = (_load_3($2)|0);
 $4 = tempRet0;
 $5 = (_bitshift64Shl(($3|0),($4|0),6)|0);
 $6 = tempRet0;
 $7 = ((($s)) + 7|0);
 $8 = (_load_3($7)|0);
 $9 = tempRet0;
 $10 = (_bitshift64Shl(($8|0),($9|0),5)|0);
 $11 = tempRet0;
 $12 = ((($s)) + 10|0);
 $13 = (_load_3($12)|0);
 $14 = tempRet0;
 $15 = (_bitshift64Shl(($13|0),($14|0),3)|0);
 $16 = tempRet0;
 $17 = ((($s)) + 13|0);
 $18 = (_load_3($17)|0);
 $19 = tempRet0;
 $20 = (_bitshift64Shl(($18|0),($19|0),2)|0);
 $21 = tempRet0;
 $22 = ((($s)) + 16|0);
 $23 = (_load_4($22)|0);
 $24 = tempRet0;
 $25 = ((($s)) + 20|0);
 $26 = (_load_3($25)|0);
 $27 = tempRet0;
 $28 = (_bitshift64Shl(($26|0),($27|0),7)|0);
 $29 = tempRet0;
 $30 = ((($s)) + 23|0);
 $31 = (_load_3($30)|0);
 $32 = tempRet0;
 $33 = (_bitshift64Shl(($31|0),($32|0),5)|0);
 $34 = tempRet0;
 $35 = ((($s)) + 26|0);
 $36 = (_load_3($35)|0);
 $37 = tempRet0;
 $38 = (_bitshift64Shl(($36|0),($37|0),4)|0);
 $39 = tempRet0;
 $40 = ((($s)) + 29|0);
 $41 = (_load_3($40)|0);
 $42 = tempRet0;
 $43 = (_bitshift64Shl(($41|0),($42|0),2)|0);
 $44 = tempRet0;
 $45 = $43 & 33554428;
 $46 = (_i64Add(($45|0),0,16777216,0)|0);
 $47 = tempRet0;
 $48 = (_bitshift64Lshr(($46|0),($47|0),25)|0);
 $49 = tempRet0;
 $50 = (_i64Subtract(0,0,($48|0),($49|0))|0);
 $51 = tempRet0;
 $52 = $50 & 19;
 $53 = (_i64Add(($52|0),0,($0|0),($1|0))|0);
 $54 = tempRet0;
 $55 = (_bitshift64Shl(($48|0),($49|0),25)|0);
 $56 = tempRet0;
 $57 = (_i64Add(($5|0),($6|0),16777216,0)|0);
 $58 = tempRet0;
 $59 = (_bitshift64Ashr(($57|0),($58|0),25)|0);
 $60 = tempRet0;
 $61 = (_i64Add(($59|0),($60|0),($10|0),($11|0))|0);
 $62 = tempRet0;
 $63 = (_bitshift64Shl(($59|0),($60|0),25)|0);
 $64 = tempRet0;
 $65 = (_i64Subtract(($5|0),($6|0),($63|0),($64|0))|0);
 $66 = tempRet0;
 $67 = (_i64Add(($15|0),($16|0),16777216,0)|0);
 $68 = tempRet0;
 $69 = (_bitshift64Ashr(($67|0),($68|0),25)|0);
 $70 = tempRet0;
 $71 = (_i64Add(($69|0),($70|0),($20|0),($21|0))|0);
 $72 = tempRet0;
 $73 = (_bitshift64Shl(($69|0),($70|0),25)|0);
 $74 = tempRet0;
 $75 = (_i64Subtract(($15|0),($16|0),($73|0),($74|0))|0);
 $76 = tempRet0;
 $77 = (_i64Add(($23|0),($24|0),16777216,0)|0);
 $78 = tempRet0;
 $79 = (_bitshift64Ashr(($77|0),($78|0),25)|0);
 $80 = tempRet0;
 $81 = (_i64Add(($28|0),($29|0),($79|0),($80|0))|0);
 $82 = tempRet0;
 $83 = (_bitshift64Shl(($79|0),($80|0),25)|0);
 $84 = tempRet0;
 $85 = (_i64Subtract(($23|0),($24|0),($83|0),($84|0))|0);
 $86 = tempRet0;
 $87 = (_i64Add(($33|0),($34|0),16777216,0)|0);
 $88 = tempRet0;
 $89 = (_bitshift64Ashr(($87|0),($88|0),25)|0);
 $90 = tempRet0;
 $91 = (_i64Add(($89|0),($90|0),($38|0),($39|0))|0);
 $92 = tempRet0;
 $93 = (_bitshift64Shl(($89|0),($90|0),25)|0);
 $94 = tempRet0;
 $95 = (_i64Add(($53|0),($54|0),33554432,0)|0);
 $96 = tempRet0;
 $97 = (_bitshift64Ashr(($95|0),($96|0),26)|0);
 $98 = tempRet0;
 $99 = (_i64Add(($65|0),($66|0),($97|0),($98|0))|0);
 $100 = tempRet0;
 $101 = (_bitshift64Shl(($97|0),($98|0),26)|0);
 $102 = tempRet0;
 $103 = (_i64Subtract(($53|0),($54|0),($101|0),($102|0))|0);
 $104 = tempRet0;
 $105 = (_i64Add(($61|0),($62|0),33554432,0)|0);
 $106 = tempRet0;
 $107 = (_bitshift64Ashr(($105|0),($106|0),26)|0);
 $108 = tempRet0;
 $109 = (_i64Add(($75|0),($76|0),($107|0),($108|0))|0);
 $110 = tempRet0;
 $111 = (_bitshift64Shl(($107|0),($108|0),26)|0);
 $112 = tempRet0;
 $113 = (_i64Subtract(($61|0),($62|0),($111|0),($112|0))|0);
 $114 = tempRet0;
 $115 = (_i64Add(($71|0),($72|0),33554432,0)|0);
 $116 = tempRet0;
 $117 = (_bitshift64Ashr(($115|0),($116|0),26)|0);
 $118 = tempRet0;
 $119 = (_i64Add(($85|0),($86|0),($117|0),($118|0))|0);
 $120 = tempRet0;
 $121 = (_bitshift64Shl(($117|0),($118|0),26)|0);
 $122 = tempRet0;
 $123 = (_i64Subtract(($71|0),($72|0),($121|0),($122|0))|0);
 $124 = tempRet0;
 $125 = (_i64Add(($81|0),($82|0),33554432,0)|0);
 $126 = tempRet0;
 $127 = (_bitshift64Ashr(($125|0),($126|0),26)|0);
 $128 = tempRet0;
 $129 = (_i64Add(($127|0),($128|0),($33|0),($34|0))|0);
 $130 = tempRet0;
 $131 = (_i64Subtract(($129|0),($130|0),($93|0),($94|0))|0);
 $132 = tempRet0;
 $133 = (_bitshift64Shl(($127|0),($128|0),26)|0);
 $134 = tempRet0;
 $135 = (_i64Subtract(($81|0),($82|0),($133|0),($134|0))|0);
 $136 = tempRet0;
 $137 = (_i64Add(($91|0),($92|0),33554432,0)|0);
 $138 = tempRet0;
 $139 = (_bitshift64Ashr(($137|0),($138|0),26)|0);
 $140 = tempRet0;
 $141 = (_i64Add(($139|0),($140|0),($45|0),0)|0);
 $142 = tempRet0;
 $143 = (_i64Subtract(($141|0),($142|0),($55|0),($56|0))|0);
 $144 = tempRet0;
 $145 = (_bitshift64Shl(($139|0),($140|0),26)|0);
 $146 = tempRet0;
 $147 = (_i64Subtract(($91|0),($92|0),($145|0),($146|0))|0);
 $148 = tempRet0;
 HEAP32[$h>>2] = $103;
 $149 = ((($h)) + 4|0);
 HEAP32[$149>>2] = $99;
 $150 = ((($h)) + 8|0);
 HEAP32[$150>>2] = $113;
 $151 = ((($h)) + 12|0);
 HEAP32[$151>>2] = $109;
 $152 = ((($h)) + 16|0);
 HEAP32[$152>>2] = $123;
 $153 = ((($h)) + 20|0);
 HEAP32[$153>>2] = $119;
 $154 = ((($h)) + 24|0);
 HEAP32[$154>>2] = $135;
 $155 = ((($h)) + 28|0);
 HEAP32[$155>>2] = $131;
 $156 = ((($h)) + 32|0);
 HEAP32[$156>>2] = $147;
 $157 = ((($h)) + 36|0);
 HEAP32[$157>>2] = $143;
 return;
}
function _fe_invert($out,$z) {
 $out = $out|0;
 $z = $z|0;
 var $0 = 0, $1 = 0, $2 = 0, $exitcond = 0, $exitcond10 = 0, $exitcond11 = 0, $i$74 = 0, $i$83 = 0, $i$92 = 0, $t0 = 0, $t1 = 0, $t2 = 0, $t3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 160|0;
 $t0 = sp + 120|0;
 $t1 = sp + 80|0;
 $t2 = sp + 40|0;
 $t3 = sp;
 _fe_sq($t0,$z);
 _fe_sq($t1,$t0);
 _fe_sq($t1,$t1);
 _fe_mul($t1,$z,$t1);
 _fe_mul($t0,$t0,$t1);
 _fe_sq($t2,$t0);
 _fe_mul($t1,$t1,$t2);
 _fe_sq($t2,$t1);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_mul($t1,$t2,$t1);
 _fe_sq($t2,$t1);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_mul($t2,$t2,$t1);
 _fe_sq($t3,$t2);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_sq($t3,$t3);
 _fe_mul($t2,$t3,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_mul($t1,$t2,$t1);
 _fe_sq($t2,$t1);
 $i$74 = 1;
 while(1) {
  _fe_sq($t2,$t2);
  $0 = (($i$74) + 1)|0;
  $exitcond11 = ($0|0)==(50);
  if ($exitcond11) {
   break;
  } else {
   $i$74 = $0;
  }
 }
 _fe_mul($t2,$t2,$t1);
 _fe_sq($t3,$t2);
 $i$83 = 1;
 while(1) {
  _fe_sq($t3,$t3);
  $1 = (($i$83) + 1)|0;
  $exitcond10 = ($1|0)==(100);
  if ($exitcond10) {
   break;
  } else {
   $i$83 = $1;
  }
 }
 _fe_mul($t2,$t3,$t2);
 _fe_sq($t2,$t2);
 $i$92 = 1;
 while(1) {
  _fe_sq($t2,$t2);
  $2 = (($i$92) + 1)|0;
  $exitcond = ($2|0)==(50);
  if ($exitcond) {
   break;
  } else {
   $i$92 = $2;
  }
 }
 _fe_mul($t1,$t2,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_mul($out,$t1,$t0);
 STACKTOP = sp;return;
}
function _fe_sq($h,$f) {
 $h = $h|0;
 $f = $f|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0;
 var $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0;
 var $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0;
 var $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0;
 var $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0;
 var $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0;
 var $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0;
 var $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0;
 var $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $1 = ((($f)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($f)) + 8|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ((($f)) + 12|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ((($f)) + 16|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = ((($f)) + 20|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ((($f)) + 24|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = ((($f)) + 28|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = ((($f)) + 32|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = ((($f)) + 36|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = $0 << 1;
 $20 = $2 << 1;
 $21 = $4 << 1;
 $22 = $6 << 1;
 $23 = $8 << 1;
 $24 = $10 << 1;
 $25 = $12 << 1;
 $26 = $14 << 1;
 $27 = ($10*38)|0;
 $28 = ($12*19)|0;
 $29 = ($14*38)|0;
 $30 = ($16*19)|0;
 $31 = ($18*38)|0;
 $32 = ($0|0)<(0);
 $33 = $32 << 31 >> 31;
 $34 = (___muldi3(($0|0),($33|0),($0|0),($33|0))|0);
 $35 = tempRet0;
 $36 = ($19|0)<(0);
 $37 = $36 << 31 >> 31;
 $38 = ($2|0)<(0);
 $39 = $38 << 31 >> 31;
 $40 = (___muldi3(($19|0),($37|0),($2|0),($39|0))|0);
 $41 = tempRet0;
 $42 = ($4|0)<(0);
 $43 = $42 << 31 >> 31;
 $44 = (___muldi3(($4|0),($43|0),($19|0),($37|0))|0);
 $45 = tempRet0;
 $46 = ($6|0)<(0);
 $47 = $46 << 31 >> 31;
 $48 = (___muldi3(($6|0),($47|0),($19|0),($37|0))|0);
 $49 = tempRet0;
 $50 = ($8|0)<(0);
 $51 = $50 << 31 >> 31;
 $52 = (___muldi3(($8|0),($51|0),($19|0),($37|0))|0);
 $53 = tempRet0;
 $54 = ($10|0)<(0);
 $55 = $54 << 31 >> 31;
 $56 = (___muldi3(($10|0),($55|0),($19|0),($37|0))|0);
 $57 = tempRet0;
 $58 = ($12|0)<(0);
 $59 = $58 << 31 >> 31;
 $60 = (___muldi3(($12|0),($59|0),($19|0),($37|0))|0);
 $61 = tempRet0;
 $62 = ($14|0)<(0);
 $63 = $62 << 31 >> 31;
 $64 = (___muldi3(($14|0),($63|0),($19|0),($37|0))|0);
 $65 = tempRet0;
 $66 = ($16|0)<(0);
 $67 = $66 << 31 >> 31;
 $68 = (___muldi3(($16|0),($67|0),($19|0),($37|0))|0);
 $69 = tempRet0;
 $70 = ($18|0)<(0);
 $71 = $70 << 31 >> 31;
 $72 = (___muldi3(($18|0),($71|0),($19|0),($37|0))|0);
 $73 = tempRet0;
 $74 = ($20|0)<(0);
 $75 = $74 << 31 >> 31;
 $76 = (___muldi3(($20|0),($75|0),($2|0),($39|0))|0);
 $77 = tempRet0;
 $78 = (___muldi3(($20|0),($75|0),($4|0),($43|0))|0);
 $79 = tempRet0;
 $80 = ($22|0)<(0);
 $81 = $80 << 31 >> 31;
 $82 = (___muldi3(($22|0),($81|0),($20|0),($75|0))|0);
 $83 = tempRet0;
 $84 = (___muldi3(($8|0),($51|0),($20|0),($75|0))|0);
 $85 = tempRet0;
 $86 = ($24|0)<(0);
 $87 = $86 << 31 >> 31;
 $88 = (___muldi3(($24|0),($87|0),($20|0),($75|0))|0);
 $89 = tempRet0;
 $90 = (___muldi3(($12|0),($59|0),($20|0),($75|0))|0);
 $91 = tempRet0;
 $92 = ($26|0)<(0);
 $93 = $92 << 31 >> 31;
 $94 = (___muldi3(($26|0),($93|0),($20|0),($75|0))|0);
 $95 = tempRet0;
 $96 = (___muldi3(($16|0),($67|0),($20|0),($75|0))|0);
 $97 = tempRet0;
 $98 = ($31|0)<(0);
 $99 = $98 << 31 >> 31;
 $100 = (___muldi3(($31|0),($99|0),($20|0),($75|0))|0);
 $101 = tempRet0;
 $102 = (___muldi3(($4|0),($43|0),($4|0),($43|0))|0);
 $103 = tempRet0;
 $104 = ($21|0)<(0);
 $105 = $104 << 31 >> 31;
 $106 = (___muldi3(($21|0),($105|0),($6|0),($47|0))|0);
 $107 = tempRet0;
 $108 = (___muldi3(($8|0),($51|0),($21|0),($105|0))|0);
 $109 = tempRet0;
 $110 = (___muldi3(($10|0),($55|0),($21|0),($105|0))|0);
 $111 = tempRet0;
 $112 = (___muldi3(($12|0),($59|0),($21|0),($105|0))|0);
 $113 = tempRet0;
 $114 = (___muldi3(($14|0),($63|0),($21|0),($105|0))|0);
 $115 = tempRet0;
 $116 = ($30|0)<(0);
 $117 = $116 << 31 >> 31;
 $118 = (___muldi3(($30|0),($117|0),($21|0),($105|0))|0);
 $119 = tempRet0;
 $120 = (___muldi3(($31|0),($99|0),($4|0),($43|0))|0);
 $121 = tempRet0;
 $122 = (___muldi3(($22|0),($81|0),($6|0),($47|0))|0);
 $123 = tempRet0;
 $124 = (___muldi3(($22|0),($81|0),($8|0),($51|0))|0);
 $125 = tempRet0;
 $126 = (___muldi3(($24|0),($87|0),($22|0),($81|0))|0);
 $127 = tempRet0;
 $128 = (___muldi3(($12|0),($59|0),($22|0),($81|0))|0);
 $129 = tempRet0;
 $130 = ($29|0)<(0);
 $131 = $130 << 31 >> 31;
 $132 = (___muldi3(($29|0),($131|0),($22|0),($81|0))|0);
 $133 = tempRet0;
 $134 = (___muldi3(($30|0),($117|0),($22|0),($81|0))|0);
 $135 = tempRet0;
 $136 = (___muldi3(($31|0),($99|0),($22|0),($81|0))|0);
 $137 = tempRet0;
 $138 = (___muldi3(($8|0),($51|0),($8|0),($51|0))|0);
 $139 = tempRet0;
 $140 = ($23|0)<(0);
 $141 = $140 << 31 >> 31;
 $142 = (___muldi3(($23|0),($141|0),($10|0),($55|0))|0);
 $143 = tempRet0;
 $144 = ($28|0)<(0);
 $145 = $144 << 31 >> 31;
 $146 = (___muldi3(($28|0),($145|0),($23|0),($141|0))|0);
 $147 = tempRet0;
 $148 = (___muldi3(($29|0),($131|0),($8|0),($51|0))|0);
 $149 = tempRet0;
 $150 = (___muldi3(($30|0),($117|0),($23|0),($141|0))|0);
 $151 = tempRet0;
 $152 = (___muldi3(($31|0),($99|0),($8|0),($51|0))|0);
 $153 = tempRet0;
 $154 = ($27|0)<(0);
 $155 = $154 << 31 >> 31;
 $156 = (___muldi3(($27|0),($155|0),($10|0),($55|0))|0);
 $157 = tempRet0;
 $158 = (___muldi3(($28|0),($145|0),($24|0),($87|0))|0);
 $159 = tempRet0;
 $160 = (___muldi3(($29|0),($131|0),($24|0),($87|0))|0);
 $161 = tempRet0;
 $162 = (___muldi3(($30|0),($117|0),($24|0),($87|0))|0);
 $163 = tempRet0;
 $164 = (___muldi3(($31|0),($99|0),($24|0),($87|0))|0);
 $165 = tempRet0;
 $166 = (___muldi3(($28|0),($145|0),($12|0),($59|0))|0);
 $167 = tempRet0;
 $168 = (___muldi3(($29|0),($131|0),($12|0),($59|0))|0);
 $169 = tempRet0;
 $170 = ($25|0)<(0);
 $171 = $170 << 31 >> 31;
 $172 = (___muldi3(($30|0),($117|0),($25|0),($171|0))|0);
 $173 = tempRet0;
 $174 = (___muldi3(($31|0),($99|0),($12|0),($59|0))|0);
 $175 = tempRet0;
 $176 = (___muldi3(($29|0),($131|0),($14|0),($63|0))|0);
 $177 = tempRet0;
 $178 = (___muldi3(($30|0),($117|0),($26|0),($93|0))|0);
 $179 = tempRet0;
 $180 = (___muldi3(($31|0),($99|0),($26|0),($93|0))|0);
 $181 = tempRet0;
 $182 = (___muldi3(($30|0),($117|0),($16|0),($67|0))|0);
 $183 = tempRet0;
 $184 = (___muldi3(($31|0),($99|0),($16|0),($67|0))|0);
 $185 = tempRet0;
 $186 = (___muldi3(($31|0),($99|0),($18|0),($71|0))|0);
 $187 = tempRet0;
 $188 = (_i64Add(($156|0),($157|0),($34|0),($35|0))|0);
 $189 = tempRet0;
 $190 = (_i64Add(($188|0),($189|0),($146|0),($147|0))|0);
 $191 = tempRet0;
 $192 = (_i64Add(($190|0),($191|0),($132|0),($133|0))|0);
 $193 = tempRet0;
 $194 = (_i64Add(($192|0),($193|0),($118|0),($119|0))|0);
 $195 = tempRet0;
 $196 = (_i64Add(($194|0),($195|0),($100|0),($101|0))|0);
 $197 = tempRet0;
 $198 = (_i64Add(($44|0),($45|0),($76|0),($77|0))|0);
 $199 = tempRet0;
 $200 = (_i64Add(($48|0),($49|0),($78|0),($79|0))|0);
 $201 = tempRet0;
 $202 = (_i64Add(($82|0),($83|0),($102|0),($103|0))|0);
 $203 = tempRet0;
 $204 = (_i64Add(($202|0),($203|0),($52|0),($53|0))|0);
 $205 = tempRet0;
 $206 = (_i64Add(($204|0),($205|0),($176|0),($177|0))|0);
 $207 = tempRet0;
 $208 = (_i64Add(($206|0),($207|0),($172|0),($173|0))|0);
 $209 = tempRet0;
 $210 = (_i64Add(($208|0),($209|0),($164|0),($165|0))|0);
 $211 = tempRet0;
 $212 = (_i64Add(($196|0),($197|0),33554432,0)|0);
 $213 = tempRet0;
 $214 = (_bitshift64Ashr(($212|0),($213|0),26)|0);
 $215 = tempRet0;
 $216 = (_i64Add(($158|0),($159|0),($40|0),($41|0))|0);
 $217 = tempRet0;
 $218 = (_i64Add(($216|0),($217|0),($148|0),($149|0))|0);
 $219 = tempRet0;
 $220 = (_i64Add(($218|0),($219|0),($134|0),($135|0))|0);
 $221 = tempRet0;
 $222 = (_i64Add(($220|0),($221|0),($120|0),($121|0))|0);
 $223 = tempRet0;
 $224 = (_i64Add(($222|0),($223|0),($214|0),($215|0))|0);
 $225 = tempRet0;
 $226 = (_bitshift64Shl(($214|0),($215|0),26)|0);
 $227 = tempRet0;
 $228 = (_i64Subtract(($196|0),($197|0),($226|0),($227|0))|0);
 $229 = tempRet0;
 $230 = (_i64Add(($210|0),($211|0),33554432,0)|0);
 $231 = tempRet0;
 $232 = (_bitshift64Ashr(($230|0),($231|0),26)|0);
 $233 = tempRet0;
 $234 = (_i64Add(($84|0),($85|0),($106|0),($107|0))|0);
 $235 = tempRet0;
 $236 = (_i64Add(($234|0),($235|0),($56|0),($57|0))|0);
 $237 = tempRet0;
 $238 = (_i64Add(($236|0),($237|0),($178|0),($179|0))|0);
 $239 = tempRet0;
 $240 = (_i64Add(($238|0),($239|0),($174|0),($175|0))|0);
 $241 = tempRet0;
 $242 = (_i64Add(($240|0),($241|0),($232|0),($233|0))|0);
 $243 = tempRet0;
 $244 = (_bitshift64Shl(($232|0),($233|0),26)|0);
 $245 = tempRet0;
 $246 = (_i64Subtract(($210|0),($211|0),($244|0),($245|0))|0);
 $247 = tempRet0;
 $248 = (_i64Add(($224|0),($225|0),16777216,0)|0);
 $249 = tempRet0;
 $250 = (_bitshift64Ashr(($248|0),($249|0),25)|0);
 $251 = tempRet0;
 $252 = (_i64Add(($198|0),($199|0),($166|0),($167|0))|0);
 $253 = tempRet0;
 $254 = (_i64Add(($252|0),($253|0),($160|0),($161|0))|0);
 $255 = tempRet0;
 $256 = (_i64Add(($254|0),($255|0),($150|0),($151|0))|0);
 $257 = tempRet0;
 $258 = (_i64Add(($256|0),($257|0),($136|0),($137|0))|0);
 $259 = tempRet0;
 $260 = (_i64Add(($258|0),($259|0),($250|0),($251|0))|0);
 $261 = tempRet0;
 $262 = (_bitshift64Shl(($250|0),($251|0),25)|0);
 $263 = tempRet0;
 $264 = (_i64Subtract(($224|0),($225|0),($262|0),($263|0))|0);
 $265 = tempRet0;
 $266 = (_i64Add(($242|0),($243|0),16777216,0)|0);
 $267 = tempRet0;
 $268 = (_bitshift64Ashr(($266|0),($267|0),25)|0);
 $269 = tempRet0;
 $270 = (_i64Add(($122|0),($123|0),($108|0),($109|0))|0);
 $271 = tempRet0;
 $272 = (_i64Add(($270|0),($271|0),($88|0),($89|0))|0);
 $273 = tempRet0;
 $274 = (_i64Add(($272|0),($273|0),($60|0),($61|0))|0);
 $275 = tempRet0;
 $276 = (_i64Add(($274|0),($275|0),($182|0),($183|0))|0);
 $277 = tempRet0;
 $278 = (_i64Add(($276|0),($277|0),($180|0),($181|0))|0);
 $279 = tempRet0;
 $280 = (_i64Add(($278|0),($279|0),($268|0),($269|0))|0);
 $281 = tempRet0;
 $282 = (_bitshift64Shl(($268|0),($269|0),25)|0);
 $283 = tempRet0;
 $284 = (_i64Subtract(($242|0),($243|0),($282|0),($283|0))|0);
 $285 = tempRet0;
 $286 = (_i64Add(($260|0),($261|0),33554432,0)|0);
 $287 = tempRet0;
 $288 = (_bitshift64Ashr(($286|0),($287|0),26)|0);
 $289 = tempRet0;
 $290 = (_i64Add(($200|0),($201|0),($168|0),($169|0))|0);
 $291 = tempRet0;
 $292 = (_i64Add(($290|0),($291|0),($162|0),($163|0))|0);
 $293 = tempRet0;
 $294 = (_i64Add(($292|0),($293|0),($152|0),($153|0))|0);
 $295 = tempRet0;
 $296 = (_i64Add(($294|0),($295|0),($288|0),($289|0))|0);
 $297 = tempRet0;
 $298 = (_bitshift64Shl(($288|0),($289|0),26)|0);
 $299 = tempRet0;
 $300 = (_i64Subtract(($260|0),($261|0),($298|0),($299|0))|0);
 $301 = tempRet0;
 $302 = (_i64Add(($280|0),($281|0),33554432,0)|0);
 $303 = tempRet0;
 $304 = (_bitshift64Ashr(($302|0),($303|0),26)|0);
 $305 = tempRet0;
 $306 = (_i64Add(($110|0),($111|0),($124|0),($125|0))|0);
 $307 = tempRet0;
 $308 = (_i64Add(($306|0),($307|0),($90|0),($91|0))|0);
 $309 = tempRet0;
 $310 = (_i64Add(($308|0),($309|0),($64|0),($65|0))|0);
 $311 = tempRet0;
 $312 = (_i64Add(($310|0),($311|0),($184|0),($185|0))|0);
 $313 = tempRet0;
 $314 = (_i64Add(($312|0),($313|0),($304|0),($305|0))|0);
 $315 = tempRet0;
 $316 = (_bitshift64Shl(($304|0),($305|0),26)|0);
 $317 = tempRet0;
 $318 = (_i64Subtract(($280|0),($281|0),($316|0),($317|0))|0);
 $319 = tempRet0;
 $320 = (_i64Add(($296|0),($297|0),16777216,0)|0);
 $321 = tempRet0;
 $322 = (_bitshift64Ashr(($320|0),($321|0),25)|0);
 $323 = tempRet0;
 $324 = (_i64Add(($322|0),($323|0),($246|0),($247|0))|0);
 $325 = tempRet0;
 $326 = (_bitshift64Shl(($322|0),($323|0),25)|0);
 $327 = tempRet0;
 $328 = (_i64Subtract(($296|0),($297|0),($326|0),($327|0))|0);
 $329 = tempRet0;
 $330 = (_i64Add(($314|0),($315|0),16777216,0)|0);
 $331 = tempRet0;
 $332 = (_bitshift64Ashr(($330|0),($331|0),25)|0);
 $333 = tempRet0;
 $334 = (_i64Add(($112|0),($113|0),($138|0),($139|0))|0);
 $335 = tempRet0;
 $336 = (_i64Add(($334|0),($335|0),($126|0),($127|0))|0);
 $337 = tempRet0;
 $338 = (_i64Add(($336|0),($337|0),($94|0),($95|0))|0);
 $339 = tempRet0;
 $340 = (_i64Add(($338|0),($339|0),($68|0),($69|0))|0);
 $341 = tempRet0;
 $342 = (_i64Add(($340|0),($341|0),($186|0),($187|0))|0);
 $343 = tempRet0;
 $344 = (_i64Add(($342|0),($343|0),($332|0),($333|0))|0);
 $345 = tempRet0;
 $346 = (_bitshift64Shl(($332|0),($333|0),25)|0);
 $347 = tempRet0;
 $348 = (_i64Subtract(($314|0),($315|0),($346|0),($347|0))|0);
 $349 = tempRet0;
 $350 = (_i64Add(($324|0),($325|0),33554432,0)|0);
 $351 = tempRet0;
 $352 = (_bitshift64Ashr(($350|0),($351|0),26)|0);
 $353 = tempRet0;
 $354 = (_i64Add(($284|0),($285|0),($352|0),($353|0))|0);
 $355 = tempRet0;
 $356 = (_bitshift64Shl(($352|0),($353|0),26)|0);
 $357 = tempRet0;
 $358 = (_i64Subtract(($324|0),($325|0),($356|0),($357|0))|0);
 $359 = tempRet0;
 $360 = (_i64Add(($344|0),($345|0),33554432,0)|0);
 $361 = tempRet0;
 $362 = (_bitshift64Ashr(($360|0),($361|0),26)|0);
 $363 = tempRet0;
 $364 = (_i64Add(($128|0),($129|0),($142|0),($143|0))|0);
 $365 = tempRet0;
 $366 = (_i64Add(($364|0),($365|0),($114|0),($115|0))|0);
 $367 = tempRet0;
 $368 = (_i64Add(($366|0),($367|0),($96|0),($97|0))|0);
 $369 = tempRet0;
 $370 = (_i64Add(($368|0),($369|0),($72|0),($73|0))|0);
 $371 = tempRet0;
 $372 = (_i64Add(($370|0),($371|0),($362|0),($363|0))|0);
 $373 = tempRet0;
 $374 = (_bitshift64Shl(($362|0),($363|0),26)|0);
 $375 = tempRet0;
 $376 = (_i64Subtract(($344|0),($345|0),($374|0),($375|0))|0);
 $377 = tempRet0;
 $378 = (_i64Add(($372|0),($373|0),16777216,0)|0);
 $379 = tempRet0;
 $380 = (_bitshift64Ashr(($378|0),($379|0),25)|0);
 $381 = tempRet0;
 $382 = (___muldi3(($380|0),($381|0),19,0)|0);
 $383 = tempRet0;
 $384 = (_i64Add(($382|0),($383|0),($228|0),($229|0))|0);
 $385 = tempRet0;
 $386 = (_bitshift64Shl(($380|0),($381|0),25)|0);
 $387 = tempRet0;
 $388 = (_i64Subtract(($372|0),($373|0),($386|0),($387|0))|0);
 $389 = tempRet0;
 $390 = (_i64Add(($384|0),($385|0),33554432,0)|0);
 $391 = tempRet0;
 $392 = (_bitshift64Ashr(($390|0),($391|0),26)|0);
 $393 = tempRet0;
 $394 = (_i64Add(($264|0),($265|0),($392|0),($393|0))|0);
 $395 = tempRet0;
 $396 = (_bitshift64Shl(($392|0),($393|0),26)|0);
 $397 = tempRet0;
 $398 = (_i64Subtract(($384|0),($385|0),($396|0),($397|0))|0);
 $399 = tempRet0;
 HEAP32[$h>>2] = $398;
 $400 = ((($h)) + 4|0);
 HEAP32[$400>>2] = $394;
 $401 = ((($h)) + 8|0);
 HEAP32[$401>>2] = $300;
 $402 = ((($h)) + 12|0);
 HEAP32[$402>>2] = $328;
 $403 = ((($h)) + 16|0);
 HEAP32[$403>>2] = $358;
 $404 = ((($h)) + 20|0);
 HEAP32[$404>>2] = $354;
 $405 = ((($h)) + 24|0);
 HEAP32[$405>>2] = $318;
 $406 = ((($h)) + 28|0);
 HEAP32[$406>>2] = $348;
 $407 = ((($h)) + 32|0);
 HEAP32[$407>>2] = $376;
 $408 = ((($h)) + 36|0);
 HEAP32[$408>>2] = $388;
 return;
}
function _fe_mul($h,$f,$g) {
 $h = $h|0;
 $f = $f|0;
 $g = $g|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0;
 var $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0;
 var $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0;
 var $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0;
 var $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0;
 var $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0;
 var $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0;
 var $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0;
 var $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0;
 var $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0;
 var $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0;
 var $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0;
 var $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0;
 var $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0;
 var $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0;
 var $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0;
 var $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0;
 var $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0;
 var $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0;
 var $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $1 = ((($f)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($f)) + 8|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ((($f)) + 12|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ((($f)) + 16|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = ((($f)) + 20|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ((($f)) + 24|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = ((($f)) + 28|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = ((($f)) + 32|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = ((($f)) + 36|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = HEAP32[$g>>2]|0;
 $20 = ((($g)) + 4|0);
 $21 = HEAP32[$20>>2]|0;
 $22 = ((($g)) + 8|0);
 $23 = HEAP32[$22>>2]|0;
 $24 = ((($g)) + 12|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = ((($g)) + 16|0);
 $27 = HEAP32[$26>>2]|0;
 $28 = ((($g)) + 20|0);
 $29 = HEAP32[$28>>2]|0;
 $30 = ((($g)) + 24|0);
 $31 = HEAP32[$30>>2]|0;
 $32 = ((($g)) + 28|0);
 $33 = HEAP32[$32>>2]|0;
 $34 = ((($g)) + 32|0);
 $35 = HEAP32[$34>>2]|0;
 $36 = ((($g)) + 36|0);
 $37 = HEAP32[$36>>2]|0;
 $38 = ($21*19)|0;
 $39 = ($23*19)|0;
 $40 = ($25*19)|0;
 $41 = ($27*19)|0;
 $42 = ($29*19)|0;
 $43 = ($31*19)|0;
 $44 = ($33*19)|0;
 $45 = ($35*19)|0;
 $46 = ($37*19)|0;
 $47 = $2 << 1;
 $48 = $6 << 1;
 $49 = $10 << 1;
 $50 = $14 << 1;
 $51 = $18 << 1;
 $52 = ($0|0)<(0);
 $53 = $52 << 31 >> 31;
 $54 = ($19|0)<(0);
 $55 = $54 << 31 >> 31;
 $56 = (___muldi3(($19|0),($55|0),($0|0),($53|0))|0);
 $57 = tempRet0;
 $58 = ($21|0)<(0);
 $59 = $58 << 31 >> 31;
 $60 = (___muldi3(($21|0),($59|0),($0|0),($53|0))|0);
 $61 = tempRet0;
 $62 = ($23|0)<(0);
 $63 = $62 << 31 >> 31;
 $64 = (___muldi3(($23|0),($63|0),($0|0),($53|0))|0);
 $65 = tempRet0;
 $66 = ($25|0)<(0);
 $67 = $66 << 31 >> 31;
 $68 = (___muldi3(($25|0),($67|0),($0|0),($53|0))|0);
 $69 = tempRet0;
 $70 = ($27|0)<(0);
 $71 = $70 << 31 >> 31;
 $72 = (___muldi3(($27|0),($71|0),($0|0),($53|0))|0);
 $73 = tempRet0;
 $74 = ($29|0)<(0);
 $75 = $74 << 31 >> 31;
 $76 = (___muldi3(($29|0),($75|0),($0|0),($53|0))|0);
 $77 = tempRet0;
 $78 = ($31|0)<(0);
 $79 = $78 << 31 >> 31;
 $80 = (___muldi3(($31|0),($79|0),($0|0),($53|0))|0);
 $81 = tempRet0;
 $82 = ($33|0)<(0);
 $83 = $82 << 31 >> 31;
 $84 = (___muldi3(($33|0),($83|0),($0|0),($53|0))|0);
 $85 = tempRet0;
 $86 = ($35|0)<(0);
 $87 = $86 << 31 >> 31;
 $88 = (___muldi3(($35|0),($87|0),($0|0),($53|0))|0);
 $89 = tempRet0;
 $90 = ($37|0)<(0);
 $91 = $90 << 31 >> 31;
 $92 = (___muldi3(($37|0),($91|0),($0|0),($53|0))|0);
 $93 = tempRet0;
 $94 = ($2|0)<(0);
 $95 = $94 << 31 >> 31;
 $96 = (___muldi3(($19|0),($55|0),($2|0),($95|0))|0);
 $97 = tempRet0;
 $98 = ($47|0)<(0);
 $99 = $98 << 31 >> 31;
 $100 = (___muldi3(($21|0),($59|0),($47|0),($99|0))|0);
 $101 = tempRet0;
 $102 = (___muldi3(($23|0),($63|0),($2|0),($95|0))|0);
 $103 = tempRet0;
 $104 = (___muldi3(($25|0),($67|0),($47|0),($99|0))|0);
 $105 = tempRet0;
 $106 = (___muldi3(($27|0),($71|0),($2|0),($95|0))|0);
 $107 = tempRet0;
 $108 = (___muldi3(($29|0),($75|0),($47|0),($99|0))|0);
 $109 = tempRet0;
 $110 = (___muldi3(($31|0),($79|0),($2|0),($95|0))|0);
 $111 = tempRet0;
 $112 = (___muldi3(($33|0),($83|0),($47|0),($99|0))|0);
 $113 = tempRet0;
 $114 = (___muldi3(($35|0),($87|0),($2|0),($95|0))|0);
 $115 = tempRet0;
 $116 = ($46|0)<(0);
 $117 = $116 << 31 >> 31;
 $118 = (___muldi3(($46|0),($117|0),($47|0),($99|0))|0);
 $119 = tempRet0;
 $120 = ($4|0)<(0);
 $121 = $120 << 31 >> 31;
 $122 = (___muldi3(($19|0),($55|0),($4|0),($121|0))|0);
 $123 = tempRet0;
 $124 = (___muldi3(($21|0),($59|0),($4|0),($121|0))|0);
 $125 = tempRet0;
 $126 = (___muldi3(($23|0),($63|0),($4|0),($121|0))|0);
 $127 = tempRet0;
 $128 = (___muldi3(($25|0),($67|0),($4|0),($121|0))|0);
 $129 = tempRet0;
 $130 = (___muldi3(($27|0),($71|0),($4|0),($121|0))|0);
 $131 = tempRet0;
 $132 = (___muldi3(($29|0),($75|0),($4|0),($121|0))|0);
 $133 = tempRet0;
 $134 = (___muldi3(($31|0),($79|0),($4|0),($121|0))|0);
 $135 = tempRet0;
 $136 = (___muldi3(($33|0),($83|0),($4|0),($121|0))|0);
 $137 = tempRet0;
 $138 = ($45|0)<(0);
 $139 = $138 << 31 >> 31;
 $140 = (___muldi3(($45|0),($139|0),($4|0),($121|0))|0);
 $141 = tempRet0;
 $142 = (___muldi3(($46|0),($117|0),($4|0),($121|0))|0);
 $143 = tempRet0;
 $144 = ($6|0)<(0);
 $145 = $144 << 31 >> 31;
 $146 = (___muldi3(($19|0),($55|0),($6|0),($145|0))|0);
 $147 = tempRet0;
 $148 = ($48|0)<(0);
 $149 = $148 << 31 >> 31;
 $150 = (___muldi3(($21|0),($59|0),($48|0),($149|0))|0);
 $151 = tempRet0;
 $152 = (___muldi3(($23|0),($63|0),($6|0),($145|0))|0);
 $153 = tempRet0;
 $154 = (___muldi3(($25|0),($67|0),($48|0),($149|0))|0);
 $155 = tempRet0;
 $156 = (___muldi3(($27|0),($71|0),($6|0),($145|0))|0);
 $157 = tempRet0;
 $158 = (___muldi3(($29|0),($75|0),($48|0),($149|0))|0);
 $159 = tempRet0;
 $160 = (___muldi3(($31|0),($79|0),($6|0),($145|0))|0);
 $161 = tempRet0;
 $162 = ($44|0)<(0);
 $163 = $162 << 31 >> 31;
 $164 = (___muldi3(($44|0),($163|0),($48|0),($149|0))|0);
 $165 = tempRet0;
 $166 = (___muldi3(($45|0),($139|0),($6|0),($145|0))|0);
 $167 = tempRet0;
 $168 = (___muldi3(($46|0),($117|0),($48|0),($149|0))|0);
 $169 = tempRet0;
 $170 = ($8|0)<(0);
 $171 = $170 << 31 >> 31;
 $172 = (___muldi3(($19|0),($55|0),($8|0),($171|0))|0);
 $173 = tempRet0;
 $174 = (___muldi3(($21|0),($59|0),($8|0),($171|0))|0);
 $175 = tempRet0;
 $176 = (___muldi3(($23|0),($63|0),($8|0),($171|0))|0);
 $177 = tempRet0;
 $178 = (___muldi3(($25|0),($67|0),($8|0),($171|0))|0);
 $179 = tempRet0;
 $180 = (___muldi3(($27|0),($71|0),($8|0),($171|0))|0);
 $181 = tempRet0;
 $182 = (___muldi3(($29|0),($75|0),($8|0),($171|0))|0);
 $183 = tempRet0;
 $184 = ($43|0)<(0);
 $185 = $184 << 31 >> 31;
 $186 = (___muldi3(($43|0),($185|0),($8|0),($171|0))|0);
 $187 = tempRet0;
 $188 = (___muldi3(($44|0),($163|0),($8|0),($171|0))|0);
 $189 = tempRet0;
 $190 = (___muldi3(($45|0),($139|0),($8|0),($171|0))|0);
 $191 = tempRet0;
 $192 = (___muldi3(($46|0),($117|0),($8|0),($171|0))|0);
 $193 = tempRet0;
 $194 = ($10|0)<(0);
 $195 = $194 << 31 >> 31;
 $196 = (___muldi3(($19|0),($55|0),($10|0),($195|0))|0);
 $197 = tempRet0;
 $198 = ($49|0)<(0);
 $199 = $198 << 31 >> 31;
 $200 = (___muldi3(($21|0),($59|0),($49|0),($199|0))|0);
 $201 = tempRet0;
 $202 = (___muldi3(($23|0),($63|0),($10|0),($195|0))|0);
 $203 = tempRet0;
 $204 = (___muldi3(($25|0),($67|0),($49|0),($199|0))|0);
 $205 = tempRet0;
 $206 = (___muldi3(($27|0),($71|0),($10|0),($195|0))|0);
 $207 = tempRet0;
 $208 = ($42|0)<(0);
 $209 = $208 << 31 >> 31;
 $210 = (___muldi3(($42|0),($209|0),($49|0),($199|0))|0);
 $211 = tempRet0;
 $212 = (___muldi3(($43|0),($185|0),($10|0),($195|0))|0);
 $213 = tempRet0;
 $214 = (___muldi3(($44|0),($163|0),($49|0),($199|0))|0);
 $215 = tempRet0;
 $216 = (___muldi3(($45|0),($139|0),($10|0),($195|0))|0);
 $217 = tempRet0;
 $218 = (___muldi3(($46|0),($117|0),($49|0),($199|0))|0);
 $219 = tempRet0;
 $220 = ($12|0)<(0);
 $221 = $220 << 31 >> 31;
 $222 = (___muldi3(($19|0),($55|0),($12|0),($221|0))|0);
 $223 = tempRet0;
 $224 = (___muldi3(($21|0),($59|0),($12|0),($221|0))|0);
 $225 = tempRet0;
 $226 = (___muldi3(($23|0),($63|0),($12|0),($221|0))|0);
 $227 = tempRet0;
 $228 = (___muldi3(($25|0),($67|0),($12|0),($221|0))|0);
 $229 = tempRet0;
 $230 = ($41|0)<(0);
 $231 = $230 << 31 >> 31;
 $232 = (___muldi3(($41|0),($231|0),($12|0),($221|0))|0);
 $233 = tempRet0;
 $234 = (___muldi3(($42|0),($209|0),($12|0),($221|0))|0);
 $235 = tempRet0;
 $236 = (___muldi3(($43|0),($185|0),($12|0),($221|0))|0);
 $237 = tempRet0;
 $238 = (___muldi3(($44|0),($163|0),($12|0),($221|0))|0);
 $239 = tempRet0;
 $240 = (___muldi3(($45|0),($139|0),($12|0),($221|0))|0);
 $241 = tempRet0;
 $242 = (___muldi3(($46|0),($117|0),($12|0),($221|0))|0);
 $243 = tempRet0;
 $244 = ($14|0)<(0);
 $245 = $244 << 31 >> 31;
 $246 = (___muldi3(($19|0),($55|0),($14|0),($245|0))|0);
 $247 = tempRet0;
 $248 = ($50|0)<(0);
 $249 = $248 << 31 >> 31;
 $250 = (___muldi3(($21|0),($59|0),($50|0),($249|0))|0);
 $251 = tempRet0;
 $252 = (___muldi3(($23|0),($63|0),($14|0),($245|0))|0);
 $253 = tempRet0;
 $254 = ($40|0)<(0);
 $255 = $254 << 31 >> 31;
 $256 = (___muldi3(($40|0),($255|0),($50|0),($249|0))|0);
 $257 = tempRet0;
 $258 = (___muldi3(($41|0),($231|0),($14|0),($245|0))|0);
 $259 = tempRet0;
 $260 = (___muldi3(($42|0),($209|0),($50|0),($249|0))|0);
 $261 = tempRet0;
 $262 = (___muldi3(($43|0),($185|0),($14|0),($245|0))|0);
 $263 = tempRet0;
 $264 = (___muldi3(($44|0),($163|0),($50|0),($249|0))|0);
 $265 = tempRet0;
 $266 = (___muldi3(($45|0),($139|0),($14|0),($245|0))|0);
 $267 = tempRet0;
 $268 = (___muldi3(($46|0),($117|0),($50|0),($249|0))|0);
 $269 = tempRet0;
 $270 = ($16|0)<(0);
 $271 = $270 << 31 >> 31;
 $272 = (___muldi3(($19|0),($55|0),($16|0),($271|0))|0);
 $273 = tempRet0;
 $274 = (___muldi3(($21|0),($59|0),($16|0),($271|0))|0);
 $275 = tempRet0;
 $276 = ($39|0)<(0);
 $277 = $276 << 31 >> 31;
 $278 = (___muldi3(($39|0),($277|0),($16|0),($271|0))|0);
 $279 = tempRet0;
 $280 = (___muldi3(($40|0),($255|0),($16|0),($271|0))|0);
 $281 = tempRet0;
 $282 = (___muldi3(($41|0),($231|0),($16|0),($271|0))|0);
 $283 = tempRet0;
 $284 = (___muldi3(($42|0),($209|0),($16|0),($271|0))|0);
 $285 = tempRet0;
 $286 = (___muldi3(($43|0),($185|0),($16|0),($271|0))|0);
 $287 = tempRet0;
 $288 = (___muldi3(($44|0),($163|0),($16|0),($271|0))|0);
 $289 = tempRet0;
 $290 = (___muldi3(($45|0),($139|0),($16|0),($271|0))|0);
 $291 = tempRet0;
 $292 = (___muldi3(($46|0),($117|0),($16|0),($271|0))|0);
 $293 = tempRet0;
 $294 = ($18|0)<(0);
 $295 = $294 << 31 >> 31;
 $296 = (___muldi3(($19|0),($55|0),($18|0),($295|0))|0);
 $297 = tempRet0;
 $298 = ($51|0)<(0);
 $299 = $298 << 31 >> 31;
 $300 = ($38|0)<(0);
 $301 = $300 << 31 >> 31;
 $302 = (___muldi3(($38|0),($301|0),($51|0),($299|0))|0);
 $303 = tempRet0;
 $304 = (___muldi3(($39|0),($277|0),($18|0),($295|0))|0);
 $305 = tempRet0;
 $306 = (___muldi3(($40|0),($255|0),($51|0),($299|0))|0);
 $307 = tempRet0;
 $308 = (___muldi3(($41|0),($231|0),($18|0),($295|0))|0);
 $309 = tempRet0;
 $310 = (___muldi3(($42|0),($209|0),($51|0),($299|0))|0);
 $311 = tempRet0;
 $312 = (___muldi3(($43|0),($185|0),($18|0),($295|0))|0);
 $313 = tempRet0;
 $314 = (___muldi3(($44|0),($163|0),($51|0),($299|0))|0);
 $315 = tempRet0;
 $316 = (___muldi3(($45|0),($139|0),($18|0),($295|0))|0);
 $317 = tempRet0;
 $318 = (___muldi3(($46|0),($117|0),($51|0),($299|0))|0);
 $319 = tempRet0;
 $320 = (_i64Add(($302|0),($303|0),($56|0),($57|0))|0);
 $321 = tempRet0;
 $322 = (_i64Add(($320|0),($321|0),($278|0),($279|0))|0);
 $323 = tempRet0;
 $324 = (_i64Add(($322|0),($323|0),($256|0),($257|0))|0);
 $325 = tempRet0;
 $326 = (_i64Add(($324|0),($325|0),($232|0),($233|0))|0);
 $327 = tempRet0;
 $328 = (_i64Add(($326|0),($327|0),($210|0),($211|0))|0);
 $329 = tempRet0;
 $330 = (_i64Add(($328|0),($329|0),($186|0),($187|0))|0);
 $331 = tempRet0;
 $332 = (_i64Add(($330|0),($331|0),($164|0),($165|0))|0);
 $333 = tempRet0;
 $334 = (_i64Add(($332|0),($333|0),($140|0),($141|0))|0);
 $335 = tempRet0;
 $336 = (_i64Add(($334|0),($335|0),($118|0),($119|0))|0);
 $337 = tempRet0;
 $338 = (_i64Add(($60|0),($61|0),($96|0),($97|0))|0);
 $339 = tempRet0;
 $340 = (_i64Add(($150|0),($151|0),($172|0),($173|0))|0);
 $341 = tempRet0;
 $342 = (_i64Add(($340|0),($341|0),($126|0),($127|0))|0);
 $343 = tempRet0;
 $344 = (_i64Add(($342|0),($343|0),($104|0),($105|0))|0);
 $345 = tempRet0;
 $346 = (_i64Add(($344|0),($345|0),($72|0),($73|0))|0);
 $347 = tempRet0;
 $348 = (_i64Add(($346|0),($347|0),($310|0),($311|0))|0);
 $349 = tempRet0;
 $350 = (_i64Add(($348|0),($349|0),($286|0),($287|0))|0);
 $351 = tempRet0;
 $352 = (_i64Add(($350|0),($351|0),($264|0),($265|0))|0);
 $353 = tempRet0;
 $354 = (_i64Add(($352|0),($353|0),($240|0),($241|0))|0);
 $355 = tempRet0;
 $356 = (_i64Add(($354|0),($355|0),($218|0),($219|0))|0);
 $357 = tempRet0;
 $358 = (_i64Add(($336|0),($337|0),33554432,0)|0);
 $359 = tempRet0;
 $360 = (_bitshift64Ashr(($358|0),($359|0),26)|0);
 $361 = tempRet0;
 $362 = (_i64Add(($338|0),($339|0),($304|0),($305|0))|0);
 $363 = tempRet0;
 $364 = (_i64Add(($362|0),($363|0),($280|0),($281|0))|0);
 $365 = tempRet0;
 $366 = (_i64Add(($364|0),($365|0),($258|0),($259|0))|0);
 $367 = tempRet0;
 $368 = (_i64Add(($366|0),($367|0),($234|0),($235|0))|0);
 $369 = tempRet0;
 $370 = (_i64Add(($368|0),($369|0),($212|0),($213|0))|0);
 $371 = tempRet0;
 $372 = (_i64Add(($370|0),($371|0),($188|0),($189|0))|0);
 $373 = tempRet0;
 $374 = (_i64Add(($372|0),($373|0),($166|0),($167|0))|0);
 $375 = tempRet0;
 $376 = (_i64Add(($374|0),($375|0),($142|0),($143|0))|0);
 $377 = tempRet0;
 $378 = (_i64Add(($376|0),($377|0),($360|0),($361|0))|0);
 $379 = tempRet0;
 $380 = (_bitshift64Shl(($360|0),($361|0),26)|0);
 $381 = tempRet0;
 $382 = (_i64Subtract(($336|0),($337|0),($380|0),($381|0))|0);
 $383 = tempRet0;
 $384 = (_i64Add(($356|0),($357|0),33554432,0)|0);
 $385 = tempRet0;
 $386 = (_bitshift64Ashr(($384|0),($385|0),26)|0);
 $387 = tempRet0;
 $388 = (_i64Add(($174|0),($175|0),($196|0),($197|0))|0);
 $389 = tempRet0;
 $390 = (_i64Add(($388|0),($389|0),($152|0),($153|0))|0);
 $391 = tempRet0;
 $392 = (_i64Add(($390|0),($391|0),($128|0),($129|0))|0);
 $393 = tempRet0;
 $394 = (_i64Add(($392|0),($393|0),($106|0),($107|0))|0);
 $395 = tempRet0;
 $396 = (_i64Add(($394|0),($395|0),($76|0),($77|0))|0);
 $397 = tempRet0;
 $398 = (_i64Add(($396|0),($397|0),($312|0),($313|0))|0);
 $399 = tempRet0;
 $400 = (_i64Add(($398|0),($399|0),($288|0),($289|0))|0);
 $401 = tempRet0;
 $402 = (_i64Add(($400|0),($401|0),($266|0),($267|0))|0);
 $403 = tempRet0;
 $404 = (_i64Add(($402|0),($403|0),($242|0),($243|0))|0);
 $405 = tempRet0;
 $406 = (_i64Add(($404|0),($405|0),($386|0),($387|0))|0);
 $407 = tempRet0;
 $408 = (_bitshift64Shl(($386|0),($387|0),26)|0);
 $409 = tempRet0;
 $410 = (_i64Subtract(($356|0),($357|0),($408|0),($409|0))|0);
 $411 = tempRet0;
 $412 = (_i64Add(($378|0),($379|0),16777216,0)|0);
 $413 = tempRet0;
 $414 = (_bitshift64Ashr(($412|0),($413|0),25)|0);
 $415 = tempRet0;
 $416 = (_i64Add(($100|0),($101|0),($122|0),($123|0))|0);
 $417 = tempRet0;
 $418 = (_i64Add(($416|0),($417|0),($64|0),($65|0))|0);
 $419 = tempRet0;
 $420 = (_i64Add(($418|0),($419|0),($306|0),($307|0))|0);
 $421 = tempRet0;
 $422 = (_i64Add(($420|0),($421|0),($282|0),($283|0))|0);
 $423 = tempRet0;
 $424 = (_i64Add(($422|0),($423|0),($260|0),($261|0))|0);
 $425 = tempRet0;
 $426 = (_i64Add(($424|0),($425|0),($236|0),($237|0))|0);
 $427 = tempRet0;
 $428 = (_i64Add(($426|0),($427|0),($214|0),($215|0))|0);
 $429 = tempRet0;
 $430 = (_i64Add(($428|0),($429|0),($190|0),($191|0))|0);
 $431 = tempRet0;
 $432 = (_i64Add(($430|0),($431|0),($168|0),($169|0))|0);
 $433 = tempRet0;
 $434 = (_i64Add(($432|0),($433|0),($414|0),($415|0))|0);
 $435 = tempRet0;
 $436 = (_bitshift64Shl(($414|0),($415|0),25)|0);
 $437 = tempRet0;
 $438 = (_i64Subtract(($378|0),($379|0),($436|0),($437|0))|0);
 $439 = tempRet0;
 $440 = (_i64Add(($406|0),($407|0),16777216,0)|0);
 $441 = tempRet0;
 $442 = (_bitshift64Ashr(($440|0),($441|0),25)|0);
 $443 = tempRet0;
 $444 = (_i64Add(($200|0),($201|0),($222|0),($223|0))|0);
 $445 = tempRet0;
 $446 = (_i64Add(($444|0),($445|0),($176|0),($177|0))|0);
 $447 = tempRet0;
 $448 = (_i64Add(($446|0),($447|0),($154|0),($155|0))|0);
 $449 = tempRet0;
 $450 = (_i64Add(($448|0),($449|0),($130|0),($131|0))|0);
 $451 = tempRet0;
 $452 = (_i64Add(($450|0),($451|0),($108|0),($109|0))|0);
 $453 = tempRet0;
 $454 = (_i64Add(($452|0),($453|0),($80|0),($81|0))|0);
 $455 = tempRet0;
 $456 = (_i64Add(($454|0),($455|0),($314|0),($315|0))|0);
 $457 = tempRet0;
 $458 = (_i64Add(($456|0),($457|0),($290|0),($291|0))|0);
 $459 = tempRet0;
 $460 = (_i64Add(($458|0),($459|0),($268|0),($269|0))|0);
 $461 = tempRet0;
 $462 = (_i64Add(($460|0),($461|0),($442|0),($443|0))|0);
 $463 = tempRet0;
 $464 = (_bitshift64Shl(($442|0),($443|0),25)|0);
 $465 = tempRet0;
 $466 = (_i64Subtract(($406|0),($407|0),($464|0),($465|0))|0);
 $467 = tempRet0;
 $468 = (_i64Add(($434|0),($435|0),33554432,0)|0);
 $469 = tempRet0;
 $470 = (_bitshift64Ashr(($468|0),($469|0),26)|0);
 $471 = tempRet0;
 $472 = (_i64Add(($124|0),($125|0),($146|0),($147|0))|0);
 $473 = tempRet0;
 $474 = (_i64Add(($472|0),($473|0),($102|0),($103|0))|0);
 $475 = tempRet0;
 $476 = (_i64Add(($474|0),($475|0),($68|0),($69|0))|0);
 $477 = tempRet0;
 $478 = (_i64Add(($476|0),($477|0),($308|0),($309|0))|0);
 $479 = tempRet0;
 $480 = (_i64Add(($478|0),($479|0),($284|0),($285|0))|0);
 $481 = tempRet0;
 $482 = (_i64Add(($480|0),($481|0),($262|0),($263|0))|0);
 $483 = tempRet0;
 $484 = (_i64Add(($482|0),($483|0),($238|0),($239|0))|0);
 $485 = tempRet0;
 $486 = (_i64Add(($484|0),($485|0),($216|0),($217|0))|0);
 $487 = tempRet0;
 $488 = (_i64Add(($486|0),($487|0),($192|0),($193|0))|0);
 $489 = tempRet0;
 $490 = (_i64Add(($488|0),($489|0),($470|0),($471|0))|0);
 $491 = tempRet0;
 $492 = (_bitshift64Shl(($470|0),($471|0),26)|0);
 $493 = tempRet0;
 $494 = (_i64Subtract(($434|0),($435|0),($492|0),($493|0))|0);
 $495 = tempRet0;
 $496 = (_i64Add(($462|0),($463|0),33554432,0)|0);
 $497 = tempRet0;
 $498 = (_bitshift64Ashr(($496|0),($497|0),26)|0);
 $499 = tempRet0;
 $500 = (_i64Add(($224|0),($225|0),($246|0),($247|0))|0);
 $501 = tempRet0;
 $502 = (_i64Add(($500|0),($501|0),($202|0),($203|0))|0);
 $503 = tempRet0;
 $504 = (_i64Add(($502|0),($503|0),($178|0),($179|0))|0);
 $505 = tempRet0;
 $506 = (_i64Add(($504|0),($505|0),($156|0),($157|0))|0);
 $507 = tempRet0;
 $508 = (_i64Add(($506|0),($507|0),($132|0),($133|0))|0);
 $509 = tempRet0;
 $510 = (_i64Add(($508|0),($509|0),($110|0),($111|0))|0);
 $511 = tempRet0;
 $512 = (_i64Add(($510|0),($511|0),($84|0),($85|0))|0);
 $513 = tempRet0;
 $514 = (_i64Add(($512|0),($513|0),($316|0),($317|0))|0);
 $515 = tempRet0;
 $516 = (_i64Add(($514|0),($515|0),($292|0),($293|0))|0);
 $517 = tempRet0;
 $518 = (_i64Add(($516|0),($517|0),($498|0),($499|0))|0);
 $519 = tempRet0;
 $520 = (_bitshift64Shl(($498|0),($499|0),26)|0);
 $521 = tempRet0;
 $522 = (_i64Subtract(($462|0),($463|0),($520|0),($521|0))|0);
 $523 = tempRet0;
 $524 = (_i64Add(($490|0),($491|0),16777216,0)|0);
 $525 = tempRet0;
 $526 = (_bitshift64Ashr(($524|0),($525|0),25)|0);
 $527 = tempRet0;
 $528 = (_i64Add(($526|0),($527|0),($410|0),($411|0))|0);
 $529 = tempRet0;
 $530 = (_bitshift64Shl(($526|0),($527|0),25)|0);
 $531 = tempRet0;
 $532 = (_i64Subtract(($490|0),($491|0),($530|0),($531|0))|0);
 $533 = tempRet0;
 $534 = (_i64Add(($518|0),($519|0),16777216,0)|0);
 $535 = tempRet0;
 $536 = (_bitshift64Ashr(($534|0),($535|0),25)|0);
 $537 = tempRet0;
 $538 = (_i64Add(($250|0),($251|0),($272|0),($273|0))|0);
 $539 = tempRet0;
 $540 = (_i64Add(($538|0),($539|0),($226|0),($227|0))|0);
 $541 = tempRet0;
 $542 = (_i64Add(($540|0),($541|0),($204|0),($205|0))|0);
 $543 = tempRet0;
 $544 = (_i64Add(($542|0),($543|0),($180|0),($181|0))|0);
 $545 = tempRet0;
 $546 = (_i64Add(($544|0),($545|0),($158|0),($159|0))|0);
 $547 = tempRet0;
 $548 = (_i64Add(($546|0),($547|0),($134|0),($135|0))|0);
 $549 = tempRet0;
 $550 = (_i64Add(($548|0),($549|0),($112|0),($113|0))|0);
 $551 = tempRet0;
 $552 = (_i64Add(($550|0),($551|0),($88|0),($89|0))|0);
 $553 = tempRet0;
 $554 = (_i64Add(($552|0),($553|0),($318|0),($319|0))|0);
 $555 = tempRet0;
 $556 = (_i64Add(($554|0),($555|0),($536|0),($537|0))|0);
 $557 = tempRet0;
 $558 = (_bitshift64Shl(($536|0),($537|0),25)|0);
 $559 = tempRet0;
 $560 = (_i64Subtract(($518|0),($519|0),($558|0),($559|0))|0);
 $561 = tempRet0;
 $562 = (_i64Add(($528|0),($529|0),33554432,0)|0);
 $563 = tempRet0;
 $564 = (_bitshift64Ashr(($562|0),($563|0),26)|0);
 $565 = tempRet0;
 $566 = (_i64Add(($466|0),($467|0),($564|0),($565|0))|0);
 $567 = tempRet0;
 $568 = (_bitshift64Shl(($564|0),($565|0),26)|0);
 $569 = tempRet0;
 $570 = (_i64Subtract(($528|0),($529|0),($568|0),($569|0))|0);
 $571 = tempRet0;
 $572 = (_i64Add(($556|0),($557|0),33554432,0)|0);
 $573 = tempRet0;
 $574 = (_bitshift64Ashr(($572|0),($573|0),26)|0);
 $575 = tempRet0;
 $576 = (_i64Add(($274|0),($275|0),($296|0),($297|0))|0);
 $577 = tempRet0;
 $578 = (_i64Add(($576|0),($577|0),($252|0),($253|0))|0);
 $579 = tempRet0;
 $580 = (_i64Add(($578|0),($579|0),($228|0),($229|0))|0);
 $581 = tempRet0;
 $582 = (_i64Add(($580|0),($581|0),($206|0),($207|0))|0);
 $583 = tempRet0;
 $584 = (_i64Add(($582|0),($583|0),($182|0),($183|0))|0);
 $585 = tempRet0;
 $586 = (_i64Add(($584|0),($585|0),($160|0),($161|0))|0);
 $587 = tempRet0;
 $588 = (_i64Add(($586|0),($587|0),($136|0),($137|0))|0);
 $589 = tempRet0;
 $590 = (_i64Add(($588|0),($589|0),($114|0),($115|0))|0);
 $591 = tempRet0;
 $592 = (_i64Add(($590|0),($591|0),($92|0),($93|0))|0);
 $593 = tempRet0;
 $594 = (_i64Add(($592|0),($593|0),($574|0),($575|0))|0);
 $595 = tempRet0;
 $596 = (_bitshift64Shl(($574|0),($575|0),26)|0);
 $597 = tempRet0;
 $598 = (_i64Subtract(($556|0),($557|0),($596|0),($597|0))|0);
 $599 = tempRet0;
 $600 = (_i64Add(($594|0),($595|0),16777216,0)|0);
 $601 = tempRet0;
 $602 = (_bitshift64Ashr(($600|0),($601|0),25)|0);
 $603 = tempRet0;
 $604 = (___muldi3(($602|0),($603|0),19,0)|0);
 $605 = tempRet0;
 $606 = (_i64Add(($604|0),($605|0),($382|0),($383|0))|0);
 $607 = tempRet0;
 $608 = (_bitshift64Shl(($602|0),($603|0),25)|0);
 $609 = tempRet0;
 $610 = (_i64Subtract(($594|0),($595|0),($608|0),($609|0))|0);
 $611 = tempRet0;
 $612 = (_i64Add(($606|0),($607|0),33554432,0)|0);
 $613 = tempRet0;
 $614 = (_bitshift64Ashr(($612|0),($613|0),26)|0);
 $615 = tempRet0;
 $616 = (_i64Add(($438|0),($439|0),($614|0),($615|0))|0);
 $617 = tempRet0;
 $618 = (_bitshift64Shl(($614|0),($615|0),26)|0);
 $619 = tempRet0;
 $620 = (_i64Subtract(($606|0),($607|0),($618|0),($619|0))|0);
 $621 = tempRet0;
 HEAP32[$h>>2] = $620;
 $622 = ((($h)) + 4|0);
 HEAP32[$622>>2] = $616;
 $623 = ((($h)) + 8|0);
 HEAP32[$623>>2] = $494;
 $624 = ((($h)) + 12|0);
 HEAP32[$624>>2] = $532;
 $625 = ((($h)) + 16|0);
 HEAP32[$625>>2] = $570;
 $626 = ((($h)) + 20|0);
 HEAP32[$626>>2] = $566;
 $627 = ((($h)) + 24|0);
 HEAP32[$627>>2] = $522;
 $628 = ((($h)) + 28|0);
 HEAP32[$628>>2] = $560;
 $629 = ((($h)) + 32|0);
 HEAP32[$629>>2] = $598;
 $630 = ((($h)) + 36|0);
 HEAP32[$630>>2] = $610;
 return;
}
function _fe_isnegative($f) {
 $f = $f|0;
 var $0 = 0, $1 = 0, $2 = 0, $s = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $s = sp;
 _fe_tobytes($s,$f);
 $0 = HEAP8[$s>>0]|0;
 $1 = $0&255;
 $2 = $1 & 1;
 STACKTOP = sp;return ($2|0);
}
function _fe_tobytes($s,$h) {
 $s = $s|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0;
 var $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0;
 var $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0;
 var $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0;
 var $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$h>>2]|0;
 $1 = ((($h)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($h)) + 8|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ((($h)) + 12|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ((($h)) + 16|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = ((($h)) + 20|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ((($h)) + 24|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = ((($h)) + 28|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = ((($h)) + 32|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = ((($h)) + 36|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = ($18*19)|0;
 $20 = (($19) + 16777216)|0;
 $21 = $20 >> 25;
 $22 = (($21) + ($0))|0;
 $23 = $22 >> 26;
 $24 = (($23) + ($2))|0;
 $25 = $24 >> 25;
 $26 = (($25) + ($4))|0;
 $27 = $26 >> 26;
 $28 = (($27) + ($6))|0;
 $29 = $28 >> 25;
 $30 = (($29) + ($8))|0;
 $31 = $30 >> 26;
 $32 = (($31) + ($10))|0;
 $33 = $32 >> 25;
 $34 = (($33) + ($12))|0;
 $35 = $34 >> 26;
 $36 = (($35) + ($14))|0;
 $37 = $36 >> 25;
 $38 = (($37) + ($16))|0;
 $39 = $38 >> 26;
 $40 = (($39) + ($18))|0;
 $41 = $40 >> 25;
 $42 = ($41*19)|0;
 $43 = (($42) + ($0))|0;
 $44 = $43 >> 26;
 $45 = (($44) + ($2))|0;
 $46 = $44 << 26;
 $47 = (($43) - ($46))|0;
 $48 = $45 >> 25;
 $49 = (($48) + ($4))|0;
 $50 = $48 << 25;
 $51 = (($45) - ($50))|0;
 $52 = $49 >> 26;
 $53 = (($52) + ($6))|0;
 $54 = $52 << 26;
 $55 = (($49) - ($54))|0;
 $56 = $53 >> 25;
 $57 = (($56) + ($8))|0;
 $58 = $56 << 25;
 $59 = (($53) - ($58))|0;
 $60 = $57 >> 26;
 $61 = (($60) + ($10))|0;
 $62 = $60 << 26;
 $63 = (($57) - ($62))|0;
 $64 = $61 >> 25;
 $65 = (($64) + ($12))|0;
 $66 = $64 << 25;
 $67 = (($61) - ($66))|0;
 $68 = $65 >> 26;
 $69 = (($68) + ($14))|0;
 $70 = $68 << 26;
 $71 = (($65) - ($70))|0;
 $72 = $69 >> 25;
 $73 = (($72) + ($16))|0;
 $74 = $72 << 25;
 $75 = (($69) - ($74))|0;
 $76 = $73 >> 26;
 $77 = (($76) + ($18))|0;
 $78 = $76 << 26;
 $79 = (($73) - ($78))|0;
 $80 = $77 & 33554431;
 $81 = $47&255;
 HEAP8[$s>>0] = $81;
 $82 = $47 >>> 8;
 $83 = $82&255;
 $84 = ((($s)) + 1|0);
 HEAP8[$84>>0] = $83;
 $85 = $47 >>> 16;
 $86 = $85&255;
 $87 = ((($s)) + 2|0);
 HEAP8[$87>>0] = $86;
 $88 = $47 >>> 24;
 $89 = $51 << 2;
 $90 = $89 | $88;
 $91 = $90&255;
 $92 = ((($s)) + 3|0);
 HEAP8[$92>>0] = $91;
 $93 = $51 >>> 6;
 $94 = $93&255;
 $95 = ((($s)) + 4|0);
 HEAP8[$95>>0] = $94;
 $96 = $51 >>> 14;
 $97 = $96&255;
 $98 = ((($s)) + 5|0);
 HEAP8[$98>>0] = $97;
 $99 = $51 >>> 22;
 $100 = $55 << 3;
 $101 = $100 | $99;
 $102 = $101&255;
 $103 = ((($s)) + 6|0);
 HEAP8[$103>>0] = $102;
 $104 = $55 >>> 5;
 $105 = $104&255;
 $106 = ((($s)) + 7|0);
 HEAP8[$106>>0] = $105;
 $107 = $55 >>> 13;
 $108 = $107&255;
 $109 = ((($s)) + 8|0);
 HEAP8[$109>>0] = $108;
 $110 = $55 >>> 21;
 $111 = $59 << 5;
 $112 = $111 | $110;
 $113 = $112&255;
 $114 = ((($s)) + 9|0);
 HEAP8[$114>>0] = $113;
 $115 = $59 >>> 3;
 $116 = $115&255;
 $117 = ((($s)) + 10|0);
 HEAP8[$117>>0] = $116;
 $118 = $59 >>> 11;
 $119 = $118&255;
 $120 = ((($s)) + 11|0);
 HEAP8[$120>>0] = $119;
 $121 = $59 >>> 19;
 $122 = $63 << 6;
 $123 = $122 | $121;
 $124 = $123&255;
 $125 = ((($s)) + 12|0);
 HEAP8[$125>>0] = $124;
 $126 = $63 >>> 2;
 $127 = $126&255;
 $128 = ((($s)) + 13|0);
 HEAP8[$128>>0] = $127;
 $129 = $63 >>> 10;
 $130 = $129&255;
 $131 = ((($s)) + 14|0);
 HEAP8[$131>>0] = $130;
 $132 = $63 >>> 18;
 $133 = $132&255;
 $134 = ((($s)) + 15|0);
 HEAP8[$134>>0] = $133;
 $135 = $67&255;
 $136 = ((($s)) + 16|0);
 HEAP8[$136>>0] = $135;
 $137 = $67 >>> 8;
 $138 = $137&255;
 $139 = ((($s)) + 17|0);
 HEAP8[$139>>0] = $138;
 $140 = $67 >>> 16;
 $141 = $140&255;
 $142 = ((($s)) + 18|0);
 HEAP8[$142>>0] = $141;
 $143 = $67 >>> 24;
 $144 = $71 << 1;
 $145 = $144 | $143;
 $146 = $145&255;
 $147 = ((($s)) + 19|0);
 HEAP8[$147>>0] = $146;
 $148 = $71 >>> 7;
 $149 = $148&255;
 $150 = ((($s)) + 20|0);
 HEAP8[$150>>0] = $149;
 $151 = $71 >>> 15;
 $152 = $151&255;
 $153 = ((($s)) + 21|0);
 HEAP8[$153>>0] = $152;
 $154 = $71 >>> 23;
 $155 = $75 << 3;
 $156 = $155 | $154;
 $157 = $156&255;
 $158 = ((($s)) + 22|0);
 HEAP8[$158>>0] = $157;
 $159 = $75 >>> 5;
 $160 = $159&255;
 $161 = ((($s)) + 23|0);
 HEAP8[$161>>0] = $160;
 $162 = $75 >>> 13;
 $163 = $162&255;
 $164 = ((($s)) + 24|0);
 HEAP8[$164>>0] = $163;
 $165 = $75 >>> 21;
 $166 = $79 << 4;
 $167 = $166 | $165;
 $168 = $167&255;
 $169 = ((($s)) + 25|0);
 HEAP8[$169>>0] = $168;
 $170 = $79 >>> 4;
 $171 = $170&255;
 $172 = ((($s)) + 26|0);
 HEAP8[$172>>0] = $171;
 $173 = $79 >>> 12;
 $174 = $173&255;
 $175 = ((($s)) + 27|0);
 HEAP8[$175>>0] = $174;
 $176 = $79 >>> 20;
 $177 = $80 << 6;
 $178 = $176 | $177;
 $179 = $178&255;
 $180 = ((($s)) + 28|0);
 HEAP8[$180>>0] = $179;
 $181 = $77 >>> 2;
 $182 = $181&255;
 $183 = ((($s)) + 29|0);
 HEAP8[$183>>0] = $182;
 $184 = $77 >>> 10;
 $185 = $184&255;
 $186 = ((($s)) + 30|0);
 HEAP8[$186>>0] = $185;
 $187 = $80 >>> 18;
 $188 = $187&255;
 $189 = ((($s)) + 31|0);
 HEAP8[$189>>0] = $188;
 return;
}
function _fe_isnonzero($f) {
 $f = $f|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $s = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $s = sp;
 _fe_tobytes($s,$f);
 $0 = HEAP8[$s>>0]|0;
 $1 = ((($s)) + 1|0);
 $2 = HEAP8[$1>>0]|0;
 $3 = $2 | $0;
 $4 = ((($s)) + 2|0);
 $5 = HEAP8[$4>>0]|0;
 $6 = $3 | $5;
 $7 = ((($s)) + 3|0);
 $8 = HEAP8[$7>>0]|0;
 $9 = $6 | $8;
 $10 = ((($s)) + 4|0);
 $11 = HEAP8[$10>>0]|0;
 $12 = $9 | $11;
 $13 = ((($s)) + 5|0);
 $14 = HEAP8[$13>>0]|0;
 $15 = $12 | $14;
 $16 = ((($s)) + 6|0);
 $17 = HEAP8[$16>>0]|0;
 $18 = $15 | $17;
 $19 = ((($s)) + 7|0);
 $20 = HEAP8[$19>>0]|0;
 $21 = $18 | $20;
 $22 = ((($s)) + 8|0);
 $23 = HEAP8[$22>>0]|0;
 $24 = $21 | $23;
 $25 = ((($s)) + 9|0);
 $26 = HEAP8[$25>>0]|0;
 $27 = $24 | $26;
 $28 = ((($s)) + 10|0);
 $29 = HEAP8[$28>>0]|0;
 $30 = $27 | $29;
 $31 = ((($s)) + 11|0);
 $32 = HEAP8[$31>>0]|0;
 $33 = $30 | $32;
 $34 = ((($s)) + 12|0);
 $35 = HEAP8[$34>>0]|0;
 $36 = $33 | $35;
 $37 = ((($s)) + 13|0);
 $38 = HEAP8[$37>>0]|0;
 $39 = $36 | $38;
 $40 = ((($s)) + 14|0);
 $41 = HEAP8[$40>>0]|0;
 $42 = $39 | $41;
 $43 = ((($s)) + 15|0);
 $44 = HEAP8[$43>>0]|0;
 $45 = $42 | $44;
 $46 = ((($s)) + 16|0);
 $47 = HEAP8[$46>>0]|0;
 $48 = $45 | $47;
 $49 = ((($s)) + 17|0);
 $50 = HEAP8[$49>>0]|0;
 $51 = $48 | $50;
 $52 = ((($s)) + 18|0);
 $53 = HEAP8[$52>>0]|0;
 $54 = $51 | $53;
 $55 = ((($s)) + 19|0);
 $56 = HEAP8[$55>>0]|0;
 $57 = $54 | $56;
 $58 = ((($s)) + 20|0);
 $59 = HEAP8[$58>>0]|0;
 $60 = $57 | $59;
 $61 = ((($s)) + 21|0);
 $62 = HEAP8[$61>>0]|0;
 $63 = $60 | $62;
 $64 = ((($s)) + 22|0);
 $65 = HEAP8[$64>>0]|0;
 $66 = $63 | $65;
 $67 = ((($s)) + 23|0);
 $68 = HEAP8[$67>>0]|0;
 $69 = $66 | $68;
 $70 = ((($s)) + 24|0);
 $71 = HEAP8[$70>>0]|0;
 $72 = $69 | $71;
 $73 = ((($s)) + 25|0);
 $74 = HEAP8[$73>>0]|0;
 $75 = $72 | $74;
 $76 = ((($s)) + 26|0);
 $77 = HEAP8[$76>>0]|0;
 $78 = $75 | $77;
 $79 = ((($s)) + 27|0);
 $80 = HEAP8[$79>>0]|0;
 $81 = $78 | $80;
 $82 = ((($s)) + 28|0);
 $83 = HEAP8[$82>>0]|0;
 $84 = $81 | $83;
 $85 = ((($s)) + 29|0);
 $86 = HEAP8[$85>>0]|0;
 $87 = $84 | $86;
 $88 = ((($s)) + 30|0);
 $89 = HEAP8[$88>>0]|0;
 $90 = $87 | $89;
 $91 = ((($s)) + 31|0);
 $92 = HEAP8[$91>>0]|0;
 $93 = $90 | $92;
 $94 = ($93<<24>>24)!=(0);
 $95 = $94&1;
 STACKTOP = sp;return ($95|0);
}
function _fe_neg($h,$f) {
 $h = $h|0;
 $f = $f|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $1 = ((($f)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($f)) + 8|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ((($f)) + 12|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ((($f)) + 16|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = ((($f)) + 20|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ((($f)) + 24|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = ((($f)) + 28|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = ((($f)) + 32|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = ((($f)) + 36|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = (0 - ($0))|0;
 $20 = (0 - ($2))|0;
 $21 = (0 - ($4))|0;
 $22 = (0 - ($6))|0;
 $23 = (0 - ($8))|0;
 $24 = (0 - ($10))|0;
 $25 = (0 - ($12))|0;
 $26 = (0 - ($14))|0;
 $27 = (0 - ($16))|0;
 $28 = (0 - ($18))|0;
 HEAP32[$h>>2] = $19;
 $29 = ((($h)) + 4|0);
 HEAP32[$29>>2] = $20;
 $30 = ((($h)) + 8|0);
 HEAP32[$30>>2] = $21;
 $31 = ((($h)) + 12|0);
 HEAP32[$31>>2] = $22;
 $32 = ((($h)) + 16|0);
 HEAP32[$32>>2] = $23;
 $33 = ((($h)) + 20|0);
 HEAP32[$33>>2] = $24;
 $34 = ((($h)) + 24|0);
 HEAP32[$34>>2] = $25;
 $35 = ((($h)) + 28|0);
 HEAP32[$35>>2] = $26;
 $36 = ((($h)) + 32|0);
 HEAP32[$36>>2] = $27;
 $37 = ((($h)) + 36|0);
 HEAP32[$37>>2] = $28;
 return;
}
function _fe_pow22523($out,$z) {
 $out = $out|0;
 $z = $z|0;
 var $0 = 0, $1 = 0, $2 = 0, $exitcond = 0, $exitcond10 = 0, $exitcond11 = 0, $i$74 = 0, $i$83 = 0, $i$92 = 0, $t0 = 0, $t1 = 0, $t2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0;
 $t0 = sp + 80|0;
 $t1 = sp + 40|0;
 $t2 = sp;
 _fe_sq($t0,$z);
 _fe_sq($t1,$t0);
 _fe_sq($t1,$t1);
 _fe_mul($t1,$z,$t1);
 _fe_mul($t0,$t0,$t1);
 _fe_sq($t0,$t0);
 _fe_mul($t0,$t1,$t0);
 _fe_sq($t1,$t0);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_mul($t0,$t1,$t0);
 _fe_sq($t1,$t0);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_mul($t1,$t1,$t0);
 _fe_sq($t2,$t1);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_sq($t2,$t2);
 _fe_mul($t1,$t2,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_sq($t1,$t1);
 _fe_mul($t0,$t1,$t0);
 _fe_sq($t1,$t0);
 $i$74 = 1;
 while(1) {
  _fe_sq($t1,$t1);
  $0 = (($i$74) + 1)|0;
  $exitcond11 = ($0|0)==(50);
  if ($exitcond11) {
   break;
  } else {
   $i$74 = $0;
  }
 }
 _fe_mul($t1,$t1,$t0);
 _fe_sq($t2,$t1);
 $i$83 = 1;
 while(1) {
  _fe_sq($t2,$t2);
  $1 = (($i$83) + 1)|0;
  $exitcond10 = ($1|0)==(100);
  if ($exitcond10) {
   break;
  } else {
   $i$83 = $1;
  }
 }
 _fe_mul($t1,$t2,$t1);
 _fe_sq($t1,$t1);
 $i$92 = 1;
 while(1) {
  _fe_sq($t1,$t1);
  $2 = (($i$92) + 1)|0;
  $exitcond = ($2|0)==(50);
  if ($exitcond) {
   break;
  } else {
   $i$92 = $2;
  }
 }
 _fe_mul($t0,$t1,$t0);
 _fe_sq($t0,$t0);
 _fe_sq($t0,$t0);
 _fe_mul($out,$t0,$z);
 STACKTOP = sp;return;
}
function _fe_sq2($h,$f) {
 $h = $h|0;
 $f = $f|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0;
 var $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0;
 var $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0;
 var $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0;
 var $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0;
 var $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0;
 var $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0;
 var $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0;
 var $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0;
 var $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $1 = ((($f)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($f)) + 8|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ((($f)) + 12|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ((($f)) + 16|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = ((($f)) + 20|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ((($f)) + 24|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = ((($f)) + 28|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = ((($f)) + 32|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = ((($f)) + 36|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = $0 << 1;
 $20 = $2 << 1;
 $21 = $4 << 1;
 $22 = $6 << 1;
 $23 = $8 << 1;
 $24 = $10 << 1;
 $25 = $12 << 1;
 $26 = $14 << 1;
 $27 = ($10*38)|0;
 $28 = ($12*19)|0;
 $29 = ($14*38)|0;
 $30 = ($16*19)|0;
 $31 = ($18*38)|0;
 $32 = ($0|0)<(0);
 $33 = $32 << 31 >> 31;
 $34 = (___muldi3(($0|0),($33|0),($0|0),($33|0))|0);
 $35 = tempRet0;
 $36 = ($19|0)<(0);
 $37 = $36 << 31 >> 31;
 $38 = ($2|0)<(0);
 $39 = $38 << 31 >> 31;
 $40 = (___muldi3(($19|0),($37|0),($2|0),($39|0))|0);
 $41 = tempRet0;
 $42 = ($4|0)<(0);
 $43 = $42 << 31 >> 31;
 $44 = (___muldi3(($4|0),($43|0),($19|0),($37|0))|0);
 $45 = tempRet0;
 $46 = ($6|0)<(0);
 $47 = $46 << 31 >> 31;
 $48 = (___muldi3(($6|0),($47|0),($19|0),($37|0))|0);
 $49 = tempRet0;
 $50 = ($8|0)<(0);
 $51 = $50 << 31 >> 31;
 $52 = (___muldi3(($8|0),($51|0),($19|0),($37|0))|0);
 $53 = tempRet0;
 $54 = ($10|0)<(0);
 $55 = $54 << 31 >> 31;
 $56 = (___muldi3(($10|0),($55|0),($19|0),($37|0))|0);
 $57 = tempRet0;
 $58 = ($12|0)<(0);
 $59 = $58 << 31 >> 31;
 $60 = (___muldi3(($12|0),($59|0),($19|0),($37|0))|0);
 $61 = tempRet0;
 $62 = ($14|0)<(0);
 $63 = $62 << 31 >> 31;
 $64 = (___muldi3(($14|0),($63|0),($19|0),($37|0))|0);
 $65 = tempRet0;
 $66 = ($16|0)<(0);
 $67 = $66 << 31 >> 31;
 $68 = (___muldi3(($16|0),($67|0),($19|0),($37|0))|0);
 $69 = tempRet0;
 $70 = ($18|0)<(0);
 $71 = $70 << 31 >> 31;
 $72 = (___muldi3(($18|0),($71|0),($19|0),($37|0))|0);
 $73 = tempRet0;
 $74 = ($20|0)<(0);
 $75 = $74 << 31 >> 31;
 $76 = (___muldi3(($20|0),($75|0),($2|0),($39|0))|0);
 $77 = tempRet0;
 $78 = (___muldi3(($20|0),($75|0),($4|0),($43|0))|0);
 $79 = tempRet0;
 $80 = ($22|0)<(0);
 $81 = $80 << 31 >> 31;
 $82 = (___muldi3(($22|0),($81|0),($20|0),($75|0))|0);
 $83 = tempRet0;
 $84 = (___muldi3(($8|0),($51|0),($20|0),($75|0))|0);
 $85 = tempRet0;
 $86 = ($24|0)<(0);
 $87 = $86 << 31 >> 31;
 $88 = (___muldi3(($24|0),($87|0),($20|0),($75|0))|0);
 $89 = tempRet0;
 $90 = (___muldi3(($12|0),($59|0),($20|0),($75|0))|0);
 $91 = tempRet0;
 $92 = ($26|0)<(0);
 $93 = $92 << 31 >> 31;
 $94 = (___muldi3(($26|0),($93|0),($20|0),($75|0))|0);
 $95 = tempRet0;
 $96 = (___muldi3(($16|0),($67|0),($20|0),($75|0))|0);
 $97 = tempRet0;
 $98 = ($31|0)<(0);
 $99 = $98 << 31 >> 31;
 $100 = (___muldi3(($31|0),($99|0),($20|0),($75|0))|0);
 $101 = tempRet0;
 $102 = (___muldi3(($4|0),($43|0),($4|0),($43|0))|0);
 $103 = tempRet0;
 $104 = ($21|0)<(0);
 $105 = $104 << 31 >> 31;
 $106 = (___muldi3(($21|0),($105|0),($6|0),($47|0))|0);
 $107 = tempRet0;
 $108 = (___muldi3(($8|0),($51|0),($21|0),($105|0))|0);
 $109 = tempRet0;
 $110 = (___muldi3(($10|0),($55|0),($21|0),($105|0))|0);
 $111 = tempRet0;
 $112 = (___muldi3(($12|0),($59|0),($21|0),($105|0))|0);
 $113 = tempRet0;
 $114 = (___muldi3(($14|0),($63|0),($21|0),($105|0))|0);
 $115 = tempRet0;
 $116 = ($30|0)<(0);
 $117 = $116 << 31 >> 31;
 $118 = (___muldi3(($30|0),($117|0),($21|0),($105|0))|0);
 $119 = tempRet0;
 $120 = (___muldi3(($31|0),($99|0),($4|0),($43|0))|0);
 $121 = tempRet0;
 $122 = (___muldi3(($22|0),($81|0),($6|0),($47|0))|0);
 $123 = tempRet0;
 $124 = (___muldi3(($22|0),($81|0),($8|0),($51|0))|0);
 $125 = tempRet0;
 $126 = (___muldi3(($24|0),($87|0),($22|0),($81|0))|0);
 $127 = tempRet0;
 $128 = (___muldi3(($12|0),($59|0),($22|0),($81|0))|0);
 $129 = tempRet0;
 $130 = ($29|0)<(0);
 $131 = $130 << 31 >> 31;
 $132 = (___muldi3(($29|0),($131|0),($22|0),($81|0))|0);
 $133 = tempRet0;
 $134 = (___muldi3(($30|0),($117|0),($22|0),($81|0))|0);
 $135 = tempRet0;
 $136 = (___muldi3(($31|0),($99|0),($22|0),($81|0))|0);
 $137 = tempRet0;
 $138 = (___muldi3(($8|0),($51|0),($8|0),($51|0))|0);
 $139 = tempRet0;
 $140 = ($23|0)<(0);
 $141 = $140 << 31 >> 31;
 $142 = (___muldi3(($23|0),($141|0),($10|0),($55|0))|0);
 $143 = tempRet0;
 $144 = ($28|0)<(0);
 $145 = $144 << 31 >> 31;
 $146 = (___muldi3(($28|0),($145|0),($23|0),($141|0))|0);
 $147 = tempRet0;
 $148 = (___muldi3(($29|0),($131|0),($8|0),($51|0))|0);
 $149 = tempRet0;
 $150 = (___muldi3(($30|0),($117|0),($23|0),($141|0))|0);
 $151 = tempRet0;
 $152 = (___muldi3(($31|0),($99|0),($8|0),($51|0))|0);
 $153 = tempRet0;
 $154 = ($27|0)<(0);
 $155 = $154 << 31 >> 31;
 $156 = (___muldi3(($27|0),($155|0),($10|0),($55|0))|0);
 $157 = tempRet0;
 $158 = (___muldi3(($28|0),($145|0),($24|0),($87|0))|0);
 $159 = tempRet0;
 $160 = (___muldi3(($29|0),($131|0),($24|0),($87|0))|0);
 $161 = tempRet0;
 $162 = (___muldi3(($30|0),($117|0),($24|0),($87|0))|0);
 $163 = tempRet0;
 $164 = (___muldi3(($31|0),($99|0),($24|0),($87|0))|0);
 $165 = tempRet0;
 $166 = (___muldi3(($28|0),($145|0),($12|0),($59|0))|0);
 $167 = tempRet0;
 $168 = (___muldi3(($29|0),($131|0),($12|0),($59|0))|0);
 $169 = tempRet0;
 $170 = ($25|0)<(0);
 $171 = $170 << 31 >> 31;
 $172 = (___muldi3(($30|0),($117|0),($25|0),($171|0))|0);
 $173 = tempRet0;
 $174 = (___muldi3(($31|0),($99|0),($12|0),($59|0))|0);
 $175 = tempRet0;
 $176 = (___muldi3(($29|0),($131|0),($14|0),($63|0))|0);
 $177 = tempRet0;
 $178 = (___muldi3(($30|0),($117|0),($26|0),($93|0))|0);
 $179 = tempRet0;
 $180 = (___muldi3(($31|0),($99|0),($26|0),($93|0))|0);
 $181 = tempRet0;
 $182 = (___muldi3(($30|0),($117|0),($16|0),($67|0))|0);
 $183 = tempRet0;
 $184 = (___muldi3(($31|0),($99|0),($16|0),($67|0))|0);
 $185 = tempRet0;
 $186 = (___muldi3(($31|0),($99|0),($18|0),($71|0))|0);
 $187 = tempRet0;
 $188 = (_i64Add(($156|0),($157|0),($34|0),($35|0))|0);
 $189 = tempRet0;
 $190 = (_i64Add(($188|0),($189|0),($146|0),($147|0))|0);
 $191 = tempRet0;
 $192 = (_i64Add(($190|0),($191|0),($132|0),($133|0))|0);
 $193 = tempRet0;
 $194 = (_i64Add(($192|0),($193|0),($118|0),($119|0))|0);
 $195 = tempRet0;
 $196 = (_i64Add(($194|0),($195|0),($100|0),($101|0))|0);
 $197 = tempRet0;
 $198 = (_i64Add(($158|0),($159|0),($40|0),($41|0))|0);
 $199 = tempRet0;
 $200 = (_i64Add(($198|0),($199|0),($148|0),($149|0))|0);
 $201 = tempRet0;
 $202 = (_i64Add(($200|0),($201|0),($134|0),($135|0))|0);
 $203 = tempRet0;
 $204 = (_i64Add(($202|0),($203|0),($120|0),($121|0))|0);
 $205 = tempRet0;
 $206 = (_i64Add(($44|0),($45|0),($76|0),($77|0))|0);
 $207 = tempRet0;
 $208 = (_i64Add(($206|0),($207|0),($166|0),($167|0))|0);
 $209 = tempRet0;
 $210 = (_i64Add(($208|0),($209|0),($160|0),($161|0))|0);
 $211 = tempRet0;
 $212 = (_i64Add(($210|0),($211|0),($150|0),($151|0))|0);
 $213 = tempRet0;
 $214 = (_i64Add(($212|0),($213|0),($136|0),($137|0))|0);
 $215 = tempRet0;
 $216 = (_i64Add(($48|0),($49|0),($78|0),($79|0))|0);
 $217 = tempRet0;
 $218 = (_i64Add(($216|0),($217|0),($168|0),($169|0))|0);
 $219 = tempRet0;
 $220 = (_i64Add(($218|0),($219|0),($162|0),($163|0))|0);
 $221 = tempRet0;
 $222 = (_i64Add(($220|0),($221|0),($152|0),($153|0))|0);
 $223 = tempRet0;
 $224 = (_i64Add(($82|0),($83|0),($102|0),($103|0))|0);
 $225 = tempRet0;
 $226 = (_i64Add(($224|0),($225|0),($52|0),($53|0))|0);
 $227 = tempRet0;
 $228 = (_i64Add(($226|0),($227|0),($176|0),($177|0))|0);
 $229 = tempRet0;
 $230 = (_i64Add(($228|0),($229|0),($172|0),($173|0))|0);
 $231 = tempRet0;
 $232 = (_i64Add(($230|0),($231|0),($164|0),($165|0))|0);
 $233 = tempRet0;
 $234 = (_i64Add(($84|0),($85|0),($106|0),($107|0))|0);
 $235 = tempRet0;
 $236 = (_i64Add(($234|0),($235|0),($56|0),($57|0))|0);
 $237 = tempRet0;
 $238 = (_i64Add(($236|0),($237|0),($178|0),($179|0))|0);
 $239 = tempRet0;
 $240 = (_i64Add(($238|0),($239|0),($174|0),($175|0))|0);
 $241 = tempRet0;
 $242 = (_i64Add(($122|0),($123|0),($108|0),($109|0))|0);
 $243 = tempRet0;
 $244 = (_i64Add(($242|0),($243|0),($88|0),($89|0))|0);
 $245 = tempRet0;
 $246 = (_i64Add(($244|0),($245|0),($60|0),($61|0))|0);
 $247 = tempRet0;
 $248 = (_i64Add(($246|0),($247|0),($182|0),($183|0))|0);
 $249 = tempRet0;
 $250 = (_i64Add(($248|0),($249|0),($180|0),($181|0))|0);
 $251 = tempRet0;
 $252 = (_i64Add(($110|0),($111|0),($124|0),($125|0))|0);
 $253 = tempRet0;
 $254 = (_i64Add(($252|0),($253|0),($90|0),($91|0))|0);
 $255 = tempRet0;
 $256 = (_i64Add(($254|0),($255|0),($64|0),($65|0))|0);
 $257 = tempRet0;
 $258 = (_i64Add(($256|0),($257|0),($184|0),($185|0))|0);
 $259 = tempRet0;
 $260 = (_i64Add(($112|0),($113|0),($138|0),($139|0))|0);
 $261 = tempRet0;
 $262 = (_i64Add(($260|0),($261|0),($126|0),($127|0))|0);
 $263 = tempRet0;
 $264 = (_i64Add(($262|0),($263|0),($94|0),($95|0))|0);
 $265 = tempRet0;
 $266 = (_i64Add(($264|0),($265|0),($68|0),($69|0))|0);
 $267 = tempRet0;
 $268 = (_i64Add(($266|0),($267|0),($186|0),($187|0))|0);
 $269 = tempRet0;
 $270 = (_i64Add(($128|0),($129|0),($142|0),($143|0))|0);
 $271 = tempRet0;
 $272 = (_i64Add(($270|0),($271|0),($114|0),($115|0))|0);
 $273 = tempRet0;
 $274 = (_i64Add(($272|0),($273|0),($96|0),($97|0))|0);
 $275 = tempRet0;
 $276 = (_i64Add(($274|0),($275|0),($72|0),($73|0))|0);
 $277 = tempRet0;
 $278 = (_bitshift64Shl(($196|0),($197|0),1)|0);
 $279 = tempRet0;
 $280 = (_bitshift64Shl(($204|0),($205|0),1)|0);
 $281 = tempRet0;
 $282 = (_bitshift64Shl(($214|0),($215|0),1)|0);
 $283 = tempRet0;
 $284 = (_bitshift64Shl(($222|0),($223|0),1)|0);
 $285 = tempRet0;
 $286 = (_bitshift64Shl(($232|0),($233|0),1)|0);
 $287 = tempRet0;
 $288 = (_bitshift64Shl(($240|0),($241|0),1)|0);
 $289 = tempRet0;
 $290 = (_bitshift64Shl(($250|0),($251|0),1)|0);
 $291 = tempRet0;
 $292 = (_bitshift64Shl(($258|0),($259|0),1)|0);
 $293 = tempRet0;
 $294 = (_bitshift64Shl(($268|0),($269|0),1)|0);
 $295 = tempRet0;
 $296 = (_bitshift64Shl(($276|0),($277|0),1)|0);
 $297 = tempRet0;
 $298 = (_i64Add(($278|0),($279|0),33554432,0)|0);
 $299 = tempRet0;
 $300 = (_bitshift64Ashr(($298|0),($299|0),26)|0);
 $301 = tempRet0;
 $302 = (_i64Add(($300|0),($301|0),($280|0),($281|0))|0);
 $303 = tempRet0;
 $304 = (_bitshift64Shl(($300|0),($301|0),26)|0);
 $305 = tempRet0;
 $306 = (_i64Subtract(($278|0),($279|0),($304|0),($305|0))|0);
 $307 = tempRet0;
 $308 = (_i64Add(($286|0),($287|0),33554432,0)|0);
 $309 = tempRet0;
 $310 = (_bitshift64Ashr(($308|0),($309|0),26)|0);
 $311 = tempRet0;
 $312 = (_i64Add(($310|0),($311|0),($288|0),($289|0))|0);
 $313 = tempRet0;
 $314 = (_bitshift64Shl(($310|0),($311|0),26)|0);
 $315 = tempRet0;
 $316 = (_i64Subtract(($286|0),($287|0),($314|0),($315|0))|0);
 $317 = tempRet0;
 $318 = (_i64Add(($302|0),($303|0),16777216,0)|0);
 $319 = tempRet0;
 $320 = (_bitshift64Ashr(($318|0),($319|0),25)|0);
 $321 = tempRet0;
 $322 = (_i64Add(($320|0),($321|0),($282|0),($283|0))|0);
 $323 = tempRet0;
 $324 = (_bitshift64Shl(($320|0),($321|0),25)|0);
 $325 = tempRet0;
 $326 = (_i64Subtract(($302|0),($303|0),($324|0),($325|0))|0);
 $327 = tempRet0;
 $328 = (_i64Add(($312|0),($313|0),16777216,0)|0);
 $329 = tempRet0;
 $330 = (_bitshift64Ashr(($328|0),($329|0),25)|0);
 $331 = tempRet0;
 $332 = (_i64Add(($330|0),($331|0),($290|0),($291|0))|0);
 $333 = tempRet0;
 $334 = (_bitshift64Shl(($330|0),($331|0),25)|0);
 $335 = tempRet0;
 $336 = (_i64Subtract(($312|0),($313|0),($334|0),($335|0))|0);
 $337 = tempRet0;
 $338 = (_i64Add(($322|0),($323|0),33554432,0)|0);
 $339 = tempRet0;
 $340 = (_bitshift64Ashr(($338|0),($339|0),26)|0);
 $341 = tempRet0;
 $342 = (_i64Add(($340|0),($341|0),($284|0),($285|0))|0);
 $343 = tempRet0;
 $344 = (_bitshift64Shl(($340|0),($341|0),26)|0);
 $345 = tempRet0;
 $346 = (_i64Subtract(($322|0),($323|0),($344|0),($345|0))|0);
 $347 = tempRet0;
 $348 = (_i64Add(($332|0),($333|0),33554432,0)|0);
 $349 = tempRet0;
 $350 = (_bitshift64Ashr(($348|0),($349|0),26)|0);
 $351 = tempRet0;
 $352 = (_i64Add(($350|0),($351|0),($292|0),($293|0))|0);
 $353 = tempRet0;
 $354 = (_bitshift64Shl(($350|0),($351|0),26)|0);
 $355 = tempRet0;
 $356 = (_i64Subtract(($332|0),($333|0),($354|0),($355|0))|0);
 $357 = tempRet0;
 $358 = (_i64Add(($342|0),($343|0),16777216,0)|0);
 $359 = tempRet0;
 $360 = (_bitshift64Ashr(($358|0),($359|0),25)|0);
 $361 = tempRet0;
 $362 = (_i64Add(($360|0),($361|0),($316|0),($317|0))|0);
 $363 = tempRet0;
 $364 = (_bitshift64Shl(($360|0),($361|0),25)|0);
 $365 = tempRet0;
 $366 = (_i64Subtract(($342|0),($343|0),($364|0),($365|0))|0);
 $367 = tempRet0;
 $368 = (_i64Add(($352|0),($353|0),16777216,0)|0);
 $369 = tempRet0;
 $370 = (_bitshift64Ashr(($368|0),($369|0),25)|0);
 $371 = tempRet0;
 $372 = (_i64Add(($370|0),($371|0),($294|0),($295|0))|0);
 $373 = tempRet0;
 $374 = (_bitshift64Shl(($370|0),($371|0),25)|0);
 $375 = tempRet0;
 $376 = (_i64Subtract(($352|0),($353|0),($374|0),($375|0))|0);
 $377 = tempRet0;
 $378 = (_i64Add(($362|0),($363|0),33554432,0)|0);
 $379 = tempRet0;
 $380 = (_bitshift64Ashr(($378|0),($379|0),26)|0);
 $381 = tempRet0;
 $382 = (_i64Add(($336|0),($337|0),($380|0),($381|0))|0);
 $383 = tempRet0;
 $384 = (_bitshift64Shl(($380|0),($381|0),26)|0);
 $385 = tempRet0;
 $386 = (_i64Subtract(($362|0),($363|0),($384|0),($385|0))|0);
 $387 = tempRet0;
 $388 = (_i64Add(($372|0),($373|0),33554432,0)|0);
 $389 = tempRet0;
 $390 = (_bitshift64Ashr(($388|0),($389|0),26)|0);
 $391 = tempRet0;
 $392 = (_i64Add(($390|0),($391|0),($296|0),($297|0))|0);
 $393 = tempRet0;
 $394 = (_bitshift64Shl(($390|0),($391|0),26)|0);
 $395 = tempRet0;
 $396 = (_i64Subtract(($372|0),($373|0),($394|0),($395|0))|0);
 $397 = tempRet0;
 $398 = (_i64Add(($392|0),($393|0),16777216,0)|0);
 $399 = tempRet0;
 $400 = (_bitshift64Ashr(($398|0),($399|0),25)|0);
 $401 = tempRet0;
 $402 = (___muldi3(($400|0),($401|0),19,0)|0);
 $403 = tempRet0;
 $404 = (_i64Add(($402|0),($403|0),($306|0),($307|0))|0);
 $405 = tempRet0;
 $406 = (_bitshift64Shl(($400|0),($401|0),25)|0);
 $407 = tempRet0;
 $408 = (_i64Subtract(($392|0),($393|0),($406|0),($407|0))|0);
 $409 = tempRet0;
 $410 = (_i64Add(($404|0),($405|0),33554432,0)|0);
 $411 = tempRet0;
 $412 = (_bitshift64Ashr(($410|0),($411|0),26)|0);
 $413 = tempRet0;
 $414 = (_i64Add(($326|0),($327|0),($412|0),($413|0))|0);
 $415 = tempRet0;
 $416 = (_bitshift64Shl(($412|0),($413|0),26)|0);
 $417 = tempRet0;
 $418 = (_i64Subtract(($404|0),($405|0),($416|0),($417|0))|0);
 $419 = tempRet0;
 HEAP32[$h>>2] = $418;
 $420 = ((($h)) + 4|0);
 HEAP32[$420>>2] = $414;
 $421 = ((($h)) + 8|0);
 HEAP32[$421>>2] = $346;
 $422 = ((($h)) + 12|0);
 HEAP32[$422>>2] = $366;
 $423 = ((($h)) + 16|0);
 HEAP32[$423>>2] = $386;
 $424 = ((($h)) + 20|0);
 HEAP32[$424>>2] = $382;
 $425 = ((($h)) + 24|0);
 HEAP32[$425>>2] = $356;
 $426 = ((($h)) + 28|0);
 HEAP32[$426>>2] = $376;
 $427 = ((($h)) + 32|0);
 HEAP32[$427>>2] = $396;
 $428 = ((($h)) + 36|0);
 HEAP32[$428>>2] = $408;
 return;
}
function _fe_sub($h,$f,$g) {
 $h = $h|0;
 $f = $f|0;
 $g = $g|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $1 = ((($f)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($f)) + 8|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ((($f)) + 12|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ((($f)) + 16|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = ((($f)) + 20|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ((($f)) + 24|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = ((($f)) + 28|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = ((($f)) + 32|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = ((($f)) + 36|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = HEAP32[$g>>2]|0;
 $20 = ((($g)) + 4|0);
 $21 = HEAP32[$20>>2]|0;
 $22 = ((($g)) + 8|0);
 $23 = HEAP32[$22>>2]|0;
 $24 = ((($g)) + 12|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = ((($g)) + 16|0);
 $27 = HEAP32[$26>>2]|0;
 $28 = ((($g)) + 20|0);
 $29 = HEAP32[$28>>2]|0;
 $30 = ((($g)) + 24|0);
 $31 = HEAP32[$30>>2]|0;
 $32 = ((($g)) + 28|0);
 $33 = HEAP32[$32>>2]|0;
 $34 = ((($g)) + 32|0);
 $35 = HEAP32[$34>>2]|0;
 $36 = ((($g)) + 36|0);
 $37 = HEAP32[$36>>2]|0;
 $38 = (($0) - ($19))|0;
 $39 = (($2) - ($21))|0;
 $40 = (($4) - ($23))|0;
 $41 = (($6) - ($25))|0;
 $42 = (($8) - ($27))|0;
 $43 = (($10) - ($29))|0;
 $44 = (($12) - ($31))|0;
 $45 = (($14) - ($33))|0;
 $46 = (($16) - ($35))|0;
 $47 = (($18) - ($37))|0;
 HEAP32[$h>>2] = $38;
 $48 = ((($h)) + 4|0);
 HEAP32[$48>>2] = $39;
 $49 = ((($h)) + 8|0);
 HEAP32[$49>>2] = $40;
 $50 = ((($h)) + 12|0);
 HEAP32[$50>>2] = $41;
 $51 = ((($h)) + 16|0);
 HEAP32[$51>>2] = $42;
 $52 = ((($h)) + 20|0);
 HEAP32[$52>>2] = $43;
 $53 = ((($h)) + 24|0);
 HEAP32[$53>>2] = $44;
 $54 = ((($h)) + 28|0);
 HEAP32[$54>>2] = $45;
 $55 = ((($h)) + 32|0);
 HEAP32[$55>>2] = $46;
 $56 = ((($h)) + 36|0);
 HEAP32[$56>>2] = $47;
 return;
}
function _load_4($in) {
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$in>>0]|0;
 $1 = $0&255;
 $2 = ((($in)) + 1|0);
 $3 = HEAP8[$2>>0]|0;
 $4 = $3&255;
 $5 = (_bitshift64Shl(($4|0),0,8)|0);
 $6 = tempRet0;
 $7 = $5 | $1;
 $8 = ((($in)) + 2|0);
 $9 = HEAP8[$8>>0]|0;
 $10 = $9&255;
 $11 = (_bitshift64Shl(($10|0),0,16)|0);
 $12 = tempRet0;
 $13 = $7 | $11;
 $14 = $6 | $12;
 $15 = ((($in)) + 3|0);
 $16 = HEAP8[$15>>0]|0;
 $17 = $16&255;
 $18 = (_bitshift64Shl(($17|0),0,24)|0);
 $19 = tempRet0;
 $20 = $13 | $18;
 $21 = $14 | $19;
 tempRet0 = ($21);
 return ($20|0);
}
function _load_3($in) {
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$in>>0]|0;
 $1 = $0&255;
 $2 = ((($in)) + 1|0);
 $3 = HEAP8[$2>>0]|0;
 $4 = $3&255;
 $5 = (_bitshift64Shl(($4|0),0,8)|0);
 $6 = tempRet0;
 $7 = $5 | $1;
 $8 = ((($in)) + 2|0);
 $9 = HEAP8[$8>>0]|0;
 $10 = $9&255;
 $11 = (_bitshift64Shl(($10|0),0,16)|0);
 $12 = tempRet0;
 $13 = $7 | $11;
 $14 = $6 | $12;
 tempRet0 = ($14);
 return ($13|0);
}
function _ge_add($r,$p,$q) {
 $r = $r|0;
 $p = $p|0;
 $q = $q|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $t0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $t0 = sp;
 $0 = ((($p)) + 40|0);
 _fe_add($r,$0,$p);
 $1 = ((($r)) + 40|0);
 _fe_sub($1,$0,$p);
 $2 = ((($r)) + 80|0);
 _fe_mul($2,$r,$q);
 $3 = ((($q)) + 40|0);
 _fe_mul($1,$1,$3);
 $4 = ((($r)) + 120|0);
 $5 = ((($q)) + 120|0);
 $6 = ((($p)) + 120|0);
 _fe_mul($4,$5,$6);
 $7 = ((($p)) + 80|0);
 $8 = ((($q)) + 80|0);
 _fe_mul($r,$7,$8);
 _fe_add($t0,$r,$r);
 _fe_sub($r,$2,$1);
 _fe_add($1,$2,$1);
 _fe_add($2,$t0,$4);
 _fe_sub($4,$t0,$4);
 STACKTOP = sp;return;
}
function _ge_double_scalarmult_vartime($r,$a,$A,$b) {
 $r = $r|0;
 $a = $a|0;
 $A = $A|0;
 $b = $b|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $A2 = 0, $Ai = 0, $aslide = 0, $bslide = 0, $i$0$lcssa = 0, $i$02 = 0, $i$11 = 0, $t = 0, $u = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 2272|0;
 $aslide = sp + 2016|0;
 $bslide = sp + 1760|0;
 $Ai = sp + 480|0;
 $t = sp + 320|0;
 $u = sp + 160|0;
 $A2 = sp;
 _slide($aslide,$a);
 _slide($bslide,$b);
 _ge_p3_to_cached($Ai,$A);
 _ge_p3_dbl($t,$A);
 _ge_p1p1_to_p3($A2,$t);
 _ge_add($t,$A2,$Ai);
 _ge_p1p1_to_p3($u,$t);
 $0 = ((($Ai)) + 160|0);
 _ge_p3_to_cached($0,$u);
 _ge_add($t,$A2,$0);
 _ge_p1p1_to_p3($u,$t);
 $1 = ((($Ai)) + 320|0);
 _ge_p3_to_cached($1,$u);
 _ge_add($t,$A2,$1);
 _ge_p1p1_to_p3($u,$t);
 $2 = ((($Ai)) + 480|0);
 _ge_p3_to_cached($2,$u);
 _ge_add($t,$A2,$2);
 _ge_p1p1_to_p3($u,$t);
 $3 = ((($Ai)) + 640|0);
 _ge_p3_to_cached($3,$u);
 _ge_add($t,$A2,$3);
 _ge_p1p1_to_p3($u,$t);
 $4 = ((($Ai)) + 800|0);
 _ge_p3_to_cached($4,$u);
 _ge_add($t,$A2,$4);
 _ge_p1p1_to_p3($u,$t);
 $5 = ((($Ai)) + 960|0);
 _ge_p3_to_cached($5,$u);
 _ge_add($t,$A2,$5);
 _ge_p1p1_to_p3($u,$t);
 $6 = ((($Ai)) + 1120|0);
 _ge_p3_to_cached($6,$u);
 _ge_p2_0($r);
 $i$02 = 255;
 while(1) {
  $7 = (($aslide) + ($i$02)|0);
  $8 = HEAP8[$7>>0]|0;
  $9 = ($8<<24>>24)==(0);
  if (!($9)) {
   $i$0$lcssa = $i$02;
   break;
  }
  $10 = (($bslide) + ($i$02)|0);
  $11 = HEAP8[$10>>0]|0;
  $12 = ($11<<24>>24)==(0);
  if (!($12)) {
   $i$0$lcssa = $i$02;
   break;
  }
  $14 = (($i$02) + -1)|0;
  $15 = ($i$02|0)>(0);
  if ($15) {
   $i$02 = $14;
  } else {
   $i$0$lcssa = $14;
   break;
  }
 }
 $13 = ($i$0$lcssa|0)>(-1);
 if ($13) {
  $i$11 = $i$0$lcssa;
 } else {
  STACKTOP = sp;return;
 }
 while(1) {
  _ge_p2_dbl($t,$r);
  $16 = (($aslide) + ($i$11)|0);
  $17 = HEAP8[$16>>0]|0;
  $18 = ($17<<24>>24)>(0);
  if ($18) {
   _ge_p1p1_to_p3($u,$t);
   $19 = HEAP8[$16>>0]|0;
   $20 = $19 << 24 >> 24;
   $21 = (($20|0) / 2)&-1;
   $22 = (($Ai) + (($21*160)|0)|0);
   _ge_add($t,$u,$22);
  } else {
   $23 = ($17<<24>>24)<(0);
   if ($23) {
    _ge_p1p1_to_p3($u,$t);
    $24 = HEAP8[$16>>0]|0;
    $25 = $24 << 24 >> 24;
    $26 = (($25|0) / -2)&-1;
    $27 = (($Ai) + (($26*160)|0)|0);
    _ge_sub($t,$u,$27);
   }
  }
  $28 = (($bslide) + ($i$11)|0);
  $29 = HEAP8[$28>>0]|0;
  $30 = ($29<<24>>24)>(0);
  if ($30) {
   _ge_p1p1_to_p3($u,$t);
   $31 = HEAP8[$28>>0]|0;
   $32 = $31 << 24 >> 24;
   $33 = (($32|0) / 2)&-1;
   $34 = (648 + (($33*120)|0)|0);
   _ge_madd($t,$u,$34);
  } else {
   $35 = ($29<<24>>24)<(0);
   if ($35) {
    _ge_p1p1_to_p3($u,$t);
    $36 = HEAP8[$28>>0]|0;
    $37 = $36 << 24 >> 24;
    $38 = (($37|0) / -2)&-1;
    $39 = (648 + (($38*120)|0)|0);
    _ge_msub($t,$u,$39);
   }
  }
  _ge_p1p1_to_p2($r,$t);
  $40 = (($i$11) + -1)|0;
  $41 = ($i$11|0)>(0);
  if ($41) {
   $i$11 = $40;
  } else {
   break;
  }
 }
 STACKTOP = sp;return;
}
function _ge_p3_to_cached($r,$p) {
 $r = $r|0;
 $p = $p|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($p)) + 40|0);
 _fe_add($r,$0,$p);
 $1 = ((($r)) + 40|0);
 _fe_sub($1,$0,$p);
 $2 = ((($r)) + 80|0);
 $3 = ((($p)) + 80|0);
 _fe_copy($2,$3);
 $4 = ((($r)) + 120|0);
 $5 = ((($p)) + 120|0);
 _fe_mul($4,$5,1608);
 return;
}
function _ge_p3_dbl($r,$p) {
 $r = $r|0;
 $p = $p|0;
 var $q = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0;
 $q = sp;
 _ge_p3_to_p2($q,$p);
 _ge_p2_dbl($r,$q);
 STACKTOP = sp;return;
}
function _ge_p1p1_to_p3($r,$p) {
 $r = $r|0;
 $p = $p|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($p)) + 120|0);
 _fe_mul($r,$p,$0);
 $1 = ((($r)) + 40|0);
 $2 = ((($p)) + 40|0);
 $3 = ((($p)) + 80|0);
 _fe_mul($1,$2,$3);
 $4 = ((($r)) + 80|0);
 _fe_mul($4,$3,$0);
 $5 = ((($r)) + 120|0);
 _fe_mul($5,$p,$2);
 return;
}
function _ge_p2_0($h) {
 $h = $h|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 _fe_0($h);
 $0 = ((($h)) + 40|0);
 _fe_1($0);
 $1 = ((($h)) + 80|0);
 _fe_1($1);
 return;
}
function _ge_p2_dbl($r,$p) {
 $r = $r|0;
 $p = $p|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $t0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $t0 = sp;
 _fe_sq($r,$p);
 $0 = ((($r)) + 80|0);
 $1 = ((($p)) + 40|0);
 _fe_sq($0,$1);
 $2 = ((($r)) + 120|0);
 $3 = ((($p)) + 80|0);
 _fe_sq2($2,$3);
 $4 = ((($r)) + 40|0);
 _fe_add($4,$p,$1);
 _fe_sq($t0,$4);
 _fe_add($4,$0,$r);
 _fe_sub($0,$0,$r);
 _fe_sub($r,$t0,$4);
 _fe_sub($2,$2,$0);
 STACKTOP = sp;return;
}
function _ge_sub($r,$p,$q) {
 $r = $r|0;
 $p = $p|0;
 $q = $q|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $t0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $t0 = sp;
 $0 = ((($p)) + 40|0);
 _fe_add($r,$0,$p);
 $1 = ((($r)) + 40|0);
 _fe_sub($1,$0,$p);
 $2 = ((($r)) + 80|0);
 $3 = ((($q)) + 40|0);
 _fe_mul($2,$r,$3);
 _fe_mul($1,$1,$q);
 $4 = ((($r)) + 120|0);
 $5 = ((($q)) + 120|0);
 $6 = ((($p)) + 120|0);
 _fe_mul($4,$5,$6);
 $7 = ((($p)) + 80|0);
 $8 = ((($q)) + 80|0);
 _fe_mul($r,$7,$8);
 _fe_add($t0,$r,$r);
 _fe_sub($r,$2,$1);
 _fe_add($1,$2,$1);
 _fe_sub($2,$t0,$4);
 _fe_add($4,$t0,$4);
 STACKTOP = sp;return;
}
function _ge_madd($r,$p,$q) {
 $r = $r|0;
 $p = $p|0;
 $q = $q|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $t0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $t0 = sp;
 $0 = ((($p)) + 40|0);
 _fe_add($r,$0,$p);
 $1 = ((($r)) + 40|0);
 _fe_sub($1,$0,$p);
 $2 = ((($r)) + 80|0);
 _fe_mul($2,$r,$q);
 $3 = ((($q)) + 40|0);
 _fe_mul($1,$1,$3);
 $4 = ((($r)) + 120|0);
 $5 = ((($q)) + 80|0);
 $6 = ((($p)) + 120|0);
 _fe_mul($4,$5,$6);
 $7 = ((($p)) + 80|0);
 _fe_add($t0,$7,$7);
 _fe_sub($r,$2,$1);
 _fe_add($1,$2,$1);
 _fe_add($2,$t0,$4);
 _fe_sub($4,$t0,$4);
 STACKTOP = sp;return;
}
function _ge_msub($r,$p,$q) {
 $r = $r|0;
 $p = $p|0;
 $q = $q|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $t0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $t0 = sp;
 $0 = ((($p)) + 40|0);
 _fe_add($r,$0,$p);
 $1 = ((($r)) + 40|0);
 _fe_sub($1,$0,$p);
 $2 = ((($r)) + 80|0);
 $3 = ((($q)) + 40|0);
 _fe_mul($2,$r,$3);
 _fe_mul($1,$1,$q);
 $4 = ((($r)) + 120|0);
 $5 = ((($q)) + 80|0);
 $6 = ((($p)) + 120|0);
 _fe_mul($4,$5,$6);
 $7 = ((($p)) + 80|0);
 _fe_add($t0,$7,$7);
 _fe_sub($r,$2,$1);
 _fe_add($1,$2,$1);
 _fe_sub($2,$t0,$4);
 _fe_add($4,$t0,$4);
 STACKTOP = sp;return;
}
function _ge_p1p1_to_p2($r,$p) {
 $r = $r|0;
 $p = $p|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($p)) + 120|0);
 _fe_mul($r,$p,$0);
 $1 = ((($r)) + 40|0);
 $2 = ((($p)) + 40|0);
 $3 = ((($p)) + 80|0);
 _fe_mul($1,$2,$3);
 $4 = ((($r)) + 80|0);
 _fe_mul($4,$3,$0);
 return;
}
function _ge_frombytes_negate_vartime($h,$s) {
 $h = $h|0;
 $s = $s|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $check = 0, $u = 0, $v = 0, $v3 = 0, $vxx = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0;
 $u = sp + 160|0;
 $v = sp + 120|0;
 $v3 = sp + 80|0;
 $vxx = sp + 40|0;
 $check = sp;
 $0 = ((($h)) + 40|0);
 _fe_frombytes($0,$s);
 $1 = ((($h)) + 80|0);
 _fe_1($1);
 _fe_sq($u,$0);
 _fe_mul($v,$u,1648);
 _fe_sub($u,$u,$1);
 _fe_add($v,$v,$1);
 _fe_sq($v3,$v);
 _fe_mul($v3,$v3,$v);
 _fe_sq($h,$v3);
 _fe_mul($h,$h,$v);
 _fe_mul($h,$h,$u);
 _fe_pow22523($h,$h);
 _fe_mul($h,$h,$v3);
 _fe_mul($h,$h,$u);
 _fe_sq($vxx,$h);
 _fe_mul($vxx,$vxx,$v);
 _fe_sub($check,$vxx,$u);
 $2 = (_fe_isnonzero($check)|0);
 $3 = ($2|0)==(0);
 do {
  if (!($3)) {
   _fe_add($check,$vxx,$u);
   $4 = (_fe_isnonzero($check)|0);
   $5 = ($4|0)==(0);
   if ($5) {
    _fe_mul($h,$h,1688);
    break;
   } else {
    $$0 = -1;
    STACKTOP = sp;return ($$0|0);
   }
  }
 } while(0);
 $6 = (_fe_isnegative($h)|0);
 $7 = ((($s)) + 31|0);
 $8 = HEAP8[$7>>0]|0;
 $9 = $8&255;
 $10 = $9 >>> 7;
 $11 = ($6|0)==($10|0);
 if ($11) {
  _fe_neg($h,$h);
 }
 $12 = ((($h)) + 120|0);
 _fe_mul($12,$h,$0);
 $$0 = 0;
 STACKTOP = sp;return ($$0|0);
}
function _ge_p3_0($h) {
 $h = $h|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 _fe_0($h);
 $0 = ((($h)) + 40|0);
 _fe_1($0);
 $1 = ((($h)) + 80|0);
 _fe_1($1);
 $2 = ((($h)) + 120|0);
 _fe_0($2);
 return;
}
function _ge_p3_to_p2($r,$p) {
 $r = $r|0;
 $p = $p|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 _fe_copy($r,$p);
 $0 = ((($r)) + 40|0);
 $1 = ((($p)) + 40|0);
 _fe_copy($0,$1);
 $2 = ((($r)) + 80|0);
 $3 = ((($p)) + 80|0);
 _fe_copy($2,$3);
 return;
}
function _ge_p3_tobytes($s,$h) {
 $s = $s|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $recip = 0, $x = 0, $y = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0;
 $recip = sp + 80|0;
 $x = sp + 40|0;
 $y = sp;
 $0 = ((($h)) + 80|0);
 _fe_invert($recip,$0);
 _fe_mul($x,$h,$recip);
 $1 = ((($h)) + 40|0);
 _fe_mul($y,$1,$recip);
 _fe_tobytes($s,$y);
 $2 = (_fe_isnegative($x)|0);
 $3 = $2 << 7;
 $4 = ((($s)) + 31|0);
 $5 = HEAP8[$4>>0]|0;
 $6 = $5&255;
 $7 = $6 ^ $3;
 $8 = $7&255;
 HEAP8[$4>>0] = $8;
 STACKTOP = sp;return;
}
function _ge_scalarmult_base($h,$a) {
 $h = $h|0;
 $a = $a|0;
 var $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $carry$04 = 0, $e = 0, $exitcond = 0;
 var $exitcond7 = 0, $i$06 = 0, $i$15 = 0, $i$23 = 0, $i$32 = 0, $r = 0, $s = 0, $sext = 0, $sext1 = 0, $t = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 464|0;
 $e = sp + 400|0;
 $r = sp + 240|0;
 $s = sp + 120|0;
 $t = sp;
 $i$06 = 0;
 while(1) {
  $0 = (($a) + ($i$06)|0);
  $1 = HEAP8[$0>>0]|0;
  $2 = $1&255;
  $3 = $2 & 15;
  $4 = $3&255;
  $5 = $i$06 << 1;
  $6 = (($e) + ($5)|0);
  HEAP8[$6>>0] = $4;
  $7 = HEAP8[$0>>0]|0;
  $8 = ($7&255) >>> 4;
  $9 = $5 | 1;
  $10 = (($e) + ($9)|0);
  HEAP8[$10>>0] = $8;
  $11 = (($i$06) + 1)|0;
  $exitcond7 = ($11|0)==(32);
  if ($exitcond7) {
   $carry$04 = 0;$i$15 = 0;
   break;
  } else {
   $i$06 = $11;
  }
 }
 while(1) {
  $12 = (($e) + ($i$15)|0);
  $13 = HEAP8[$12>>0]|0;
  $14 = $13&255;
  $15 = (($14) + ($carry$04))|0;
  $sext = $15 << 24;
  $sext1 = (($sext) + 134217728)|0;
  $16 = $sext1 >> 28;
  $17 = $16 << 4;
  $18 = (($15) - ($17))|0;
  $19 = $18&255;
  HEAP8[$12>>0] = $19;
  $20 = (($i$15) + 1)|0;
  $exitcond = ($20|0)==(63);
  if ($exitcond) {
   $$lcssa = $16;
   break;
  } else {
   $carry$04 = $16;$i$15 = $20;
  }
 }
 $21 = ((($e)) + 63|0);
 $22 = HEAP8[$21>>0]|0;
 $23 = $22&255;
 $24 = (($23) + ($$lcssa))|0;
 $25 = $24&255;
 HEAP8[$21>>0] = $25;
 _ge_p3_0($h);
 $i$23 = 1;
 while(1) {
  $26 = (($i$23|0) / 2)&-1;
  $27 = (($e) + ($i$23)|0);
  $28 = HEAP8[$27>>0]|0;
  _select28($t,$26,$28);
  _ge_madd($r,$h,$t);
  _ge_p1p1_to_p3($h,$r);
  $29 = (($i$23) + 2)|0;
  $30 = ($29|0)<(64);
  if ($30) {
   $i$23 = $29;
  } else {
   break;
  }
 }
 _ge_p3_dbl($r,$h);
 _ge_p1p1_to_p2($s,$r);
 _ge_p2_dbl($r,$s);
 _ge_p1p1_to_p2($s,$r);
 _ge_p2_dbl($r,$s);
 _ge_p1p1_to_p2($s,$r);
 _ge_p2_dbl($r,$s);
 _ge_p1p1_to_p3($h,$r);
 $i$32 = 0;
 while(1) {
  $31 = (($i$32|0) / 2)&-1;
  $32 = (($e) + ($i$32)|0);
  $33 = HEAP8[$32>>0]|0;
  _select28($t,$31,$33);
  _ge_madd($r,$h,$t);
  _ge_p1p1_to_p3($h,$r);
  $34 = (($i$32) + 2)|0;
  $35 = ($34|0)<(64);
  if ($35) {
   $i$32 = $34;
  } else {
   break;
  }
 }
 STACKTOP = sp;return;
}
function _ge_tobytes($s,$h) {
 $s = $s|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $recip = 0, $x = 0, $y = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0;
 $recip = sp + 80|0;
 $x = sp + 40|0;
 $y = sp;
 $0 = ((($h)) + 80|0);
 _fe_invert($recip,$0);
 _fe_mul($x,$h,$recip);
 $1 = ((($h)) + 40|0);
 _fe_mul($y,$1,$recip);
 _fe_tobytes($s,$y);
 $2 = (_fe_isnegative($x)|0);
 $3 = $2 << 7;
 $4 = ((($s)) + 31|0);
 $5 = HEAP8[$4>>0]|0;
 $6 = $5&255;
 $7 = $6 ^ $3;
 $8 = $7&255;
 HEAP8[$4>>0] = $8;
 STACKTOP = sp;return;
}
function _slide($r,$a) {
 $r = $r|0;
 $a = $a|0;
 var $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $b$03 = 0, $exitcond = 0, $exitcond9 = 0;
 var $i$07 = 0, $i$14 = 0, $k$02 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $i$07 = 0;
 while(1) {
  $0 = $i$07 >> 3;
  $1 = (($a) + ($0)|0);
  $2 = HEAP8[$1>>0]|0;
  $3 = $2&255;
  $4 = $i$07 & 7;
  $5 = $3 >>> $4;
  $6 = $5 & 1;
  $7 = $6&255;
  $8 = (($r) + ($i$07)|0);
  HEAP8[$8>>0] = $7;
  $9 = (($i$07) + 1)|0;
  $exitcond9 = ($9|0)==(256);
  if ($exitcond9) {
   $i$14 = 0;
   break;
  } else {
   $i$07 = $9;
  }
 }
 while(1) {
  $10 = (($r) + ($i$14)|0);
  $11 = HEAP8[$10>>0]|0;
  $12 = ($11<<24>>24)==(0);
  L5: do {
   if (!($12)) {
    $b$03 = 1;
    while(1) {
     $13 = (($b$03) + ($i$14))|0;
     $14 = ($13|0)<(256);
     if (!($14)) {
      break L5;
     }
     $15 = (($r) + ($13)|0);
     $16 = HEAP8[$15>>0]|0;
     $17 = ($16<<24>>24)==(0);
     L9: do {
      if (!($17)) {
       $18 = HEAP8[$10>>0]|0;
       $19 = $18 << 24 >> 24;
       $20 = $16 << 24 >> 24;
       $21 = $20 << $b$03;
       $22 = (($19) + ($21))|0;
       $23 = ($22|0)<(16);
       if ($23) {
        $24 = $22&255;
        HEAP8[$10>>0] = $24;
        HEAP8[$15>>0] = 0;
        break;
       }
       $25 = (($19) - ($21))|0;
       $26 = ($25|0)>(-16);
       if (!($26)) {
        break L5;
       }
       $27 = $25&255;
       HEAP8[$10>>0] = $27;
       $k$02 = $13;
       while(1) {
        $28 = (($r) + ($k$02)|0);
        $29 = HEAP8[$28>>0]|0;
        $30 = ($29<<24>>24)==(0);
        if ($30) {
         $$lcssa = $28;
         break;
        }
        HEAP8[$28>>0] = 0;
        $31 = (($k$02) + 1)|0;
        $32 = ($31|0)<(256);
        if ($32) {
         $k$02 = $31;
        } else {
         break L9;
        }
       }
       HEAP8[$$lcssa>>0] = 1;
      }
     } while(0);
     $33 = (($b$03) + 1)|0;
     $34 = ($33|0)<(7);
     if ($34) {
      $b$03 = $33;
     } else {
      break;
     }
    }
   }
  } while(0);
  $35 = (($i$14) + 1)|0;
  $exitcond = ($35|0)==(256);
  if ($exitcond) {
   break;
  } else {
   $i$14 = $35;
  }
 }
 return;
}
function _select28($t,$pos,$b) {
 $t = $t|0;
 $pos = $pos|0;
 $b = $b|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $minust = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0;
 $minust = sp;
 $0 = (_negative($b)|0);
 $1 = $b << 24 >> 24;
 $2 = $0&255;
 $3 = (0 - ($2))|0;
 $4 = $1 & $3;
 $5 = $4 << 1;
 $6 = (($1) - ($5))|0;
 $7 = $6&255;
 _fe_1($t);
 $8 = ((($t)) + 40|0);
 _fe_1($8);
 $9 = ((($t)) + 80|0);
 _fe_0($9);
 $10 = (1728 + (($pos*960)|0)|0);
 $11 = (_equal($7,1)|0);
 _cmov($t,$10,$11);
 $12 = (((1728 + (($pos*960)|0)|0)) + 120|0);
 $13 = (_equal($7,2)|0);
 _cmov($t,$12,$13);
 $14 = (((1728 + (($pos*960)|0)|0)) + 240|0);
 $15 = (_equal($7,3)|0);
 _cmov($t,$14,$15);
 $16 = (((1728 + (($pos*960)|0)|0)) + 360|0);
 $17 = (_equal($7,4)|0);
 _cmov($t,$16,$17);
 $18 = (((1728 + (($pos*960)|0)|0)) + 480|0);
 $19 = (_equal($7,5)|0);
 _cmov($t,$18,$19);
 $20 = (((1728 + (($pos*960)|0)|0)) + 600|0);
 $21 = (_equal($7,6)|0);
 _cmov($t,$20,$21);
 $22 = (((1728 + (($pos*960)|0)|0)) + 720|0);
 $23 = (_equal($7,7)|0);
 _cmov($t,$22,$23);
 $24 = (((1728 + (($pos*960)|0)|0)) + 840|0);
 $25 = (_equal($7,8)|0);
 _cmov($t,$24,$25);
 _fe_copy($minust,$8);
 $26 = ((($minust)) + 40|0);
 _fe_copy($26,$t);
 $27 = ((($minust)) + 80|0);
 _fe_neg($27,$9);
 _cmov($t,$minust,$0);
 STACKTOP = sp;return;
}
function _negative($b) {
 $b = $b|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $b << 24 >> 24;
 $1 = ($0|0)<(0);
 $2 = $1 << 31 >> 31;
 $3 = (_bitshift64Lshr(($0|0),($2|0),63)|0);
 $4 = tempRet0;
 $5 = $3&255;
 return ($5|0);
}
function _equal($b,$c) {
 $b = $b|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $c ^ $b;
 $1 = $0&255;
 $2 = (_i64Add(($1|0),0,-1,-1)|0);
 $3 = tempRet0;
 $4 = (_bitshift64Lshr(($2|0),($3|0),63)|0);
 $5 = tempRet0;
 $6 = $4&255;
 return ($6|0);
}
function _cmov($t,$u,$b) {
 $t = $t|0;
 $u = $u|0;
 $b = $b|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $b&255;
 _fe_cmov($t,$u,$0);
 $1 = ((($t)) + 40|0);
 $2 = ((($u)) + 40|0);
 _fe_cmov($1,$2,$0);
 $3 = ((($t)) + 80|0);
 $4 = ((($u)) + 80|0);
 _fe_cmov($3,$4,$0);
 return;
}
function _ed25519_create_keypair($public_key,$private_key,$seed) {
 $public_key = $public_key|0;
 $private_key = $private_key|0;
 $seed = $seed|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $A = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 160|0;
 $A = sp;
 (_sha512($seed,32,$private_key)|0);
 $0 = HEAP8[$private_key>>0]|0;
 $1 = $0&255;
 $2 = $1 & 248;
 $3 = $2&255;
 HEAP8[$private_key>>0] = $3;
 $4 = ((($private_key)) + 31|0);
 $5 = HEAP8[$4>>0]|0;
 $6 = $5&255;
 $7 = $6 & 63;
 $8 = $7 | 64;
 $9 = $8&255;
 HEAP8[$4>>0] = $9;
 _ge_scalarmult_base($A,$private_key);
 _ge_p3_tobytes($public_key,$A);
 STACKTOP = sp;return;
}
function _sc_reduce($s) {
 $s = $s|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0;
 var $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0;
 var $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0;
 var $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0;
 var $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0;
 var $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0;
 var $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0;
 var $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0;
 var $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0;
 var $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0;
 var $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0;
 var $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0;
 var $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0;
 var $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0;
 var $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0;
 var $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0;
 var $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0;
 var $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0;
 var $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0;
 var $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0;
 var $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0;
 var $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0;
 var $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0;
 var $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0;
 var $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0;
 var $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0;
 var $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0;
 var $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0;
 var $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0;
 var $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0;
 var $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0;
 var $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0;
 var $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0;
 var $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0;
 var $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0;
 var $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0;
 var $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0;
 var $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0;
 var $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0;
 var $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0;
 var $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0;
 var $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0;
 var $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0;
 var $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0;
 var $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0;
 var $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0;
 var $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0;
 var $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0;
 var $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0;
 var $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0;
 var $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0;
 var $997 = 0, $998 = 0, $999 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_load_319($s)|0);
 $1 = tempRet0;
 $2 = $0 & 2097151;
 $3 = ((($s)) + 2|0);
 $4 = (_load_420($3)|0);
 $5 = tempRet0;
 $6 = (_bitshift64Lshr(($4|0),($5|0),5)|0);
 $7 = tempRet0;
 $8 = $6 & 2097151;
 $9 = ((($s)) + 5|0);
 $10 = (_load_319($9)|0);
 $11 = tempRet0;
 $12 = (_bitshift64Lshr(($10|0),($11|0),2)|0);
 $13 = tempRet0;
 $14 = $12 & 2097151;
 $15 = ((($s)) + 7|0);
 $16 = (_load_420($15)|0);
 $17 = tempRet0;
 $18 = (_bitshift64Lshr(($16|0),($17|0),7)|0);
 $19 = tempRet0;
 $20 = $18 & 2097151;
 $21 = ((($s)) + 10|0);
 $22 = (_load_420($21)|0);
 $23 = tempRet0;
 $24 = (_bitshift64Lshr(($22|0),($23|0),4)|0);
 $25 = tempRet0;
 $26 = $24 & 2097151;
 $27 = ((($s)) + 13|0);
 $28 = (_load_319($27)|0);
 $29 = tempRet0;
 $30 = (_bitshift64Lshr(($28|0),($29|0),1)|0);
 $31 = tempRet0;
 $32 = $30 & 2097151;
 $33 = ((($s)) + 15|0);
 $34 = (_load_420($33)|0);
 $35 = tempRet0;
 $36 = (_bitshift64Lshr(($34|0),($35|0),6)|0);
 $37 = tempRet0;
 $38 = $36 & 2097151;
 $39 = ((($s)) + 18|0);
 $40 = (_load_319($39)|0);
 $41 = tempRet0;
 $42 = (_bitshift64Lshr(($40|0),($41|0),3)|0);
 $43 = tempRet0;
 $44 = $42 & 2097151;
 $45 = ((($s)) + 21|0);
 $46 = (_load_319($45)|0);
 $47 = tempRet0;
 $48 = $46 & 2097151;
 $49 = ((($s)) + 23|0);
 $50 = (_load_420($49)|0);
 $51 = tempRet0;
 $52 = (_bitshift64Lshr(($50|0),($51|0),5)|0);
 $53 = tempRet0;
 $54 = $52 & 2097151;
 $55 = ((($s)) + 26|0);
 $56 = (_load_319($55)|0);
 $57 = tempRet0;
 $58 = (_bitshift64Lshr(($56|0),($57|0),2)|0);
 $59 = tempRet0;
 $60 = $58 & 2097151;
 $61 = ((($s)) + 28|0);
 $62 = (_load_420($61)|0);
 $63 = tempRet0;
 $64 = (_bitshift64Lshr(($62|0),($63|0),7)|0);
 $65 = tempRet0;
 $66 = $64 & 2097151;
 $67 = ((($s)) + 31|0);
 $68 = (_load_420($67)|0);
 $69 = tempRet0;
 $70 = (_bitshift64Lshr(($68|0),($69|0),4)|0);
 $71 = tempRet0;
 $72 = $70 & 2097151;
 $73 = ((($s)) + 34|0);
 $74 = (_load_319($73)|0);
 $75 = tempRet0;
 $76 = (_bitshift64Lshr(($74|0),($75|0),1)|0);
 $77 = tempRet0;
 $78 = $76 & 2097151;
 $79 = ((($s)) + 36|0);
 $80 = (_load_420($79)|0);
 $81 = tempRet0;
 $82 = (_bitshift64Lshr(($80|0),($81|0),6)|0);
 $83 = tempRet0;
 $84 = $82 & 2097151;
 $85 = ((($s)) + 39|0);
 $86 = (_load_319($85)|0);
 $87 = tempRet0;
 $88 = (_bitshift64Lshr(($86|0),($87|0),3)|0);
 $89 = tempRet0;
 $90 = $88 & 2097151;
 $91 = ((($s)) + 42|0);
 $92 = (_load_319($91)|0);
 $93 = tempRet0;
 $94 = $92 & 2097151;
 $95 = ((($s)) + 44|0);
 $96 = (_load_420($95)|0);
 $97 = tempRet0;
 $98 = (_bitshift64Lshr(($96|0),($97|0),5)|0);
 $99 = tempRet0;
 $100 = $98 & 2097151;
 $101 = ((($s)) + 47|0);
 $102 = (_load_319($101)|0);
 $103 = tempRet0;
 $104 = (_bitshift64Lshr(($102|0),($103|0),2)|0);
 $105 = tempRet0;
 $106 = $104 & 2097151;
 $107 = ((($s)) + 49|0);
 $108 = (_load_420($107)|0);
 $109 = tempRet0;
 $110 = (_bitshift64Lshr(($108|0),($109|0),7)|0);
 $111 = tempRet0;
 $112 = $110 & 2097151;
 $113 = ((($s)) + 52|0);
 $114 = (_load_420($113)|0);
 $115 = tempRet0;
 $116 = (_bitshift64Lshr(($114|0),($115|0),4)|0);
 $117 = tempRet0;
 $118 = $116 & 2097151;
 $119 = ((($s)) + 55|0);
 $120 = (_load_319($119)|0);
 $121 = tempRet0;
 $122 = (_bitshift64Lshr(($120|0),($121|0),1)|0);
 $123 = tempRet0;
 $124 = $122 & 2097151;
 $125 = ((($s)) + 57|0);
 $126 = (_load_420($125)|0);
 $127 = tempRet0;
 $128 = (_bitshift64Lshr(($126|0),($127|0),6)|0);
 $129 = tempRet0;
 $130 = $128 & 2097151;
 $131 = ((($s)) + 60|0);
 $132 = (_load_420($131)|0);
 $133 = tempRet0;
 $134 = (_bitshift64Lshr(($132|0),($133|0),3)|0);
 $135 = tempRet0;
 $136 = (___muldi3(($134|0),($135|0),666643,0)|0);
 $137 = tempRet0;
 $138 = (_i64Add(($66|0),0,($136|0),($137|0))|0);
 $139 = tempRet0;
 $140 = (___muldi3(($134|0),($135|0),470296,0)|0);
 $141 = tempRet0;
 $142 = (_i64Add(($72|0),0,($140|0),($141|0))|0);
 $143 = tempRet0;
 $144 = (___muldi3(($134|0),($135|0),654183,0)|0);
 $145 = tempRet0;
 $146 = (_i64Add(($78|0),0,($144|0),($145|0))|0);
 $147 = tempRet0;
 $148 = (___muldi3(($134|0),($135|0),-997805,-1)|0);
 $149 = tempRet0;
 $150 = (_i64Add(($84|0),0,($148|0),($149|0))|0);
 $151 = tempRet0;
 $152 = (___muldi3(($134|0),($135|0),136657,0)|0);
 $153 = tempRet0;
 $154 = (_i64Add(($90|0),0,($152|0),($153|0))|0);
 $155 = tempRet0;
 $156 = (___muldi3(($134|0),($135|0),-683901,-1)|0);
 $157 = tempRet0;
 $158 = (_i64Add(($94|0),0,($156|0),($157|0))|0);
 $159 = tempRet0;
 $160 = (___muldi3(($130|0),0,666643,0)|0);
 $161 = tempRet0;
 $162 = (_i64Add(($60|0),0,($160|0),($161|0))|0);
 $163 = tempRet0;
 $164 = (___muldi3(($130|0),0,470296,0)|0);
 $165 = tempRet0;
 $166 = (_i64Add(($164|0),($165|0),($138|0),($139|0))|0);
 $167 = tempRet0;
 $168 = (___muldi3(($130|0),0,654183,0)|0);
 $169 = tempRet0;
 $170 = (_i64Add(($168|0),($169|0),($142|0),($143|0))|0);
 $171 = tempRet0;
 $172 = (___muldi3(($130|0),0,-997805,-1)|0);
 $173 = tempRet0;
 $174 = (_i64Add(($172|0),($173|0),($146|0),($147|0))|0);
 $175 = tempRet0;
 $176 = (___muldi3(($130|0),0,136657,0)|0);
 $177 = tempRet0;
 $178 = (_i64Add(($176|0),($177|0),($150|0),($151|0))|0);
 $179 = tempRet0;
 $180 = (___muldi3(($130|0),0,-683901,-1)|0);
 $181 = tempRet0;
 $182 = (_i64Add(($154|0),($155|0),($180|0),($181|0))|0);
 $183 = tempRet0;
 $184 = (___muldi3(($124|0),0,666643,0)|0);
 $185 = tempRet0;
 $186 = (_i64Add(($54|0),0,($184|0),($185|0))|0);
 $187 = tempRet0;
 $188 = (___muldi3(($124|0),0,470296,0)|0);
 $189 = tempRet0;
 $190 = (_i64Add(($188|0),($189|0),($162|0),($163|0))|0);
 $191 = tempRet0;
 $192 = (___muldi3(($124|0),0,654183,0)|0);
 $193 = tempRet0;
 $194 = (_i64Add(($192|0),($193|0),($166|0),($167|0))|0);
 $195 = tempRet0;
 $196 = (___muldi3(($124|0),0,-997805,-1)|0);
 $197 = tempRet0;
 $198 = (_i64Add(($196|0),($197|0),($170|0),($171|0))|0);
 $199 = tempRet0;
 $200 = (___muldi3(($124|0),0,136657,0)|0);
 $201 = tempRet0;
 $202 = (_i64Add(($200|0),($201|0),($174|0),($175|0))|0);
 $203 = tempRet0;
 $204 = (___muldi3(($124|0),0,-683901,-1)|0);
 $205 = tempRet0;
 $206 = (_i64Add(($178|0),($179|0),($204|0),($205|0))|0);
 $207 = tempRet0;
 $208 = (___muldi3(($118|0),0,666643,0)|0);
 $209 = tempRet0;
 $210 = (___muldi3(($118|0),0,470296,0)|0);
 $211 = tempRet0;
 $212 = (_i64Add(($210|0),($211|0),($186|0),($187|0))|0);
 $213 = tempRet0;
 $214 = (___muldi3(($118|0),0,654183,0)|0);
 $215 = tempRet0;
 $216 = (_i64Add(($214|0),($215|0),($190|0),($191|0))|0);
 $217 = tempRet0;
 $218 = (___muldi3(($118|0),0,-997805,-1)|0);
 $219 = tempRet0;
 $220 = (_i64Add(($218|0),($219|0),($194|0),($195|0))|0);
 $221 = tempRet0;
 $222 = (___muldi3(($118|0),0,136657,0)|0);
 $223 = tempRet0;
 $224 = (_i64Add(($222|0),($223|0),($198|0),($199|0))|0);
 $225 = tempRet0;
 $226 = (___muldi3(($118|0),0,-683901,-1)|0);
 $227 = tempRet0;
 $228 = (_i64Add(($202|0),($203|0),($226|0),($227|0))|0);
 $229 = tempRet0;
 $230 = (___muldi3(($112|0),0,666643,0)|0);
 $231 = tempRet0;
 $232 = (___muldi3(($112|0),0,470296,0)|0);
 $233 = tempRet0;
 $234 = (___muldi3(($112|0),0,654183,0)|0);
 $235 = tempRet0;
 $236 = (_i64Add(($234|0),($235|0),($212|0),($213|0))|0);
 $237 = tempRet0;
 $238 = (___muldi3(($112|0),0,-997805,-1)|0);
 $239 = tempRet0;
 $240 = (_i64Add(($216|0),($217|0),($238|0),($239|0))|0);
 $241 = tempRet0;
 $242 = (___muldi3(($112|0),0,136657,0)|0);
 $243 = tempRet0;
 $244 = (_i64Add(($242|0),($243|0),($220|0),($221|0))|0);
 $245 = tempRet0;
 $246 = (___muldi3(($112|0),0,-683901,-1)|0);
 $247 = tempRet0;
 $248 = (_i64Add(($224|0),($225|0),($246|0),($247|0))|0);
 $249 = tempRet0;
 $250 = (___muldi3(($106|0),0,666643,0)|0);
 $251 = tempRet0;
 $252 = (_i64Add(($250|0),($251|0),($38|0),0)|0);
 $253 = tempRet0;
 $254 = (___muldi3(($106|0),0,470296,0)|0);
 $255 = tempRet0;
 $256 = (___muldi3(($106|0),0,654183,0)|0);
 $257 = tempRet0;
 $258 = (_i64Add(($256|0),($257|0),($48|0),0)|0);
 $259 = tempRet0;
 $260 = (_i64Add(($258|0),($259|0),($232|0),($233|0))|0);
 $261 = tempRet0;
 $262 = (_i64Add(($260|0),($261|0),($208|0),($209|0))|0);
 $263 = tempRet0;
 $264 = (___muldi3(($106|0),0,-997805,-1)|0);
 $265 = tempRet0;
 $266 = (_i64Add(($236|0),($237|0),($264|0),($265|0))|0);
 $267 = tempRet0;
 $268 = (___muldi3(($106|0),0,136657,0)|0);
 $269 = tempRet0;
 $270 = (_i64Add(($240|0),($241|0),($268|0),($269|0))|0);
 $271 = tempRet0;
 $272 = (___muldi3(($106|0),0,-683901,-1)|0);
 $273 = tempRet0;
 $274 = (_i64Add(($244|0),($245|0),($272|0),($273|0))|0);
 $275 = tempRet0;
 $276 = (_i64Add(($252|0),($253|0),1048576,0)|0);
 $277 = tempRet0;
 $278 = (_bitshift64Lshr(($276|0),($277|0),21)|0);
 $279 = tempRet0;
 $280 = (_i64Add(($254|0),($255|0),($44|0),0)|0);
 $281 = tempRet0;
 $282 = (_i64Add(($280|0),($281|0),($230|0),($231|0))|0);
 $283 = tempRet0;
 $284 = (_i64Add(($282|0),($283|0),($278|0),($279|0))|0);
 $285 = tempRet0;
 $286 = (_bitshift64Shl(($278|0),($279|0),21)|0);
 $287 = tempRet0;
 $288 = (_i64Subtract(($252|0),($253|0),($286|0),($287|0))|0);
 $289 = tempRet0;
 $290 = (_i64Add(($262|0),($263|0),1048576,0)|0);
 $291 = tempRet0;
 $292 = (_bitshift64Lshr(($290|0),($291|0),21)|0);
 $293 = tempRet0;
 $294 = (_i64Add(($266|0),($267|0),($292|0),($293|0))|0);
 $295 = tempRet0;
 $296 = (_bitshift64Shl(($292|0),($293|0),21)|0);
 $297 = tempRet0;
 $298 = (_i64Subtract(($262|0),($263|0),($296|0),($297|0))|0);
 $299 = tempRet0;
 $300 = (_i64Add(($270|0),($271|0),1048576,0)|0);
 $301 = tempRet0;
 $302 = (_bitshift64Ashr(($300|0),($301|0),21)|0);
 $303 = tempRet0;
 $304 = (_i64Add(($302|0),($303|0),($274|0),($275|0))|0);
 $305 = tempRet0;
 $306 = (_bitshift64Shl(($302|0),($303|0),21)|0);
 $307 = tempRet0;
 $308 = (_i64Subtract(($270|0),($271|0),($306|0),($307|0))|0);
 $309 = tempRet0;
 $310 = (_i64Add(($248|0),($249|0),1048576,0)|0);
 $311 = tempRet0;
 $312 = (_bitshift64Ashr(($310|0),($311|0),21)|0);
 $313 = tempRet0;
 $314 = (_i64Add(($312|0),($313|0),($228|0),($229|0))|0);
 $315 = tempRet0;
 $316 = (_bitshift64Shl(($312|0),($313|0),21)|0);
 $317 = tempRet0;
 $318 = (_i64Subtract(($248|0),($249|0),($316|0),($317|0))|0);
 $319 = tempRet0;
 $320 = (_i64Add(($206|0),($207|0),1048576,0)|0);
 $321 = tempRet0;
 $322 = (_bitshift64Ashr(($320|0),($321|0),21)|0);
 $323 = tempRet0;
 $324 = (_i64Add(($322|0),($323|0),($182|0),($183|0))|0);
 $325 = tempRet0;
 $326 = (_bitshift64Shl(($322|0),($323|0),21)|0);
 $327 = tempRet0;
 $328 = (_i64Subtract(($206|0),($207|0),($326|0),($327|0))|0);
 $329 = tempRet0;
 $330 = (_i64Add(($158|0),($159|0),1048576,0)|0);
 $331 = tempRet0;
 $332 = (_bitshift64Ashr(($330|0),($331|0),21)|0);
 $333 = tempRet0;
 $334 = (_i64Add(($332|0),($333|0),($100|0),0)|0);
 $335 = tempRet0;
 $336 = (_bitshift64Shl(($332|0),($333|0),21)|0);
 $337 = tempRet0;
 $338 = (_i64Subtract(($158|0),($159|0),($336|0),($337|0))|0);
 $339 = tempRet0;
 $340 = (_i64Add(($284|0),($285|0),1048576,0)|0);
 $341 = tempRet0;
 $342 = (_bitshift64Lshr(($340|0),($341|0),21)|0);
 $343 = tempRet0;
 $344 = (_i64Add(($342|0),($343|0),($298|0),($299|0))|0);
 $345 = tempRet0;
 $346 = (_bitshift64Shl(($342|0),($343|0),21)|0);
 $347 = tempRet0;
 $348 = (_i64Subtract(($284|0),($285|0),($346|0),($347|0))|0);
 $349 = tempRet0;
 $350 = (_i64Add(($294|0),($295|0),1048576,0)|0);
 $351 = tempRet0;
 $352 = (_bitshift64Ashr(($350|0),($351|0),21)|0);
 $353 = tempRet0;
 $354 = (_i64Add(($352|0),($353|0),($308|0),($309|0))|0);
 $355 = tempRet0;
 $356 = (_bitshift64Shl(($352|0),($353|0),21)|0);
 $357 = tempRet0;
 $358 = (_i64Subtract(($294|0),($295|0),($356|0),($357|0))|0);
 $359 = tempRet0;
 $360 = (_i64Add(($304|0),($305|0),1048576,0)|0);
 $361 = tempRet0;
 $362 = (_bitshift64Ashr(($360|0),($361|0),21)|0);
 $363 = tempRet0;
 $364 = (_i64Add(($362|0),($363|0),($318|0),($319|0))|0);
 $365 = tempRet0;
 $366 = (_bitshift64Shl(($362|0),($363|0),21)|0);
 $367 = tempRet0;
 $368 = (_i64Subtract(($304|0),($305|0),($366|0),($367|0))|0);
 $369 = tempRet0;
 $370 = (_i64Add(($314|0),($315|0),1048576,0)|0);
 $371 = tempRet0;
 $372 = (_bitshift64Ashr(($370|0),($371|0),21)|0);
 $373 = tempRet0;
 $374 = (_i64Add(($372|0),($373|0),($328|0),($329|0))|0);
 $375 = tempRet0;
 $376 = (_bitshift64Shl(($372|0),($373|0),21)|0);
 $377 = tempRet0;
 $378 = (_i64Subtract(($314|0),($315|0),($376|0),($377|0))|0);
 $379 = tempRet0;
 $380 = (_i64Add(($324|0),($325|0),1048576,0)|0);
 $381 = tempRet0;
 $382 = (_bitshift64Ashr(($380|0),($381|0),21)|0);
 $383 = tempRet0;
 $384 = (_i64Add(($382|0),($383|0),($338|0),($339|0))|0);
 $385 = tempRet0;
 $386 = (_bitshift64Shl(($382|0),($383|0),21)|0);
 $387 = tempRet0;
 $388 = (_i64Subtract(($324|0),($325|0),($386|0),($387|0))|0);
 $389 = tempRet0;
 $390 = (___muldi3(($334|0),($335|0),666643,0)|0);
 $391 = tempRet0;
 $392 = (_i64Add(($32|0),0,($390|0),($391|0))|0);
 $393 = tempRet0;
 $394 = (___muldi3(($334|0),($335|0),470296,0)|0);
 $395 = tempRet0;
 $396 = (_i64Add(($288|0),($289|0),($394|0),($395|0))|0);
 $397 = tempRet0;
 $398 = (___muldi3(($334|0),($335|0),654183,0)|0);
 $399 = tempRet0;
 $400 = (_i64Add(($348|0),($349|0),($398|0),($399|0))|0);
 $401 = tempRet0;
 $402 = (___muldi3(($334|0),($335|0),-997805,-1)|0);
 $403 = tempRet0;
 $404 = (_i64Add(($402|0),($403|0),($344|0),($345|0))|0);
 $405 = tempRet0;
 $406 = (___muldi3(($334|0),($335|0),136657,0)|0);
 $407 = tempRet0;
 $408 = (_i64Add(($406|0),($407|0),($358|0),($359|0))|0);
 $409 = tempRet0;
 $410 = (___muldi3(($334|0),($335|0),-683901,-1)|0);
 $411 = tempRet0;
 $412 = (_i64Add(($354|0),($355|0),($410|0),($411|0))|0);
 $413 = tempRet0;
 $414 = (___muldi3(($384|0),($385|0),666643,0)|0);
 $415 = tempRet0;
 $416 = (_i64Add(($26|0),0,($414|0),($415|0))|0);
 $417 = tempRet0;
 $418 = (___muldi3(($384|0),($385|0),470296,0)|0);
 $419 = tempRet0;
 $420 = (_i64Add(($392|0),($393|0),($418|0),($419|0))|0);
 $421 = tempRet0;
 $422 = (___muldi3(($384|0),($385|0),654183,0)|0);
 $423 = tempRet0;
 $424 = (_i64Add(($396|0),($397|0),($422|0),($423|0))|0);
 $425 = tempRet0;
 $426 = (___muldi3(($384|0),($385|0),-997805,-1)|0);
 $427 = tempRet0;
 $428 = (_i64Add(($400|0),($401|0),($426|0),($427|0))|0);
 $429 = tempRet0;
 $430 = (___muldi3(($384|0),($385|0),136657,0)|0);
 $431 = tempRet0;
 $432 = (_i64Add(($404|0),($405|0),($430|0),($431|0))|0);
 $433 = tempRet0;
 $434 = (___muldi3(($384|0),($385|0),-683901,-1)|0);
 $435 = tempRet0;
 $436 = (_i64Add(($408|0),($409|0),($434|0),($435|0))|0);
 $437 = tempRet0;
 $438 = (___muldi3(($388|0),($389|0),666643,0)|0);
 $439 = tempRet0;
 $440 = (_i64Add(($20|0),0,($438|0),($439|0))|0);
 $441 = tempRet0;
 $442 = (___muldi3(($388|0),($389|0),470296,0)|0);
 $443 = tempRet0;
 $444 = (_i64Add(($416|0),($417|0),($442|0),($443|0))|0);
 $445 = tempRet0;
 $446 = (___muldi3(($388|0),($389|0),654183,0)|0);
 $447 = tempRet0;
 $448 = (_i64Add(($420|0),($421|0),($446|0),($447|0))|0);
 $449 = tempRet0;
 $450 = (___muldi3(($388|0),($389|0),-997805,-1)|0);
 $451 = tempRet0;
 $452 = (_i64Add(($424|0),($425|0),($450|0),($451|0))|0);
 $453 = tempRet0;
 $454 = (___muldi3(($388|0),($389|0),136657,0)|0);
 $455 = tempRet0;
 $456 = (_i64Add(($428|0),($429|0),($454|0),($455|0))|0);
 $457 = tempRet0;
 $458 = (___muldi3(($388|0),($389|0),-683901,-1)|0);
 $459 = tempRet0;
 $460 = (_i64Add(($432|0),($433|0),($458|0),($459|0))|0);
 $461 = tempRet0;
 $462 = (___muldi3(($374|0),($375|0),666643,0)|0);
 $463 = tempRet0;
 $464 = (_i64Add(($462|0),($463|0),($14|0),0)|0);
 $465 = tempRet0;
 $466 = (___muldi3(($374|0),($375|0),470296,0)|0);
 $467 = tempRet0;
 $468 = (_i64Add(($440|0),($441|0),($466|0),($467|0))|0);
 $469 = tempRet0;
 $470 = (___muldi3(($374|0),($375|0),654183,0)|0);
 $471 = tempRet0;
 $472 = (_i64Add(($444|0),($445|0),($470|0),($471|0))|0);
 $473 = tempRet0;
 $474 = (___muldi3(($374|0),($375|0),-997805,-1)|0);
 $475 = tempRet0;
 $476 = (_i64Add(($448|0),($449|0),($474|0),($475|0))|0);
 $477 = tempRet0;
 $478 = (___muldi3(($374|0),($375|0),136657,0)|0);
 $479 = tempRet0;
 $480 = (_i64Add(($452|0),($453|0),($478|0),($479|0))|0);
 $481 = tempRet0;
 $482 = (___muldi3(($374|0),($375|0),-683901,-1)|0);
 $483 = tempRet0;
 $484 = (_i64Add(($456|0),($457|0),($482|0),($483|0))|0);
 $485 = tempRet0;
 $486 = (___muldi3(($378|0),($379|0),666643,0)|0);
 $487 = tempRet0;
 $488 = (___muldi3(($378|0),($379|0),470296,0)|0);
 $489 = tempRet0;
 $490 = (___muldi3(($378|0),($379|0),654183,0)|0);
 $491 = tempRet0;
 $492 = (_i64Add(($468|0),($469|0),($490|0),($491|0))|0);
 $493 = tempRet0;
 $494 = (___muldi3(($378|0),($379|0),-997805,-1)|0);
 $495 = tempRet0;
 $496 = (_i64Add(($472|0),($473|0),($494|0),($495|0))|0);
 $497 = tempRet0;
 $498 = (___muldi3(($378|0),($379|0),136657,0)|0);
 $499 = tempRet0;
 $500 = (_i64Add(($476|0),($477|0),($498|0),($499|0))|0);
 $501 = tempRet0;
 $502 = (___muldi3(($378|0),($379|0),-683901,-1)|0);
 $503 = tempRet0;
 $504 = (_i64Add(($480|0),($481|0),($502|0),($503|0))|0);
 $505 = tempRet0;
 $506 = (___muldi3(($364|0),($365|0),666643,0)|0);
 $507 = tempRet0;
 $508 = (_i64Add(($506|0),($507|0),($2|0),0)|0);
 $509 = tempRet0;
 $510 = (___muldi3(($364|0),($365|0),470296,0)|0);
 $511 = tempRet0;
 $512 = (___muldi3(($364|0),($365|0),654183,0)|0);
 $513 = tempRet0;
 $514 = (_i64Add(($464|0),($465|0),($512|0),($513|0))|0);
 $515 = tempRet0;
 $516 = (_i64Add(($514|0),($515|0),($488|0),($489|0))|0);
 $517 = tempRet0;
 $518 = (___muldi3(($364|0),($365|0),-997805,-1)|0);
 $519 = tempRet0;
 $520 = (_i64Add(($492|0),($493|0),($518|0),($519|0))|0);
 $521 = tempRet0;
 $522 = (___muldi3(($364|0),($365|0),136657,0)|0);
 $523 = tempRet0;
 $524 = (_i64Add(($496|0),($497|0),($522|0),($523|0))|0);
 $525 = tempRet0;
 $526 = (___muldi3(($364|0),($365|0),-683901,-1)|0);
 $527 = tempRet0;
 $528 = (_i64Add(($500|0),($501|0),($526|0),($527|0))|0);
 $529 = tempRet0;
 $530 = (_i64Add(($508|0),($509|0),1048576,0)|0);
 $531 = tempRet0;
 $532 = (_bitshift64Ashr(($530|0),($531|0),21)|0);
 $533 = tempRet0;
 $534 = (_i64Add(($510|0),($511|0),($8|0),0)|0);
 $535 = tempRet0;
 $536 = (_i64Add(($534|0),($535|0),($486|0),($487|0))|0);
 $537 = tempRet0;
 $538 = (_i64Add(($536|0),($537|0),($532|0),($533|0))|0);
 $539 = tempRet0;
 $540 = (_bitshift64Shl(($532|0),($533|0),21)|0);
 $541 = tempRet0;
 $542 = (_i64Subtract(($508|0),($509|0),($540|0),($541|0))|0);
 $543 = tempRet0;
 $544 = (_i64Add(($516|0),($517|0),1048576,0)|0);
 $545 = tempRet0;
 $546 = (_bitshift64Ashr(($544|0),($545|0),21)|0);
 $547 = tempRet0;
 $548 = (_i64Add(($546|0),($547|0),($520|0),($521|0))|0);
 $549 = tempRet0;
 $550 = (_bitshift64Shl(($546|0),($547|0),21)|0);
 $551 = tempRet0;
 $552 = (_i64Add(($524|0),($525|0),1048576,0)|0);
 $553 = tempRet0;
 $554 = (_bitshift64Ashr(($552|0),($553|0),21)|0);
 $555 = tempRet0;
 $556 = (_i64Add(($554|0),($555|0),($528|0),($529|0))|0);
 $557 = tempRet0;
 $558 = (_bitshift64Shl(($554|0),($555|0),21)|0);
 $559 = tempRet0;
 $560 = (_i64Add(($504|0),($505|0),1048576,0)|0);
 $561 = tempRet0;
 $562 = (_bitshift64Ashr(($560|0),($561|0),21)|0);
 $563 = tempRet0;
 $564 = (_i64Add(($562|0),($563|0),($484|0),($485|0))|0);
 $565 = tempRet0;
 $566 = (_bitshift64Shl(($562|0),($563|0),21)|0);
 $567 = tempRet0;
 $568 = (_i64Subtract(($504|0),($505|0),($566|0),($567|0))|0);
 $569 = tempRet0;
 $570 = (_i64Add(($460|0),($461|0),1048576,0)|0);
 $571 = tempRet0;
 $572 = (_bitshift64Ashr(($570|0),($571|0),21)|0);
 $573 = tempRet0;
 $574 = (_i64Add(($572|0),($573|0),($436|0),($437|0))|0);
 $575 = tempRet0;
 $576 = (_bitshift64Shl(($572|0),($573|0),21)|0);
 $577 = tempRet0;
 $578 = (_i64Subtract(($460|0),($461|0),($576|0),($577|0))|0);
 $579 = tempRet0;
 $580 = (_i64Add(($412|0),($413|0),1048576,0)|0);
 $581 = tempRet0;
 $582 = (_bitshift64Ashr(($580|0),($581|0),21)|0);
 $583 = tempRet0;
 $584 = (_i64Add(($582|0),($583|0),($368|0),($369|0))|0);
 $585 = tempRet0;
 $586 = (_bitshift64Shl(($582|0),($583|0),21)|0);
 $587 = tempRet0;
 $588 = (_i64Subtract(($412|0),($413|0),($586|0),($587|0))|0);
 $589 = tempRet0;
 $590 = (_i64Add(($538|0),($539|0),1048576,0)|0);
 $591 = tempRet0;
 $592 = (_bitshift64Ashr(($590|0),($591|0),21)|0);
 $593 = tempRet0;
 $594 = (_bitshift64Shl(($592|0),($593|0),21)|0);
 $595 = tempRet0;
 $596 = (_i64Add(($548|0),($549|0),1048576,0)|0);
 $597 = tempRet0;
 $598 = (_bitshift64Ashr(($596|0),($597|0),21)|0);
 $599 = tempRet0;
 $600 = (_bitshift64Shl(($598|0),($599|0),21)|0);
 $601 = tempRet0;
 $602 = (_i64Subtract(($548|0),($549|0),($600|0),($601|0))|0);
 $603 = tempRet0;
 $604 = (_i64Add(($556|0),($557|0),1048576,0)|0);
 $605 = tempRet0;
 $606 = (_bitshift64Ashr(($604|0),($605|0),21)|0);
 $607 = tempRet0;
 $608 = (_i64Add(($568|0),($569|0),($606|0),($607|0))|0);
 $609 = tempRet0;
 $610 = (_bitshift64Shl(($606|0),($607|0),21)|0);
 $611 = tempRet0;
 $612 = (_i64Subtract(($556|0),($557|0),($610|0),($611|0))|0);
 $613 = tempRet0;
 $614 = (_i64Add(($564|0),($565|0),1048576,0)|0);
 $615 = tempRet0;
 $616 = (_bitshift64Ashr(($614|0),($615|0),21)|0);
 $617 = tempRet0;
 $618 = (_i64Add(($578|0),($579|0),($616|0),($617|0))|0);
 $619 = tempRet0;
 $620 = (_bitshift64Shl(($616|0),($617|0),21)|0);
 $621 = tempRet0;
 $622 = (_i64Subtract(($564|0),($565|0),($620|0),($621|0))|0);
 $623 = tempRet0;
 $624 = (_i64Add(($574|0),($575|0),1048576,0)|0);
 $625 = tempRet0;
 $626 = (_bitshift64Ashr(($624|0),($625|0),21)|0);
 $627 = tempRet0;
 $628 = (_i64Add(($588|0),($589|0),($626|0),($627|0))|0);
 $629 = tempRet0;
 $630 = (_bitshift64Shl(($626|0),($627|0),21)|0);
 $631 = tempRet0;
 $632 = (_i64Subtract(($574|0),($575|0),($630|0),($631|0))|0);
 $633 = tempRet0;
 $634 = (_i64Add(($584|0),($585|0),1048576,0)|0);
 $635 = tempRet0;
 $636 = (_bitshift64Ashr(($634|0),($635|0),21)|0);
 $637 = tempRet0;
 $638 = (_bitshift64Shl(($636|0),($637|0),21)|0);
 $639 = tempRet0;
 $640 = (_i64Subtract(($584|0),($585|0),($638|0),($639|0))|0);
 $641 = tempRet0;
 $642 = (___muldi3(($636|0),($637|0),666643,0)|0);
 $643 = tempRet0;
 $644 = (_i64Add(($542|0),($543|0),($642|0),($643|0))|0);
 $645 = tempRet0;
 $646 = (___muldi3(($636|0),($637|0),470296,0)|0);
 $647 = tempRet0;
 $648 = (___muldi3(($636|0),($637|0),654183,0)|0);
 $649 = tempRet0;
 $650 = (___muldi3(($636|0),($637|0),-997805,-1)|0);
 $651 = tempRet0;
 $652 = (_i64Add(($602|0),($603|0),($650|0),($651|0))|0);
 $653 = tempRet0;
 $654 = (___muldi3(($636|0),($637|0),136657,0)|0);
 $655 = tempRet0;
 $656 = (___muldi3(($636|0),($637|0),-683901,-1)|0);
 $657 = tempRet0;
 $658 = (_i64Add(($612|0),($613|0),($656|0),($657|0))|0);
 $659 = tempRet0;
 $660 = (_bitshift64Ashr(($644|0),($645|0),21)|0);
 $661 = tempRet0;
 $662 = (_i64Add(($646|0),($647|0),($538|0),($539|0))|0);
 $663 = tempRet0;
 $664 = (_i64Subtract(($662|0),($663|0),($594|0),($595|0))|0);
 $665 = tempRet0;
 $666 = (_i64Add(($664|0),($665|0),($660|0),($661|0))|0);
 $667 = tempRet0;
 $668 = (_bitshift64Shl(($660|0),($661|0),21)|0);
 $669 = tempRet0;
 $670 = (_i64Subtract(($644|0),($645|0),($668|0),($669|0))|0);
 $671 = tempRet0;
 $672 = (_bitshift64Ashr(($666|0),($667|0),21)|0);
 $673 = tempRet0;
 $674 = (_i64Add(($648|0),($649|0),($516|0),($517|0))|0);
 $675 = tempRet0;
 $676 = (_i64Subtract(($674|0),($675|0),($550|0),($551|0))|0);
 $677 = tempRet0;
 $678 = (_i64Add(($676|0),($677|0),($592|0),($593|0))|0);
 $679 = tempRet0;
 $680 = (_i64Add(($678|0),($679|0),($672|0),($673|0))|0);
 $681 = tempRet0;
 $682 = (_bitshift64Shl(($672|0),($673|0),21)|0);
 $683 = tempRet0;
 $684 = (_i64Subtract(($666|0),($667|0),($682|0),($683|0))|0);
 $685 = tempRet0;
 $686 = (_bitshift64Ashr(($680|0),($681|0),21)|0);
 $687 = tempRet0;
 $688 = (_i64Add(($686|0),($687|0),($652|0),($653|0))|0);
 $689 = tempRet0;
 $690 = (_bitshift64Shl(($686|0),($687|0),21)|0);
 $691 = tempRet0;
 $692 = (_i64Subtract(($680|0),($681|0),($690|0),($691|0))|0);
 $693 = tempRet0;
 $694 = (_bitshift64Ashr(($688|0),($689|0),21)|0);
 $695 = tempRet0;
 $696 = (_i64Add(($654|0),($655|0),($524|0),($525|0))|0);
 $697 = tempRet0;
 $698 = (_i64Subtract(($696|0),($697|0),($558|0),($559|0))|0);
 $699 = tempRet0;
 $700 = (_i64Add(($698|0),($699|0),($598|0),($599|0))|0);
 $701 = tempRet0;
 $702 = (_i64Add(($700|0),($701|0),($694|0),($695|0))|0);
 $703 = tempRet0;
 $704 = (_bitshift64Shl(($694|0),($695|0),21)|0);
 $705 = tempRet0;
 $706 = (_i64Subtract(($688|0),($689|0),($704|0),($705|0))|0);
 $707 = tempRet0;
 $708 = (_bitshift64Ashr(($702|0),($703|0),21)|0);
 $709 = tempRet0;
 $710 = (_i64Add(($708|0),($709|0),($658|0),($659|0))|0);
 $711 = tempRet0;
 $712 = (_bitshift64Shl(($708|0),($709|0),21)|0);
 $713 = tempRet0;
 $714 = (_i64Subtract(($702|0),($703|0),($712|0),($713|0))|0);
 $715 = tempRet0;
 $716 = (_bitshift64Ashr(($710|0),($711|0),21)|0);
 $717 = tempRet0;
 $718 = (_i64Add(($608|0),($609|0),($716|0),($717|0))|0);
 $719 = tempRet0;
 $720 = (_bitshift64Shl(($716|0),($717|0),21)|0);
 $721 = tempRet0;
 $722 = (_i64Subtract(($710|0),($711|0),($720|0),($721|0))|0);
 $723 = tempRet0;
 $724 = (_bitshift64Ashr(($718|0),($719|0),21)|0);
 $725 = tempRet0;
 $726 = (_i64Add(($724|0),($725|0),($622|0),($623|0))|0);
 $727 = tempRet0;
 $728 = (_bitshift64Shl(($724|0),($725|0),21)|0);
 $729 = tempRet0;
 $730 = (_i64Subtract(($718|0),($719|0),($728|0),($729|0))|0);
 $731 = tempRet0;
 $732 = (_bitshift64Ashr(($726|0),($727|0),21)|0);
 $733 = tempRet0;
 $734 = (_i64Add(($618|0),($619|0),($732|0),($733|0))|0);
 $735 = tempRet0;
 $736 = (_bitshift64Shl(($732|0),($733|0),21)|0);
 $737 = tempRet0;
 $738 = (_i64Subtract(($726|0),($727|0),($736|0),($737|0))|0);
 $739 = tempRet0;
 $740 = (_bitshift64Ashr(($734|0),($735|0),21)|0);
 $741 = tempRet0;
 $742 = (_i64Add(($740|0),($741|0),($632|0),($633|0))|0);
 $743 = tempRet0;
 $744 = (_bitshift64Shl(($740|0),($741|0),21)|0);
 $745 = tempRet0;
 $746 = (_i64Subtract(($734|0),($735|0),($744|0),($745|0))|0);
 $747 = tempRet0;
 $748 = (_bitshift64Ashr(($742|0),($743|0),21)|0);
 $749 = tempRet0;
 $750 = (_i64Add(($628|0),($629|0),($748|0),($749|0))|0);
 $751 = tempRet0;
 $752 = (_bitshift64Shl(($748|0),($749|0),21)|0);
 $753 = tempRet0;
 $754 = (_i64Subtract(($742|0),($743|0),($752|0),($753|0))|0);
 $755 = tempRet0;
 $756 = (_bitshift64Ashr(($750|0),($751|0),21)|0);
 $757 = tempRet0;
 $758 = (_i64Add(($756|0),($757|0),($640|0),($641|0))|0);
 $759 = tempRet0;
 $760 = (_bitshift64Shl(($756|0),($757|0),21)|0);
 $761 = tempRet0;
 $762 = (_i64Subtract(($750|0),($751|0),($760|0),($761|0))|0);
 $763 = tempRet0;
 $764 = (_bitshift64Ashr(($758|0),($759|0),21)|0);
 $765 = tempRet0;
 $766 = (_bitshift64Shl(($764|0),($765|0),21)|0);
 $767 = tempRet0;
 $768 = (_i64Subtract(($758|0),($759|0),($766|0),($767|0))|0);
 $769 = tempRet0;
 $770 = (___muldi3(($764|0),($765|0),666643,0)|0);
 $771 = tempRet0;
 $772 = (_i64Add(($770|0),($771|0),($670|0),($671|0))|0);
 $773 = tempRet0;
 $774 = (___muldi3(($764|0),($765|0),470296,0)|0);
 $775 = tempRet0;
 $776 = (_i64Add(($684|0),($685|0),($774|0),($775|0))|0);
 $777 = tempRet0;
 $778 = (___muldi3(($764|0),($765|0),654183,0)|0);
 $779 = tempRet0;
 $780 = (_i64Add(($692|0),($693|0),($778|0),($779|0))|0);
 $781 = tempRet0;
 $782 = (___muldi3(($764|0),($765|0),-997805,-1)|0);
 $783 = tempRet0;
 $784 = (_i64Add(($706|0),($707|0),($782|0),($783|0))|0);
 $785 = tempRet0;
 $786 = (___muldi3(($764|0),($765|0),136657,0)|0);
 $787 = tempRet0;
 $788 = (_i64Add(($714|0),($715|0),($786|0),($787|0))|0);
 $789 = tempRet0;
 $790 = (___muldi3(($764|0),($765|0),-683901,-1)|0);
 $791 = tempRet0;
 $792 = (_i64Add(($722|0),($723|0),($790|0),($791|0))|0);
 $793 = tempRet0;
 $794 = (_bitshift64Ashr(($772|0),($773|0),21)|0);
 $795 = tempRet0;
 $796 = (_i64Add(($776|0),($777|0),($794|0),($795|0))|0);
 $797 = tempRet0;
 $798 = (_bitshift64Shl(($794|0),($795|0),21)|0);
 $799 = tempRet0;
 $800 = (_i64Subtract(($772|0),($773|0),($798|0),($799|0))|0);
 $801 = tempRet0;
 $802 = (_bitshift64Ashr(($796|0),($797|0),21)|0);
 $803 = tempRet0;
 $804 = (_i64Add(($780|0),($781|0),($802|0),($803|0))|0);
 $805 = tempRet0;
 $806 = (_bitshift64Shl(($802|0),($803|0),21)|0);
 $807 = tempRet0;
 $808 = (_i64Subtract(($796|0),($797|0),($806|0),($807|0))|0);
 $809 = tempRet0;
 $810 = (_bitshift64Ashr(($804|0),($805|0),21)|0);
 $811 = tempRet0;
 $812 = (_i64Add(($810|0),($811|0),($784|0),($785|0))|0);
 $813 = tempRet0;
 $814 = (_bitshift64Shl(($810|0),($811|0),21)|0);
 $815 = tempRet0;
 $816 = (_i64Subtract(($804|0),($805|0),($814|0),($815|0))|0);
 $817 = tempRet0;
 $818 = (_bitshift64Ashr(($812|0),($813|0),21)|0);
 $819 = tempRet0;
 $820 = (_i64Add(($788|0),($789|0),($818|0),($819|0))|0);
 $821 = tempRet0;
 $822 = (_bitshift64Shl(($818|0),($819|0),21)|0);
 $823 = tempRet0;
 $824 = (_i64Subtract(($812|0),($813|0),($822|0),($823|0))|0);
 $825 = tempRet0;
 $826 = (_bitshift64Ashr(($820|0),($821|0),21)|0);
 $827 = tempRet0;
 $828 = (_i64Add(($826|0),($827|0),($792|0),($793|0))|0);
 $829 = tempRet0;
 $830 = (_bitshift64Shl(($826|0),($827|0),21)|0);
 $831 = tempRet0;
 $832 = (_i64Subtract(($820|0),($821|0),($830|0),($831|0))|0);
 $833 = tempRet0;
 $834 = (_bitshift64Ashr(($828|0),($829|0),21)|0);
 $835 = tempRet0;
 $836 = (_i64Add(($834|0),($835|0),($730|0),($731|0))|0);
 $837 = tempRet0;
 $838 = (_bitshift64Shl(($834|0),($835|0),21)|0);
 $839 = tempRet0;
 $840 = (_i64Subtract(($828|0),($829|0),($838|0),($839|0))|0);
 $841 = tempRet0;
 $842 = (_bitshift64Ashr(($836|0),($837|0),21)|0);
 $843 = tempRet0;
 $844 = (_i64Add(($842|0),($843|0),($738|0),($739|0))|0);
 $845 = tempRet0;
 $846 = (_bitshift64Shl(($842|0),($843|0),21)|0);
 $847 = tempRet0;
 $848 = (_i64Subtract(($836|0),($837|0),($846|0),($847|0))|0);
 $849 = tempRet0;
 $850 = (_bitshift64Ashr(($844|0),($845|0),21)|0);
 $851 = tempRet0;
 $852 = (_i64Add(($850|0),($851|0),($746|0),($747|0))|0);
 $853 = tempRet0;
 $854 = (_bitshift64Shl(($850|0),($851|0),21)|0);
 $855 = tempRet0;
 $856 = (_i64Subtract(($844|0),($845|0),($854|0),($855|0))|0);
 $857 = tempRet0;
 $858 = (_bitshift64Ashr(($852|0),($853|0),21)|0);
 $859 = tempRet0;
 $860 = (_i64Add(($858|0),($859|0),($754|0),($755|0))|0);
 $861 = tempRet0;
 $862 = (_bitshift64Shl(($858|0),($859|0),21)|0);
 $863 = tempRet0;
 $864 = (_i64Subtract(($852|0),($853|0),($862|0),($863|0))|0);
 $865 = tempRet0;
 $866 = (_bitshift64Ashr(($860|0),($861|0),21)|0);
 $867 = tempRet0;
 $868 = (_i64Add(($866|0),($867|0),($762|0),($763|0))|0);
 $869 = tempRet0;
 $870 = (_bitshift64Shl(($866|0),($867|0),21)|0);
 $871 = tempRet0;
 $872 = (_i64Subtract(($860|0),($861|0),($870|0),($871|0))|0);
 $873 = tempRet0;
 $874 = (_bitshift64Ashr(($868|0),($869|0),21)|0);
 $875 = tempRet0;
 $876 = (_i64Add(($874|0),($875|0),($768|0),($769|0))|0);
 $877 = tempRet0;
 $878 = (_bitshift64Shl(($874|0),($875|0),21)|0);
 $879 = tempRet0;
 $880 = (_i64Subtract(($868|0),($869|0),($878|0),($879|0))|0);
 $881 = tempRet0;
 $882 = $800&255;
 HEAP8[$s>>0] = $882;
 $883 = (_bitshift64Lshr(($800|0),($801|0),8)|0);
 $884 = tempRet0;
 $885 = $883&255;
 $886 = ((($s)) + 1|0);
 HEAP8[$886>>0] = $885;
 $887 = (_bitshift64Lshr(($800|0),($801|0),16)|0);
 $888 = tempRet0;
 $889 = (_bitshift64Shl(($808|0),($809|0),5)|0);
 $890 = tempRet0;
 $891 = $889 | $887;
 $890 | $888;
 $892 = $891&255;
 HEAP8[$3>>0] = $892;
 $893 = (_bitshift64Lshr(($808|0),($809|0),3)|0);
 $894 = tempRet0;
 $895 = $893&255;
 $896 = ((($s)) + 3|0);
 HEAP8[$896>>0] = $895;
 $897 = (_bitshift64Lshr(($808|0),($809|0),11)|0);
 $898 = tempRet0;
 $899 = $897&255;
 $900 = ((($s)) + 4|0);
 HEAP8[$900>>0] = $899;
 $901 = (_bitshift64Lshr(($808|0),($809|0),19)|0);
 $902 = tempRet0;
 $903 = (_bitshift64Shl(($816|0),($817|0),2)|0);
 $904 = tempRet0;
 $905 = $903 | $901;
 $904 | $902;
 $906 = $905&255;
 HEAP8[$9>>0] = $906;
 $907 = (_bitshift64Lshr(($816|0),($817|0),6)|0);
 $908 = tempRet0;
 $909 = $907&255;
 $910 = ((($s)) + 6|0);
 HEAP8[$910>>0] = $909;
 $911 = (_bitshift64Lshr(($816|0),($817|0),14)|0);
 $912 = tempRet0;
 $913 = (_bitshift64Shl(($824|0),($825|0),7)|0);
 $914 = tempRet0;
 $915 = $913 | $911;
 $914 | $912;
 $916 = $915&255;
 HEAP8[$15>>0] = $916;
 $917 = (_bitshift64Lshr(($824|0),($825|0),1)|0);
 $918 = tempRet0;
 $919 = $917&255;
 $920 = ((($s)) + 8|0);
 HEAP8[$920>>0] = $919;
 $921 = (_bitshift64Lshr(($824|0),($825|0),9)|0);
 $922 = tempRet0;
 $923 = $921&255;
 $924 = ((($s)) + 9|0);
 HEAP8[$924>>0] = $923;
 $925 = (_bitshift64Lshr(($824|0),($825|0),17)|0);
 $926 = tempRet0;
 $927 = (_bitshift64Shl(($832|0),($833|0),4)|0);
 $928 = tempRet0;
 $929 = $927 | $925;
 $928 | $926;
 $930 = $929&255;
 HEAP8[$21>>0] = $930;
 $931 = (_bitshift64Lshr(($832|0),($833|0),4)|0);
 $932 = tempRet0;
 $933 = $931&255;
 $934 = ((($s)) + 11|0);
 HEAP8[$934>>0] = $933;
 $935 = (_bitshift64Lshr(($832|0),($833|0),12)|0);
 $936 = tempRet0;
 $937 = $935&255;
 $938 = ((($s)) + 12|0);
 HEAP8[$938>>0] = $937;
 $939 = (_bitshift64Lshr(($832|0),($833|0),20)|0);
 $940 = tempRet0;
 $941 = (_bitshift64Shl(($840|0),($841|0),1)|0);
 $942 = tempRet0;
 $943 = $941 | $939;
 $942 | $940;
 $944 = $943&255;
 HEAP8[$27>>0] = $944;
 $945 = (_bitshift64Lshr(($840|0),($841|0),7)|0);
 $946 = tempRet0;
 $947 = $945&255;
 $948 = ((($s)) + 14|0);
 HEAP8[$948>>0] = $947;
 $949 = (_bitshift64Lshr(($840|0),($841|0),15)|0);
 $950 = tempRet0;
 $951 = (_bitshift64Shl(($848|0),($849|0),6)|0);
 $952 = tempRet0;
 $953 = $951 | $949;
 $952 | $950;
 $954 = $953&255;
 HEAP8[$33>>0] = $954;
 $955 = (_bitshift64Lshr(($848|0),($849|0),2)|0);
 $956 = tempRet0;
 $957 = $955&255;
 $958 = ((($s)) + 16|0);
 HEAP8[$958>>0] = $957;
 $959 = (_bitshift64Lshr(($848|0),($849|0),10)|0);
 $960 = tempRet0;
 $961 = $959&255;
 $962 = ((($s)) + 17|0);
 HEAP8[$962>>0] = $961;
 $963 = (_bitshift64Lshr(($848|0),($849|0),18)|0);
 $964 = tempRet0;
 $965 = (_bitshift64Shl(($856|0),($857|0),3)|0);
 $966 = tempRet0;
 $967 = $965 | $963;
 $966 | $964;
 $968 = $967&255;
 HEAP8[$39>>0] = $968;
 $969 = (_bitshift64Lshr(($856|0),($857|0),5)|0);
 $970 = tempRet0;
 $971 = $969&255;
 $972 = ((($s)) + 19|0);
 HEAP8[$972>>0] = $971;
 $973 = (_bitshift64Lshr(($856|0),($857|0),13)|0);
 $974 = tempRet0;
 $975 = $973&255;
 $976 = ((($s)) + 20|0);
 HEAP8[$976>>0] = $975;
 $977 = $864&255;
 HEAP8[$45>>0] = $977;
 $978 = (_bitshift64Lshr(($864|0),($865|0),8)|0);
 $979 = tempRet0;
 $980 = $978&255;
 $981 = ((($s)) + 22|0);
 HEAP8[$981>>0] = $980;
 $982 = (_bitshift64Lshr(($864|0),($865|0),16)|0);
 $983 = tempRet0;
 $984 = (_bitshift64Shl(($872|0),($873|0),5)|0);
 $985 = tempRet0;
 $986 = $984 | $982;
 $985 | $983;
 $987 = $986&255;
 HEAP8[$49>>0] = $987;
 $988 = (_bitshift64Lshr(($872|0),($873|0),3)|0);
 $989 = tempRet0;
 $990 = $988&255;
 $991 = ((($s)) + 24|0);
 HEAP8[$991>>0] = $990;
 $992 = (_bitshift64Lshr(($872|0),($873|0),11)|0);
 $993 = tempRet0;
 $994 = $992&255;
 $995 = ((($s)) + 25|0);
 HEAP8[$995>>0] = $994;
 $996 = (_bitshift64Lshr(($872|0),($873|0),19)|0);
 $997 = tempRet0;
 $998 = (_bitshift64Shl(($880|0),($881|0),2)|0);
 $999 = tempRet0;
 $1000 = $998 | $996;
 $999 | $997;
 $1001 = $1000&255;
 HEAP8[$55>>0] = $1001;
 $1002 = (_bitshift64Lshr(($880|0),($881|0),6)|0);
 $1003 = tempRet0;
 $1004 = $1002&255;
 $1005 = ((($s)) + 27|0);
 HEAP8[$1005>>0] = $1004;
 $1006 = (_bitshift64Lshr(($880|0),($881|0),14)|0);
 $1007 = tempRet0;
 $1008 = (_bitshift64Shl(($876|0),($877|0),7)|0);
 $1009 = tempRet0;
 $1010 = $1006 | $1008;
 $1007 | $1009;
 $1011 = $1010&255;
 HEAP8[$61>>0] = $1011;
 $1012 = (_bitshift64Lshr(($876|0),($877|0),1)|0);
 $1013 = tempRet0;
 $1014 = $1012&255;
 $1015 = ((($s)) + 29|0);
 HEAP8[$1015>>0] = $1014;
 $1016 = (_bitshift64Lshr(($876|0),($877|0),9)|0);
 $1017 = tempRet0;
 $1018 = $1016&255;
 $1019 = ((($s)) + 30|0);
 HEAP8[$1019>>0] = $1018;
 $1020 = (_bitshift64Lshr(($876|0),($877|0),17)|0);
 $1021 = tempRet0;
 $1022 = $1020&255;
 HEAP8[$67>>0] = $1022;
 return;
}
function _sc_muladd($s,$a,$b,$c) {
 $s = $s|0;
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0;
 var $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0;
 var $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0;
 var $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0;
 var $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $1075 = 0, $1076 = 0, $1077 = 0, $1078 = 0, $1079 = 0, $108 = 0, $1080 = 0, $1081 = 0, $1082 = 0, $1083 = 0, $1084 = 0, $1085 = 0, $1086 = 0, $1087 = 0;
 var $1088 = 0, $1089 = 0, $109 = 0, $1090 = 0, $1091 = 0, $1092 = 0, $1093 = 0, $1094 = 0, $1095 = 0, $1096 = 0, $1097 = 0, $1098 = 0, $1099 = 0, $11 = 0, $110 = 0, $1100 = 0, $1101 = 0, $1102 = 0, $1103 = 0, $1104 = 0;
 var $1105 = 0, $1106 = 0, $1107 = 0, $1108 = 0, $1109 = 0, $111 = 0, $1110 = 0, $1111 = 0, $1112 = 0, $1113 = 0, $1114 = 0, $1115 = 0, $1116 = 0, $1117 = 0, $1118 = 0, $1119 = 0, $112 = 0, $1120 = 0, $1121 = 0, $1122 = 0;
 var $1123 = 0, $1124 = 0, $1125 = 0, $1126 = 0, $1127 = 0, $1128 = 0, $1129 = 0, $113 = 0, $1130 = 0, $1131 = 0, $1132 = 0, $1133 = 0, $1134 = 0, $1135 = 0, $1136 = 0, $1137 = 0, $1138 = 0, $1139 = 0, $114 = 0, $1140 = 0;
 var $1141 = 0, $1142 = 0, $1143 = 0, $1144 = 0, $1145 = 0, $1146 = 0, $1147 = 0, $1148 = 0, $1149 = 0, $115 = 0, $1150 = 0, $1151 = 0, $1152 = 0, $1153 = 0, $1154 = 0, $1155 = 0, $1156 = 0, $1157 = 0, $1158 = 0, $1159 = 0;
 var $116 = 0, $1160 = 0, $1161 = 0, $1162 = 0, $1163 = 0, $1164 = 0, $1165 = 0, $1166 = 0, $1167 = 0, $1168 = 0, $1169 = 0, $117 = 0, $1170 = 0, $1171 = 0, $1172 = 0, $1173 = 0, $1174 = 0, $1175 = 0, $1176 = 0, $1177 = 0;
 var $1178 = 0, $1179 = 0, $118 = 0, $1180 = 0, $1181 = 0, $1182 = 0, $1183 = 0, $1184 = 0, $1185 = 0, $1186 = 0, $1187 = 0, $1188 = 0, $1189 = 0, $119 = 0, $1190 = 0, $1191 = 0, $1192 = 0, $1193 = 0, $1194 = 0, $1195 = 0;
 var $1196 = 0, $1197 = 0, $1198 = 0, $1199 = 0, $12 = 0, $120 = 0, $1200 = 0, $1201 = 0, $1202 = 0, $1203 = 0, $1204 = 0, $1205 = 0, $1206 = 0, $1207 = 0, $1208 = 0, $1209 = 0, $121 = 0, $1210 = 0, $1211 = 0, $1212 = 0;
 var $1213 = 0, $1214 = 0, $1215 = 0, $1216 = 0, $1217 = 0, $1218 = 0, $1219 = 0, $122 = 0, $1220 = 0, $1221 = 0, $1222 = 0, $1223 = 0, $1224 = 0, $1225 = 0, $1226 = 0, $1227 = 0, $1228 = 0, $1229 = 0, $123 = 0, $1230 = 0;
 var $1231 = 0, $1232 = 0, $1233 = 0, $1234 = 0, $1235 = 0, $1236 = 0, $1237 = 0, $1238 = 0, $1239 = 0, $124 = 0, $1240 = 0, $1241 = 0, $1242 = 0, $1243 = 0, $1244 = 0, $1245 = 0, $1246 = 0, $1247 = 0, $1248 = 0, $1249 = 0;
 var $125 = 0, $1250 = 0, $1251 = 0, $1252 = 0, $1253 = 0, $1254 = 0, $1255 = 0, $1256 = 0, $1257 = 0, $1258 = 0, $1259 = 0, $126 = 0, $1260 = 0, $1261 = 0, $1262 = 0, $1263 = 0, $1264 = 0, $1265 = 0, $1266 = 0, $1267 = 0;
 var $1268 = 0, $1269 = 0, $127 = 0, $1270 = 0, $1271 = 0, $1272 = 0, $1273 = 0, $1274 = 0, $1275 = 0, $1276 = 0, $1277 = 0, $1278 = 0, $1279 = 0, $128 = 0, $1280 = 0, $1281 = 0, $1282 = 0, $1283 = 0, $1284 = 0, $1285 = 0;
 var $1286 = 0, $1287 = 0, $1288 = 0, $1289 = 0, $129 = 0, $1290 = 0, $1291 = 0, $1292 = 0, $1293 = 0, $1294 = 0, $1295 = 0, $1296 = 0, $1297 = 0, $1298 = 0, $1299 = 0, $13 = 0, $130 = 0, $1300 = 0, $1301 = 0, $1302 = 0;
 var $1303 = 0, $1304 = 0, $1305 = 0, $1306 = 0, $1307 = 0, $1308 = 0, $1309 = 0, $131 = 0, $1310 = 0, $1311 = 0, $1312 = 0, $1313 = 0, $1314 = 0, $1315 = 0, $1316 = 0, $1317 = 0, $1318 = 0, $1319 = 0, $132 = 0, $1320 = 0;
 var $1321 = 0, $1322 = 0, $1323 = 0, $1324 = 0, $1325 = 0, $1326 = 0, $1327 = 0, $1328 = 0, $1329 = 0, $133 = 0, $1330 = 0, $1331 = 0, $1332 = 0, $1333 = 0, $1334 = 0, $1335 = 0, $1336 = 0, $1337 = 0, $1338 = 0, $1339 = 0;
 var $134 = 0, $1340 = 0, $1341 = 0, $1342 = 0, $1343 = 0, $1344 = 0, $1345 = 0, $1346 = 0, $1347 = 0, $1348 = 0, $1349 = 0, $135 = 0, $1350 = 0, $1351 = 0, $1352 = 0, $1353 = 0, $1354 = 0, $1355 = 0, $1356 = 0, $1357 = 0;
 var $1358 = 0, $1359 = 0, $136 = 0, $1360 = 0, $1361 = 0, $1362 = 0, $1363 = 0, $1364 = 0, $1365 = 0, $1366 = 0, $1367 = 0, $1368 = 0, $1369 = 0, $137 = 0, $1370 = 0, $1371 = 0, $1372 = 0, $1373 = 0, $1374 = 0, $1375 = 0;
 var $1376 = 0, $1377 = 0, $1378 = 0, $1379 = 0, $138 = 0, $1380 = 0, $1381 = 0, $1382 = 0, $1383 = 0, $1384 = 0, $1385 = 0, $1386 = 0, $1387 = 0, $1388 = 0, $1389 = 0, $139 = 0, $1390 = 0, $1391 = 0, $1392 = 0, $1393 = 0;
 var $1394 = 0, $1395 = 0, $1396 = 0, $1397 = 0, $1398 = 0, $1399 = 0, $14 = 0, $140 = 0, $1400 = 0, $1401 = 0, $1402 = 0, $1403 = 0, $1404 = 0, $1405 = 0, $1406 = 0, $1407 = 0, $1408 = 0, $1409 = 0, $141 = 0, $1410 = 0;
 var $1411 = 0, $1412 = 0, $1413 = 0, $1414 = 0, $1415 = 0, $1416 = 0, $1417 = 0, $1418 = 0, $1419 = 0, $142 = 0, $1420 = 0, $1421 = 0, $1422 = 0, $1423 = 0, $1424 = 0, $1425 = 0, $1426 = 0, $1427 = 0, $1428 = 0, $1429 = 0;
 var $143 = 0, $1430 = 0, $1431 = 0, $1432 = 0, $1433 = 0, $1434 = 0, $1435 = 0, $1436 = 0, $1437 = 0, $1438 = 0, $1439 = 0, $144 = 0, $1440 = 0, $1441 = 0, $1442 = 0, $1443 = 0, $1444 = 0, $1445 = 0, $1446 = 0, $1447 = 0;
 var $1448 = 0, $1449 = 0, $145 = 0, $1450 = 0, $1451 = 0, $1452 = 0, $1453 = 0, $1454 = 0, $1455 = 0, $1456 = 0, $1457 = 0, $1458 = 0, $1459 = 0, $146 = 0, $1460 = 0, $1461 = 0, $1462 = 0, $1463 = 0, $1464 = 0, $1465 = 0;
 var $1466 = 0, $1467 = 0, $1468 = 0, $1469 = 0, $147 = 0, $1470 = 0, $1471 = 0, $1472 = 0, $1473 = 0, $1474 = 0, $1475 = 0, $1476 = 0, $1477 = 0, $1478 = 0, $1479 = 0, $148 = 0, $1480 = 0, $1481 = 0, $1482 = 0, $1483 = 0;
 var $1484 = 0, $1485 = 0, $1486 = 0, $1487 = 0, $1488 = 0, $1489 = 0, $149 = 0, $1490 = 0, $1491 = 0, $1492 = 0, $1493 = 0, $1494 = 0, $1495 = 0, $1496 = 0, $1497 = 0, $1498 = 0, $1499 = 0, $15 = 0, $150 = 0, $1500 = 0;
 var $1501 = 0, $1502 = 0, $1503 = 0, $1504 = 0, $1505 = 0, $1506 = 0, $1507 = 0, $1508 = 0, $1509 = 0, $151 = 0, $1510 = 0, $1511 = 0, $1512 = 0, $1513 = 0, $1514 = 0, $1515 = 0, $1516 = 0, $1517 = 0, $1518 = 0, $1519 = 0;
 var $152 = 0, $1520 = 0, $1521 = 0, $1522 = 0, $1523 = 0, $1524 = 0, $1525 = 0, $1526 = 0, $1527 = 0, $1528 = 0, $1529 = 0, $153 = 0, $1530 = 0, $1531 = 0, $1532 = 0, $1533 = 0, $1534 = 0, $1535 = 0, $1536 = 0, $1537 = 0;
 var $1538 = 0, $1539 = 0, $154 = 0, $1540 = 0, $1541 = 0, $1542 = 0, $1543 = 0, $1544 = 0, $1545 = 0, $1546 = 0, $1547 = 0, $1548 = 0, $1549 = 0, $155 = 0, $1550 = 0, $1551 = 0, $1552 = 0, $1553 = 0, $1554 = 0, $1555 = 0;
 var $1556 = 0, $1557 = 0, $1558 = 0, $1559 = 0, $156 = 0, $1560 = 0, $1561 = 0, $1562 = 0, $1563 = 0, $1564 = 0, $1565 = 0, $1566 = 0, $1567 = 0, $1568 = 0, $1569 = 0, $157 = 0, $1570 = 0, $1571 = 0, $1572 = 0, $1573 = 0;
 var $1574 = 0, $1575 = 0, $1576 = 0, $1577 = 0, $1578 = 0, $1579 = 0, $158 = 0, $1580 = 0, $1581 = 0, $1582 = 0, $1583 = 0, $1584 = 0, $1585 = 0, $1586 = 0, $1587 = 0, $1588 = 0, $1589 = 0, $159 = 0, $1590 = 0, $1591 = 0;
 var $1592 = 0, $1593 = 0, $1594 = 0, $1595 = 0, $1596 = 0, $1597 = 0, $1598 = 0, $1599 = 0, $16 = 0, $160 = 0, $1600 = 0, $1601 = 0, $1602 = 0, $1603 = 0, $1604 = 0, $1605 = 0, $1606 = 0, $1607 = 0, $1608 = 0, $1609 = 0;
 var $161 = 0, $1610 = 0, $1611 = 0, $1612 = 0, $1613 = 0, $1614 = 0, $1615 = 0, $1616 = 0, $1617 = 0, $1618 = 0, $1619 = 0, $162 = 0, $1620 = 0, $1621 = 0, $1622 = 0, $1623 = 0, $1624 = 0, $1625 = 0, $1626 = 0, $1627 = 0;
 var $1628 = 0, $1629 = 0, $163 = 0, $1630 = 0, $1631 = 0, $1632 = 0, $1633 = 0, $1634 = 0, $1635 = 0, $1636 = 0, $1637 = 0, $1638 = 0, $1639 = 0, $164 = 0, $1640 = 0, $1641 = 0, $1642 = 0, $1643 = 0, $1644 = 0, $1645 = 0;
 var $1646 = 0, $1647 = 0, $1648 = 0, $1649 = 0, $165 = 0, $1650 = 0, $1651 = 0, $1652 = 0, $1653 = 0, $1654 = 0, $1655 = 0, $1656 = 0, $1657 = 0, $1658 = 0, $1659 = 0, $166 = 0, $1660 = 0, $1661 = 0, $1662 = 0, $1663 = 0;
 var $1664 = 0, $1665 = 0, $1666 = 0, $1667 = 0, $1668 = 0, $1669 = 0, $167 = 0, $1670 = 0, $1671 = 0, $1672 = 0, $1673 = 0, $1674 = 0, $1675 = 0, $1676 = 0, $1677 = 0, $1678 = 0, $1679 = 0, $168 = 0, $1680 = 0, $1681 = 0;
 var $1682 = 0, $1683 = 0, $1684 = 0, $1685 = 0, $1686 = 0, $1687 = 0, $1688 = 0, $1689 = 0, $169 = 0, $1690 = 0, $1691 = 0, $1692 = 0, $1693 = 0, $1694 = 0, $1695 = 0, $1696 = 0, $1697 = 0, $1698 = 0, $1699 = 0, $17 = 0;
 var $170 = 0, $1700 = 0, $1701 = 0, $1702 = 0, $1703 = 0, $1704 = 0, $1705 = 0, $1706 = 0, $1707 = 0, $1708 = 0, $1709 = 0, $171 = 0, $1710 = 0, $1711 = 0, $1712 = 0, $1713 = 0, $1714 = 0, $1715 = 0, $1716 = 0, $1717 = 0;
 var $1718 = 0, $1719 = 0, $172 = 0, $1720 = 0, $1721 = 0, $1722 = 0, $1723 = 0, $1724 = 0, $1725 = 0, $1726 = 0, $1727 = 0, $1728 = 0, $1729 = 0, $173 = 0, $1730 = 0, $1731 = 0, $1732 = 0, $1733 = 0, $1734 = 0, $1735 = 0;
 var $1736 = 0, $1737 = 0, $1738 = 0, $1739 = 0, $174 = 0, $1740 = 0, $1741 = 0, $1742 = 0, $1743 = 0, $1744 = 0, $1745 = 0, $1746 = 0, $1747 = 0, $1748 = 0, $1749 = 0, $175 = 0, $1750 = 0, $1751 = 0, $1752 = 0, $1753 = 0;
 var $1754 = 0, $1755 = 0, $1756 = 0, $1757 = 0, $1758 = 0, $1759 = 0, $176 = 0, $1760 = 0, $1761 = 0, $1762 = 0, $1763 = 0, $1764 = 0, $1765 = 0, $1766 = 0, $1767 = 0, $1768 = 0, $1769 = 0, $177 = 0, $1770 = 0, $1771 = 0;
 var $1772 = 0, $1773 = 0, $1774 = 0, $1775 = 0, $1776 = 0, $1777 = 0, $1778 = 0, $1779 = 0, $178 = 0, $1780 = 0, $1781 = 0, $1782 = 0, $1783 = 0, $1784 = 0, $1785 = 0, $1786 = 0, $1787 = 0, $1788 = 0, $1789 = 0, $179 = 0;
 var $1790 = 0, $1791 = 0, $1792 = 0, $1793 = 0, $1794 = 0, $1795 = 0, $1796 = 0, $1797 = 0, $1798 = 0, $1799 = 0, $18 = 0, $180 = 0, $1800 = 0, $1801 = 0, $1802 = 0, $1803 = 0, $1804 = 0, $1805 = 0, $1806 = 0, $1807 = 0;
 var $1808 = 0, $1809 = 0, $181 = 0, $1810 = 0, $1811 = 0, $1812 = 0, $1813 = 0, $1814 = 0, $1815 = 0, $1816 = 0, $1817 = 0, $1818 = 0, $1819 = 0, $182 = 0, $1820 = 0, $1821 = 0, $1822 = 0, $1823 = 0, $1824 = 0, $1825 = 0;
 var $1826 = 0, $1827 = 0, $1828 = 0, $1829 = 0, $183 = 0, $1830 = 0, $1831 = 0, $1832 = 0, $1833 = 0, $1834 = 0, $1835 = 0, $1836 = 0, $1837 = 0, $1838 = 0, $1839 = 0, $184 = 0, $1840 = 0, $1841 = 0, $1842 = 0, $1843 = 0;
 var $1844 = 0, $1845 = 0, $1846 = 0, $1847 = 0, $1848 = 0, $1849 = 0, $185 = 0, $1850 = 0, $1851 = 0, $1852 = 0, $1853 = 0, $1854 = 0, $1855 = 0, $1856 = 0, $1857 = 0, $1858 = 0, $1859 = 0, $186 = 0, $1860 = 0, $1861 = 0;
 var $1862 = 0, $1863 = 0, $1864 = 0, $1865 = 0, $1866 = 0, $1867 = 0, $1868 = 0, $1869 = 0, $187 = 0, $1870 = 0, $1871 = 0, $1872 = 0, $1873 = 0, $1874 = 0, $1875 = 0, $1876 = 0, $1877 = 0, $1878 = 0, $188 = 0, $189 = 0;
 var $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0;
 var $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0;
 var $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0;
 var $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0;
 var $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0;
 var $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0;
 var $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0;
 var $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0;
 var $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0;
 var $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0;
 var $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0;
 var $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0;
 var $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0;
 var $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0;
 var $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0;
 var $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0;
 var $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0;
 var $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0;
 var $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0;
 var $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0;
 var $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0;
 var $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0;
 var $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0;
 var $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0;
 var $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0;
 var $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0;
 var $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0;
 var $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0;
 var $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0;
 var $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0;
 var $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0;
 var $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0;
 var $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0;
 var $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0;
 var $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0;
 var $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0;
 var $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0;
 var $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0;
 var $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0;
 var $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0;
 var $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0;
 var $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0;
 var $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0;
 var $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0;
 var $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = (_load_319($a)|0);
 $1 = tempRet0;
 $2 = $0 & 2097151;
 $3 = ((($a)) + 2|0);
 $4 = (_load_420($3)|0);
 $5 = tempRet0;
 $6 = (_bitshift64Lshr(($4|0),($5|0),5)|0);
 $7 = tempRet0;
 $8 = $6 & 2097151;
 $9 = ((($a)) + 5|0);
 $10 = (_load_319($9)|0);
 $11 = tempRet0;
 $12 = (_bitshift64Lshr(($10|0),($11|0),2)|0);
 $13 = tempRet0;
 $14 = $12 & 2097151;
 $15 = ((($a)) + 7|0);
 $16 = (_load_420($15)|0);
 $17 = tempRet0;
 $18 = (_bitshift64Lshr(($16|0),($17|0),7)|0);
 $19 = tempRet0;
 $20 = $18 & 2097151;
 $21 = ((($a)) + 10|0);
 $22 = (_load_420($21)|0);
 $23 = tempRet0;
 $24 = (_bitshift64Lshr(($22|0),($23|0),4)|0);
 $25 = tempRet0;
 $26 = $24 & 2097151;
 $27 = ((($a)) + 13|0);
 $28 = (_load_319($27)|0);
 $29 = tempRet0;
 $30 = (_bitshift64Lshr(($28|0),($29|0),1)|0);
 $31 = tempRet0;
 $32 = $30 & 2097151;
 $33 = ((($a)) + 15|0);
 $34 = (_load_420($33)|0);
 $35 = tempRet0;
 $36 = (_bitshift64Lshr(($34|0),($35|0),6)|0);
 $37 = tempRet0;
 $38 = $36 & 2097151;
 $39 = ((($a)) + 18|0);
 $40 = (_load_319($39)|0);
 $41 = tempRet0;
 $42 = (_bitshift64Lshr(($40|0),($41|0),3)|0);
 $43 = tempRet0;
 $44 = $42 & 2097151;
 $45 = ((($a)) + 21|0);
 $46 = (_load_319($45)|0);
 $47 = tempRet0;
 $48 = $46 & 2097151;
 $49 = ((($a)) + 23|0);
 $50 = (_load_420($49)|0);
 $51 = tempRet0;
 $52 = (_bitshift64Lshr(($50|0),($51|0),5)|0);
 $53 = tempRet0;
 $54 = $52 & 2097151;
 $55 = ((($a)) + 26|0);
 $56 = (_load_319($55)|0);
 $57 = tempRet0;
 $58 = (_bitshift64Lshr(($56|0),($57|0),2)|0);
 $59 = tempRet0;
 $60 = $58 & 2097151;
 $61 = ((($a)) + 28|0);
 $62 = (_load_420($61)|0);
 $63 = tempRet0;
 $64 = (_bitshift64Lshr(($62|0),($63|0),7)|0);
 $65 = tempRet0;
 $66 = (_load_319($b)|0);
 $67 = tempRet0;
 $68 = $66 & 2097151;
 $69 = ((($b)) + 2|0);
 $70 = (_load_420($69)|0);
 $71 = tempRet0;
 $72 = (_bitshift64Lshr(($70|0),($71|0),5)|0);
 $73 = tempRet0;
 $74 = $72 & 2097151;
 $75 = ((($b)) + 5|0);
 $76 = (_load_319($75)|0);
 $77 = tempRet0;
 $78 = (_bitshift64Lshr(($76|0),($77|0),2)|0);
 $79 = tempRet0;
 $80 = $78 & 2097151;
 $81 = ((($b)) + 7|0);
 $82 = (_load_420($81)|0);
 $83 = tempRet0;
 $84 = (_bitshift64Lshr(($82|0),($83|0),7)|0);
 $85 = tempRet0;
 $86 = $84 & 2097151;
 $87 = ((($b)) + 10|0);
 $88 = (_load_420($87)|0);
 $89 = tempRet0;
 $90 = (_bitshift64Lshr(($88|0),($89|0),4)|0);
 $91 = tempRet0;
 $92 = $90 & 2097151;
 $93 = ((($b)) + 13|0);
 $94 = (_load_319($93)|0);
 $95 = tempRet0;
 $96 = (_bitshift64Lshr(($94|0),($95|0),1)|0);
 $97 = tempRet0;
 $98 = $96 & 2097151;
 $99 = ((($b)) + 15|0);
 $100 = (_load_420($99)|0);
 $101 = tempRet0;
 $102 = (_bitshift64Lshr(($100|0),($101|0),6)|0);
 $103 = tempRet0;
 $104 = $102 & 2097151;
 $105 = ((($b)) + 18|0);
 $106 = (_load_319($105)|0);
 $107 = tempRet0;
 $108 = (_bitshift64Lshr(($106|0),($107|0),3)|0);
 $109 = tempRet0;
 $110 = $108 & 2097151;
 $111 = ((($b)) + 21|0);
 $112 = (_load_319($111)|0);
 $113 = tempRet0;
 $114 = $112 & 2097151;
 $115 = ((($b)) + 23|0);
 $116 = (_load_420($115)|0);
 $117 = tempRet0;
 $118 = (_bitshift64Lshr(($116|0),($117|0),5)|0);
 $119 = tempRet0;
 $120 = $118 & 2097151;
 $121 = ((($b)) + 26|0);
 $122 = (_load_319($121)|0);
 $123 = tempRet0;
 $124 = (_bitshift64Lshr(($122|0),($123|0),2)|0);
 $125 = tempRet0;
 $126 = $124 & 2097151;
 $127 = ((($b)) + 28|0);
 $128 = (_load_420($127)|0);
 $129 = tempRet0;
 $130 = (_bitshift64Lshr(($128|0),($129|0),7)|0);
 $131 = tempRet0;
 $132 = (_load_319($c)|0);
 $133 = tempRet0;
 $134 = $132 & 2097151;
 $135 = ((($c)) + 2|0);
 $136 = (_load_420($135)|0);
 $137 = tempRet0;
 $138 = (_bitshift64Lshr(($136|0),($137|0),5)|0);
 $139 = tempRet0;
 $140 = $138 & 2097151;
 $141 = ((($c)) + 5|0);
 $142 = (_load_319($141)|0);
 $143 = tempRet0;
 $144 = (_bitshift64Lshr(($142|0),($143|0),2)|0);
 $145 = tempRet0;
 $146 = $144 & 2097151;
 $147 = ((($c)) + 7|0);
 $148 = (_load_420($147)|0);
 $149 = tempRet0;
 $150 = (_bitshift64Lshr(($148|0),($149|0),7)|0);
 $151 = tempRet0;
 $152 = $150 & 2097151;
 $153 = ((($c)) + 10|0);
 $154 = (_load_420($153)|0);
 $155 = tempRet0;
 $156 = (_bitshift64Lshr(($154|0),($155|0),4)|0);
 $157 = tempRet0;
 $158 = $156 & 2097151;
 $159 = ((($c)) + 13|0);
 $160 = (_load_319($159)|0);
 $161 = tempRet0;
 $162 = (_bitshift64Lshr(($160|0),($161|0),1)|0);
 $163 = tempRet0;
 $164 = $162 & 2097151;
 $165 = ((($c)) + 15|0);
 $166 = (_load_420($165)|0);
 $167 = tempRet0;
 $168 = (_bitshift64Lshr(($166|0),($167|0),6)|0);
 $169 = tempRet0;
 $170 = $168 & 2097151;
 $171 = ((($c)) + 18|0);
 $172 = (_load_319($171)|0);
 $173 = tempRet0;
 $174 = (_bitshift64Lshr(($172|0),($173|0),3)|0);
 $175 = tempRet0;
 $176 = $174 & 2097151;
 $177 = ((($c)) + 21|0);
 $178 = (_load_319($177)|0);
 $179 = tempRet0;
 $180 = $178 & 2097151;
 $181 = ((($c)) + 23|0);
 $182 = (_load_420($181)|0);
 $183 = tempRet0;
 $184 = (_bitshift64Lshr(($182|0),($183|0),5)|0);
 $185 = tempRet0;
 $186 = $184 & 2097151;
 $187 = ((($c)) + 26|0);
 $188 = (_load_319($187)|0);
 $189 = tempRet0;
 $190 = (_bitshift64Lshr(($188|0),($189|0),2)|0);
 $191 = tempRet0;
 $192 = $190 & 2097151;
 $193 = ((($c)) + 28|0);
 $194 = (_load_420($193)|0);
 $195 = tempRet0;
 $196 = (_bitshift64Lshr(($194|0),($195|0),7)|0);
 $197 = tempRet0;
 $198 = (___muldi3(($68|0),0,($2|0),0)|0);
 $199 = tempRet0;
 $200 = (_i64Add(($134|0),0,($198|0),($199|0))|0);
 $201 = tempRet0;
 $202 = (___muldi3(($74|0),0,($2|0),0)|0);
 $203 = tempRet0;
 $204 = (___muldi3(($68|0),0,($8|0),0)|0);
 $205 = tempRet0;
 $206 = (___muldi3(($80|0),0,($2|0),0)|0);
 $207 = tempRet0;
 $208 = (___muldi3(($74|0),0,($8|0),0)|0);
 $209 = tempRet0;
 $210 = (___muldi3(($68|0),0,($14|0),0)|0);
 $211 = tempRet0;
 $212 = (_i64Add(($208|0),($209|0),($210|0),($211|0))|0);
 $213 = tempRet0;
 $214 = (_i64Add(($212|0),($213|0),($206|0),($207|0))|0);
 $215 = tempRet0;
 $216 = (_i64Add(($214|0),($215|0),($146|0),0)|0);
 $217 = tempRet0;
 $218 = (___muldi3(($86|0),0,($2|0),0)|0);
 $219 = tempRet0;
 $220 = (___muldi3(($80|0),0,($8|0),0)|0);
 $221 = tempRet0;
 $222 = (___muldi3(($74|0),0,($14|0),0)|0);
 $223 = tempRet0;
 $224 = (___muldi3(($68|0),0,($20|0),0)|0);
 $225 = tempRet0;
 $226 = (___muldi3(($92|0),0,($2|0),0)|0);
 $227 = tempRet0;
 $228 = (___muldi3(($86|0),0,($8|0),0)|0);
 $229 = tempRet0;
 $230 = (___muldi3(($80|0),0,($14|0),0)|0);
 $231 = tempRet0;
 $232 = (___muldi3(($74|0),0,($20|0),0)|0);
 $233 = tempRet0;
 $234 = (___muldi3(($68|0),0,($26|0),0)|0);
 $235 = tempRet0;
 $236 = (_i64Add(($232|0),($233|0),($234|0),($235|0))|0);
 $237 = tempRet0;
 $238 = (_i64Add(($236|0),($237|0),($230|0),($231|0))|0);
 $239 = tempRet0;
 $240 = (_i64Add(($238|0),($239|0),($228|0),($229|0))|0);
 $241 = tempRet0;
 $242 = (_i64Add(($240|0),($241|0),($226|0),($227|0))|0);
 $243 = tempRet0;
 $244 = (_i64Add(($242|0),($243|0),($158|0),0)|0);
 $245 = tempRet0;
 $246 = (___muldi3(($98|0),0,($2|0),0)|0);
 $247 = tempRet0;
 $248 = (___muldi3(($92|0),0,($8|0),0)|0);
 $249 = tempRet0;
 $250 = (___muldi3(($86|0),0,($14|0),0)|0);
 $251 = tempRet0;
 $252 = (___muldi3(($80|0),0,($20|0),0)|0);
 $253 = tempRet0;
 $254 = (___muldi3(($74|0),0,($26|0),0)|0);
 $255 = tempRet0;
 $256 = (___muldi3(($68|0),0,($32|0),0)|0);
 $257 = tempRet0;
 $258 = (___muldi3(($104|0),0,($2|0),0)|0);
 $259 = tempRet0;
 $260 = (___muldi3(($98|0),0,($8|0),0)|0);
 $261 = tempRet0;
 $262 = (___muldi3(($92|0),0,($14|0),0)|0);
 $263 = tempRet0;
 $264 = (___muldi3(($86|0),0,($20|0),0)|0);
 $265 = tempRet0;
 $266 = (___muldi3(($80|0),0,($26|0),0)|0);
 $267 = tempRet0;
 $268 = (___muldi3(($74|0),0,($32|0),0)|0);
 $269 = tempRet0;
 $270 = (___muldi3(($68|0),0,($38|0),0)|0);
 $271 = tempRet0;
 $272 = (_i64Add(($268|0),($269|0),($270|0),($271|0))|0);
 $273 = tempRet0;
 $274 = (_i64Add(($272|0),($273|0),($266|0),($267|0))|0);
 $275 = tempRet0;
 $276 = (_i64Add(($274|0),($275|0),($264|0),($265|0))|0);
 $277 = tempRet0;
 $278 = (_i64Add(($276|0),($277|0),($262|0),($263|0))|0);
 $279 = tempRet0;
 $280 = (_i64Add(($278|0),($279|0),($260|0),($261|0))|0);
 $281 = tempRet0;
 $282 = (_i64Add(($280|0),($281|0),($258|0),($259|0))|0);
 $283 = tempRet0;
 $284 = (_i64Add(($282|0),($283|0),($170|0),0)|0);
 $285 = tempRet0;
 $286 = (___muldi3(($110|0),0,($2|0),0)|0);
 $287 = tempRet0;
 $288 = (___muldi3(($104|0),0,($8|0),0)|0);
 $289 = tempRet0;
 $290 = (___muldi3(($98|0),0,($14|0),0)|0);
 $291 = tempRet0;
 $292 = (___muldi3(($92|0),0,($20|0),0)|0);
 $293 = tempRet0;
 $294 = (___muldi3(($86|0),0,($26|0),0)|0);
 $295 = tempRet0;
 $296 = (___muldi3(($80|0),0,($32|0),0)|0);
 $297 = tempRet0;
 $298 = (___muldi3(($74|0),0,($38|0),0)|0);
 $299 = tempRet0;
 $300 = (___muldi3(($68|0),0,($44|0),0)|0);
 $301 = tempRet0;
 $302 = (___muldi3(($114|0),0,($2|0),0)|0);
 $303 = tempRet0;
 $304 = (___muldi3(($110|0),0,($8|0),0)|0);
 $305 = tempRet0;
 $306 = (___muldi3(($104|0),0,($14|0),0)|0);
 $307 = tempRet0;
 $308 = (___muldi3(($98|0),0,($20|0),0)|0);
 $309 = tempRet0;
 $310 = (___muldi3(($92|0),0,($26|0),0)|0);
 $311 = tempRet0;
 $312 = (___muldi3(($86|0),0,($32|0),0)|0);
 $313 = tempRet0;
 $314 = (___muldi3(($80|0),0,($38|0),0)|0);
 $315 = tempRet0;
 $316 = (___muldi3(($74|0),0,($44|0),0)|0);
 $317 = tempRet0;
 $318 = (___muldi3(($68|0),0,($48|0),0)|0);
 $319 = tempRet0;
 $320 = (_i64Add(($316|0),($317|0),($318|0),($319|0))|0);
 $321 = tempRet0;
 $322 = (_i64Add(($320|0),($321|0),($314|0),($315|0))|0);
 $323 = tempRet0;
 $324 = (_i64Add(($322|0),($323|0),($312|0),($313|0))|0);
 $325 = tempRet0;
 $326 = (_i64Add(($324|0),($325|0),($310|0),($311|0))|0);
 $327 = tempRet0;
 $328 = (_i64Add(($326|0),($327|0),($308|0),($309|0))|0);
 $329 = tempRet0;
 $330 = (_i64Add(($328|0),($329|0),($306|0),($307|0))|0);
 $331 = tempRet0;
 $332 = (_i64Add(($330|0),($331|0),($302|0),($303|0))|0);
 $333 = tempRet0;
 $334 = (_i64Add(($332|0),($333|0),($304|0),($305|0))|0);
 $335 = tempRet0;
 $336 = (_i64Add(($334|0),($335|0),($180|0),0)|0);
 $337 = tempRet0;
 $338 = (___muldi3(($120|0),0,($2|0),0)|0);
 $339 = tempRet0;
 $340 = (___muldi3(($114|0),0,($8|0),0)|0);
 $341 = tempRet0;
 $342 = (___muldi3(($110|0),0,($14|0),0)|0);
 $343 = tempRet0;
 $344 = (___muldi3(($104|0),0,($20|0),0)|0);
 $345 = tempRet0;
 $346 = (___muldi3(($98|0),0,($26|0),0)|0);
 $347 = tempRet0;
 $348 = (___muldi3(($92|0),0,($32|0),0)|0);
 $349 = tempRet0;
 $350 = (___muldi3(($86|0),0,($38|0),0)|0);
 $351 = tempRet0;
 $352 = (___muldi3(($80|0),0,($44|0),0)|0);
 $353 = tempRet0;
 $354 = (___muldi3(($74|0),0,($48|0),0)|0);
 $355 = tempRet0;
 $356 = (___muldi3(($68|0),0,($54|0),0)|0);
 $357 = tempRet0;
 $358 = (___muldi3(($126|0),0,($2|0),0)|0);
 $359 = tempRet0;
 $360 = (___muldi3(($120|0),0,($8|0),0)|0);
 $361 = tempRet0;
 $362 = (___muldi3(($114|0),0,($14|0),0)|0);
 $363 = tempRet0;
 $364 = (___muldi3(($110|0),0,($20|0),0)|0);
 $365 = tempRet0;
 $366 = (___muldi3(($104|0),0,($26|0),0)|0);
 $367 = tempRet0;
 $368 = (___muldi3(($98|0),0,($32|0),0)|0);
 $369 = tempRet0;
 $370 = (___muldi3(($92|0),0,($38|0),0)|0);
 $371 = tempRet0;
 $372 = (___muldi3(($86|0),0,($44|0),0)|0);
 $373 = tempRet0;
 $374 = (___muldi3(($80|0),0,($48|0),0)|0);
 $375 = tempRet0;
 $376 = (___muldi3(($74|0),0,($54|0),0)|0);
 $377 = tempRet0;
 $378 = (___muldi3(($68|0),0,($60|0),0)|0);
 $379 = tempRet0;
 $380 = (_i64Add(($376|0),($377|0),($378|0),($379|0))|0);
 $381 = tempRet0;
 $382 = (_i64Add(($380|0),($381|0),($374|0),($375|0))|0);
 $383 = tempRet0;
 $384 = (_i64Add(($382|0),($383|0),($372|0),($373|0))|0);
 $385 = tempRet0;
 $386 = (_i64Add(($384|0),($385|0),($370|0),($371|0))|0);
 $387 = tempRet0;
 $388 = (_i64Add(($386|0),($387|0),($368|0),($369|0))|0);
 $389 = tempRet0;
 $390 = (_i64Add(($388|0),($389|0),($366|0),($367|0))|0);
 $391 = tempRet0;
 $392 = (_i64Add(($390|0),($391|0),($362|0),($363|0))|0);
 $393 = tempRet0;
 $394 = (_i64Add(($392|0),($393|0),($364|0),($365|0))|0);
 $395 = tempRet0;
 $396 = (_i64Add(($394|0),($395|0),($360|0),($361|0))|0);
 $397 = tempRet0;
 $398 = (_i64Add(($396|0),($397|0),($358|0),($359|0))|0);
 $399 = tempRet0;
 $400 = (_i64Add(($398|0),($399|0),($192|0),0)|0);
 $401 = tempRet0;
 $402 = (___muldi3(($130|0),($131|0),($2|0),0)|0);
 $403 = tempRet0;
 $404 = (___muldi3(($126|0),0,($8|0),0)|0);
 $405 = tempRet0;
 $406 = (___muldi3(($120|0),0,($14|0),0)|0);
 $407 = tempRet0;
 $408 = (___muldi3(($114|0),0,($20|0),0)|0);
 $409 = tempRet0;
 $410 = (___muldi3(($110|0),0,($26|0),0)|0);
 $411 = tempRet0;
 $412 = (___muldi3(($104|0),0,($32|0),0)|0);
 $413 = tempRet0;
 $414 = (___muldi3(($98|0),0,($38|0),0)|0);
 $415 = tempRet0;
 $416 = (___muldi3(($92|0),0,($44|0),0)|0);
 $417 = tempRet0;
 $418 = (___muldi3(($86|0),0,($48|0),0)|0);
 $419 = tempRet0;
 $420 = (___muldi3(($80|0),0,($54|0),0)|0);
 $421 = tempRet0;
 $422 = (___muldi3(($74|0),0,($60|0),0)|0);
 $423 = tempRet0;
 $424 = (___muldi3(($68|0),0,($64|0),($65|0))|0);
 $425 = tempRet0;
 $426 = (___muldi3(($130|0),($131|0),($8|0),0)|0);
 $427 = tempRet0;
 $428 = (___muldi3(($126|0),0,($14|0),0)|0);
 $429 = tempRet0;
 $430 = (___muldi3(($120|0),0,($20|0),0)|0);
 $431 = tempRet0;
 $432 = (___muldi3(($114|0),0,($26|0),0)|0);
 $433 = tempRet0;
 $434 = (___muldi3(($110|0),0,($32|0),0)|0);
 $435 = tempRet0;
 $436 = (___muldi3(($104|0),0,($38|0),0)|0);
 $437 = tempRet0;
 $438 = (___muldi3(($98|0),0,($44|0),0)|0);
 $439 = tempRet0;
 $440 = (___muldi3(($92|0),0,($48|0),0)|0);
 $441 = tempRet0;
 $442 = (___muldi3(($86|0),0,($54|0),0)|0);
 $443 = tempRet0;
 $444 = (___muldi3(($80|0),0,($60|0),0)|0);
 $445 = tempRet0;
 $446 = (___muldi3(($74|0),0,($64|0),($65|0))|0);
 $447 = tempRet0;
 $448 = (_i64Add(($444|0),($445|0),($446|0),($447|0))|0);
 $449 = tempRet0;
 $450 = (_i64Add(($448|0),($449|0),($442|0),($443|0))|0);
 $451 = tempRet0;
 $452 = (_i64Add(($450|0),($451|0),($440|0),($441|0))|0);
 $453 = tempRet0;
 $454 = (_i64Add(($452|0),($453|0),($438|0),($439|0))|0);
 $455 = tempRet0;
 $456 = (_i64Add(($454|0),($455|0),($436|0),($437|0))|0);
 $457 = tempRet0;
 $458 = (_i64Add(($456|0),($457|0),($432|0),($433|0))|0);
 $459 = tempRet0;
 $460 = (_i64Add(($458|0),($459|0),($434|0),($435|0))|0);
 $461 = tempRet0;
 $462 = (_i64Add(($460|0),($461|0),($430|0),($431|0))|0);
 $463 = tempRet0;
 $464 = (_i64Add(($462|0),($463|0),($428|0),($429|0))|0);
 $465 = tempRet0;
 $466 = (_i64Add(($464|0),($465|0),($426|0),($427|0))|0);
 $467 = tempRet0;
 $468 = (___muldi3(($130|0),($131|0),($14|0),0)|0);
 $469 = tempRet0;
 $470 = (___muldi3(($126|0),0,($20|0),0)|0);
 $471 = tempRet0;
 $472 = (___muldi3(($120|0),0,($26|0),0)|0);
 $473 = tempRet0;
 $474 = (___muldi3(($114|0),0,($32|0),0)|0);
 $475 = tempRet0;
 $476 = (___muldi3(($110|0),0,($38|0),0)|0);
 $477 = tempRet0;
 $478 = (___muldi3(($104|0),0,($44|0),0)|0);
 $479 = tempRet0;
 $480 = (___muldi3(($98|0),0,($48|0),0)|0);
 $481 = tempRet0;
 $482 = (___muldi3(($92|0),0,($54|0),0)|0);
 $483 = tempRet0;
 $484 = (___muldi3(($86|0),0,($60|0),0)|0);
 $485 = tempRet0;
 $486 = (___muldi3(($80|0),0,($64|0),($65|0))|0);
 $487 = tempRet0;
 $488 = (___muldi3(($130|0),($131|0),($20|0),0)|0);
 $489 = tempRet0;
 $490 = (___muldi3(($126|0),0,($26|0),0)|0);
 $491 = tempRet0;
 $492 = (___muldi3(($120|0),0,($32|0),0)|0);
 $493 = tempRet0;
 $494 = (___muldi3(($114|0),0,($38|0),0)|0);
 $495 = tempRet0;
 $496 = (___muldi3(($110|0),0,($44|0),0)|0);
 $497 = tempRet0;
 $498 = (___muldi3(($104|0),0,($48|0),0)|0);
 $499 = tempRet0;
 $500 = (___muldi3(($98|0),0,($54|0),0)|0);
 $501 = tempRet0;
 $502 = (___muldi3(($92|0),0,($60|0),0)|0);
 $503 = tempRet0;
 $504 = (___muldi3(($86|0),0,($64|0),($65|0))|0);
 $505 = tempRet0;
 $506 = (_i64Add(($502|0),($503|0),($504|0),($505|0))|0);
 $507 = tempRet0;
 $508 = (_i64Add(($506|0),($507|0),($500|0),($501|0))|0);
 $509 = tempRet0;
 $510 = (_i64Add(($508|0),($509|0),($498|0),($499|0))|0);
 $511 = tempRet0;
 $512 = (_i64Add(($510|0),($511|0),($494|0),($495|0))|0);
 $513 = tempRet0;
 $514 = (_i64Add(($512|0),($513|0),($496|0),($497|0))|0);
 $515 = tempRet0;
 $516 = (_i64Add(($514|0),($515|0),($492|0),($493|0))|0);
 $517 = tempRet0;
 $518 = (_i64Add(($516|0),($517|0),($490|0),($491|0))|0);
 $519 = tempRet0;
 $520 = (_i64Add(($518|0),($519|0),($488|0),($489|0))|0);
 $521 = tempRet0;
 $522 = (___muldi3(($130|0),($131|0),($26|0),0)|0);
 $523 = tempRet0;
 $524 = (___muldi3(($126|0),0,($32|0),0)|0);
 $525 = tempRet0;
 $526 = (___muldi3(($120|0),0,($38|0),0)|0);
 $527 = tempRet0;
 $528 = (___muldi3(($114|0),0,($44|0),0)|0);
 $529 = tempRet0;
 $530 = (___muldi3(($110|0),0,($48|0),0)|0);
 $531 = tempRet0;
 $532 = (___muldi3(($104|0),0,($54|0),0)|0);
 $533 = tempRet0;
 $534 = (___muldi3(($98|0),0,($60|0),0)|0);
 $535 = tempRet0;
 $536 = (___muldi3(($92|0),0,($64|0),($65|0))|0);
 $537 = tempRet0;
 $538 = (___muldi3(($130|0),($131|0),($32|0),0)|0);
 $539 = tempRet0;
 $540 = (___muldi3(($126|0),0,($38|0),0)|0);
 $541 = tempRet0;
 $542 = (___muldi3(($120|0),0,($44|0),0)|0);
 $543 = tempRet0;
 $544 = (___muldi3(($114|0),0,($48|0),0)|0);
 $545 = tempRet0;
 $546 = (___muldi3(($110|0),0,($54|0),0)|0);
 $547 = tempRet0;
 $548 = (___muldi3(($104|0),0,($60|0),0)|0);
 $549 = tempRet0;
 $550 = (___muldi3(($98|0),0,($64|0),($65|0))|0);
 $551 = tempRet0;
 $552 = (_i64Add(($548|0),($549|0),($550|0),($551|0))|0);
 $553 = tempRet0;
 $554 = (_i64Add(($552|0),($553|0),($544|0),($545|0))|0);
 $555 = tempRet0;
 $556 = (_i64Add(($554|0),($555|0),($546|0),($547|0))|0);
 $557 = tempRet0;
 $558 = (_i64Add(($556|0),($557|0),($542|0),($543|0))|0);
 $559 = tempRet0;
 $560 = (_i64Add(($558|0),($559|0),($540|0),($541|0))|0);
 $561 = tempRet0;
 $562 = (_i64Add(($560|0),($561|0),($538|0),($539|0))|0);
 $563 = tempRet0;
 $564 = (___muldi3(($130|0),($131|0),($38|0),0)|0);
 $565 = tempRet0;
 $566 = (___muldi3(($126|0),0,($44|0),0)|0);
 $567 = tempRet0;
 $568 = (___muldi3(($120|0),0,($48|0),0)|0);
 $569 = tempRet0;
 $570 = (___muldi3(($114|0),0,($54|0),0)|0);
 $571 = tempRet0;
 $572 = (___muldi3(($110|0),0,($60|0),0)|0);
 $573 = tempRet0;
 $574 = (___muldi3(($104|0),0,($64|0),($65|0))|0);
 $575 = tempRet0;
 $576 = (___muldi3(($130|0),($131|0),($44|0),0)|0);
 $577 = tempRet0;
 $578 = (___muldi3(($126|0),0,($48|0),0)|0);
 $579 = tempRet0;
 $580 = (___muldi3(($120|0),0,($54|0),0)|0);
 $581 = tempRet0;
 $582 = (___muldi3(($114|0),0,($60|0),0)|0);
 $583 = tempRet0;
 $584 = (___muldi3(($110|0),0,($64|0),($65|0))|0);
 $585 = tempRet0;
 $586 = (_i64Add(($584|0),($585|0),($582|0),($583|0))|0);
 $587 = tempRet0;
 $588 = (_i64Add(($586|0),($587|0),($580|0),($581|0))|0);
 $589 = tempRet0;
 $590 = (_i64Add(($588|0),($589|0),($578|0),($579|0))|0);
 $591 = tempRet0;
 $592 = (_i64Add(($590|0),($591|0),($576|0),($577|0))|0);
 $593 = tempRet0;
 $594 = (___muldi3(($130|0),($131|0),($48|0),0)|0);
 $595 = tempRet0;
 $596 = (___muldi3(($126|0),0,($54|0),0)|0);
 $597 = tempRet0;
 $598 = (___muldi3(($120|0),0,($60|0),0)|0);
 $599 = tempRet0;
 $600 = (___muldi3(($114|0),0,($64|0),($65|0))|0);
 $601 = tempRet0;
 $602 = (___muldi3(($130|0),($131|0),($54|0),0)|0);
 $603 = tempRet0;
 $604 = (___muldi3(($126|0),0,($60|0),0)|0);
 $605 = tempRet0;
 $606 = (___muldi3(($120|0),0,($64|0),($65|0))|0);
 $607 = tempRet0;
 $608 = (_i64Add(($604|0),($605|0),($606|0),($607|0))|0);
 $609 = tempRet0;
 $610 = (_i64Add(($608|0),($609|0),($602|0),($603|0))|0);
 $611 = tempRet0;
 $612 = (___muldi3(($130|0),($131|0),($60|0),0)|0);
 $613 = tempRet0;
 $614 = (___muldi3(($126|0),0,($64|0),($65|0))|0);
 $615 = tempRet0;
 $616 = (_i64Add(($612|0),($613|0),($614|0),($615|0))|0);
 $617 = tempRet0;
 $618 = (___muldi3(($130|0),($131|0),($64|0),($65|0))|0);
 $619 = tempRet0;
 $620 = (_i64Add(($200|0),($201|0),1048576,0)|0);
 $621 = tempRet0;
 $622 = (_bitshift64Lshr(($620|0),($621|0),21)|0);
 $623 = tempRet0;
 $624 = (_i64Add(($202|0),($203|0),($204|0),($205|0))|0);
 $625 = tempRet0;
 $626 = (_i64Add(($624|0),($625|0),($140|0),0)|0);
 $627 = tempRet0;
 $628 = (_i64Add(($626|0),($627|0),($622|0),($623|0))|0);
 $629 = tempRet0;
 $630 = (_bitshift64Shl(($622|0),($623|0),21)|0);
 $631 = tempRet0;
 $632 = (_i64Subtract(($200|0),($201|0),($630|0),($631|0))|0);
 $633 = tempRet0;
 $634 = (_i64Add(($216|0),($217|0),1048576,0)|0);
 $635 = tempRet0;
 $636 = (_bitshift64Lshr(($634|0),($635|0),21)|0);
 $637 = tempRet0;
 $638 = (_i64Add(($222|0),($223|0),($224|0),($225|0))|0);
 $639 = tempRet0;
 $640 = (_i64Add(($638|0),($639|0),($220|0),($221|0))|0);
 $641 = tempRet0;
 $642 = (_i64Add(($640|0),($641|0),($218|0),($219|0))|0);
 $643 = tempRet0;
 $644 = (_i64Add(($642|0),($643|0),($152|0),0)|0);
 $645 = tempRet0;
 $646 = (_i64Add(($644|0),($645|0),($636|0),($637|0))|0);
 $647 = tempRet0;
 $648 = (_bitshift64Shl(($636|0),($637|0),21)|0);
 $649 = tempRet0;
 $650 = (_i64Add(($244|0),($245|0),1048576,0)|0);
 $651 = tempRet0;
 $652 = (_bitshift64Ashr(($650|0),($651|0),21)|0);
 $653 = tempRet0;
 $654 = (_i64Add(($254|0),($255|0),($256|0),($257|0))|0);
 $655 = tempRet0;
 $656 = (_i64Add(($654|0),($655|0),($252|0),($253|0))|0);
 $657 = tempRet0;
 $658 = (_i64Add(($656|0),($657|0),($250|0),($251|0))|0);
 $659 = tempRet0;
 $660 = (_i64Add(($658|0),($659|0),($248|0),($249|0))|0);
 $661 = tempRet0;
 $662 = (_i64Add(($660|0),($661|0),($246|0),($247|0))|0);
 $663 = tempRet0;
 $664 = (_i64Add(($662|0),($663|0),($164|0),0)|0);
 $665 = tempRet0;
 $666 = (_i64Add(($664|0),($665|0),($652|0),($653|0))|0);
 $667 = tempRet0;
 $668 = (_bitshift64Shl(($652|0),($653|0),21)|0);
 $669 = tempRet0;
 $670 = (_i64Subtract(($244|0),($245|0),($668|0),($669|0))|0);
 $671 = tempRet0;
 $672 = (_i64Add(($284|0),($285|0),1048576,0)|0);
 $673 = tempRet0;
 $674 = (_bitshift64Ashr(($672|0),($673|0),21)|0);
 $675 = tempRet0;
 $676 = (_i64Add(($298|0),($299|0),($300|0),($301|0))|0);
 $677 = tempRet0;
 $678 = (_i64Add(($676|0),($677|0),($296|0),($297|0))|0);
 $679 = tempRet0;
 $680 = (_i64Add(($678|0),($679|0),($294|0),($295|0))|0);
 $681 = tempRet0;
 $682 = (_i64Add(($680|0),($681|0),($292|0),($293|0))|0);
 $683 = tempRet0;
 $684 = (_i64Add(($682|0),($683|0),($290|0),($291|0))|0);
 $685 = tempRet0;
 $686 = (_i64Add(($684|0),($685|0),($288|0),($289|0))|0);
 $687 = tempRet0;
 $688 = (_i64Add(($686|0),($687|0),($286|0),($287|0))|0);
 $689 = tempRet0;
 $690 = (_i64Add(($688|0),($689|0),($176|0),0)|0);
 $691 = tempRet0;
 $692 = (_i64Add(($690|0),($691|0),($674|0),($675|0))|0);
 $693 = tempRet0;
 $694 = (_bitshift64Shl(($674|0),($675|0),21)|0);
 $695 = tempRet0;
 $696 = (_i64Add(($336|0),($337|0),1048576,0)|0);
 $697 = tempRet0;
 $698 = (_bitshift64Ashr(($696|0),($697|0),21)|0);
 $699 = tempRet0;
 $700 = (_i64Add(($354|0),($355|0),($356|0),($357|0))|0);
 $701 = tempRet0;
 $702 = (_i64Add(($700|0),($701|0),($352|0),($353|0))|0);
 $703 = tempRet0;
 $704 = (_i64Add(($702|0),($703|0),($350|0),($351|0))|0);
 $705 = tempRet0;
 $706 = (_i64Add(($704|0),($705|0),($348|0),($349|0))|0);
 $707 = tempRet0;
 $708 = (_i64Add(($706|0),($707|0),($346|0),($347|0))|0);
 $709 = tempRet0;
 $710 = (_i64Add(($708|0),($709|0),($344|0),($345|0))|0);
 $711 = tempRet0;
 $712 = (_i64Add(($710|0),($711|0),($340|0),($341|0))|0);
 $713 = tempRet0;
 $714 = (_i64Add(($712|0),($713|0),($342|0),($343|0))|0);
 $715 = tempRet0;
 $716 = (_i64Add(($714|0),($715|0),($338|0),($339|0))|0);
 $717 = tempRet0;
 $718 = (_i64Add(($716|0),($717|0),($186|0),0)|0);
 $719 = tempRet0;
 $720 = (_i64Add(($718|0),($719|0),($698|0),($699|0))|0);
 $721 = tempRet0;
 $722 = (_bitshift64Shl(($698|0),($699|0),21)|0);
 $723 = tempRet0;
 $724 = (_i64Add(($400|0),($401|0),1048576,0)|0);
 $725 = tempRet0;
 $726 = (_bitshift64Ashr(($724|0),($725|0),21)|0);
 $727 = tempRet0;
 $728 = (_i64Add(($422|0),($423|0),($424|0),($425|0))|0);
 $729 = tempRet0;
 $730 = (_i64Add(($728|0),($729|0),($420|0),($421|0))|0);
 $731 = tempRet0;
 $732 = (_i64Add(($730|0),($731|0),($418|0),($419|0))|0);
 $733 = tempRet0;
 $734 = (_i64Add(($732|0),($733|0),($416|0),($417|0))|0);
 $735 = tempRet0;
 $736 = (_i64Add(($734|0),($735|0),($414|0),($415|0))|0);
 $737 = tempRet0;
 $738 = (_i64Add(($736|0),($737|0),($412|0),($413|0))|0);
 $739 = tempRet0;
 $740 = (_i64Add(($738|0),($739|0),($408|0),($409|0))|0);
 $741 = tempRet0;
 $742 = (_i64Add(($740|0),($741|0),($410|0),($411|0))|0);
 $743 = tempRet0;
 $744 = (_i64Add(($742|0),($743|0),($406|0),($407|0))|0);
 $745 = tempRet0;
 $746 = (_i64Add(($744|0),($745|0),($402|0),($403|0))|0);
 $747 = tempRet0;
 $748 = (_i64Add(($746|0),($747|0),($404|0),($405|0))|0);
 $749 = tempRet0;
 $750 = (_i64Add(($748|0),($749|0),($196|0),($197|0))|0);
 $751 = tempRet0;
 $752 = (_i64Add(($750|0),($751|0),($726|0),($727|0))|0);
 $753 = tempRet0;
 $754 = (_bitshift64Shl(($726|0),($727|0),21)|0);
 $755 = tempRet0;
 $756 = (_i64Subtract(($400|0),($401|0),($754|0),($755|0))|0);
 $757 = tempRet0;
 $758 = (_i64Add(($466|0),($467|0),1048576,0)|0);
 $759 = tempRet0;
 $760 = (_bitshift64Ashr(($758|0),($759|0),21)|0);
 $761 = tempRet0;
 $762 = (_i64Add(($484|0),($485|0),($486|0),($487|0))|0);
 $763 = tempRet0;
 $764 = (_i64Add(($762|0),($763|0),($482|0),($483|0))|0);
 $765 = tempRet0;
 $766 = (_i64Add(($764|0),($765|0),($480|0),($481|0))|0);
 $767 = tempRet0;
 $768 = (_i64Add(($766|0),($767|0),($478|0),($479|0))|0);
 $769 = tempRet0;
 $770 = (_i64Add(($768|0),($769|0),($474|0),($475|0))|0);
 $771 = tempRet0;
 $772 = (_i64Add(($770|0),($771|0),($476|0),($477|0))|0);
 $773 = tempRet0;
 $774 = (_i64Add(($772|0),($773|0),($472|0),($473|0))|0);
 $775 = tempRet0;
 $776 = (_i64Add(($774|0),($775|0),($470|0),($471|0))|0);
 $777 = tempRet0;
 $778 = (_i64Add(($776|0),($777|0),($468|0),($469|0))|0);
 $779 = tempRet0;
 $780 = (_i64Add(($778|0),($779|0),($760|0),($761|0))|0);
 $781 = tempRet0;
 $782 = (_bitshift64Shl(($760|0),($761|0),21)|0);
 $783 = tempRet0;
 $784 = (_i64Subtract(($466|0),($467|0),($782|0),($783|0))|0);
 $785 = tempRet0;
 $786 = (_i64Add(($520|0),($521|0),1048576,0)|0);
 $787 = tempRet0;
 $788 = (_bitshift64Ashr(($786|0),($787|0),21)|0);
 $789 = tempRet0;
 $790 = (_i64Add(($534|0),($535|0),($536|0),($537|0))|0);
 $791 = tempRet0;
 $792 = (_i64Add(($790|0),($791|0),($532|0),($533|0))|0);
 $793 = tempRet0;
 $794 = (_i64Add(($792|0),($793|0),($528|0),($529|0))|0);
 $795 = tempRet0;
 $796 = (_i64Add(($794|0),($795|0),($530|0),($531|0))|0);
 $797 = tempRet0;
 $798 = (_i64Add(($796|0),($797|0),($526|0),($527|0))|0);
 $799 = tempRet0;
 $800 = (_i64Add(($798|0),($799|0),($524|0),($525|0))|0);
 $801 = tempRet0;
 $802 = (_i64Add(($800|0),($801|0),($522|0),($523|0))|0);
 $803 = tempRet0;
 $804 = (_i64Add(($802|0),($803|0),($788|0),($789|0))|0);
 $805 = tempRet0;
 $806 = (_bitshift64Shl(($788|0),($789|0),21)|0);
 $807 = tempRet0;
 $808 = (_i64Subtract(($520|0),($521|0),($806|0),($807|0))|0);
 $809 = tempRet0;
 $810 = (_i64Add(($562|0),($563|0),1048576,0)|0);
 $811 = tempRet0;
 $812 = (_bitshift64Ashr(($810|0),($811|0),21)|0);
 $813 = tempRet0;
 $814 = (_i64Add(($570|0),($571|0),($574|0),($575|0))|0);
 $815 = tempRet0;
 $816 = (_i64Add(($814|0),($815|0),($572|0),($573|0))|0);
 $817 = tempRet0;
 $818 = (_i64Add(($816|0),($817|0),($568|0),($569|0))|0);
 $819 = tempRet0;
 $820 = (_i64Add(($818|0),($819|0),($566|0),($567|0))|0);
 $821 = tempRet0;
 $822 = (_i64Add(($820|0),($821|0),($564|0),($565|0))|0);
 $823 = tempRet0;
 $824 = (_i64Add(($822|0),($823|0),($812|0),($813|0))|0);
 $825 = tempRet0;
 $826 = (_bitshift64Shl(($812|0),($813|0),21)|0);
 $827 = tempRet0;
 $828 = (_i64Subtract(($562|0),($563|0),($826|0),($827|0))|0);
 $829 = tempRet0;
 $830 = (_i64Add(($592|0),($593|0),1048576,0)|0);
 $831 = tempRet0;
 $832 = (_bitshift64Ashr(($830|0),($831|0),21)|0);
 $833 = tempRet0;
 $834 = (_i64Add(($598|0),($599|0),($600|0),($601|0))|0);
 $835 = tempRet0;
 $836 = (_i64Add(($834|0),($835|0),($596|0),($597|0))|0);
 $837 = tempRet0;
 $838 = (_i64Add(($836|0),($837|0),($594|0),($595|0))|0);
 $839 = tempRet0;
 $840 = (_i64Add(($838|0),($839|0),($832|0),($833|0))|0);
 $841 = tempRet0;
 $842 = (_bitshift64Shl(($832|0),($833|0),21)|0);
 $843 = tempRet0;
 $844 = (_i64Subtract(($592|0),($593|0),($842|0),($843|0))|0);
 $845 = tempRet0;
 $846 = (_i64Add(($610|0),($611|0),1048576,0)|0);
 $847 = tempRet0;
 $848 = (_bitshift64Lshr(($846|0),($847|0),21)|0);
 $849 = tempRet0;
 $850 = (_i64Add(($616|0),($617|0),($848|0),($849|0))|0);
 $851 = tempRet0;
 $852 = (_bitshift64Shl(($848|0),($849|0),21)|0);
 $853 = tempRet0;
 $854 = (_i64Subtract(($610|0),($611|0),($852|0),($853|0))|0);
 $855 = tempRet0;
 $856 = (_i64Add(($618|0),($619|0),1048576,0)|0);
 $857 = tempRet0;
 $858 = (_bitshift64Lshr(($856|0),($857|0),21)|0);
 $859 = tempRet0;
 $860 = (_bitshift64Shl(($858|0),($859|0),21)|0);
 $861 = tempRet0;
 $862 = (_i64Subtract(($618|0),($619|0),($860|0),($861|0))|0);
 $863 = tempRet0;
 $864 = (_i64Add(($628|0),($629|0),1048576,0)|0);
 $865 = tempRet0;
 $866 = (_bitshift64Lshr(($864|0),($865|0),21)|0);
 $867 = tempRet0;
 $868 = (_bitshift64Shl(($866|0),($867|0),21)|0);
 $869 = tempRet0;
 $870 = (_i64Subtract(($628|0),($629|0),($868|0),($869|0))|0);
 $871 = tempRet0;
 $872 = (_i64Add(($646|0),($647|0),1048576,0)|0);
 $873 = tempRet0;
 $874 = (_bitshift64Ashr(($872|0),($873|0),21)|0);
 $875 = tempRet0;
 $876 = (_i64Add(($874|0),($875|0),($670|0),($671|0))|0);
 $877 = tempRet0;
 $878 = (_bitshift64Shl(($874|0),($875|0),21)|0);
 $879 = tempRet0;
 $880 = (_i64Subtract(($646|0),($647|0),($878|0),($879|0))|0);
 $881 = tempRet0;
 $882 = (_i64Add(($666|0),($667|0),1048576,0)|0);
 $883 = tempRet0;
 $884 = (_bitshift64Ashr(($882|0),($883|0),21)|0);
 $885 = tempRet0;
 $886 = (_bitshift64Shl(($884|0),($885|0),21)|0);
 $887 = tempRet0;
 $888 = (_i64Subtract(($666|0),($667|0),($886|0),($887|0))|0);
 $889 = tempRet0;
 $890 = (_i64Add(($692|0),($693|0),1048576,0)|0);
 $891 = tempRet0;
 $892 = (_bitshift64Ashr(($890|0),($891|0),21)|0);
 $893 = tempRet0;
 $894 = (_bitshift64Shl(($892|0),($893|0),21)|0);
 $895 = tempRet0;
 $896 = (_i64Add(($720|0),($721|0),1048576,0)|0);
 $897 = tempRet0;
 $898 = (_bitshift64Ashr(($896|0),($897|0),21)|0);
 $899 = tempRet0;
 $900 = (_i64Add(($898|0),($899|0),($756|0),($757|0))|0);
 $901 = tempRet0;
 $902 = (_bitshift64Shl(($898|0),($899|0),21)|0);
 $903 = tempRet0;
 $904 = (_i64Subtract(($720|0),($721|0),($902|0),($903|0))|0);
 $905 = tempRet0;
 $906 = (_i64Add(($752|0),($753|0),1048576,0)|0);
 $907 = tempRet0;
 $908 = (_bitshift64Ashr(($906|0),($907|0),21)|0);
 $909 = tempRet0;
 $910 = (_i64Add(($784|0),($785|0),($908|0),($909|0))|0);
 $911 = tempRet0;
 $912 = (_bitshift64Shl(($908|0),($909|0),21)|0);
 $913 = tempRet0;
 $914 = (_i64Subtract(($752|0),($753|0),($912|0),($913|0))|0);
 $915 = tempRet0;
 $916 = (_i64Add(($780|0),($781|0),1048576,0)|0);
 $917 = tempRet0;
 $918 = (_bitshift64Ashr(($916|0),($917|0),21)|0);
 $919 = tempRet0;
 $920 = (_i64Add(($808|0),($809|0),($918|0),($919|0))|0);
 $921 = tempRet0;
 $922 = (_bitshift64Shl(($918|0),($919|0),21)|0);
 $923 = tempRet0;
 $924 = (_i64Subtract(($780|0),($781|0),($922|0),($923|0))|0);
 $925 = tempRet0;
 $926 = (_i64Add(($804|0),($805|0),1048576,0)|0);
 $927 = tempRet0;
 $928 = (_bitshift64Ashr(($926|0),($927|0),21)|0);
 $929 = tempRet0;
 $930 = (_i64Add(($828|0),($829|0),($928|0),($929|0))|0);
 $931 = tempRet0;
 $932 = (_bitshift64Shl(($928|0),($929|0),21)|0);
 $933 = tempRet0;
 $934 = (_i64Subtract(($804|0),($805|0),($932|0),($933|0))|0);
 $935 = tempRet0;
 $936 = (_i64Add(($824|0),($825|0),1048576,0)|0);
 $937 = tempRet0;
 $938 = (_bitshift64Ashr(($936|0),($937|0),21)|0);
 $939 = tempRet0;
 $940 = (_i64Add(($938|0),($939|0),($844|0),($845|0))|0);
 $941 = tempRet0;
 $942 = (_bitshift64Shl(($938|0),($939|0),21)|0);
 $943 = tempRet0;
 $944 = (_i64Subtract(($824|0),($825|0),($942|0),($943|0))|0);
 $945 = tempRet0;
 $946 = (_i64Add(($840|0),($841|0),1048576,0)|0);
 $947 = tempRet0;
 $948 = (_bitshift64Ashr(($946|0),($947|0),21)|0);
 $949 = tempRet0;
 $950 = (_i64Add(($948|0),($949|0),($854|0),($855|0))|0);
 $951 = tempRet0;
 $952 = (_bitshift64Shl(($948|0),($949|0),21)|0);
 $953 = tempRet0;
 $954 = (_i64Subtract(($840|0),($841|0),($952|0),($953|0))|0);
 $955 = tempRet0;
 $956 = (_i64Add(($850|0),($851|0),1048576,0)|0);
 $957 = tempRet0;
 $958 = (_bitshift64Lshr(($956|0),($957|0),21)|0);
 $959 = tempRet0;
 $960 = (_i64Add(($958|0),($959|0),($862|0),($863|0))|0);
 $961 = tempRet0;
 $962 = (_bitshift64Shl(($958|0),($959|0),21)|0);
 $963 = tempRet0;
 $964 = (_i64Subtract(($850|0),($851|0),($962|0),($963|0))|0);
 $965 = tempRet0;
 $966 = (___muldi3(($858|0),($859|0),666643,0)|0);
 $967 = tempRet0;
 $968 = (_i64Add(($966|0),($967|0),($914|0),($915|0))|0);
 $969 = tempRet0;
 $970 = (___muldi3(($858|0),($859|0),470296,0)|0);
 $971 = tempRet0;
 $972 = (_i64Add(($970|0),($971|0),($910|0),($911|0))|0);
 $973 = tempRet0;
 $974 = (___muldi3(($858|0),($859|0),654183,0)|0);
 $975 = tempRet0;
 $976 = (_i64Add(($974|0),($975|0),($924|0),($925|0))|0);
 $977 = tempRet0;
 $978 = (___muldi3(($858|0),($859|0),-997805,-1)|0);
 $979 = tempRet0;
 $980 = (_i64Add(($978|0),($979|0),($920|0),($921|0))|0);
 $981 = tempRet0;
 $982 = (___muldi3(($858|0),($859|0),136657,0)|0);
 $983 = tempRet0;
 $984 = (_i64Add(($982|0),($983|0),($934|0),($935|0))|0);
 $985 = tempRet0;
 $986 = (___muldi3(($858|0),($859|0),-683901,-1)|0);
 $987 = tempRet0;
 $988 = (_i64Add(($930|0),($931|0),($986|0),($987|0))|0);
 $989 = tempRet0;
 $990 = (___muldi3(($960|0),($961|0),666643,0)|0);
 $991 = tempRet0;
 $992 = (_i64Add(($990|0),($991|0),($900|0),($901|0))|0);
 $993 = tempRet0;
 $994 = (___muldi3(($960|0),($961|0),470296,0)|0);
 $995 = tempRet0;
 $996 = (_i64Add(($994|0),($995|0),($968|0),($969|0))|0);
 $997 = tempRet0;
 $998 = (___muldi3(($960|0),($961|0),654183,0)|0);
 $999 = tempRet0;
 $1000 = (_i64Add(($998|0),($999|0),($972|0),($973|0))|0);
 $1001 = tempRet0;
 $1002 = (___muldi3(($960|0),($961|0),-997805,-1)|0);
 $1003 = tempRet0;
 $1004 = (_i64Add(($1002|0),($1003|0),($976|0),($977|0))|0);
 $1005 = tempRet0;
 $1006 = (___muldi3(($960|0),($961|0),136657,0)|0);
 $1007 = tempRet0;
 $1008 = (_i64Add(($1006|0),($1007|0),($980|0),($981|0))|0);
 $1009 = tempRet0;
 $1010 = (___muldi3(($960|0),($961|0),-683901,-1)|0);
 $1011 = tempRet0;
 $1012 = (_i64Add(($984|0),($985|0),($1010|0),($1011|0))|0);
 $1013 = tempRet0;
 $1014 = (___muldi3(($964|0),($965|0),666643,0)|0);
 $1015 = tempRet0;
 $1016 = (_i64Add(($1014|0),($1015|0),($904|0),($905|0))|0);
 $1017 = tempRet0;
 $1018 = (___muldi3(($964|0),($965|0),470296,0)|0);
 $1019 = tempRet0;
 $1020 = (_i64Add(($1018|0),($1019|0),($992|0),($993|0))|0);
 $1021 = tempRet0;
 $1022 = (___muldi3(($964|0),($965|0),654183,0)|0);
 $1023 = tempRet0;
 $1024 = (_i64Add(($1022|0),($1023|0),($996|0),($997|0))|0);
 $1025 = tempRet0;
 $1026 = (___muldi3(($964|0),($965|0),-997805,-1)|0);
 $1027 = tempRet0;
 $1028 = (_i64Add(($1026|0),($1027|0),($1000|0),($1001|0))|0);
 $1029 = tempRet0;
 $1030 = (___muldi3(($964|0),($965|0),136657,0)|0);
 $1031 = tempRet0;
 $1032 = (_i64Add(($1030|0),($1031|0),($1004|0),($1005|0))|0);
 $1033 = tempRet0;
 $1034 = (___muldi3(($964|0),($965|0),-683901,-1)|0);
 $1035 = tempRet0;
 $1036 = (_i64Add(($1008|0),($1009|0),($1034|0),($1035|0))|0);
 $1037 = tempRet0;
 $1038 = (___muldi3(($950|0),($951|0),666643,0)|0);
 $1039 = tempRet0;
 $1040 = (___muldi3(($950|0),($951|0),470296,0)|0);
 $1041 = tempRet0;
 $1042 = (_i64Add(($1040|0),($1041|0),($1016|0),($1017|0))|0);
 $1043 = tempRet0;
 $1044 = (___muldi3(($950|0),($951|0),654183,0)|0);
 $1045 = tempRet0;
 $1046 = (_i64Add(($1044|0),($1045|0),($1020|0),($1021|0))|0);
 $1047 = tempRet0;
 $1048 = (___muldi3(($950|0),($951|0),-997805,-1)|0);
 $1049 = tempRet0;
 $1050 = (_i64Add(($1048|0),($1049|0),($1024|0),($1025|0))|0);
 $1051 = tempRet0;
 $1052 = (___muldi3(($950|0),($951|0),136657,0)|0);
 $1053 = tempRet0;
 $1054 = (_i64Add(($1052|0),($1053|0),($1028|0),($1029|0))|0);
 $1055 = tempRet0;
 $1056 = (___muldi3(($950|0),($951|0),-683901,-1)|0);
 $1057 = tempRet0;
 $1058 = (_i64Add(($1032|0),($1033|0),($1056|0),($1057|0))|0);
 $1059 = tempRet0;
 $1060 = (___muldi3(($954|0),($955|0),666643,0)|0);
 $1061 = tempRet0;
 $1062 = (___muldi3(($954|0),($955|0),470296,0)|0);
 $1063 = tempRet0;
 $1064 = (___muldi3(($954|0),($955|0),654183,0)|0);
 $1065 = tempRet0;
 $1066 = (_i64Add(($1064|0),($1065|0),($1042|0),($1043|0))|0);
 $1067 = tempRet0;
 $1068 = (___muldi3(($954|0),($955|0),-997805,-1)|0);
 $1069 = tempRet0;
 $1070 = (_i64Add(($1046|0),($1047|0),($1068|0),($1069|0))|0);
 $1071 = tempRet0;
 $1072 = (___muldi3(($954|0),($955|0),136657,0)|0);
 $1073 = tempRet0;
 $1074 = (_i64Add(($1072|0),($1073|0),($1050|0),($1051|0))|0);
 $1075 = tempRet0;
 $1076 = (___muldi3(($954|0),($955|0),-683901,-1)|0);
 $1077 = tempRet0;
 $1078 = (_i64Add(($1054|0),($1055|0),($1076|0),($1077|0))|0);
 $1079 = tempRet0;
 $1080 = (___muldi3(($940|0),($941|0),666643,0)|0);
 $1081 = tempRet0;
 $1082 = (_i64Add(($284|0),($285|0),($1080|0),($1081|0))|0);
 $1083 = tempRet0;
 $1084 = (_i64Add(($1082|0),($1083|0),($884|0),($885|0))|0);
 $1085 = tempRet0;
 $1086 = (_i64Subtract(($1084|0),($1085|0),($694|0),($695|0))|0);
 $1087 = tempRet0;
 $1088 = (___muldi3(($940|0),($941|0),470296,0)|0);
 $1089 = tempRet0;
 $1090 = (___muldi3(($940|0),($941|0),654183,0)|0);
 $1091 = tempRet0;
 $1092 = (_i64Add(($1062|0),($1063|0),($1038|0),($1039|0))|0);
 $1093 = tempRet0;
 $1094 = (_i64Add(($1092|0),($1093|0),($1090|0),($1091|0))|0);
 $1095 = tempRet0;
 $1096 = (_i64Add(($1094|0),($1095|0),($336|0),($337|0))|0);
 $1097 = tempRet0;
 $1098 = (_i64Add(($1096|0),($1097|0),($892|0),($893|0))|0);
 $1099 = tempRet0;
 $1100 = (_i64Subtract(($1098|0),($1099|0),($722|0),($723|0))|0);
 $1101 = tempRet0;
 $1102 = (___muldi3(($940|0),($941|0),-997805,-1)|0);
 $1103 = tempRet0;
 $1104 = (_i64Add(($1066|0),($1067|0),($1102|0),($1103|0))|0);
 $1105 = tempRet0;
 $1106 = (___muldi3(($940|0),($941|0),136657,0)|0);
 $1107 = tempRet0;
 $1108 = (_i64Add(($1070|0),($1071|0),($1106|0),($1107|0))|0);
 $1109 = tempRet0;
 $1110 = (___muldi3(($940|0),($941|0),-683901,-1)|0);
 $1111 = tempRet0;
 $1112 = (_i64Add(($1074|0),($1075|0),($1110|0),($1111|0))|0);
 $1113 = tempRet0;
 $1114 = (_i64Add(($1086|0),($1087|0),1048576,0)|0);
 $1115 = tempRet0;
 $1116 = (_bitshift64Ashr(($1114|0),($1115|0),21)|0);
 $1117 = tempRet0;
 $1118 = (_i64Add(($1088|0),($1089|0),($1060|0),($1061|0))|0);
 $1119 = tempRet0;
 $1120 = (_i64Add(($1118|0),($1119|0),($692|0),($693|0))|0);
 $1121 = tempRet0;
 $1122 = (_i64Subtract(($1120|0),($1121|0),($894|0),($895|0))|0);
 $1123 = tempRet0;
 $1124 = (_i64Add(($1122|0),($1123|0),($1116|0),($1117|0))|0);
 $1125 = tempRet0;
 $1126 = (_bitshift64Shl(($1116|0),($1117|0),21)|0);
 $1127 = tempRet0;
 $1128 = (_i64Subtract(($1086|0),($1087|0),($1126|0),($1127|0))|0);
 $1129 = tempRet0;
 $1130 = (_i64Add(($1100|0),($1101|0),1048576,0)|0);
 $1131 = tempRet0;
 $1132 = (_bitshift64Ashr(($1130|0),($1131|0),21)|0);
 $1133 = tempRet0;
 $1134 = (_i64Add(($1104|0),($1105|0),($1132|0),($1133|0))|0);
 $1135 = tempRet0;
 $1136 = (_bitshift64Shl(($1132|0),($1133|0),21)|0);
 $1137 = tempRet0;
 $1138 = (_i64Subtract(($1100|0),($1101|0),($1136|0),($1137|0))|0);
 $1139 = tempRet0;
 $1140 = (_i64Add(($1108|0),($1109|0),1048576,0)|0);
 $1141 = tempRet0;
 $1142 = (_bitshift64Ashr(($1140|0),($1141|0),21)|0);
 $1143 = tempRet0;
 $1144 = (_i64Add(($1112|0),($1113|0),($1142|0),($1143|0))|0);
 $1145 = tempRet0;
 $1146 = (_bitshift64Shl(($1142|0),($1143|0),21)|0);
 $1147 = tempRet0;
 $1148 = (_i64Subtract(($1108|0),($1109|0),($1146|0),($1147|0))|0);
 $1149 = tempRet0;
 $1150 = (_i64Add(($1078|0),($1079|0),1048576,0)|0);
 $1151 = tempRet0;
 $1152 = (_bitshift64Ashr(($1150|0),($1151|0),21)|0);
 $1153 = tempRet0;
 $1154 = (_i64Add(($1152|0),($1153|0),($1058|0),($1059|0))|0);
 $1155 = tempRet0;
 $1156 = (_bitshift64Shl(($1152|0),($1153|0),21)|0);
 $1157 = tempRet0;
 $1158 = (_i64Subtract(($1078|0),($1079|0),($1156|0),($1157|0))|0);
 $1159 = tempRet0;
 $1160 = (_i64Add(($1036|0),($1037|0),1048576,0)|0);
 $1161 = tempRet0;
 $1162 = (_bitshift64Ashr(($1160|0),($1161|0),21)|0);
 $1163 = tempRet0;
 $1164 = (_i64Add(($1162|0),($1163|0),($1012|0),($1013|0))|0);
 $1165 = tempRet0;
 $1166 = (_bitshift64Shl(($1162|0),($1163|0),21)|0);
 $1167 = tempRet0;
 $1168 = (_i64Subtract(($1036|0),($1037|0),($1166|0),($1167|0))|0);
 $1169 = tempRet0;
 $1170 = (_i64Add(($988|0),($989|0),1048576,0)|0);
 $1171 = tempRet0;
 $1172 = (_bitshift64Ashr(($1170|0),($1171|0),21)|0);
 $1173 = tempRet0;
 $1174 = (_i64Add(($1172|0),($1173|0),($944|0),($945|0))|0);
 $1175 = tempRet0;
 $1176 = (_bitshift64Shl(($1172|0),($1173|0),21)|0);
 $1177 = tempRet0;
 $1178 = (_i64Subtract(($988|0),($989|0),($1176|0),($1177|0))|0);
 $1179 = tempRet0;
 $1180 = (_i64Add(($1124|0),($1125|0),1048576,0)|0);
 $1181 = tempRet0;
 $1182 = (_bitshift64Ashr(($1180|0),($1181|0),21)|0);
 $1183 = tempRet0;
 $1184 = (_i64Add(($1182|0),($1183|0),($1138|0),($1139|0))|0);
 $1185 = tempRet0;
 $1186 = (_bitshift64Shl(($1182|0),($1183|0),21)|0);
 $1187 = tempRet0;
 $1188 = (_i64Subtract(($1124|0),($1125|0),($1186|0),($1187|0))|0);
 $1189 = tempRet0;
 $1190 = (_i64Add(($1134|0),($1135|0),1048576,0)|0);
 $1191 = tempRet0;
 $1192 = (_bitshift64Ashr(($1190|0),($1191|0),21)|0);
 $1193 = tempRet0;
 $1194 = (_i64Add(($1192|0),($1193|0),($1148|0),($1149|0))|0);
 $1195 = tempRet0;
 $1196 = (_bitshift64Shl(($1192|0),($1193|0),21)|0);
 $1197 = tempRet0;
 $1198 = (_i64Subtract(($1134|0),($1135|0),($1196|0),($1197|0))|0);
 $1199 = tempRet0;
 $1200 = (_i64Add(($1144|0),($1145|0),1048576,0)|0);
 $1201 = tempRet0;
 $1202 = (_bitshift64Ashr(($1200|0),($1201|0),21)|0);
 $1203 = tempRet0;
 $1204 = (_i64Add(($1202|0),($1203|0),($1158|0),($1159|0))|0);
 $1205 = tempRet0;
 $1206 = (_bitshift64Shl(($1202|0),($1203|0),21)|0);
 $1207 = tempRet0;
 $1208 = (_i64Subtract(($1144|0),($1145|0),($1206|0),($1207|0))|0);
 $1209 = tempRet0;
 $1210 = (_i64Add(($1154|0),($1155|0),1048576,0)|0);
 $1211 = tempRet0;
 $1212 = (_bitshift64Ashr(($1210|0),($1211|0),21)|0);
 $1213 = tempRet0;
 $1214 = (_i64Add(($1212|0),($1213|0),($1168|0),($1169|0))|0);
 $1215 = tempRet0;
 $1216 = (_bitshift64Shl(($1212|0),($1213|0),21)|0);
 $1217 = tempRet0;
 $1218 = (_i64Subtract(($1154|0),($1155|0),($1216|0),($1217|0))|0);
 $1219 = tempRet0;
 $1220 = (_i64Add(($1164|0),($1165|0),1048576,0)|0);
 $1221 = tempRet0;
 $1222 = (_bitshift64Ashr(($1220|0),($1221|0),21)|0);
 $1223 = tempRet0;
 $1224 = (_i64Add(($1222|0),($1223|0),($1178|0),($1179|0))|0);
 $1225 = tempRet0;
 $1226 = (_bitshift64Shl(($1222|0),($1223|0),21)|0);
 $1227 = tempRet0;
 $1228 = (_i64Subtract(($1164|0),($1165|0),($1226|0),($1227|0))|0);
 $1229 = tempRet0;
 $1230 = (___muldi3(($1174|0),($1175|0),666643,0)|0);
 $1231 = tempRet0;
 $1232 = (_i64Add(($888|0),($889|0),($1230|0),($1231|0))|0);
 $1233 = tempRet0;
 $1234 = (___muldi3(($1174|0),($1175|0),470296,0)|0);
 $1235 = tempRet0;
 $1236 = (_i64Add(($1234|0),($1235|0),($1128|0),($1129|0))|0);
 $1237 = tempRet0;
 $1238 = (___muldi3(($1174|0),($1175|0),654183,0)|0);
 $1239 = tempRet0;
 $1240 = (_i64Add(($1238|0),($1239|0),($1188|0),($1189|0))|0);
 $1241 = tempRet0;
 $1242 = (___muldi3(($1174|0),($1175|0),-997805,-1)|0);
 $1243 = tempRet0;
 $1244 = (_i64Add(($1242|0),($1243|0),($1184|0),($1185|0))|0);
 $1245 = tempRet0;
 $1246 = (___muldi3(($1174|0),($1175|0),136657,0)|0);
 $1247 = tempRet0;
 $1248 = (_i64Add(($1246|0),($1247|0),($1198|0),($1199|0))|0);
 $1249 = tempRet0;
 $1250 = (___muldi3(($1174|0),($1175|0),-683901,-1)|0);
 $1251 = tempRet0;
 $1252 = (_i64Add(($1194|0),($1195|0),($1250|0),($1251|0))|0);
 $1253 = tempRet0;
 $1254 = (___muldi3(($1224|0),($1225|0),666643,0)|0);
 $1255 = tempRet0;
 $1256 = (_i64Add(($876|0),($877|0),($1254|0),($1255|0))|0);
 $1257 = tempRet0;
 $1258 = (___muldi3(($1224|0),($1225|0),470296,0)|0);
 $1259 = tempRet0;
 $1260 = (_i64Add(($1232|0),($1233|0),($1258|0),($1259|0))|0);
 $1261 = tempRet0;
 $1262 = (___muldi3(($1224|0),($1225|0),654183,0)|0);
 $1263 = tempRet0;
 $1264 = (_i64Add(($1236|0),($1237|0),($1262|0),($1263|0))|0);
 $1265 = tempRet0;
 $1266 = (___muldi3(($1224|0),($1225|0),-997805,-1)|0);
 $1267 = tempRet0;
 $1268 = (_i64Add(($1266|0),($1267|0),($1240|0),($1241|0))|0);
 $1269 = tempRet0;
 $1270 = (___muldi3(($1224|0),($1225|0),136657,0)|0);
 $1271 = tempRet0;
 $1272 = (_i64Add(($1270|0),($1271|0),($1244|0),($1245|0))|0);
 $1273 = tempRet0;
 $1274 = (___muldi3(($1224|0),($1225|0),-683901,-1)|0);
 $1275 = tempRet0;
 $1276 = (_i64Add(($1248|0),($1249|0),($1274|0),($1275|0))|0);
 $1277 = tempRet0;
 $1278 = (___muldi3(($1228|0),($1229|0),666643,0)|0);
 $1279 = tempRet0;
 $1280 = (_i64Add(($880|0),($881|0),($1278|0),($1279|0))|0);
 $1281 = tempRet0;
 $1282 = (___muldi3(($1228|0),($1229|0),470296,0)|0);
 $1283 = tempRet0;
 $1284 = (_i64Add(($1256|0),($1257|0),($1282|0),($1283|0))|0);
 $1285 = tempRet0;
 $1286 = (___muldi3(($1228|0),($1229|0),654183,0)|0);
 $1287 = tempRet0;
 $1288 = (_i64Add(($1260|0),($1261|0),($1286|0),($1287|0))|0);
 $1289 = tempRet0;
 $1290 = (___muldi3(($1228|0),($1229|0),-997805,-1)|0);
 $1291 = tempRet0;
 $1292 = (_i64Add(($1264|0),($1265|0),($1290|0),($1291|0))|0);
 $1293 = tempRet0;
 $1294 = (___muldi3(($1228|0),($1229|0),136657,0)|0);
 $1295 = tempRet0;
 $1296 = (_i64Add(($1294|0),($1295|0),($1268|0),($1269|0))|0);
 $1297 = tempRet0;
 $1298 = (___muldi3(($1228|0),($1229|0),-683901,-1)|0);
 $1299 = tempRet0;
 $1300 = (_i64Add(($1272|0),($1273|0),($1298|0),($1299|0))|0);
 $1301 = tempRet0;
 $1302 = (___muldi3(($1214|0),($1215|0),666643,0)|0);
 $1303 = tempRet0;
 $1304 = (___muldi3(($1214|0),($1215|0),470296,0)|0);
 $1305 = tempRet0;
 $1306 = (_i64Add(($1280|0),($1281|0),($1304|0),($1305|0))|0);
 $1307 = tempRet0;
 $1308 = (___muldi3(($1214|0),($1215|0),654183,0)|0);
 $1309 = tempRet0;
 $1310 = (_i64Add(($1284|0),($1285|0),($1308|0),($1309|0))|0);
 $1311 = tempRet0;
 $1312 = (___muldi3(($1214|0),($1215|0),-997805,-1)|0);
 $1313 = tempRet0;
 $1314 = (_i64Add(($1288|0),($1289|0),($1312|0),($1313|0))|0);
 $1315 = tempRet0;
 $1316 = (___muldi3(($1214|0),($1215|0),136657,0)|0);
 $1317 = tempRet0;
 $1318 = (_i64Add(($1292|0),($1293|0),($1316|0),($1317|0))|0);
 $1319 = tempRet0;
 $1320 = (___muldi3(($1214|0),($1215|0),-683901,-1)|0);
 $1321 = tempRet0;
 $1322 = (_i64Add(($1296|0),($1297|0),($1320|0),($1321|0))|0);
 $1323 = tempRet0;
 $1324 = (___muldi3(($1218|0),($1219|0),666643,0)|0);
 $1325 = tempRet0;
 $1326 = (___muldi3(($1218|0),($1219|0),470296,0)|0);
 $1327 = tempRet0;
 $1328 = (___muldi3(($1218|0),($1219|0),654183,0)|0);
 $1329 = tempRet0;
 $1330 = (_i64Add(($1306|0),($1307|0),($1328|0),($1329|0))|0);
 $1331 = tempRet0;
 $1332 = (___muldi3(($1218|0),($1219|0),-997805,-1)|0);
 $1333 = tempRet0;
 $1334 = (_i64Add(($1310|0),($1311|0),($1332|0),($1333|0))|0);
 $1335 = tempRet0;
 $1336 = (___muldi3(($1218|0),($1219|0),136657,0)|0);
 $1337 = tempRet0;
 $1338 = (_i64Add(($1314|0),($1315|0),($1336|0),($1337|0))|0);
 $1339 = tempRet0;
 $1340 = (___muldi3(($1218|0),($1219|0),-683901,-1)|0);
 $1341 = tempRet0;
 $1342 = (_i64Add(($1318|0),($1319|0),($1340|0),($1341|0))|0);
 $1343 = tempRet0;
 $1344 = (___muldi3(($1204|0),($1205|0),666643,0)|0);
 $1345 = tempRet0;
 $1346 = (_i64Add(($1344|0),($1345|0),($632|0),($633|0))|0);
 $1347 = tempRet0;
 $1348 = (___muldi3(($1204|0),($1205|0),470296,0)|0);
 $1349 = tempRet0;
 $1350 = (___muldi3(($1204|0),($1205|0),654183,0)|0);
 $1351 = tempRet0;
 $1352 = (_i64Add(($866|0),($867|0),($216|0),($217|0))|0);
 $1353 = tempRet0;
 $1354 = (_i64Subtract(($1352|0),($1353|0),($648|0),($649|0))|0);
 $1355 = tempRet0;
 $1356 = (_i64Add(($1354|0),($1355|0),($1302|0),($1303|0))|0);
 $1357 = tempRet0;
 $1358 = (_i64Add(($1356|0),($1357|0),($1350|0),($1351|0))|0);
 $1359 = tempRet0;
 $1360 = (_i64Add(($1358|0),($1359|0),($1326|0),($1327|0))|0);
 $1361 = tempRet0;
 $1362 = (___muldi3(($1204|0),($1205|0),-997805,-1)|0);
 $1363 = tempRet0;
 $1364 = (_i64Add(($1330|0),($1331|0),($1362|0),($1363|0))|0);
 $1365 = tempRet0;
 $1366 = (___muldi3(($1204|0),($1205|0),136657,0)|0);
 $1367 = tempRet0;
 $1368 = (_i64Add(($1334|0),($1335|0),($1366|0),($1367|0))|0);
 $1369 = tempRet0;
 $1370 = (___muldi3(($1204|0),($1205|0),-683901,-1)|0);
 $1371 = tempRet0;
 $1372 = (_i64Add(($1338|0),($1339|0),($1370|0),($1371|0))|0);
 $1373 = tempRet0;
 $1374 = (_i64Add(($1346|0),($1347|0),1048576,0)|0);
 $1375 = tempRet0;
 $1376 = (_bitshift64Ashr(($1374|0),($1375|0),21)|0);
 $1377 = tempRet0;
 $1378 = (_i64Add(($870|0),($871|0),($1348|0),($1349|0))|0);
 $1379 = tempRet0;
 $1380 = (_i64Add(($1378|0),($1379|0),($1324|0),($1325|0))|0);
 $1381 = tempRet0;
 $1382 = (_i64Add(($1380|0),($1381|0),($1376|0),($1377|0))|0);
 $1383 = tempRet0;
 $1384 = (_bitshift64Shl(($1376|0),($1377|0),21)|0);
 $1385 = tempRet0;
 $1386 = (_i64Subtract(($1346|0),($1347|0),($1384|0),($1385|0))|0);
 $1387 = tempRet0;
 $1388 = (_i64Add(($1360|0),($1361|0),1048576,0)|0);
 $1389 = tempRet0;
 $1390 = (_bitshift64Ashr(($1388|0),($1389|0),21)|0);
 $1391 = tempRet0;
 $1392 = (_i64Add(($1390|0),($1391|0),($1364|0),($1365|0))|0);
 $1393 = tempRet0;
 $1394 = (_bitshift64Shl(($1390|0),($1391|0),21)|0);
 $1395 = tempRet0;
 $1396 = (_i64Add(($1368|0),($1369|0),1048576,0)|0);
 $1397 = tempRet0;
 $1398 = (_bitshift64Ashr(($1396|0),($1397|0),21)|0);
 $1399 = tempRet0;
 $1400 = (_i64Add(($1398|0),($1399|0),($1372|0),($1373|0))|0);
 $1401 = tempRet0;
 $1402 = (_bitshift64Shl(($1398|0),($1399|0),21)|0);
 $1403 = tempRet0;
 $1404 = (_i64Add(($1342|0),($1343|0),1048576,0)|0);
 $1405 = tempRet0;
 $1406 = (_bitshift64Ashr(($1404|0),($1405|0),21)|0);
 $1407 = tempRet0;
 $1408 = (_i64Add(($1406|0),($1407|0),($1322|0),($1323|0))|0);
 $1409 = tempRet0;
 $1410 = (_bitshift64Shl(($1406|0),($1407|0),21)|0);
 $1411 = tempRet0;
 $1412 = (_i64Subtract(($1342|0),($1343|0),($1410|0),($1411|0))|0);
 $1413 = tempRet0;
 $1414 = (_i64Add(($1300|0),($1301|0),1048576,0)|0);
 $1415 = tempRet0;
 $1416 = (_bitshift64Ashr(($1414|0),($1415|0),21)|0);
 $1417 = tempRet0;
 $1418 = (_i64Add(($1276|0),($1277|0),($1416|0),($1417|0))|0);
 $1419 = tempRet0;
 $1420 = (_bitshift64Shl(($1416|0),($1417|0),21)|0);
 $1421 = tempRet0;
 $1422 = (_i64Subtract(($1300|0),($1301|0),($1420|0),($1421|0))|0);
 $1423 = tempRet0;
 $1424 = (_i64Add(($1252|0),($1253|0),1048576,0)|0);
 $1425 = tempRet0;
 $1426 = (_bitshift64Ashr(($1424|0),($1425|0),21)|0);
 $1427 = tempRet0;
 $1428 = (_i64Add(($1208|0),($1209|0),($1426|0),($1427|0))|0);
 $1429 = tempRet0;
 $1430 = (_bitshift64Shl(($1426|0),($1427|0),21)|0);
 $1431 = tempRet0;
 $1432 = (_i64Add(($1382|0),($1383|0),1048576,0)|0);
 $1433 = tempRet0;
 $1434 = (_bitshift64Ashr(($1432|0),($1433|0),21)|0);
 $1435 = tempRet0;
 $1436 = (_bitshift64Shl(($1434|0),($1435|0),21)|0);
 $1437 = tempRet0;
 $1438 = (_i64Add(($1392|0),($1393|0),1048576,0)|0);
 $1439 = tempRet0;
 $1440 = (_bitshift64Ashr(($1438|0),($1439|0),21)|0);
 $1441 = tempRet0;
 $1442 = (_bitshift64Shl(($1440|0),($1441|0),21)|0);
 $1443 = tempRet0;
 $1444 = (_i64Subtract(($1392|0),($1393|0),($1442|0),($1443|0))|0);
 $1445 = tempRet0;
 $1446 = (_i64Add(($1400|0),($1401|0),1048576,0)|0);
 $1447 = tempRet0;
 $1448 = (_bitshift64Ashr(($1446|0),($1447|0),21)|0);
 $1449 = tempRet0;
 $1450 = (_i64Add(($1412|0),($1413|0),($1448|0),($1449|0))|0);
 $1451 = tempRet0;
 $1452 = (_bitshift64Shl(($1448|0),($1449|0),21)|0);
 $1453 = tempRet0;
 $1454 = (_i64Subtract(($1400|0),($1401|0),($1452|0),($1453|0))|0);
 $1455 = tempRet0;
 $1456 = (_i64Add(($1408|0),($1409|0),1048576,0)|0);
 $1457 = tempRet0;
 $1458 = (_bitshift64Ashr(($1456|0),($1457|0),21)|0);
 $1459 = tempRet0;
 $1460 = (_i64Add(($1422|0),($1423|0),($1458|0),($1459|0))|0);
 $1461 = tempRet0;
 $1462 = (_bitshift64Shl(($1458|0),($1459|0),21)|0);
 $1463 = tempRet0;
 $1464 = (_i64Subtract(($1408|0),($1409|0),($1462|0),($1463|0))|0);
 $1465 = tempRet0;
 $1466 = (_i64Add(($1418|0),($1419|0),1048576,0)|0);
 $1467 = tempRet0;
 $1468 = (_bitshift64Ashr(($1466|0),($1467|0),21)|0);
 $1469 = tempRet0;
 $1470 = (_bitshift64Shl(($1468|0),($1469|0),21)|0);
 $1471 = tempRet0;
 $1472 = (_i64Subtract(($1418|0),($1419|0),($1470|0),($1471|0))|0);
 $1473 = tempRet0;
 $1474 = (_i64Add(($1428|0),($1429|0),1048576,0)|0);
 $1475 = tempRet0;
 $1476 = (_bitshift64Ashr(($1474|0),($1475|0),21)|0);
 $1477 = tempRet0;
 $1478 = (_bitshift64Shl(($1476|0),($1477|0),21)|0);
 $1479 = tempRet0;
 $1480 = (_i64Subtract(($1428|0),($1429|0),($1478|0),($1479|0))|0);
 $1481 = tempRet0;
 $1482 = (___muldi3(($1476|0),($1477|0),666643,0)|0);
 $1483 = tempRet0;
 $1484 = (_i64Add(($1386|0),($1387|0),($1482|0),($1483|0))|0);
 $1485 = tempRet0;
 $1486 = (___muldi3(($1476|0),($1477|0),470296,0)|0);
 $1487 = tempRet0;
 $1488 = (___muldi3(($1476|0),($1477|0),654183,0)|0);
 $1489 = tempRet0;
 $1490 = (___muldi3(($1476|0),($1477|0),-997805,-1)|0);
 $1491 = tempRet0;
 $1492 = (_i64Add(($1444|0),($1445|0),($1490|0),($1491|0))|0);
 $1493 = tempRet0;
 $1494 = (___muldi3(($1476|0),($1477|0),136657,0)|0);
 $1495 = tempRet0;
 $1496 = (___muldi3(($1476|0),($1477|0),-683901,-1)|0);
 $1497 = tempRet0;
 $1498 = (_i64Add(($1454|0),($1455|0),($1496|0),($1497|0))|0);
 $1499 = tempRet0;
 $1500 = (_bitshift64Ashr(($1484|0),($1485|0),21)|0);
 $1501 = tempRet0;
 $1502 = (_i64Add(($1486|0),($1487|0),($1382|0),($1383|0))|0);
 $1503 = tempRet0;
 $1504 = (_i64Subtract(($1502|0),($1503|0),($1436|0),($1437|0))|0);
 $1505 = tempRet0;
 $1506 = (_i64Add(($1504|0),($1505|0),($1500|0),($1501|0))|0);
 $1507 = tempRet0;
 $1508 = (_bitshift64Shl(($1500|0),($1501|0),21)|0);
 $1509 = tempRet0;
 $1510 = (_i64Subtract(($1484|0),($1485|0),($1508|0),($1509|0))|0);
 $1511 = tempRet0;
 $1512 = (_bitshift64Ashr(($1506|0),($1507|0),21)|0);
 $1513 = tempRet0;
 $1514 = (_i64Add(($1488|0),($1489|0),($1360|0),($1361|0))|0);
 $1515 = tempRet0;
 $1516 = (_i64Subtract(($1514|0),($1515|0),($1394|0),($1395|0))|0);
 $1517 = tempRet0;
 $1518 = (_i64Add(($1516|0),($1517|0),($1434|0),($1435|0))|0);
 $1519 = tempRet0;
 $1520 = (_i64Add(($1518|0),($1519|0),($1512|0),($1513|0))|0);
 $1521 = tempRet0;
 $1522 = (_bitshift64Shl(($1512|0),($1513|0),21)|0);
 $1523 = tempRet0;
 $1524 = (_i64Subtract(($1506|0),($1507|0),($1522|0),($1523|0))|0);
 $1525 = tempRet0;
 $1526 = (_bitshift64Ashr(($1520|0),($1521|0),21)|0);
 $1527 = tempRet0;
 $1528 = (_i64Add(($1526|0),($1527|0),($1492|0),($1493|0))|0);
 $1529 = tempRet0;
 $1530 = (_bitshift64Shl(($1526|0),($1527|0),21)|0);
 $1531 = tempRet0;
 $1532 = (_i64Subtract(($1520|0),($1521|0),($1530|0),($1531|0))|0);
 $1533 = tempRet0;
 $1534 = (_bitshift64Ashr(($1528|0),($1529|0),21)|0);
 $1535 = tempRet0;
 $1536 = (_i64Add(($1494|0),($1495|0),($1368|0),($1369|0))|0);
 $1537 = tempRet0;
 $1538 = (_i64Subtract(($1536|0),($1537|0),($1402|0),($1403|0))|0);
 $1539 = tempRet0;
 $1540 = (_i64Add(($1538|0),($1539|0),($1440|0),($1441|0))|0);
 $1541 = tempRet0;
 $1542 = (_i64Add(($1540|0),($1541|0),($1534|0),($1535|0))|0);
 $1543 = tempRet0;
 $1544 = (_bitshift64Shl(($1534|0),($1535|0),21)|0);
 $1545 = tempRet0;
 $1546 = (_i64Subtract(($1528|0),($1529|0),($1544|0),($1545|0))|0);
 $1547 = tempRet0;
 $1548 = (_bitshift64Ashr(($1542|0),($1543|0),21)|0);
 $1549 = tempRet0;
 $1550 = (_i64Add(($1548|0),($1549|0),($1498|0),($1499|0))|0);
 $1551 = tempRet0;
 $1552 = (_bitshift64Shl(($1548|0),($1549|0),21)|0);
 $1553 = tempRet0;
 $1554 = (_i64Subtract(($1542|0),($1543|0),($1552|0),($1553|0))|0);
 $1555 = tempRet0;
 $1556 = (_bitshift64Ashr(($1550|0),($1551|0),21)|0);
 $1557 = tempRet0;
 $1558 = (_i64Add(($1450|0),($1451|0),($1556|0),($1557|0))|0);
 $1559 = tempRet0;
 $1560 = (_bitshift64Shl(($1556|0),($1557|0),21)|0);
 $1561 = tempRet0;
 $1562 = (_i64Subtract(($1550|0),($1551|0),($1560|0),($1561|0))|0);
 $1563 = tempRet0;
 $1564 = (_bitshift64Ashr(($1558|0),($1559|0),21)|0);
 $1565 = tempRet0;
 $1566 = (_i64Add(($1564|0),($1565|0),($1464|0),($1465|0))|0);
 $1567 = tempRet0;
 $1568 = (_bitshift64Shl(($1564|0),($1565|0),21)|0);
 $1569 = tempRet0;
 $1570 = (_i64Subtract(($1558|0),($1559|0),($1568|0),($1569|0))|0);
 $1571 = tempRet0;
 $1572 = (_bitshift64Ashr(($1566|0),($1567|0),21)|0);
 $1573 = tempRet0;
 $1574 = (_i64Add(($1460|0),($1461|0),($1572|0),($1573|0))|0);
 $1575 = tempRet0;
 $1576 = (_bitshift64Shl(($1572|0),($1573|0),21)|0);
 $1577 = tempRet0;
 $1578 = (_i64Subtract(($1566|0),($1567|0),($1576|0),($1577|0))|0);
 $1579 = tempRet0;
 $1580 = (_bitshift64Ashr(($1574|0),($1575|0),21)|0);
 $1581 = tempRet0;
 $1582 = (_i64Add(($1580|0),($1581|0),($1472|0),($1473|0))|0);
 $1583 = tempRet0;
 $1584 = (_bitshift64Shl(($1580|0),($1581|0),21)|0);
 $1585 = tempRet0;
 $1586 = (_i64Subtract(($1574|0),($1575|0),($1584|0),($1585|0))|0);
 $1587 = tempRet0;
 $1588 = (_bitshift64Ashr(($1582|0),($1583|0),21)|0);
 $1589 = tempRet0;
 $1590 = (_i64Add(($1468|0),($1469|0),($1252|0),($1253|0))|0);
 $1591 = tempRet0;
 $1592 = (_i64Subtract(($1590|0),($1591|0),($1430|0),($1431|0))|0);
 $1593 = tempRet0;
 $1594 = (_i64Add(($1592|0),($1593|0),($1588|0),($1589|0))|0);
 $1595 = tempRet0;
 $1596 = (_bitshift64Shl(($1588|0),($1589|0),21)|0);
 $1597 = tempRet0;
 $1598 = (_i64Subtract(($1582|0),($1583|0),($1596|0),($1597|0))|0);
 $1599 = tempRet0;
 $1600 = (_bitshift64Ashr(($1594|0),($1595|0),21)|0);
 $1601 = tempRet0;
 $1602 = (_i64Add(($1600|0),($1601|0),($1480|0),($1481|0))|0);
 $1603 = tempRet0;
 $1604 = (_bitshift64Shl(($1600|0),($1601|0),21)|0);
 $1605 = tempRet0;
 $1606 = (_i64Subtract(($1594|0),($1595|0),($1604|0),($1605|0))|0);
 $1607 = tempRet0;
 $1608 = (_bitshift64Ashr(($1602|0),($1603|0),21)|0);
 $1609 = tempRet0;
 $1610 = (_bitshift64Shl(($1608|0),($1609|0),21)|0);
 $1611 = tempRet0;
 $1612 = (_i64Subtract(($1602|0),($1603|0),($1610|0),($1611|0))|0);
 $1613 = tempRet0;
 $1614 = (___muldi3(($1608|0),($1609|0),666643,0)|0);
 $1615 = tempRet0;
 $1616 = (_i64Add(($1614|0),($1615|0),($1510|0),($1511|0))|0);
 $1617 = tempRet0;
 $1618 = (___muldi3(($1608|0),($1609|0),470296,0)|0);
 $1619 = tempRet0;
 $1620 = (_i64Add(($1524|0),($1525|0),($1618|0),($1619|0))|0);
 $1621 = tempRet0;
 $1622 = (___muldi3(($1608|0),($1609|0),654183,0)|0);
 $1623 = tempRet0;
 $1624 = (_i64Add(($1532|0),($1533|0),($1622|0),($1623|0))|0);
 $1625 = tempRet0;
 $1626 = (___muldi3(($1608|0),($1609|0),-997805,-1)|0);
 $1627 = tempRet0;
 $1628 = (_i64Add(($1546|0),($1547|0),($1626|0),($1627|0))|0);
 $1629 = tempRet0;
 $1630 = (___muldi3(($1608|0),($1609|0),136657,0)|0);
 $1631 = tempRet0;
 $1632 = (_i64Add(($1554|0),($1555|0),($1630|0),($1631|0))|0);
 $1633 = tempRet0;
 $1634 = (___muldi3(($1608|0),($1609|0),-683901,-1)|0);
 $1635 = tempRet0;
 $1636 = (_i64Add(($1562|0),($1563|0),($1634|0),($1635|0))|0);
 $1637 = tempRet0;
 $1638 = (_bitshift64Ashr(($1616|0),($1617|0),21)|0);
 $1639 = tempRet0;
 $1640 = (_i64Add(($1620|0),($1621|0),($1638|0),($1639|0))|0);
 $1641 = tempRet0;
 $1642 = (_bitshift64Shl(($1638|0),($1639|0),21)|0);
 $1643 = tempRet0;
 $1644 = (_i64Subtract(($1616|0),($1617|0),($1642|0),($1643|0))|0);
 $1645 = tempRet0;
 $1646 = (_bitshift64Ashr(($1640|0),($1641|0),21)|0);
 $1647 = tempRet0;
 $1648 = (_i64Add(($1624|0),($1625|0),($1646|0),($1647|0))|0);
 $1649 = tempRet0;
 $1650 = (_bitshift64Shl(($1646|0),($1647|0),21)|0);
 $1651 = tempRet0;
 $1652 = (_i64Subtract(($1640|0),($1641|0),($1650|0),($1651|0))|0);
 $1653 = tempRet0;
 $1654 = (_bitshift64Ashr(($1648|0),($1649|0),21)|0);
 $1655 = tempRet0;
 $1656 = (_i64Add(($1654|0),($1655|0),($1628|0),($1629|0))|0);
 $1657 = tempRet0;
 $1658 = (_bitshift64Shl(($1654|0),($1655|0),21)|0);
 $1659 = tempRet0;
 $1660 = (_i64Subtract(($1648|0),($1649|0),($1658|0),($1659|0))|0);
 $1661 = tempRet0;
 $1662 = (_bitshift64Ashr(($1656|0),($1657|0),21)|0);
 $1663 = tempRet0;
 $1664 = (_i64Add(($1632|0),($1633|0),($1662|0),($1663|0))|0);
 $1665 = tempRet0;
 $1666 = (_bitshift64Shl(($1662|0),($1663|0),21)|0);
 $1667 = tempRet0;
 $1668 = (_i64Subtract(($1656|0),($1657|0),($1666|0),($1667|0))|0);
 $1669 = tempRet0;
 $1670 = (_bitshift64Ashr(($1664|0),($1665|0),21)|0);
 $1671 = tempRet0;
 $1672 = (_i64Add(($1670|0),($1671|0),($1636|0),($1637|0))|0);
 $1673 = tempRet0;
 $1674 = (_bitshift64Shl(($1670|0),($1671|0),21)|0);
 $1675 = tempRet0;
 $1676 = (_i64Subtract(($1664|0),($1665|0),($1674|0),($1675|0))|0);
 $1677 = tempRet0;
 $1678 = (_bitshift64Ashr(($1672|0),($1673|0),21)|0);
 $1679 = tempRet0;
 $1680 = (_i64Add(($1678|0),($1679|0),($1570|0),($1571|0))|0);
 $1681 = tempRet0;
 $1682 = (_bitshift64Shl(($1678|0),($1679|0),21)|0);
 $1683 = tempRet0;
 $1684 = (_i64Subtract(($1672|0),($1673|0),($1682|0),($1683|0))|0);
 $1685 = tempRet0;
 $1686 = (_bitshift64Ashr(($1680|0),($1681|0),21)|0);
 $1687 = tempRet0;
 $1688 = (_i64Add(($1686|0),($1687|0),($1578|0),($1579|0))|0);
 $1689 = tempRet0;
 $1690 = (_bitshift64Shl(($1686|0),($1687|0),21)|0);
 $1691 = tempRet0;
 $1692 = (_i64Subtract(($1680|0),($1681|0),($1690|0),($1691|0))|0);
 $1693 = tempRet0;
 $1694 = (_bitshift64Ashr(($1688|0),($1689|0),21)|0);
 $1695 = tempRet0;
 $1696 = (_i64Add(($1694|0),($1695|0),($1586|0),($1587|0))|0);
 $1697 = tempRet0;
 $1698 = (_bitshift64Shl(($1694|0),($1695|0),21)|0);
 $1699 = tempRet0;
 $1700 = (_i64Subtract(($1688|0),($1689|0),($1698|0),($1699|0))|0);
 $1701 = tempRet0;
 $1702 = (_bitshift64Ashr(($1696|0),($1697|0),21)|0);
 $1703 = tempRet0;
 $1704 = (_i64Add(($1702|0),($1703|0),($1598|0),($1599|0))|0);
 $1705 = tempRet0;
 $1706 = (_bitshift64Shl(($1702|0),($1703|0),21)|0);
 $1707 = tempRet0;
 $1708 = (_i64Subtract(($1696|0),($1697|0),($1706|0),($1707|0))|0);
 $1709 = tempRet0;
 $1710 = (_bitshift64Ashr(($1704|0),($1705|0),21)|0);
 $1711 = tempRet0;
 $1712 = (_i64Add(($1710|0),($1711|0),($1606|0),($1607|0))|0);
 $1713 = tempRet0;
 $1714 = (_bitshift64Shl(($1710|0),($1711|0),21)|0);
 $1715 = tempRet0;
 $1716 = (_i64Subtract(($1704|0),($1705|0),($1714|0),($1715|0))|0);
 $1717 = tempRet0;
 $1718 = (_bitshift64Ashr(($1712|0),($1713|0),21)|0);
 $1719 = tempRet0;
 $1720 = (_i64Add(($1718|0),($1719|0),($1612|0),($1613|0))|0);
 $1721 = tempRet0;
 $1722 = (_bitshift64Shl(($1718|0),($1719|0),21)|0);
 $1723 = tempRet0;
 $1724 = (_i64Subtract(($1712|0),($1713|0),($1722|0),($1723|0))|0);
 $1725 = tempRet0;
 $1726 = $1644&255;
 HEAP8[$s>>0] = $1726;
 $1727 = (_bitshift64Lshr(($1644|0),($1645|0),8)|0);
 $1728 = tempRet0;
 $1729 = $1727&255;
 $1730 = ((($s)) + 1|0);
 HEAP8[$1730>>0] = $1729;
 $1731 = (_bitshift64Lshr(($1644|0),($1645|0),16)|0);
 $1732 = tempRet0;
 $1733 = (_bitshift64Shl(($1652|0),($1653|0),5)|0);
 $1734 = tempRet0;
 $1735 = $1733 | $1731;
 $1734 | $1732;
 $1736 = $1735&255;
 $1737 = ((($s)) + 2|0);
 HEAP8[$1737>>0] = $1736;
 $1738 = (_bitshift64Lshr(($1652|0),($1653|0),3)|0);
 $1739 = tempRet0;
 $1740 = $1738&255;
 $1741 = ((($s)) + 3|0);
 HEAP8[$1741>>0] = $1740;
 $1742 = (_bitshift64Lshr(($1652|0),($1653|0),11)|0);
 $1743 = tempRet0;
 $1744 = $1742&255;
 $1745 = ((($s)) + 4|0);
 HEAP8[$1745>>0] = $1744;
 $1746 = (_bitshift64Lshr(($1652|0),($1653|0),19)|0);
 $1747 = tempRet0;
 $1748 = (_bitshift64Shl(($1660|0),($1661|0),2)|0);
 $1749 = tempRet0;
 $1750 = $1748 | $1746;
 $1749 | $1747;
 $1751 = $1750&255;
 $1752 = ((($s)) + 5|0);
 HEAP8[$1752>>0] = $1751;
 $1753 = (_bitshift64Lshr(($1660|0),($1661|0),6)|0);
 $1754 = tempRet0;
 $1755 = $1753&255;
 $1756 = ((($s)) + 6|0);
 HEAP8[$1756>>0] = $1755;
 $1757 = (_bitshift64Lshr(($1660|0),($1661|0),14)|0);
 $1758 = tempRet0;
 $1759 = (_bitshift64Shl(($1668|0),($1669|0),7)|0);
 $1760 = tempRet0;
 $1761 = $1759 | $1757;
 $1760 | $1758;
 $1762 = $1761&255;
 $1763 = ((($s)) + 7|0);
 HEAP8[$1763>>0] = $1762;
 $1764 = (_bitshift64Lshr(($1668|0),($1669|0),1)|0);
 $1765 = tempRet0;
 $1766 = $1764&255;
 $1767 = ((($s)) + 8|0);
 HEAP8[$1767>>0] = $1766;
 $1768 = (_bitshift64Lshr(($1668|0),($1669|0),9)|0);
 $1769 = tempRet0;
 $1770 = $1768&255;
 $1771 = ((($s)) + 9|0);
 HEAP8[$1771>>0] = $1770;
 $1772 = (_bitshift64Lshr(($1668|0),($1669|0),17)|0);
 $1773 = tempRet0;
 $1774 = (_bitshift64Shl(($1676|0),($1677|0),4)|0);
 $1775 = tempRet0;
 $1776 = $1774 | $1772;
 $1775 | $1773;
 $1777 = $1776&255;
 $1778 = ((($s)) + 10|0);
 HEAP8[$1778>>0] = $1777;
 $1779 = (_bitshift64Lshr(($1676|0),($1677|0),4)|0);
 $1780 = tempRet0;
 $1781 = $1779&255;
 $1782 = ((($s)) + 11|0);
 HEAP8[$1782>>0] = $1781;
 $1783 = (_bitshift64Lshr(($1676|0),($1677|0),12)|0);
 $1784 = tempRet0;
 $1785 = $1783&255;
 $1786 = ((($s)) + 12|0);
 HEAP8[$1786>>0] = $1785;
 $1787 = (_bitshift64Lshr(($1676|0),($1677|0),20)|0);
 $1788 = tempRet0;
 $1789 = (_bitshift64Shl(($1684|0),($1685|0),1)|0);
 $1790 = tempRet0;
 $1791 = $1789 | $1787;
 $1790 | $1788;
 $1792 = $1791&255;
 $1793 = ((($s)) + 13|0);
 HEAP8[$1793>>0] = $1792;
 $1794 = (_bitshift64Lshr(($1684|0),($1685|0),7)|0);
 $1795 = tempRet0;
 $1796 = $1794&255;
 $1797 = ((($s)) + 14|0);
 HEAP8[$1797>>0] = $1796;
 $1798 = (_bitshift64Lshr(($1684|0),($1685|0),15)|0);
 $1799 = tempRet0;
 $1800 = (_bitshift64Shl(($1692|0),($1693|0),6)|0);
 $1801 = tempRet0;
 $1802 = $1800 | $1798;
 $1801 | $1799;
 $1803 = $1802&255;
 $1804 = ((($s)) + 15|0);
 HEAP8[$1804>>0] = $1803;
 $1805 = (_bitshift64Lshr(($1692|0),($1693|0),2)|0);
 $1806 = tempRet0;
 $1807 = $1805&255;
 $1808 = ((($s)) + 16|0);
 HEAP8[$1808>>0] = $1807;
 $1809 = (_bitshift64Lshr(($1692|0),($1693|0),10)|0);
 $1810 = tempRet0;
 $1811 = $1809&255;
 $1812 = ((($s)) + 17|0);
 HEAP8[$1812>>0] = $1811;
 $1813 = (_bitshift64Lshr(($1692|0),($1693|0),18)|0);
 $1814 = tempRet0;
 $1815 = (_bitshift64Shl(($1700|0),($1701|0),3)|0);
 $1816 = tempRet0;
 $1817 = $1815 | $1813;
 $1816 | $1814;
 $1818 = $1817&255;
 $1819 = ((($s)) + 18|0);
 HEAP8[$1819>>0] = $1818;
 $1820 = (_bitshift64Lshr(($1700|0),($1701|0),5)|0);
 $1821 = tempRet0;
 $1822 = $1820&255;
 $1823 = ((($s)) + 19|0);
 HEAP8[$1823>>0] = $1822;
 $1824 = (_bitshift64Lshr(($1700|0),($1701|0),13)|0);
 $1825 = tempRet0;
 $1826 = $1824&255;
 $1827 = ((($s)) + 20|0);
 HEAP8[$1827>>0] = $1826;
 $1828 = $1708&255;
 $1829 = ((($s)) + 21|0);
 HEAP8[$1829>>0] = $1828;
 $1830 = (_bitshift64Lshr(($1708|0),($1709|0),8)|0);
 $1831 = tempRet0;
 $1832 = $1830&255;
 $1833 = ((($s)) + 22|0);
 HEAP8[$1833>>0] = $1832;
 $1834 = (_bitshift64Lshr(($1708|0),($1709|0),16)|0);
 $1835 = tempRet0;
 $1836 = (_bitshift64Shl(($1716|0),($1717|0),5)|0);
 $1837 = tempRet0;
 $1838 = $1836 | $1834;
 $1837 | $1835;
 $1839 = $1838&255;
 $1840 = ((($s)) + 23|0);
 HEAP8[$1840>>0] = $1839;
 $1841 = (_bitshift64Lshr(($1716|0),($1717|0),3)|0);
 $1842 = tempRet0;
 $1843 = $1841&255;
 $1844 = ((($s)) + 24|0);
 HEAP8[$1844>>0] = $1843;
 $1845 = (_bitshift64Lshr(($1716|0),($1717|0),11)|0);
 $1846 = tempRet0;
 $1847 = $1845&255;
 $1848 = ((($s)) + 25|0);
 HEAP8[$1848>>0] = $1847;
 $1849 = (_bitshift64Lshr(($1716|0),($1717|0),19)|0);
 $1850 = tempRet0;
 $1851 = (_bitshift64Shl(($1724|0),($1725|0),2)|0);
 $1852 = tempRet0;
 $1853 = $1851 | $1849;
 $1852 | $1850;
 $1854 = $1853&255;
 $1855 = ((($s)) + 26|0);
 HEAP8[$1855>>0] = $1854;
 $1856 = (_bitshift64Lshr(($1724|0),($1725|0),6)|0);
 $1857 = tempRet0;
 $1858 = $1856&255;
 $1859 = ((($s)) + 27|0);
 HEAP8[$1859>>0] = $1858;
 $1860 = (_bitshift64Lshr(($1724|0),($1725|0),14)|0);
 $1861 = tempRet0;
 $1862 = (_bitshift64Shl(($1720|0),($1721|0),7)|0);
 $1863 = tempRet0;
 $1864 = $1860 | $1862;
 $1861 | $1863;
 $1865 = $1864&255;
 $1866 = ((($s)) + 28|0);
 HEAP8[$1866>>0] = $1865;
 $1867 = (_bitshift64Lshr(($1720|0),($1721|0),1)|0);
 $1868 = tempRet0;
 $1869 = $1867&255;
 $1870 = ((($s)) + 29|0);
 HEAP8[$1870>>0] = $1869;
 $1871 = (_bitshift64Lshr(($1720|0),($1721|0),9)|0);
 $1872 = tempRet0;
 $1873 = $1871&255;
 $1874 = ((($s)) + 30|0);
 HEAP8[$1874>>0] = $1873;
 $1875 = (_bitshift64Lshr(($1720|0),($1721|0),17)|0);
 $1876 = tempRet0;
 $1877 = $1875&255;
 $1878 = ((($s)) + 31|0);
 HEAP8[$1878>>0] = $1877;
 return;
}
function _load_319($in) {
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$in>>0]|0;
 $1 = $0&255;
 $2 = ((($in)) + 1|0);
 $3 = HEAP8[$2>>0]|0;
 $4 = $3&255;
 $5 = (_bitshift64Shl(($4|0),0,8)|0);
 $6 = tempRet0;
 $7 = $5 | $1;
 $8 = ((($in)) + 2|0);
 $9 = HEAP8[$8>>0]|0;
 $10 = $9&255;
 $11 = (_bitshift64Shl(($10|0),0,16)|0);
 $12 = tempRet0;
 $13 = $7 | $11;
 $14 = $6 | $12;
 tempRet0 = ($14);
 return ($13|0);
}
function _load_420($in) {
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$in>>0]|0;
 $1 = $0&255;
 $2 = ((($in)) + 1|0);
 $3 = HEAP8[$2>>0]|0;
 $4 = $3&255;
 $5 = (_bitshift64Shl(($4|0),0,8)|0);
 $6 = tempRet0;
 $7 = $5 | $1;
 $8 = ((($in)) + 2|0);
 $9 = HEAP8[$8>>0]|0;
 $10 = $9&255;
 $11 = (_bitshift64Shl(($10|0),0,16)|0);
 $12 = tempRet0;
 $13 = $7 | $11;
 $14 = $6 | $12;
 $15 = ((($in)) + 3|0);
 $16 = HEAP8[$15>>0]|0;
 $17 = $16&255;
 $18 = (_bitshift64Shl(($17|0),0,24)|0);
 $19 = tempRet0;
 $20 = $13 | $18;
 $21 = $14 | $19;
 tempRet0 = ($21);
 return ($20|0);
}
function _sha512_init($md) {
 $md = $md|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($md|0)==(0|0);
 if ($0) {
  $$0 = 1;
  return ($$0|0);
 }
 $1 = ((($md)) + 72|0);
 HEAP32[$1>>2] = 0;
 $2 = $md;
 $3 = $2;
 HEAP32[$3>>2] = 0;
 $4 = (($2) + 4)|0;
 $5 = $4;
 HEAP32[$5>>2] = 0;
 $6 = ((($md)) + 8|0);
 $7 = $6;
 $8 = $7;
 HEAP32[$8>>2] = -205731576;
 $9 = (($7) + 4)|0;
 $10 = $9;
 HEAP32[$10>>2] = 1779033703;
 $11 = ((($md)) + 16|0);
 $12 = $11;
 $13 = $12;
 HEAP32[$13>>2] = -2067093701;
 $14 = (($12) + 4)|0;
 $15 = $14;
 HEAP32[$15>>2] = -1150833019;
 $16 = ((($md)) + 24|0);
 $17 = $16;
 $18 = $17;
 HEAP32[$18>>2] = -23791573;
 $19 = (($17) + 4)|0;
 $20 = $19;
 HEAP32[$20>>2] = 1013904242;
 $21 = ((($md)) + 32|0);
 $22 = $21;
 $23 = $22;
 HEAP32[$23>>2] = 1595750129;
 $24 = (($22) + 4)|0;
 $25 = $24;
 HEAP32[$25>>2] = -1521486534;
 $26 = ((($md)) + 40|0);
 $27 = $26;
 $28 = $27;
 HEAP32[$28>>2] = -1377402159;
 $29 = (($27) + 4)|0;
 $30 = $29;
 HEAP32[$30>>2] = 1359893119;
 $31 = ((($md)) + 48|0);
 $32 = $31;
 $33 = $32;
 HEAP32[$33>>2] = 725511199;
 $34 = (($32) + 4)|0;
 $35 = $34;
 HEAP32[$35>>2] = -1694144372;
 $36 = ((($md)) + 56|0);
 $37 = $36;
 $38 = $37;
 HEAP32[$38>>2] = -79577749;
 $39 = (($37) + 4)|0;
 $40 = $39;
 HEAP32[$40>>2] = 528734635;
 $41 = ((($md)) + 64|0);
 $42 = $41;
 $43 = $42;
 HEAP32[$43>>2] = 327033209;
 $44 = (($42) + 4)|0;
 $45 = $44;
 HEAP32[$45>>2] = 1541459225;
 $$0 = 0;
 return ($$0|0);
}
function _sha512_update($md,$in,$inlen) {
 $md = $md|0;
 $in = $in|0;
 $inlen = $inlen|0;
 var $$0 = 0, $$02$ = 0, $$02$be = 0, $$027 = 0, $$03$be = 0, $$036 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0;
 var $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0;
 var $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $exitcond = 0, $i$05 = 0, $or$cond = 0, $or$cond4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($md|0)==(0|0);
 $1 = ($in|0)==(0|0);
 $or$cond4 = $0 | $1;
 if ($or$cond4) {
  $$0 = 1;
  return ($$0|0);
 }
 $2 = ((($md)) + 72|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3>>>0)>(128);
 if ($4) {
  $$0 = 1;
  return ($$0|0);
 }
 $5 = ($inlen|0)==(0);
 if ($5) {
  $$0 = 0;
  return ($$0|0);
 }
 $6 = ((($md)) + 76|0);
 $$027 = $inlen;$$036 = $in;
 while(1) {
  $7 = HEAP32[$2>>2]|0;
  $8 = ($7|0)==(0);
  $9 = ($$027>>>0)>(127);
  $or$cond = $9 & $8;
  if ($or$cond) {
   _sha512_compress($md,$$036);
   $10 = $md;
   $11 = $10;
   $12 = HEAP32[$11>>2]|0;
   $13 = (($10) + 4)|0;
   $14 = $13;
   $15 = HEAP32[$14>>2]|0;
   $16 = (_i64Add(($12|0),($15|0),1024,0)|0);
   $17 = tempRet0;
   $18 = $md;
   $19 = $18;
   HEAP32[$19>>2] = $16;
   $20 = (($18) + 4)|0;
   $21 = $20;
   HEAP32[$21>>2] = $17;
   $22 = ((($$036)) + 128|0);
   $23 = (($$027) + -128)|0;
   $$02$be = $23;$$03$be = $22;
  } else {
   $24 = (128 - ($7))|0;
   $25 = ($$027>>>0)<($24>>>0);
   $$02$ = $25 ? $$027 : $24;
   $26 = ($$02$|0)==(0);
   if (!($26)) {
    $27 = (128 - ($7))|0;
    $28 = ($$027>>>0)>($27>>>0);
    $29 = $28 ? $27 : $$027;
    $i$05 = 0;
    while(1) {
     $30 = (($$036) + ($i$05)|0);
     $31 = HEAP8[$30>>0]|0;
     $32 = HEAP32[$2>>2]|0;
     $33 = (($32) + ($i$05))|0;
     $34 = (((($md)) + 76|0) + ($33)|0);
     HEAP8[$34>>0] = $31;
     $35 = (($i$05) + 1)|0;
     $exitcond = ($35|0)==($29|0);
     if ($exitcond) {
      break;
     } else {
      $i$05 = $35;
     }
    }
   }
   $36 = HEAP32[$2>>2]|0;
   $37 = (($36) + ($$02$))|0;
   HEAP32[$2>>2] = $37;
   $38 = (($$036) + ($$02$)|0);
   $39 = (($$027) - ($$02$))|0;
   $40 = ($37|0)==(128);
   if ($40) {
    _sha512_compress($md,$6);
    $42 = $md;
    $43 = $42;
    $44 = HEAP32[$43>>2]|0;
    $45 = (($42) + 4)|0;
    $46 = $45;
    $47 = HEAP32[$46>>2]|0;
    $48 = (_i64Add(($44|0),($47|0),1024,0)|0);
    $49 = tempRet0;
    $50 = $md;
    $51 = $50;
    HEAP32[$51>>2] = $48;
    $52 = (($50) + 4)|0;
    $53 = $52;
    HEAP32[$53>>2] = $49;
    HEAP32[$2>>2] = 0;
    $$02$be = $39;$$03$be = $38;
   } else {
    $$02$be = $39;$$03$be = $38;
   }
  }
  $41 = ($$02$be|0)==(0);
  if ($41) {
   $$0 = 0;
   break;
  } else {
   $$027 = $$02$be;$$036 = $$03$be;
  }
 }
 return ($$0|0);
}
function _sha512_final($md,$out) {
 $md = $md|0;
 $out = $out|0;
 var $$0 = 0, $$pr = 0, $$pr8 = 0, $$sum1 = 0, $$sum2 = 0, $$sum3 = 0, $$sum4 = 0, $$sum5 = 0, $$sum6 = 0, $$sum7 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0;
 var $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0;
 var $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0;
 var $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0;
 var $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0;
 var $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0;
 var $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $exitcond = 0;
 var $i$010 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($md|0)==(0|0);
 $1 = ($out|0)==(0|0);
 $or$cond = $0 | $1;
 if ($or$cond) {
  $$0 = 1;
  return ($$0|0);
 }
 $2 = ((($md)) + 72|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3>>>0)>(127);
 if ($4) {
  $$0 = 1;
  return ($$0|0);
 }
 $5 = (_bitshift64Shl(($3|0),0,3)|0);
 $6 = tempRet0;
 $7 = $md;
 $8 = $7;
 $9 = HEAP32[$8>>2]|0;
 $10 = (($7) + 4)|0;
 $11 = $10;
 $12 = HEAP32[$11>>2]|0;
 $13 = (_i64Add(($9|0),($12|0),($5|0),($6|0))|0);
 $14 = tempRet0;
 $15 = $md;
 $16 = $15;
 HEAP32[$16>>2] = $13;
 $17 = (($15) + 4)|0;
 $18 = $17;
 HEAP32[$18>>2] = $14;
 $19 = HEAP32[$2>>2]|0;
 $20 = (($19) + 1)|0;
 HEAP32[$2>>2] = $20;
 $21 = ((($md)) + 76|0);
 $22 = (((($md)) + 76|0) + ($19)|0);
 HEAP8[$22>>0] = -128;
 $23 = HEAP32[$2>>2]|0;
 $24 = ($23>>>0)>(112);
 if ($24) {
  $25 = ($23>>>0)<(128);
  if ($25) {
   $27 = $23;
   while(1) {
    $26 = (($27) + 1)|0;
    HEAP32[$2>>2] = $26;
    $28 = (((($md)) + 76|0) + ($27)|0);
    HEAP8[$28>>0] = 0;
    $$pr = HEAP32[$2>>2]|0;
    $29 = ($$pr>>>0)<(128);
    if ($29) {
     $27 = $$pr;
    } else {
     break;
    }
   }
  }
  _sha512_compress($md,$21);
  HEAP32[$2>>2] = 0;
  $31 = 0;
 } else {
  $31 = $23;
 }
 while(1) {
  $30 = (($31) + 1)|0;
  HEAP32[$2>>2] = $30;
  $32 = (((($md)) + 76|0) + ($31)|0);
  HEAP8[$32>>0] = 0;
  $$pr8 = HEAP32[$2>>2]|0;
  $33 = ($$pr8>>>0)<(120);
  if ($33) {
   $31 = $$pr8;
  } else {
   break;
  }
 }
 $34 = $md;
 $35 = $34;
 $36 = HEAP32[$35>>2]|0;
 $37 = (($34) + 4)|0;
 $38 = $37;
 $39 = HEAP32[$38>>2]|0;
 $40 = (_bitshift64Lshr(($36|0),($39|0),56)|0);
 $41 = tempRet0;
 $42 = $40&255;
 $43 = ((($md)) + 196|0);
 HEAP8[$43>>0] = $42;
 $44 = $md;
 $45 = $44;
 $46 = HEAP32[$45>>2]|0;
 $47 = (($44) + 4)|0;
 $48 = $47;
 $49 = HEAP32[$48>>2]|0;
 $50 = (_bitshift64Lshr(($46|0),($49|0),48)|0);
 $51 = tempRet0;
 $52 = $50&255;
 $53 = ((($md)) + 197|0);
 HEAP8[$53>>0] = $52;
 $54 = $md;
 $55 = $54;
 $56 = HEAP32[$55>>2]|0;
 $57 = (($54) + 4)|0;
 $58 = $57;
 $59 = HEAP32[$58>>2]|0;
 $60 = (_bitshift64Lshr(($56|0),($59|0),40)|0);
 $61 = tempRet0;
 $62 = $60&255;
 $63 = ((($md)) + 198|0);
 HEAP8[$63>>0] = $62;
 $64 = $md;
 $65 = $64;
 $66 = HEAP32[$65>>2]|0;
 $67 = (($64) + 4)|0;
 $68 = $67;
 $69 = HEAP32[$68>>2]|0;
 $70 = $69&255;
 $71 = ((($md)) + 199|0);
 HEAP8[$71>>0] = $70;
 $72 = $md;
 $73 = $72;
 $74 = HEAP32[$73>>2]|0;
 $75 = (($72) + 4)|0;
 $76 = $75;
 $77 = HEAP32[$76>>2]|0;
 $78 = (_bitshift64Lshr(($74|0),($77|0),24)|0);
 $79 = tempRet0;
 $80 = $78&255;
 $81 = ((($md)) + 200|0);
 HEAP8[$81>>0] = $80;
 $82 = $md;
 $83 = $82;
 $84 = HEAP32[$83>>2]|0;
 $85 = (($82) + 4)|0;
 $86 = $85;
 $87 = HEAP32[$86>>2]|0;
 $88 = (_bitshift64Lshr(($84|0),($87|0),16)|0);
 $89 = tempRet0;
 $90 = $88&255;
 $91 = ((($md)) + 201|0);
 HEAP8[$91>>0] = $90;
 $92 = $md;
 $93 = $92;
 $94 = HEAP32[$93>>2]|0;
 $95 = (($92) + 4)|0;
 $96 = $95;
 $97 = HEAP32[$96>>2]|0;
 $98 = (_bitshift64Lshr(($94|0),($97|0),8)|0);
 $99 = tempRet0;
 $100 = $98&255;
 $101 = ((($md)) + 202|0);
 HEAP8[$101>>0] = $100;
 $102 = $md;
 $103 = $102;
 $104 = HEAP32[$103>>2]|0;
 $105 = (($102) + 4)|0;
 $106 = $105;
 $107 = HEAP32[$106>>2]|0;
 $108 = $104&255;
 $109 = ((($md)) + 203|0);
 HEAP8[$109>>0] = $108;
 _sha512_compress($md,$21);
 $i$010 = 0;
 while(1) {
  $110 = (((($md)) + 8|0) + ($i$010<<3)|0);
  $111 = $110;
  $112 = $111;
  $113 = HEAP32[$112>>2]|0;
  $114 = (($111) + 4)|0;
  $115 = $114;
  $116 = HEAP32[$115>>2]|0;
  $117 = (_bitshift64Lshr(($113|0),($116|0),56)|0);
  $118 = tempRet0;
  $119 = $117&255;
  $120 = $i$010 << 3;
  $121 = (($out) + ($120)|0);
  HEAP8[$121>>0] = $119;
  $122 = $110;
  $123 = $122;
  $124 = HEAP32[$123>>2]|0;
  $125 = (($122) + 4)|0;
  $126 = $125;
  $127 = HEAP32[$126>>2]|0;
  $128 = (_bitshift64Lshr(($124|0),($127|0),48)|0);
  $129 = tempRet0;
  $130 = $128&255;
  $$sum1 = $120 | 1;
  $131 = (($out) + ($$sum1)|0);
  HEAP8[$131>>0] = $130;
  $132 = $110;
  $133 = $132;
  $134 = HEAP32[$133>>2]|0;
  $135 = (($132) + 4)|0;
  $136 = $135;
  $137 = HEAP32[$136>>2]|0;
  $138 = (_bitshift64Lshr(($134|0),($137|0),40)|0);
  $139 = tempRet0;
  $140 = $138&255;
  $$sum2 = $120 | 2;
  $141 = (($out) + ($$sum2)|0);
  HEAP8[$141>>0] = $140;
  $142 = $110;
  $143 = $142;
  $144 = HEAP32[$143>>2]|0;
  $145 = (($142) + 4)|0;
  $146 = $145;
  $147 = HEAP32[$146>>2]|0;
  $148 = $147&255;
  $$sum3 = $120 | 3;
  $149 = (($out) + ($$sum3)|0);
  HEAP8[$149>>0] = $148;
  $150 = $110;
  $151 = $150;
  $152 = HEAP32[$151>>2]|0;
  $153 = (($150) + 4)|0;
  $154 = $153;
  $155 = HEAP32[$154>>2]|0;
  $156 = (_bitshift64Lshr(($152|0),($155|0),24)|0);
  $157 = tempRet0;
  $158 = $156&255;
  $$sum4 = $120 | 4;
  $159 = (($out) + ($$sum4)|0);
  HEAP8[$159>>0] = $158;
  $160 = $110;
  $161 = $160;
  $162 = HEAP32[$161>>2]|0;
  $163 = (($160) + 4)|0;
  $164 = $163;
  $165 = HEAP32[$164>>2]|0;
  $166 = (_bitshift64Lshr(($162|0),($165|0),16)|0);
  $167 = tempRet0;
  $168 = $166&255;
  $$sum5 = $120 | 5;
  $169 = (($out) + ($$sum5)|0);
  HEAP8[$169>>0] = $168;
  $170 = $110;
  $171 = $170;
  $172 = HEAP32[$171>>2]|0;
  $173 = (($170) + 4)|0;
  $174 = $173;
  $175 = HEAP32[$174>>2]|0;
  $176 = (_bitshift64Lshr(($172|0),($175|0),8)|0);
  $177 = tempRet0;
  $178 = $176&255;
  $$sum6 = $120 | 6;
  $179 = (($out) + ($$sum6)|0);
  HEAP8[$179>>0] = $178;
  $180 = $110;
  $181 = $180;
  $182 = HEAP32[$181>>2]|0;
  $183 = (($180) + 4)|0;
  $184 = $183;
  $185 = HEAP32[$184>>2]|0;
  $186 = $182&255;
  $$sum7 = $120 | 7;
  $187 = (($out) + ($$sum7)|0);
  HEAP8[$187>>0] = $186;
  $188 = (($i$010) + 1)|0;
  $exitcond = ($188|0)==(8);
  if ($exitcond) {
   $$0 = 0;
   break;
  } else {
   $i$010 = $188;
  }
 }
 return ($$0|0);
}
function _sha512($message,$message_len,$out) {
 $message = $message|0;
 $message_len = $message_len|0;
 $out = $out|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $ctx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0;
 $ctx = sp;
 $0 = (_sha512_init($ctx)|0);
 $1 = ($0|0)==(0);
 if ($1) {
  $2 = (_sha512_update($ctx,$message,$message_len)|0);
  $3 = ($2|0)==(0);
  if ($3) {
   $4 = (_sha512_final($ctx,$out)|0);
   $$0 = $4;
  } else {
   $$0 = $2;
  }
 } else {
  $$0 = $0;
 }
 STACKTOP = sp;return ($$0|0);
}
function _sha512_compress($md,$buf) {
 $md = $md|0;
 $buf = $buf|0;
 var $$sum1 = 0, $$sum2 = 0, $$sum3 = 0, $$sum4 = 0, $$sum5 = 0, $$sum6 = 0, $$sum7 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0;
 var $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0;
 var $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0;
 var $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0;
 var $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $1075 = 0, $1076 = 0, $1077 = 0, $1078 = 0, $1079 = 0, $108 = 0, $1080 = 0;
 var $1081 = 0, $1082 = 0, $1083 = 0, $1084 = 0, $1085 = 0, $1086 = 0, $1087 = 0, $1088 = 0, $1089 = 0, $109 = 0, $1090 = 0, $1091 = 0, $1092 = 0, $1093 = 0, $1094 = 0, $1095 = 0, $1096 = 0, $1097 = 0, $1098 = 0, $1099 = 0;
 var $11 = 0, $110 = 0, $1100 = 0, $1101 = 0, $1102 = 0, $1103 = 0, $1104 = 0, $1105 = 0, $1106 = 0, $1107 = 0, $1108 = 0, $1109 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0;
 var $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0;
 var $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0;
 var $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0;
 var $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0;
 var $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0;
 var $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0;
 var $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0;
 var $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0;
 var $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0;
 var $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0;
 var $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0;
 var $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0;
 var $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0;
 var $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0;
 var $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0;
 var $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0;
 var $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0;
 var $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0;
 var $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0;
 var $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0;
 var $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0;
 var $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0;
 var $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0;
 var $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0;
 var $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0;
 var $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0;
 var $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0;
 var $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0;
 var $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0;
 var $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0;
 var $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0;
 var $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0;
 var $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0;
 var $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0;
 var $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0;
 var $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0;
 var $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0;
 var $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0;
 var $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0;
 var $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0;
 var $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0;
 var $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0;
 var $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0;
 var $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0;
 var $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0;
 var $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0;
 var $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0;
 var $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0;
 var $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $S = 0, $W = 0, $exitcond = 0;
 var $exitcond37 = 0, $i$128 = 0, $i$227 = 0, $i$312 = 0, $scevgep = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 704|0;
 $S = sp + 640|0;
 $W = sp;
 $scevgep = ((($md)) + 8|0);
 dest=$S; src=$scevgep; stop=dest+64|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 $i$128 = 0;
 while(1) {
  $0 = $i$128 << 3;
  $1 = (($buf) + ($0)|0);
  $2 = HEAP8[$1>>0]|0;
  $3 = $2&255;
  $4 = (_bitshift64Shl(($3|0),0,56)|0);
  $5 = tempRet0;
  $$sum1 = $0 | 1;
  $6 = (($buf) + ($$sum1)|0);
  $7 = HEAP8[$6>>0]|0;
  $8 = $7&255;
  $9 = (_bitshift64Shl(($8|0),0,48)|0);
  $10 = tempRet0;
  $11 = $9 | $4;
  $12 = $10 | $5;
  $$sum2 = $0 | 2;
  $13 = (($buf) + ($$sum2)|0);
  $14 = HEAP8[$13>>0]|0;
  $15 = $14&255;
  $16 = (_bitshift64Shl(($15|0),0,40)|0);
  $17 = tempRet0;
  $18 = $11 | $16;
  $19 = $12 | $17;
  $$sum3 = $0 | 3;
  $20 = (($buf) + ($$sum3)|0);
  $21 = HEAP8[$20>>0]|0;
  $22 = $21&255;
  $23 = $19 | $22;
  $$sum4 = $0 | 4;
  $24 = (($buf) + ($$sum4)|0);
  $25 = HEAP8[$24>>0]|0;
  $26 = $25&255;
  $27 = (_bitshift64Shl(($26|0),0,24)|0);
  $28 = tempRet0;
  $29 = $18 | $27;
  $30 = $23 | $28;
  $$sum5 = $0 | 5;
  $31 = (($buf) + ($$sum5)|0);
  $32 = HEAP8[$31>>0]|0;
  $33 = $32&255;
  $34 = (_bitshift64Shl(($33|0),0,16)|0);
  $35 = tempRet0;
  $36 = $29 | $34;
  $37 = $30 | $35;
  $$sum6 = $0 | 6;
  $38 = (($buf) + ($$sum6)|0);
  $39 = HEAP8[$38>>0]|0;
  $40 = $39&255;
  $41 = (_bitshift64Shl(($40|0),0,8)|0);
  $42 = tempRet0;
  $43 = $36 | $41;
  $44 = $37 | $42;
  $$sum7 = $0 | 7;
  $45 = (($buf) + ($$sum7)|0);
  $46 = HEAP8[$45>>0]|0;
  $47 = $46&255;
  $48 = $43 | $47;
  $49 = (($W) + ($i$128<<3)|0);
  $50 = $49;
  $51 = $50;
  HEAP32[$51>>2] = $48;
  $52 = (($50) + 4)|0;
  $53 = $52;
  HEAP32[$53>>2] = $44;
  $54 = (($i$128) + 1)|0;
  $exitcond37 = ($54|0)==(16);
  if ($exitcond37) {
   $i$227 = 16;
   break;
  } else {
   $i$128 = $54;
  }
 }
 while(1) {
  $110 = (($i$227) + -2)|0;
  $111 = (($W) + ($110<<3)|0);
  $112 = $111;
  $113 = $112;
  $114 = HEAP32[$113>>2]|0;
  $115 = (($112) + 4)|0;
  $116 = $115;
  $117 = HEAP32[$116>>2]|0;
  $118 = (_bitshift64Lshr(($114|0),($117|0),19)|0);
  $119 = tempRet0;
  $120 = (_bitshift64Shl(($114|0),($117|0),45)|0);
  $121 = tempRet0;
  $122 = $118 | $120;
  $123 = $119 | $121;
  $124 = (_bitshift64Lshr(($114|0),($117|0),61)|0);
  $125 = tempRet0;
  $126 = (_bitshift64Shl(($114|0),($117|0),3)|0);
  $127 = tempRet0;
  $128 = $124 | $126;
  $129 = $125 | $127;
  $130 = (_bitshift64Lshr(($114|0),($117|0),6)|0);
  $131 = tempRet0;
  $132 = $128 ^ $130;
  $133 = $129 ^ $131;
  $134 = $132 ^ $122;
  $135 = $133 ^ $123;
  $136 = (($i$227) + -7)|0;
  $137 = (($W) + ($136<<3)|0);
  $138 = $137;
  $139 = $138;
  $140 = HEAP32[$139>>2]|0;
  $141 = (($138) + 4)|0;
  $142 = $141;
  $143 = HEAP32[$142>>2]|0;
  $144 = (($i$227) + -15)|0;
  $145 = (($W) + ($144<<3)|0);
  $146 = $145;
  $147 = $146;
  $148 = HEAP32[$147>>2]|0;
  $149 = (($146) + 4)|0;
  $150 = $149;
  $151 = HEAP32[$150>>2]|0;
  $152 = (_bitshift64Lshr(($148|0),($151|0),1)|0);
  $153 = tempRet0;
  $154 = (_bitshift64Shl(($148|0),($151|0),63)|0);
  $155 = tempRet0;
  $156 = $152 | $154;
  $157 = $153 | $155;
  $158 = (_bitshift64Lshr(($148|0),($151|0),8)|0);
  $159 = tempRet0;
  $160 = (_bitshift64Shl(($148|0),($151|0),56)|0);
  $161 = tempRet0;
  $162 = $158 | $160;
  $163 = $159 | $161;
  $164 = (_bitshift64Lshr(($148|0),($151|0),7)|0);
  $165 = tempRet0;
  $166 = $162 ^ $164;
  $167 = $163 ^ $165;
  $168 = $166 ^ $156;
  $169 = $167 ^ $157;
  $170 = (($i$227) + -16)|0;
  $171 = (($W) + ($170<<3)|0);
  $172 = $171;
  $173 = $172;
  $174 = HEAP32[$173>>2]|0;
  $175 = (($172) + 4)|0;
  $176 = $175;
  $177 = HEAP32[$176>>2]|0;
  $178 = (_i64Add(($174|0),($177|0),($140|0),($143|0))|0);
  $179 = tempRet0;
  $180 = (_i64Add(($178|0),($179|0),($134|0),($135|0))|0);
  $181 = tempRet0;
  $182 = (_i64Add(($180|0),($181|0),($168|0),($169|0))|0);
  $183 = tempRet0;
  $184 = (($W) + ($i$227<<3)|0);
  $185 = $184;
  $186 = $185;
  HEAP32[$186>>2] = $182;
  $187 = (($185) + 4)|0;
  $188 = $187;
  HEAP32[$188>>2] = $183;
  $189 = (($i$227) + 1)|0;
  $exitcond = ($189|0)==(80);
  if ($exitcond) {
   break;
  } else {
   $i$227 = $189;
  }
 }
 $55 = ((($S)) + 56|0);
 $56 = ((($S)) + 32|0);
 $57 = ((($S)) + 48|0);
 $58 = ((($S)) + 40|0);
 $59 = ((($S)) + 8|0);
 $60 = ((($S)) + 16|0);
 $61 = ((($S)) + 24|0);
 $62 = $55;
 $63 = $62;
 $64 = HEAP32[$63>>2]|0;
 $65 = (($62) + 4)|0;
 $66 = $65;
 $67 = HEAP32[$66>>2]|0;
 $68 = $56;
 $69 = $68;
 $70 = HEAP32[$69>>2]|0;
 $71 = (($68) + 4)|0;
 $72 = $71;
 $73 = HEAP32[$72>>2]|0;
 $74 = $57;
 $75 = $74;
 $76 = HEAP32[$75>>2]|0;
 $77 = (($74) + 4)|0;
 $78 = $77;
 $79 = HEAP32[$78>>2]|0;
 $80 = $58;
 $81 = $80;
 $82 = HEAP32[$81>>2]|0;
 $83 = (($80) + 4)|0;
 $84 = $83;
 $85 = HEAP32[$84>>2]|0;
 $86 = $S;
 $87 = $86;
 $88 = HEAP32[$87>>2]|0;
 $89 = (($86) + 4)|0;
 $90 = $89;
 $91 = HEAP32[$90>>2]|0;
 $92 = $59;
 $93 = $92;
 $94 = HEAP32[$93>>2]|0;
 $95 = (($92) + 4)|0;
 $96 = $95;
 $97 = HEAP32[$96>>2]|0;
 $98 = $60;
 $99 = $98;
 $100 = HEAP32[$99>>2]|0;
 $101 = (($98) + 4)|0;
 $102 = $101;
 $103 = HEAP32[$102>>2]|0;
 $104 = $61;
 $105 = $104;
 $106 = HEAP32[$105>>2]|0;
 $107 = (($104) + 4)|0;
 $108 = $107;
 $109 = HEAP32[$108>>2]|0;
 $190 = $70;$191 = $73;$215 = $82;$216 = $76;$218 = $85;$219 = $79;$238 = $64;$239 = $67;$248 = $88;$249 = $91;$273 = $94;$275 = $97;$277 = $100;$279 = $103;$284 = $106;$285 = $109;$i$312 = 0;
 while(1) {
  $192 = (_bitshift64Lshr(($190|0),($191|0),14)|0);
  $193 = tempRet0;
  $194 = (_bitshift64Shl(($190|0),($191|0),50)|0);
  $195 = tempRet0;
  $196 = $192 | $194;
  $197 = $193 | $195;
  $198 = (_bitshift64Lshr(($190|0),($191|0),18)|0);
  $199 = tempRet0;
  $200 = (_bitshift64Shl(($190|0),($191|0),46)|0);
  $201 = tempRet0;
  $202 = $198 | $200;
  $203 = $199 | $201;
  $204 = $196 ^ $202;
  $205 = $197 ^ $203;
  $206 = (_bitshift64Lshr(($190|0),($191|0),41)|0);
  $207 = tempRet0;
  $208 = (_bitshift64Shl(($190|0),($191|0),23)|0);
  $209 = tempRet0;
  $210 = $206 | $208;
  $211 = $207 | $209;
  $212 = $204 ^ $210;
  $213 = $205 ^ $211;
  $214 = $215 ^ $216;
  $217 = $218 ^ $219;
  $220 = $214 & $190;
  $221 = $217 & $191;
  $222 = $220 ^ $216;
  $223 = $221 ^ $219;
  $224 = (8 + ($i$312<<3)|0);
  $225 = $224;
  $226 = $225;
  $227 = HEAP32[$226>>2]|0;
  $228 = (($225) + 4)|0;
  $229 = $228;
  $230 = HEAP32[$229>>2]|0;
  $231 = (($W) + ($i$312<<3)|0);
  $232 = $231;
  $233 = $232;
  $234 = HEAP32[$233>>2]|0;
  $235 = (($232) + 4)|0;
  $236 = $235;
  $237 = HEAP32[$236>>2]|0;
  $240 = (_i64Add(($227|0),($230|0),($238|0),($239|0))|0);
  $241 = tempRet0;
  $242 = (_i64Add(($240|0),($241|0),($212|0),($213|0))|0);
  $243 = tempRet0;
  $244 = (_i64Add(($242|0),($243|0),($234|0),($237|0))|0);
  $245 = tempRet0;
  $246 = (_i64Add(($244|0),($245|0),($222|0),($223|0))|0);
  $247 = tempRet0;
  $250 = (_bitshift64Lshr(($248|0),($249|0),28)|0);
  $251 = tempRet0;
  $252 = (_bitshift64Shl(($248|0),($249|0),36)|0);
  $253 = tempRet0;
  $254 = $250 | $252;
  $255 = $251 | $253;
  $256 = (_bitshift64Lshr(($248|0),($249|0),34)|0);
  $257 = tempRet0;
  $258 = (_bitshift64Shl(($248|0),($249|0),30)|0);
  $259 = tempRet0;
  $260 = $256 | $258;
  $261 = $257 | $259;
  $262 = $254 ^ $260;
  $263 = $255 ^ $261;
  $264 = (_bitshift64Lshr(($248|0),($249|0),39)|0);
  $265 = tempRet0;
  $266 = (_bitshift64Shl(($248|0),($249|0),25)|0);
  $267 = tempRet0;
  $268 = $264 | $266;
  $269 = $265 | $267;
  $270 = $262 ^ $268;
  $271 = $263 ^ $269;
  $272 = $273 | $248;
  $274 = $275 | $249;
  $276 = $272 & $277;
  $278 = $274 & $279;
  $280 = $273 & $248;
  $281 = $275 & $249;
  $282 = $276 | $280;
  $283 = $278 | $281;
  $286 = (_i64Add(($284|0),($285|0),($246|0),($247|0))|0);
  $287 = tempRet0;
  $288 = (_i64Add(($282|0),($283|0),($246|0),($247|0))|0);
  $289 = tempRet0;
  $290 = (_i64Add(($288|0),($289|0),($270|0),($271|0))|0);
  $291 = tempRet0;
  $292 = (_bitshift64Lshr(($286|0),($287|0),14)|0);
  $293 = tempRet0;
  $294 = (_bitshift64Shl(($286|0),($287|0),50)|0);
  $295 = tempRet0;
  $296 = $292 | $294;
  $297 = $293 | $295;
  $298 = (_bitshift64Lshr(($286|0),($287|0),18)|0);
  $299 = tempRet0;
  $300 = (_bitshift64Shl(($286|0),($287|0),46)|0);
  $301 = tempRet0;
  $302 = $298 | $300;
  $303 = $299 | $301;
  $304 = $296 ^ $302;
  $305 = $297 ^ $303;
  $306 = (_bitshift64Lshr(($286|0),($287|0),41)|0);
  $307 = tempRet0;
  $308 = (_bitshift64Shl(($286|0),($287|0),23)|0);
  $309 = tempRet0;
  $310 = $306 | $308;
  $311 = $307 | $309;
  $312 = $304 ^ $310;
  $313 = $305 ^ $311;
  $314 = $190 ^ $215;
  $315 = $191 ^ $218;
  $316 = $314 & $286;
  $317 = $315 & $287;
  $318 = $316 ^ $215;
  $319 = $317 ^ $218;
  $320 = $i$312 | 1;
  $321 = (8 + ($320<<3)|0);
  $322 = $321;
  $323 = $322;
  $324 = HEAP32[$323>>2]|0;
  $325 = (($322) + 4)|0;
  $326 = $325;
  $327 = HEAP32[$326>>2]|0;
  $328 = (($W) + ($320<<3)|0);
  $329 = $328;
  $330 = $329;
  $331 = HEAP32[$330>>2]|0;
  $332 = (($329) + 4)|0;
  $333 = $332;
  $334 = HEAP32[$333>>2]|0;
  $335 = (_i64Add(($324|0),($327|0),($216|0),($219|0))|0);
  $336 = tempRet0;
  $337 = (_i64Add(($335|0),($336|0),($312|0),($313|0))|0);
  $338 = tempRet0;
  $339 = (_i64Add(($337|0),($338|0),($331|0),($334|0))|0);
  $340 = tempRet0;
  $341 = (_i64Add(($339|0),($340|0),($318|0),($319|0))|0);
  $342 = tempRet0;
  $343 = (_bitshift64Lshr(($290|0),($291|0),28)|0);
  $344 = tempRet0;
  $345 = (_bitshift64Shl(($290|0),($291|0),36)|0);
  $346 = tempRet0;
  $347 = $343 | $345;
  $348 = $344 | $346;
  $349 = (_bitshift64Lshr(($290|0),($291|0),34)|0);
  $350 = tempRet0;
  $351 = (_bitshift64Shl(($290|0),($291|0),30)|0);
  $352 = tempRet0;
  $353 = $349 | $351;
  $354 = $350 | $352;
  $355 = $347 ^ $353;
  $356 = $348 ^ $354;
  $357 = (_bitshift64Lshr(($290|0),($291|0),39)|0);
  $358 = tempRet0;
  $359 = (_bitshift64Shl(($290|0),($291|0),25)|0);
  $360 = tempRet0;
  $361 = $357 | $359;
  $362 = $358 | $360;
  $363 = $355 ^ $361;
  $364 = $356 ^ $362;
  $365 = $248 | $290;
  $366 = $249 | $291;
  $367 = $365 & $273;
  $368 = $366 & $275;
  $369 = $248 & $290;
  $370 = $249 & $291;
  $371 = $367 | $369;
  $372 = $368 | $370;
  $373 = (_i64Add(($371|0),($372|0),($363|0),($364|0))|0);
  $374 = tempRet0;
  $375 = (_i64Add(($341|0),($342|0),($277|0),($279|0))|0);
  $376 = tempRet0;
  $377 = (_i64Add(($373|0),($374|0),($341|0),($342|0))|0);
  $378 = tempRet0;
  $379 = (_bitshift64Lshr(($375|0),($376|0),14)|0);
  $380 = tempRet0;
  $381 = (_bitshift64Shl(($375|0),($376|0),50)|0);
  $382 = tempRet0;
  $383 = $379 | $381;
  $384 = $380 | $382;
  $385 = (_bitshift64Lshr(($375|0),($376|0),18)|0);
  $386 = tempRet0;
  $387 = (_bitshift64Shl(($375|0),($376|0),46)|0);
  $388 = tempRet0;
  $389 = $385 | $387;
  $390 = $386 | $388;
  $391 = $383 ^ $389;
  $392 = $384 ^ $390;
  $393 = (_bitshift64Lshr(($375|0),($376|0),41)|0);
  $394 = tempRet0;
  $395 = (_bitshift64Shl(($375|0),($376|0),23)|0);
  $396 = tempRet0;
  $397 = $393 | $395;
  $398 = $394 | $396;
  $399 = $391 ^ $397;
  $400 = $392 ^ $398;
  $401 = $286 ^ $190;
  $402 = $287 ^ $191;
  $403 = $401 & $375;
  $404 = $402 & $376;
  $405 = $403 ^ $190;
  $406 = $404 ^ $191;
  $407 = $i$312 | 2;
  $408 = (8 + ($407<<3)|0);
  $409 = $408;
  $410 = $409;
  $411 = HEAP32[$410>>2]|0;
  $412 = (($409) + 4)|0;
  $413 = $412;
  $414 = HEAP32[$413>>2]|0;
  $415 = (($W) + ($407<<3)|0);
  $416 = $415;
  $417 = $416;
  $418 = HEAP32[$417>>2]|0;
  $419 = (($416) + 4)|0;
  $420 = $419;
  $421 = HEAP32[$420>>2]|0;
  $422 = (_i64Add(($411|0),($414|0),($215|0),($218|0))|0);
  $423 = tempRet0;
  $424 = (_i64Add(($422|0),($423|0),($399|0),($400|0))|0);
  $425 = tempRet0;
  $426 = (_i64Add(($424|0),($425|0),($418|0),($421|0))|0);
  $427 = tempRet0;
  $428 = (_i64Add(($426|0),($427|0),($405|0),($406|0))|0);
  $429 = tempRet0;
  $430 = (_bitshift64Lshr(($377|0),($378|0),28)|0);
  $431 = tempRet0;
  $432 = (_bitshift64Shl(($377|0),($378|0),36)|0);
  $433 = tempRet0;
  $434 = $430 | $432;
  $435 = $431 | $433;
  $436 = (_bitshift64Lshr(($377|0),($378|0),34)|0);
  $437 = tempRet0;
  $438 = (_bitshift64Shl(($377|0),($378|0),30)|0);
  $439 = tempRet0;
  $440 = $436 | $438;
  $441 = $437 | $439;
  $442 = $434 ^ $440;
  $443 = $435 ^ $441;
  $444 = (_bitshift64Lshr(($377|0),($378|0),39)|0);
  $445 = tempRet0;
  $446 = (_bitshift64Shl(($377|0),($378|0),25)|0);
  $447 = tempRet0;
  $448 = $444 | $446;
  $449 = $445 | $447;
  $450 = $442 ^ $448;
  $451 = $443 ^ $449;
  $452 = $290 | $377;
  $453 = $291 | $378;
  $454 = $452 & $248;
  $455 = $453 & $249;
  $456 = $290 & $377;
  $457 = $291 & $378;
  $458 = $454 | $456;
  $459 = $455 | $457;
  $460 = (_i64Add(($458|0),($459|0),($450|0),($451|0))|0);
  $461 = tempRet0;
  $462 = (_i64Add(($428|0),($429|0),($273|0),($275|0))|0);
  $463 = tempRet0;
  $464 = (_i64Add(($460|0),($461|0),($428|0),($429|0))|0);
  $465 = tempRet0;
  $466 = (_bitshift64Lshr(($462|0),($463|0),14)|0);
  $467 = tempRet0;
  $468 = (_bitshift64Shl(($462|0),($463|0),50)|0);
  $469 = tempRet0;
  $470 = $466 | $468;
  $471 = $467 | $469;
  $472 = (_bitshift64Lshr(($462|0),($463|0),18)|0);
  $473 = tempRet0;
  $474 = (_bitshift64Shl(($462|0),($463|0),46)|0);
  $475 = tempRet0;
  $476 = $472 | $474;
  $477 = $473 | $475;
  $478 = $470 ^ $476;
  $479 = $471 ^ $477;
  $480 = (_bitshift64Lshr(($462|0),($463|0),41)|0);
  $481 = tempRet0;
  $482 = (_bitshift64Shl(($462|0),($463|0),23)|0);
  $483 = tempRet0;
  $484 = $480 | $482;
  $485 = $481 | $483;
  $486 = $478 ^ $484;
  $487 = $479 ^ $485;
  $488 = $375 ^ $286;
  $489 = $376 ^ $287;
  $490 = $488 & $462;
  $491 = $489 & $463;
  $492 = $490 ^ $286;
  $493 = $491 ^ $287;
  $494 = $i$312 | 3;
  $495 = (8 + ($494<<3)|0);
  $496 = $495;
  $497 = $496;
  $498 = HEAP32[$497>>2]|0;
  $499 = (($496) + 4)|0;
  $500 = $499;
  $501 = HEAP32[$500>>2]|0;
  $502 = (($W) + ($494<<3)|0);
  $503 = $502;
  $504 = $503;
  $505 = HEAP32[$504>>2]|0;
  $506 = (($503) + 4)|0;
  $507 = $506;
  $508 = HEAP32[$507>>2]|0;
  $509 = (_i64Add(($498|0),($501|0),($190|0),($191|0))|0);
  $510 = tempRet0;
  $511 = (_i64Add(($509|0),($510|0),($486|0),($487|0))|0);
  $512 = tempRet0;
  $513 = (_i64Add(($511|0),($512|0),($505|0),($508|0))|0);
  $514 = tempRet0;
  $515 = (_i64Add(($513|0),($514|0),($492|0),($493|0))|0);
  $516 = tempRet0;
  $517 = (_bitshift64Lshr(($464|0),($465|0),28)|0);
  $518 = tempRet0;
  $519 = (_bitshift64Shl(($464|0),($465|0),36)|0);
  $520 = tempRet0;
  $521 = $517 | $519;
  $522 = $518 | $520;
  $523 = (_bitshift64Lshr(($464|0),($465|0),34)|0);
  $524 = tempRet0;
  $525 = (_bitshift64Shl(($464|0),($465|0),30)|0);
  $526 = tempRet0;
  $527 = $523 | $525;
  $528 = $524 | $526;
  $529 = $521 ^ $527;
  $530 = $522 ^ $528;
  $531 = (_bitshift64Lshr(($464|0),($465|0),39)|0);
  $532 = tempRet0;
  $533 = (_bitshift64Shl(($464|0),($465|0),25)|0);
  $534 = tempRet0;
  $535 = $531 | $533;
  $536 = $532 | $534;
  $537 = $529 ^ $535;
  $538 = $530 ^ $536;
  $539 = $377 | $464;
  $540 = $378 | $465;
  $541 = $539 & $290;
  $542 = $540 & $291;
  $543 = $377 & $464;
  $544 = $378 & $465;
  $545 = $541 | $543;
  $546 = $542 | $544;
  $547 = (_i64Add(($545|0),($546|0),($537|0),($538|0))|0);
  $548 = tempRet0;
  $549 = (_i64Add(($515|0),($516|0),($248|0),($249|0))|0);
  $550 = tempRet0;
  $551 = (_i64Add(($547|0),($548|0),($515|0),($516|0))|0);
  $552 = tempRet0;
  $553 = (_bitshift64Lshr(($549|0),($550|0),14)|0);
  $554 = tempRet0;
  $555 = (_bitshift64Shl(($549|0),($550|0),50)|0);
  $556 = tempRet0;
  $557 = $553 | $555;
  $558 = $554 | $556;
  $559 = (_bitshift64Lshr(($549|0),($550|0),18)|0);
  $560 = tempRet0;
  $561 = (_bitshift64Shl(($549|0),($550|0),46)|0);
  $562 = tempRet0;
  $563 = $559 | $561;
  $564 = $560 | $562;
  $565 = $557 ^ $563;
  $566 = $558 ^ $564;
  $567 = (_bitshift64Lshr(($549|0),($550|0),41)|0);
  $568 = tempRet0;
  $569 = (_bitshift64Shl(($549|0),($550|0),23)|0);
  $570 = tempRet0;
  $571 = $567 | $569;
  $572 = $568 | $570;
  $573 = $565 ^ $571;
  $574 = $566 ^ $572;
  $575 = $462 ^ $375;
  $576 = $463 ^ $376;
  $577 = $575 & $549;
  $578 = $576 & $550;
  $579 = $577 ^ $375;
  $580 = $578 ^ $376;
  $581 = $i$312 | 4;
  $582 = (8 + ($581<<3)|0);
  $583 = $582;
  $584 = $583;
  $585 = HEAP32[$584>>2]|0;
  $586 = (($583) + 4)|0;
  $587 = $586;
  $588 = HEAP32[$587>>2]|0;
  $589 = (($W) + ($581<<3)|0);
  $590 = $589;
  $591 = $590;
  $592 = HEAP32[$591>>2]|0;
  $593 = (($590) + 4)|0;
  $594 = $593;
  $595 = HEAP32[$594>>2]|0;
  $596 = (_i64Add(($585|0),($588|0),($286|0),($287|0))|0);
  $597 = tempRet0;
  $598 = (_i64Add(($596|0),($597|0),($573|0),($574|0))|0);
  $599 = tempRet0;
  $600 = (_i64Add(($598|0),($599|0),($592|0),($595|0))|0);
  $601 = tempRet0;
  $602 = (_i64Add(($600|0),($601|0),($579|0),($580|0))|0);
  $603 = tempRet0;
  $604 = (_bitshift64Lshr(($551|0),($552|0),28)|0);
  $605 = tempRet0;
  $606 = (_bitshift64Shl(($551|0),($552|0),36)|0);
  $607 = tempRet0;
  $608 = $604 | $606;
  $609 = $605 | $607;
  $610 = (_bitshift64Lshr(($551|0),($552|0),34)|0);
  $611 = tempRet0;
  $612 = (_bitshift64Shl(($551|0),($552|0),30)|0);
  $613 = tempRet0;
  $614 = $610 | $612;
  $615 = $611 | $613;
  $616 = $608 ^ $614;
  $617 = $609 ^ $615;
  $618 = (_bitshift64Lshr(($551|0),($552|0),39)|0);
  $619 = tempRet0;
  $620 = (_bitshift64Shl(($551|0),($552|0),25)|0);
  $621 = tempRet0;
  $622 = $618 | $620;
  $623 = $619 | $621;
  $624 = $616 ^ $622;
  $625 = $617 ^ $623;
  $626 = $464 | $551;
  $627 = $465 | $552;
  $628 = $626 & $377;
  $629 = $627 & $378;
  $630 = $464 & $551;
  $631 = $465 & $552;
  $632 = $628 | $630;
  $633 = $629 | $631;
  $634 = (_i64Add(($632|0),($633|0),($624|0),($625|0))|0);
  $635 = tempRet0;
  $636 = (_i64Add(($602|0),($603|0),($290|0),($291|0))|0);
  $637 = tempRet0;
  $638 = (_i64Add(($634|0),($635|0),($602|0),($603|0))|0);
  $639 = tempRet0;
  $640 = (_bitshift64Lshr(($636|0),($637|0),14)|0);
  $641 = tempRet0;
  $642 = (_bitshift64Shl(($636|0),($637|0),50)|0);
  $643 = tempRet0;
  $644 = $640 | $642;
  $645 = $641 | $643;
  $646 = (_bitshift64Lshr(($636|0),($637|0),18)|0);
  $647 = tempRet0;
  $648 = (_bitshift64Shl(($636|0),($637|0),46)|0);
  $649 = tempRet0;
  $650 = $646 | $648;
  $651 = $647 | $649;
  $652 = $644 ^ $650;
  $653 = $645 ^ $651;
  $654 = (_bitshift64Lshr(($636|0),($637|0),41)|0);
  $655 = tempRet0;
  $656 = (_bitshift64Shl(($636|0),($637|0),23)|0);
  $657 = tempRet0;
  $658 = $654 | $656;
  $659 = $655 | $657;
  $660 = $652 ^ $658;
  $661 = $653 ^ $659;
  $662 = $549 ^ $462;
  $663 = $550 ^ $463;
  $664 = $662 & $636;
  $665 = $663 & $637;
  $666 = $664 ^ $462;
  $667 = $665 ^ $463;
  $668 = $i$312 | 5;
  $669 = (8 + ($668<<3)|0);
  $670 = $669;
  $671 = $670;
  $672 = HEAP32[$671>>2]|0;
  $673 = (($670) + 4)|0;
  $674 = $673;
  $675 = HEAP32[$674>>2]|0;
  $676 = (($W) + ($668<<3)|0);
  $677 = $676;
  $678 = $677;
  $679 = HEAP32[$678>>2]|0;
  $680 = (($677) + 4)|0;
  $681 = $680;
  $682 = HEAP32[$681>>2]|0;
  $683 = (_i64Add(($672|0),($675|0),($375|0),($376|0))|0);
  $684 = tempRet0;
  $685 = (_i64Add(($683|0),($684|0),($660|0),($661|0))|0);
  $686 = tempRet0;
  $687 = (_i64Add(($685|0),($686|0),($679|0),($682|0))|0);
  $688 = tempRet0;
  $689 = (_i64Add(($687|0),($688|0),($666|0),($667|0))|0);
  $690 = tempRet0;
  $691 = (_bitshift64Lshr(($638|0),($639|0),28)|0);
  $692 = tempRet0;
  $693 = (_bitshift64Shl(($638|0),($639|0),36)|0);
  $694 = tempRet0;
  $695 = $691 | $693;
  $696 = $692 | $694;
  $697 = (_bitshift64Lshr(($638|0),($639|0),34)|0);
  $698 = tempRet0;
  $699 = (_bitshift64Shl(($638|0),($639|0),30)|0);
  $700 = tempRet0;
  $701 = $697 | $699;
  $702 = $698 | $700;
  $703 = $695 ^ $701;
  $704 = $696 ^ $702;
  $705 = (_bitshift64Lshr(($638|0),($639|0),39)|0);
  $706 = tempRet0;
  $707 = (_bitshift64Shl(($638|0),($639|0),25)|0);
  $708 = tempRet0;
  $709 = $705 | $707;
  $710 = $706 | $708;
  $711 = $703 ^ $709;
  $712 = $704 ^ $710;
  $713 = $551 | $638;
  $714 = $552 | $639;
  $715 = $713 & $464;
  $716 = $714 & $465;
  $717 = $551 & $638;
  $718 = $552 & $639;
  $719 = $715 | $717;
  $720 = $716 | $718;
  $721 = (_i64Add(($719|0),($720|0),($711|0),($712|0))|0);
  $722 = tempRet0;
  $723 = (_i64Add(($689|0),($690|0),($377|0),($378|0))|0);
  $724 = tempRet0;
  $725 = (_i64Add(($721|0),($722|0),($689|0),($690|0))|0);
  $726 = tempRet0;
  $727 = (_bitshift64Lshr(($723|0),($724|0),14)|0);
  $728 = tempRet0;
  $729 = (_bitshift64Shl(($723|0),($724|0),50)|0);
  $730 = tempRet0;
  $731 = $727 | $729;
  $732 = $728 | $730;
  $733 = (_bitshift64Lshr(($723|0),($724|0),18)|0);
  $734 = tempRet0;
  $735 = (_bitshift64Shl(($723|0),($724|0),46)|0);
  $736 = tempRet0;
  $737 = $733 | $735;
  $738 = $734 | $736;
  $739 = $731 ^ $737;
  $740 = $732 ^ $738;
  $741 = (_bitshift64Lshr(($723|0),($724|0),41)|0);
  $742 = tempRet0;
  $743 = (_bitshift64Shl(($723|0),($724|0),23)|0);
  $744 = tempRet0;
  $745 = $741 | $743;
  $746 = $742 | $744;
  $747 = $739 ^ $745;
  $748 = $740 ^ $746;
  $749 = $636 ^ $549;
  $750 = $637 ^ $550;
  $751 = $749 & $723;
  $752 = $750 & $724;
  $753 = $751 ^ $549;
  $754 = $752 ^ $550;
  $755 = $i$312 | 6;
  $756 = (8 + ($755<<3)|0);
  $757 = $756;
  $758 = $757;
  $759 = HEAP32[$758>>2]|0;
  $760 = (($757) + 4)|0;
  $761 = $760;
  $762 = HEAP32[$761>>2]|0;
  $763 = (($W) + ($755<<3)|0);
  $764 = $763;
  $765 = $764;
  $766 = HEAP32[$765>>2]|0;
  $767 = (($764) + 4)|0;
  $768 = $767;
  $769 = HEAP32[$768>>2]|0;
  $770 = (_i64Add(($759|0),($762|0),($462|0),($463|0))|0);
  $771 = tempRet0;
  $772 = (_i64Add(($770|0),($771|0),($747|0),($748|0))|0);
  $773 = tempRet0;
  $774 = (_i64Add(($772|0),($773|0),($766|0),($769|0))|0);
  $775 = tempRet0;
  $776 = (_i64Add(($774|0),($775|0),($753|0),($754|0))|0);
  $777 = tempRet0;
  $778 = (_bitshift64Lshr(($725|0),($726|0),28)|0);
  $779 = tempRet0;
  $780 = (_bitshift64Shl(($725|0),($726|0),36)|0);
  $781 = tempRet0;
  $782 = $778 | $780;
  $783 = $779 | $781;
  $784 = (_bitshift64Lshr(($725|0),($726|0),34)|0);
  $785 = tempRet0;
  $786 = (_bitshift64Shl(($725|0),($726|0),30)|0);
  $787 = tempRet0;
  $788 = $784 | $786;
  $789 = $785 | $787;
  $790 = $782 ^ $788;
  $791 = $783 ^ $789;
  $792 = (_bitshift64Lshr(($725|0),($726|0),39)|0);
  $793 = tempRet0;
  $794 = (_bitshift64Shl(($725|0),($726|0),25)|0);
  $795 = tempRet0;
  $796 = $792 | $794;
  $797 = $793 | $795;
  $798 = $790 ^ $796;
  $799 = $791 ^ $797;
  $800 = $638 | $725;
  $801 = $639 | $726;
  $802 = $800 & $551;
  $803 = $801 & $552;
  $804 = $638 & $725;
  $805 = $639 & $726;
  $806 = $802 | $804;
  $807 = $803 | $805;
  $808 = (_i64Add(($806|0),($807|0),($798|0),($799|0))|0);
  $809 = tempRet0;
  $810 = (_i64Add(($776|0),($777|0),($464|0),($465|0))|0);
  $811 = tempRet0;
  $812 = (_i64Add(($808|0),($809|0),($776|0),($777|0))|0);
  $813 = tempRet0;
  $814 = (_bitshift64Lshr(($810|0),($811|0),14)|0);
  $815 = tempRet0;
  $816 = (_bitshift64Shl(($810|0),($811|0),50)|0);
  $817 = tempRet0;
  $818 = $814 | $816;
  $819 = $815 | $817;
  $820 = (_bitshift64Lshr(($810|0),($811|0),18)|0);
  $821 = tempRet0;
  $822 = (_bitshift64Shl(($810|0),($811|0),46)|0);
  $823 = tempRet0;
  $824 = $820 | $822;
  $825 = $821 | $823;
  $826 = $818 ^ $824;
  $827 = $819 ^ $825;
  $828 = (_bitshift64Lshr(($810|0),($811|0),41)|0);
  $829 = tempRet0;
  $830 = (_bitshift64Shl(($810|0),($811|0),23)|0);
  $831 = tempRet0;
  $832 = $828 | $830;
  $833 = $829 | $831;
  $834 = $826 ^ $832;
  $835 = $827 ^ $833;
  $836 = $723 ^ $636;
  $837 = $724 ^ $637;
  $838 = $836 & $810;
  $839 = $837 & $811;
  $840 = $838 ^ $636;
  $841 = $839 ^ $637;
  $842 = $i$312 | 7;
  $843 = (8 + ($842<<3)|0);
  $844 = $843;
  $845 = $844;
  $846 = HEAP32[$845>>2]|0;
  $847 = (($844) + 4)|0;
  $848 = $847;
  $849 = HEAP32[$848>>2]|0;
  $850 = (($W) + ($842<<3)|0);
  $851 = $850;
  $852 = $851;
  $853 = HEAP32[$852>>2]|0;
  $854 = (($851) + 4)|0;
  $855 = $854;
  $856 = HEAP32[$855>>2]|0;
  $857 = (_i64Add(($846|0),($849|0),($549|0),($550|0))|0);
  $858 = tempRet0;
  $859 = (_i64Add(($857|0),($858|0),($834|0),($835|0))|0);
  $860 = tempRet0;
  $861 = (_i64Add(($859|0),($860|0),($853|0),($856|0))|0);
  $862 = tempRet0;
  $863 = (_i64Add(($861|0),($862|0),($840|0),($841|0))|0);
  $864 = tempRet0;
  $865 = (_bitshift64Lshr(($812|0),($813|0),28)|0);
  $866 = tempRet0;
  $867 = (_bitshift64Shl(($812|0),($813|0),36)|0);
  $868 = tempRet0;
  $869 = $865 | $867;
  $870 = $866 | $868;
  $871 = (_bitshift64Lshr(($812|0),($813|0),34)|0);
  $872 = tempRet0;
  $873 = (_bitshift64Shl(($812|0),($813|0),30)|0);
  $874 = tempRet0;
  $875 = $871 | $873;
  $876 = $872 | $874;
  $877 = $869 ^ $875;
  $878 = $870 ^ $876;
  $879 = (_bitshift64Lshr(($812|0),($813|0),39)|0);
  $880 = tempRet0;
  $881 = (_bitshift64Shl(($812|0),($813|0),25)|0);
  $882 = tempRet0;
  $883 = $879 | $881;
  $884 = $880 | $882;
  $885 = $877 ^ $883;
  $886 = $878 ^ $884;
  $887 = $725 | $812;
  $888 = $726 | $813;
  $889 = $887 & $638;
  $890 = $888 & $639;
  $891 = $725 & $812;
  $892 = $726 & $813;
  $893 = $889 | $891;
  $894 = $890 | $892;
  $895 = (_i64Add(($893|0),($894|0),($885|0),($886|0))|0);
  $896 = tempRet0;
  $897 = (_i64Add(($863|0),($864|0),($551|0),($552|0))|0);
  $898 = tempRet0;
  $899 = (_i64Add(($895|0),($896|0),($863|0),($864|0))|0);
  $900 = tempRet0;
  $901 = (($i$312) + 8)|0;
  $902 = ($901|0)<(80);
  if ($902) {
   $190 = $897;$191 = $898;$215 = $810;$216 = $723;$218 = $811;$219 = $724;$238 = $636;$239 = $637;$248 = $899;$249 = $900;$273 = $812;$275 = $813;$277 = $725;$279 = $726;$284 = $638;$285 = $639;$i$312 = $901;
  } else {
   $905 = $636;$908 = $637;$911 = $897;$914 = $898;$917 = $723;$920 = $724;$923 = $810;$926 = $811;$929 = $899;$932 = $900;$935 = $812;$938 = $813;$941 = $725;$944 = $726;$947 = $638;$950 = $639;
   break;
  }
 }
 $903 = $55;
 $904 = $903;
 HEAP32[$904>>2] = $905;
 $906 = (($903) + 4)|0;
 $907 = $906;
 HEAP32[$907>>2] = $908;
 $909 = $56;
 $910 = $909;
 HEAP32[$910>>2] = $911;
 $912 = (($909) + 4)|0;
 $913 = $912;
 HEAP32[$913>>2] = $914;
 $915 = $57;
 $916 = $915;
 HEAP32[$916>>2] = $917;
 $918 = (($915) + 4)|0;
 $919 = $918;
 HEAP32[$919>>2] = $920;
 $921 = $58;
 $922 = $921;
 HEAP32[$922>>2] = $923;
 $924 = (($921) + 4)|0;
 $925 = $924;
 HEAP32[$925>>2] = $926;
 $927 = $S;
 $928 = $927;
 HEAP32[$928>>2] = $929;
 $930 = (($927) + 4)|0;
 $931 = $930;
 HEAP32[$931>>2] = $932;
 $933 = $59;
 $934 = $933;
 HEAP32[$934>>2] = $935;
 $936 = (($933) + 4)|0;
 $937 = $936;
 HEAP32[$937>>2] = $938;
 $939 = $60;
 $940 = $939;
 HEAP32[$940>>2] = $941;
 $942 = (($939) + 4)|0;
 $943 = $942;
 HEAP32[$943>>2] = $944;
 $945 = $61;
 $946 = $945;
 HEAP32[$946>>2] = $947;
 $948 = (($945) + 4)|0;
 $949 = $948;
 HEAP32[$949>>2] = $950;
 $951 = ((($md)) + 8|0);
 $952 = $951;
 $953 = $952;
 $954 = HEAP32[$953>>2]|0;
 $955 = (($952) + 4)|0;
 $956 = $955;
 $957 = HEAP32[$956>>2]|0;
 $958 = $S;
 $959 = $958;
 $960 = HEAP32[$959>>2]|0;
 $961 = (($958) + 4)|0;
 $962 = $961;
 $963 = HEAP32[$962>>2]|0;
 $964 = (_i64Add(($960|0),($963|0),($954|0),($957|0))|0);
 $965 = tempRet0;
 $966 = $951;
 $967 = $966;
 HEAP32[$967>>2] = $964;
 $968 = (($966) + 4)|0;
 $969 = $968;
 HEAP32[$969>>2] = $965;
 $970 = ((($md)) + 16|0);
 $971 = $970;
 $972 = $971;
 $973 = HEAP32[$972>>2]|0;
 $974 = (($971) + 4)|0;
 $975 = $974;
 $976 = HEAP32[$975>>2]|0;
 $977 = ((($S)) + 8|0);
 $978 = $977;
 $979 = $978;
 $980 = HEAP32[$979>>2]|0;
 $981 = (($978) + 4)|0;
 $982 = $981;
 $983 = HEAP32[$982>>2]|0;
 $984 = (_i64Add(($980|0),($983|0),($973|0),($976|0))|0);
 $985 = tempRet0;
 $986 = $970;
 $987 = $986;
 HEAP32[$987>>2] = $984;
 $988 = (($986) + 4)|0;
 $989 = $988;
 HEAP32[$989>>2] = $985;
 $990 = ((($md)) + 24|0);
 $991 = $990;
 $992 = $991;
 $993 = HEAP32[$992>>2]|0;
 $994 = (($991) + 4)|0;
 $995 = $994;
 $996 = HEAP32[$995>>2]|0;
 $997 = ((($S)) + 16|0);
 $998 = $997;
 $999 = $998;
 $1000 = HEAP32[$999>>2]|0;
 $1001 = (($998) + 4)|0;
 $1002 = $1001;
 $1003 = HEAP32[$1002>>2]|0;
 $1004 = (_i64Add(($1000|0),($1003|0),($993|0),($996|0))|0);
 $1005 = tempRet0;
 $1006 = $990;
 $1007 = $1006;
 HEAP32[$1007>>2] = $1004;
 $1008 = (($1006) + 4)|0;
 $1009 = $1008;
 HEAP32[$1009>>2] = $1005;
 $1010 = ((($md)) + 32|0);
 $1011 = $1010;
 $1012 = $1011;
 $1013 = HEAP32[$1012>>2]|0;
 $1014 = (($1011) + 4)|0;
 $1015 = $1014;
 $1016 = HEAP32[$1015>>2]|0;
 $1017 = ((($S)) + 24|0);
 $1018 = $1017;
 $1019 = $1018;
 $1020 = HEAP32[$1019>>2]|0;
 $1021 = (($1018) + 4)|0;
 $1022 = $1021;
 $1023 = HEAP32[$1022>>2]|0;
 $1024 = (_i64Add(($1020|0),($1023|0),($1013|0),($1016|0))|0);
 $1025 = tempRet0;
 $1026 = $1010;
 $1027 = $1026;
 HEAP32[$1027>>2] = $1024;
 $1028 = (($1026) + 4)|0;
 $1029 = $1028;
 HEAP32[$1029>>2] = $1025;
 $1030 = ((($md)) + 40|0);
 $1031 = $1030;
 $1032 = $1031;
 $1033 = HEAP32[$1032>>2]|0;
 $1034 = (($1031) + 4)|0;
 $1035 = $1034;
 $1036 = HEAP32[$1035>>2]|0;
 $1037 = ((($S)) + 32|0);
 $1038 = $1037;
 $1039 = $1038;
 $1040 = HEAP32[$1039>>2]|0;
 $1041 = (($1038) + 4)|0;
 $1042 = $1041;
 $1043 = HEAP32[$1042>>2]|0;
 $1044 = (_i64Add(($1040|0),($1043|0),($1033|0),($1036|0))|0);
 $1045 = tempRet0;
 $1046 = $1030;
 $1047 = $1046;
 HEAP32[$1047>>2] = $1044;
 $1048 = (($1046) + 4)|0;
 $1049 = $1048;
 HEAP32[$1049>>2] = $1045;
 $1050 = ((($md)) + 48|0);
 $1051 = $1050;
 $1052 = $1051;
 $1053 = HEAP32[$1052>>2]|0;
 $1054 = (($1051) + 4)|0;
 $1055 = $1054;
 $1056 = HEAP32[$1055>>2]|0;
 $1057 = ((($S)) + 40|0);
 $1058 = $1057;
 $1059 = $1058;
 $1060 = HEAP32[$1059>>2]|0;
 $1061 = (($1058) + 4)|0;
 $1062 = $1061;
 $1063 = HEAP32[$1062>>2]|0;
 $1064 = (_i64Add(($1060|0),($1063|0),($1053|0),($1056|0))|0);
 $1065 = tempRet0;
 $1066 = $1050;
 $1067 = $1066;
 HEAP32[$1067>>2] = $1064;
 $1068 = (($1066) + 4)|0;
 $1069 = $1068;
 HEAP32[$1069>>2] = $1065;
 $1070 = ((($md)) + 56|0);
 $1071 = $1070;
 $1072 = $1071;
 $1073 = HEAP32[$1072>>2]|0;
 $1074 = (($1071) + 4)|0;
 $1075 = $1074;
 $1076 = HEAP32[$1075>>2]|0;
 $1077 = ((($S)) + 48|0);
 $1078 = $1077;
 $1079 = $1078;
 $1080 = HEAP32[$1079>>2]|0;
 $1081 = (($1078) + 4)|0;
 $1082 = $1081;
 $1083 = HEAP32[$1082>>2]|0;
 $1084 = (_i64Add(($1080|0),($1083|0),($1073|0),($1076|0))|0);
 $1085 = tempRet0;
 $1086 = $1070;
 $1087 = $1086;
 HEAP32[$1087>>2] = $1084;
 $1088 = (($1086) + 4)|0;
 $1089 = $1088;
 HEAP32[$1089>>2] = $1085;
 $1090 = ((($md)) + 64|0);
 $1091 = $1090;
 $1092 = $1091;
 $1093 = HEAP32[$1092>>2]|0;
 $1094 = (($1091) + 4)|0;
 $1095 = $1094;
 $1096 = HEAP32[$1095>>2]|0;
 $1097 = ((($S)) + 56|0);
 $1098 = $1097;
 $1099 = $1098;
 $1100 = HEAP32[$1099>>2]|0;
 $1101 = (($1098) + 4)|0;
 $1102 = $1101;
 $1103 = HEAP32[$1102>>2]|0;
 $1104 = (_i64Add(($1100|0),($1103|0),($1093|0),($1096|0))|0);
 $1105 = tempRet0;
 $1106 = $1090;
 $1107 = $1106;
 HEAP32[$1107>>2] = $1104;
 $1108 = (($1106) + 4)|0;
 $1109 = $1108;
 HEAP32[$1109>>2] = $1105;
 STACKTOP = sp;return;
}
function _ed25519_sign($signature,$message,$message_len,$public_key,$private_key) {
 $signature = $signature|0;
 $message = $message|0;
 $message_len = $message_len|0;
 $public_key = $public_key|0;
 $private_key = $private_key|0;
 var $0 = 0, $1 = 0, $R = 0, $hash = 0, $hram = 0, $r = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 496|0;
 $hash = sp;
 $hram = sp + 432|0;
 $r = sp + 368|0;
 $R = sp + 208|0;
 (_sha512_init($hash)|0);
 $0 = ((($private_key)) + 32|0);
 (_sha512_update($hash,$0,32)|0);
 (_sha512_update($hash,$message,$message_len)|0);
 (_sha512_final($hash,$r)|0);
 _sc_reduce($r);
 _ge_scalarmult_base($R,$r);
 _ge_p3_tobytes($signature,$R);
 (_sha512_init($hash)|0);
 (_sha512_update($hash,$signature,32)|0);
 (_sha512_update($hash,$public_key,32)|0);
 (_sha512_update($hash,$message,$message_len)|0);
 (_sha512_final($hash,$hram)|0);
 _sc_reduce($hram);
 $1 = ((($signature)) + 32|0);
 _sc_muladd($1,$hram,$private_key,$r);
 STACKTOP = sp;return;
}
function _ed25519_verify($signature,$message,$message_len,$public_key) {
 $signature = $signature|0;
 $message = $message|0;
 $message_len = $message_len|0;
 $public_key = $public_key|0;
 var $$ = 0, $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $A = 0, $R = 0, $checker = 0, $h = 0, $hash = 0, $not$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 592|0;
 $h = sp + 520|0;
 $checker = sp + 488|0;
 $hash = sp;
 $A = sp + 328|0;
 $R = sp + 208|0;
 $0 = ((($signature)) + 63|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = ($1&255)>(31);
 if ($2) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $3 = (_ge_frombytes_negate_vartime($A,$public_key)|0);
 $4 = ($3|0)==(0);
 if (!($4)) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 (_sha512_init($hash)|0);
 (_sha512_update($hash,$signature,32)|0);
 (_sha512_update($hash,$public_key,32)|0);
 (_sha512_update($hash,$message,$message_len)|0);
 (_sha512_final($hash,$h)|0);
 _sc_reduce($h);
 $5 = ((($signature)) + 32|0);
 _ge_double_scalarmult_vartime($R,$h,$A,$5);
 _ge_tobytes($checker,$R);
 $6 = (_consttime_equal($checker,$signature)|0);
 $not$ = ($6|0)!=(0);
 $$ = $not$&1;
 $$0 = $$;
 STACKTOP = sp;return ($$0|0);
}
function _consttime_equal($x,$y) {
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0;
 var $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0;
 var $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0;
 var $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0;
 var $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$x>>0]|0;
 $1 = HEAP8[$y>>0]|0;
 $2 = $1 ^ $0;
 $3 = ((($x)) + 1|0);
 $4 = HEAP8[$3>>0]|0;
 $5 = ((($y)) + 1|0);
 $6 = HEAP8[$5>>0]|0;
 $7 = $6 ^ $4;
 $8 = $7 | $2;
 $9 = ((($x)) + 2|0);
 $10 = HEAP8[$9>>0]|0;
 $11 = ((($y)) + 2|0);
 $12 = HEAP8[$11>>0]|0;
 $13 = $12 ^ $10;
 $14 = $8 | $13;
 $15 = ((($x)) + 3|0);
 $16 = HEAP8[$15>>0]|0;
 $17 = ((($y)) + 3|0);
 $18 = HEAP8[$17>>0]|0;
 $19 = $18 ^ $16;
 $20 = $14 | $19;
 $21 = ((($x)) + 4|0);
 $22 = HEAP8[$21>>0]|0;
 $23 = ((($y)) + 4|0);
 $24 = HEAP8[$23>>0]|0;
 $25 = $24 ^ $22;
 $26 = $20 | $25;
 $27 = ((($x)) + 5|0);
 $28 = HEAP8[$27>>0]|0;
 $29 = ((($y)) + 5|0);
 $30 = HEAP8[$29>>0]|0;
 $31 = $30 ^ $28;
 $32 = $26 | $31;
 $33 = ((($x)) + 6|0);
 $34 = HEAP8[$33>>0]|0;
 $35 = ((($y)) + 6|0);
 $36 = HEAP8[$35>>0]|0;
 $37 = $36 ^ $34;
 $38 = $32 | $37;
 $39 = ((($x)) + 7|0);
 $40 = HEAP8[$39>>0]|0;
 $41 = ((($y)) + 7|0);
 $42 = HEAP8[$41>>0]|0;
 $43 = $42 ^ $40;
 $44 = $38 | $43;
 $45 = ((($x)) + 8|0);
 $46 = HEAP8[$45>>0]|0;
 $47 = ((($y)) + 8|0);
 $48 = HEAP8[$47>>0]|0;
 $49 = $48 ^ $46;
 $50 = $44 | $49;
 $51 = ((($x)) + 9|0);
 $52 = HEAP8[$51>>0]|0;
 $53 = ((($y)) + 9|0);
 $54 = HEAP8[$53>>0]|0;
 $55 = $54 ^ $52;
 $56 = $50 | $55;
 $57 = ((($x)) + 10|0);
 $58 = HEAP8[$57>>0]|0;
 $59 = ((($y)) + 10|0);
 $60 = HEAP8[$59>>0]|0;
 $61 = $60 ^ $58;
 $62 = $56 | $61;
 $63 = ((($x)) + 11|0);
 $64 = HEAP8[$63>>0]|0;
 $65 = ((($y)) + 11|0);
 $66 = HEAP8[$65>>0]|0;
 $67 = $66 ^ $64;
 $68 = $62 | $67;
 $69 = ((($x)) + 12|0);
 $70 = HEAP8[$69>>0]|0;
 $71 = ((($y)) + 12|0);
 $72 = HEAP8[$71>>0]|0;
 $73 = $72 ^ $70;
 $74 = $68 | $73;
 $75 = ((($x)) + 13|0);
 $76 = HEAP8[$75>>0]|0;
 $77 = ((($y)) + 13|0);
 $78 = HEAP8[$77>>0]|0;
 $79 = $78 ^ $76;
 $80 = $74 | $79;
 $81 = ((($x)) + 14|0);
 $82 = HEAP8[$81>>0]|0;
 $83 = ((($y)) + 14|0);
 $84 = HEAP8[$83>>0]|0;
 $85 = $84 ^ $82;
 $86 = $80 | $85;
 $87 = ((($x)) + 15|0);
 $88 = HEAP8[$87>>0]|0;
 $89 = ((($y)) + 15|0);
 $90 = HEAP8[$89>>0]|0;
 $91 = $90 ^ $88;
 $92 = $86 | $91;
 $93 = ((($x)) + 16|0);
 $94 = HEAP8[$93>>0]|0;
 $95 = ((($y)) + 16|0);
 $96 = HEAP8[$95>>0]|0;
 $97 = $96 ^ $94;
 $98 = $92 | $97;
 $99 = ((($x)) + 17|0);
 $100 = HEAP8[$99>>0]|0;
 $101 = ((($y)) + 17|0);
 $102 = HEAP8[$101>>0]|0;
 $103 = $102 ^ $100;
 $104 = $98 | $103;
 $105 = ((($x)) + 18|0);
 $106 = HEAP8[$105>>0]|0;
 $107 = ((($y)) + 18|0);
 $108 = HEAP8[$107>>0]|0;
 $109 = $108 ^ $106;
 $110 = $104 | $109;
 $111 = ((($x)) + 19|0);
 $112 = HEAP8[$111>>0]|0;
 $113 = ((($y)) + 19|0);
 $114 = HEAP8[$113>>0]|0;
 $115 = $114 ^ $112;
 $116 = $110 | $115;
 $117 = ((($x)) + 20|0);
 $118 = HEAP8[$117>>0]|0;
 $119 = ((($y)) + 20|0);
 $120 = HEAP8[$119>>0]|0;
 $121 = $120 ^ $118;
 $122 = $116 | $121;
 $123 = ((($x)) + 21|0);
 $124 = HEAP8[$123>>0]|0;
 $125 = ((($y)) + 21|0);
 $126 = HEAP8[$125>>0]|0;
 $127 = $126 ^ $124;
 $128 = $122 | $127;
 $129 = ((($x)) + 22|0);
 $130 = HEAP8[$129>>0]|0;
 $131 = ((($y)) + 22|0);
 $132 = HEAP8[$131>>0]|0;
 $133 = $132 ^ $130;
 $134 = $128 | $133;
 $135 = ((($x)) + 23|0);
 $136 = HEAP8[$135>>0]|0;
 $137 = ((($y)) + 23|0);
 $138 = HEAP8[$137>>0]|0;
 $139 = $138 ^ $136;
 $140 = $134 | $139;
 $141 = ((($x)) + 24|0);
 $142 = HEAP8[$141>>0]|0;
 $143 = ((($y)) + 24|0);
 $144 = HEAP8[$143>>0]|0;
 $145 = $144 ^ $142;
 $146 = $140 | $145;
 $147 = ((($x)) + 25|0);
 $148 = HEAP8[$147>>0]|0;
 $149 = ((($y)) + 25|0);
 $150 = HEAP8[$149>>0]|0;
 $151 = $150 ^ $148;
 $152 = $146 | $151;
 $153 = ((($x)) + 26|0);
 $154 = HEAP8[$153>>0]|0;
 $155 = ((($y)) + 26|0);
 $156 = HEAP8[$155>>0]|0;
 $157 = $156 ^ $154;
 $158 = $152 | $157;
 $159 = ((($x)) + 27|0);
 $160 = HEAP8[$159>>0]|0;
 $161 = ((($y)) + 27|0);
 $162 = HEAP8[$161>>0]|0;
 $163 = $162 ^ $160;
 $164 = $158 | $163;
 $165 = ((($x)) + 28|0);
 $166 = HEAP8[$165>>0]|0;
 $167 = ((($y)) + 28|0);
 $168 = HEAP8[$167>>0]|0;
 $169 = $168 ^ $166;
 $170 = $164 | $169;
 $171 = ((($x)) + 29|0);
 $172 = HEAP8[$171>>0]|0;
 $173 = ((($y)) + 29|0);
 $174 = HEAP8[$173>>0]|0;
 $175 = $174 ^ $172;
 $176 = $170 | $175;
 $177 = ((($x)) + 30|0);
 $178 = HEAP8[$177>>0]|0;
 $179 = ((($y)) + 30|0);
 $180 = HEAP8[$179>>0]|0;
 $181 = $180 ^ $178;
 $182 = $176 | $181;
 $183 = ((($x)) + 31|0);
 $184 = HEAP8[$183>>0]|0;
 $185 = ((($y)) + 31|0);
 $186 = HEAP8[$185>>0]|0;
 $187 = $186 ^ $184;
 $188 = $182 | $187;
 $189 = ($188<<24>>24)==(0);
 $190 = $189&1;
 return ($190|0);
}
function ___errno_location() {
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[32448>>2]|0;
 $1 = ($0|0)==(0|0);
 if ($1) {
  $$0 = 32496;
 } else {
  $2 = (_pthread_self()|0);
  $3 = ((($2)) + 60|0);
  $4 = HEAP32[$3>>2]|0;
  $$0 = $4;
 }
 return ($$0|0);
}
function ___syscall_ret($r) {
 $r = $r|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($r>>>0)>(4294963200);
 if ($0) {
  $1 = (0 - ($r))|0;
  $2 = (___errno_location()|0);
  HEAP32[$2>>2] = $1;
  $$0 = -1;
 } else {
  $$0 = $r;
 }
 return ($$0|0);
}
function _fflush($f) {
 $f = $f|0;
 var $$0 = 0, $$01 = 0, $$012 = 0, $$014 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $phitmp = 0, $r$0$lcssa = 0, $r$03 = 0, $r$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($f|0)==(0|0);
 do {
  if ($0) {
   $7 = HEAP32[32492>>2]|0;
   $8 = ($7|0)==(0|0);
   if ($8) {
    $27 = 0;
   } else {
    $9 = HEAP32[32492>>2]|0;
    $10 = (_fflush($9)|0);
    $27 = $10;
   }
   ___lock(((32476)|0));
   $$012 = HEAP32[(32472)>>2]|0;
   $11 = ($$012|0)==(0|0);
   if ($11) {
    $r$0$lcssa = $27;
   } else {
    $$014 = $$012;$r$03 = $27;
    while(1) {
     $12 = ((($$014)) + 76|0);
     $13 = HEAP32[$12>>2]|0;
     $14 = ($13|0)>(-1);
     if ($14) {
      $15 = (___lockfile($$014)|0);
      $23 = $15;
     } else {
      $23 = 0;
     }
     $16 = ((($$014)) + 20|0);
     $17 = HEAP32[$16>>2]|0;
     $18 = ((($$014)) + 28|0);
     $19 = HEAP32[$18>>2]|0;
     $20 = ($17>>>0)>($19>>>0);
     if ($20) {
      $21 = (___fflush_unlocked($$014)|0);
      $22 = $21 | $r$03;
      $r$1 = $22;
     } else {
      $r$1 = $r$03;
     }
     $24 = ($23|0)==(0);
     if (!($24)) {
      ___unlockfile($$014);
     }
     $25 = ((($$014)) + 56|0);
     $$01 = HEAP32[$25>>2]|0;
     $26 = ($$01|0)==(0|0);
     if ($26) {
      $r$0$lcssa = $r$1;
      break;
     } else {
      $$014 = $$01;$r$03 = $r$1;
     }
    }
   }
   ___unlock(((32476)|0));
   $$0 = $r$0$lcssa;
  } else {
   $1 = ((($f)) + 76|0);
   $2 = HEAP32[$1>>2]|0;
   $3 = ($2|0)>(-1);
   if (!($3)) {
    $4 = (___fflush_unlocked($f)|0);
    $$0 = $4;
    break;
   }
   $5 = (___lockfile($f)|0);
   $phitmp = ($5|0)==(0);
   $6 = (___fflush_unlocked($f)|0);
   if ($phitmp) {
    $$0 = $6;
   } else {
    ___unlockfile($f);
    $$0 = $6;
   }
  }
 } while(0);
 return ($$0|0);
}
function ___lockfile($f) {
 $f = $f|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function ___unlockfile($f) {
 $f = $f|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function ___stdio_close($f) {
 $f = $f|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $vararg_buffer = sp;
 $0 = ((($f)) + 60|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$vararg_buffer>>2] = $1;
 $2 = (___syscall6(6,($vararg_buffer|0))|0);
 $3 = (___syscall_ret($2)|0);
 STACKTOP = sp;return ($3|0);
}
function ___stdio_seek($f,$off,$whence) {
 $f = $f|0;
 $off = $off|0;
 $whence = $whence|0;
 var $$pre = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $ret = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr3 = 0, $vararg_ptr4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $vararg_buffer = sp;
 $ret = sp + 20|0;
 $0 = ((($f)) + 60|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$vararg_buffer>>2] = $1;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = 0;
 $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
 HEAP32[$vararg_ptr2>>2] = $off;
 $vararg_ptr3 = ((($vararg_buffer)) + 12|0);
 HEAP32[$vararg_ptr3>>2] = $ret;
 $vararg_ptr4 = ((($vararg_buffer)) + 16|0);
 HEAP32[$vararg_ptr4>>2] = $whence;
 $2 = (___syscall140(140,($vararg_buffer|0))|0);
 $3 = (___syscall_ret($2)|0);
 $4 = ($3|0)<(0);
 if ($4) {
  HEAP32[$ret>>2] = -1;
  $5 = -1;
 } else {
  $$pre = HEAP32[$ret>>2]|0;
  $5 = $$pre;
 }
 STACKTOP = sp;return ($5|0);
}
function ___stdio_write($f,$buf,$len) {
 $f = $f|0;
 $buf = $buf|0;
 $len = $len|0;
 var $$0 = 0, $$phi$trans$insert = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $cnt$0 = 0, $cnt$1 = 0, $iov$0 = 0, $iov$0$lcssa11 = 0, $iov$1 = 0, $iovcnt$0 = 0;
 var $iovcnt$0$lcssa12 = 0, $iovcnt$1 = 0, $iovs = 0, $rem$0 = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr6 = 0, $vararg_ptr7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer = sp;
 $iovs = sp + 32|0;
 $0 = ((($f)) + 28|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$iovs>>2] = $1;
 $2 = ((($iovs)) + 4|0);
 $3 = ((($f)) + 20|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = $4;
 $6 = (($5) - ($1))|0;
 HEAP32[$2>>2] = $6;
 $7 = ((($iovs)) + 8|0);
 HEAP32[$7>>2] = $buf;
 $8 = ((($iovs)) + 12|0);
 HEAP32[$8>>2] = $len;
 $9 = (($6) + ($len))|0;
 $10 = ((($f)) + 60|0);
 $11 = ((($f)) + 44|0);
 $iov$0 = $iovs;$iovcnt$0 = 2;$rem$0 = $9;
 while(1) {
  $12 = HEAP32[32448>>2]|0;
  $13 = ($12|0)==(0|0);
  if ($13) {
   $17 = HEAP32[$10>>2]|0;
   HEAP32[$vararg_buffer3>>2] = $17;
   $vararg_ptr6 = ((($vararg_buffer3)) + 4|0);
   HEAP32[$vararg_ptr6>>2] = $iov$0;
   $vararg_ptr7 = ((($vararg_buffer3)) + 8|0);
   HEAP32[$vararg_ptr7>>2] = $iovcnt$0;
   $18 = (___syscall146(146,($vararg_buffer3|0))|0);
   $19 = (___syscall_ret($18)|0);
   $cnt$0 = $19;
  } else {
   _pthread_cleanup_push((1|0),($f|0));
   $14 = HEAP32[$10>>2]|0;
   HEAP32[$vararg_buffer>>2] = $14;
   $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
   HEAP32[$vararg_ptr1>>2] = $iov$0;
   $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
   HEAP32[$vararg_ptr2>>2] = $iovcnt$0;
   $15 = (___syscall146(146,($vararg_buffer|0))|0);
   $16 = (___syscall_ret($15)|0);
   _pthread_cleanup_pop(0);
   $cnt$0 = $16;
  }
  $20 = ($rem$0|0)==($cnt$0|0);
  if ($20) {
   label = 6;
   break;
  }
  $27 = ($cnt$0|0)<(0);
  if ($27) {
   $iov$0$lcssa11 = $iov$0;$iovcnt$0$lcssa12 = $iovcnt$0;
   label = 8;
   break;
  }
  $35 = (($rem$0) - ($cnt$0))|0;
  $36 = ((($iov$0)) + 4|0);
  $37 = HEAP32[$36>>2]|0;
  $38 = ($cnt$0>>>0)>($37>>>0);
  if ($38) {
   $39 = HEAP32[$11>>2]|0;
   HEAP32[$0>>2] = $39;
   HEAP32[$3>>2] = $39;
   $40 = (($cnt$0) - ($37))|0;
   $41 = ((($iov$0)) + 8|0);
   $42 = (($iovcnt$0) + -1)|0;
   $$phi$trans$insert = ((($iov$0)) + 12|0);
   $$pre = HEAP32[$$phi$trans$insert>>2]|0;
   $50 = $$pre;$cnt$1 = $40;$iov$1 = $41;$iovcnt$1 = $42;
  } else {
   $43 = ($iovcnt$0|0)==(2);
   if ($43) {
    $44 = HEAP32[$0>>2]|0;
    $45 = (($44) + ($cnt$0)|0);
    HEAP32[$0>>2] = $45;
    $50 = $37;$cnt$1 = $cnt$0;$iov$1 = $iov$0;$iovcnt$1 = 2;
   } else {
    $50 = $37;$cnt$1 = $cnt$0;$iov$1 = $iov$0;$iovcnt$1 = $iovcnt$0;
   }
  }
  $46 = HEAP32[$iov$1>>2]|0;
  $47 = (($46) + ($cnt$1)|0);
  HEAP32[$iov$1>>2] = $47;
  $48 = ((($iov$1)) + 4|0);
  $49 = (($50) - ($cnt$1))|0;
  HEAP32[$48>>2] = $49;
  $iov$0 = $iov$1;$iovcnt$0 = $iovcnt$1;$rem$0 = $35;
 }
 if ((label|0) == 6) {
  $21 = HEAP32[$11>>2]|0;
  $22 = ((($f)) + 48|0);
  $23 = HEAP32[$22>>2]|0;
  $24 = (($21) + ($23)|0);
  $25 = ((($f)) + 16|0);
  HEAP32[$25>>2] = $24;
  $26 = $21;
  HEAP32[$0>>2] = $26;
  HEAP32[$3>>2] = $26;
  $$0 = $len;
 }
 else if ((label|0) == 8) {
  $28 = ((($f)) + 16|0);
  HEAP32[$28>>2] = 0;
  HEAP32[$0>>2] = 0;
  HEAP32[$3>>2] = 0;
  $29 = HEAP32[$f>>2]|0;
  $30 = $29 | 32;
  HEAP32[$f>>2] = $30;
  $31 = ($iovcnt$0$lcssa12|0)==(2);
  if ($31) {
   $$0 = 0;
  } else {
   $32 = ((($iov$0$lcssa11)) + 4|0);
   $33 = HEAP32[$32>>2]|0;
   $34 = (($len) - ($33))|0;
   $$0 = $34;
  }
 }
 STACKTOP = sp;return ($$0|0);
}
function ___stdout_write($f,$buf,$len) {
 $f = $f|0;
 $buf = $buf|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $tio = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0;
 $vararg_buffer = sp;
 $tio = sp + 12|0;
 $0 = ((($f)) + 36|0);
 HEAP32[$0>>2] = 3;
 $1 = HEAP32[$f>>2]|0;
 $2 = $1 & 64;
 $3 = ($2|0)==(0);
 if ($3) {
  $4 = ((($f)) + 60|0);
  $5 = HEAP32[$4>>2]|0;
  HEAP32[$vararg_buffer>>2] = $5;
  $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
  HEAP32[$vararg_ptr1>>2] = 21505;
  $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
  HEAP32[$vararg_ptr2>>2] = $tio;
  $6 = (___syscall54(54,($vararg_buffer|0))|0);
  $7 = ($6|0)==(0);
  if (!($7)) {
   $8 = ((($f)) + 75|0);
   HEAP8[$8>>0] = -1;
  }
 }
 $9 = (___stdio_write($f,$buf,$len)|0);
 STACKTOP = sp;return ($9|0);
}
function ___fflush_unlocked($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 20|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($f)) + 28|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($1>>>0)>($3>>>0);
 if ($4) {
  $5 = ((($f)) + 36|0);
  $6 = HEAP32[$5>>2]|0;
  (FUNCTION_TABLE_iiii[$6 & 3]($f,0,0)|0);
  $7 = HEAP32[$0>>2]|0;
  $8 = ($7|0)==(0|0);
  if ($8) {
   $$0 = -1;
  } else {
   label = 3;
  }
 } else {
  label = 3;
 }
 if ((label|0) == 3) {
  $9 = ((($f)) + 4|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = ((($f)) + 8|0);
  $12 = HEAP32[$11>>2]|0;
  $13 = ($10>>>0)<($12>>>0);
  if ($13) {
   $14 = ((($f)) + 40|0);
   $15 = HEAP32[$14>>2]|0;
   $16 = $10;
   $17 = $12;
   $18 = (($16) - ($17))|0;
   (FUNCTION_TABLE_iiii[$15 & 3]($f,$18,1)|0);
  }
  $19 = ((($f)) + 16|0);
  HEAP32[$19>>2] = 0;
  HEAP32[$2>>2] = 0;
  HEAP32[$0>>2] = 0;
  HEAP32[$11>>2] = 0;
  HEAP32[$9>>2] = 0;
  $$0 = 0;
 }
 return ($$0|0);
}
function _cleanup526($p) {
 $p = $p|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($p)) + 68|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0);
 if ($2) {
  ___unlockfile($p);
 }
 return;
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$3$i = 0, $$lcssa = 0, $$lcssa211 = 0, $$lcssa215 = 0, $$lcssa216 = 0, $$lcssa217 = 0, $$lcssa219 = 0, $$lcssa222 = 0, $$lcssa224 = 0, $$lcssa226 = 0, $$lcssa228 = 0, $$lcssa230 = 0, $$lcssa232 = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i22$i = 0, $$pre$i25 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i23$iZ2D = 0;
 var $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi58$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre106 = 0, $$pre14$i$i = 0, $$pre43$i = 0, $$pre56$i$i = 0, $$pre57$i$i = 0, $$pre8$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i13$i = 0, $$sum$i14$i = 0, $$sum$i17$i = 0, $$sum$i19$i = 0;
 var $$sum$i2334 = 0, $$sum$i32 = 0, $$sum$i35 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i15$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum11$i = 0, $$sum11$i$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum116$i = 0;
 var $$sum117$i = 0, $$sum118$i = 0, $$sum119$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum120$i = 0, $$sum121$i = 0, $$sum122$i = 0, $$sum123$i = 0, $$sum124$i = 0, $$sum125$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum15$i = 0, $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0;
 var $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i16$i = 0, $$sum2$i18$i = 0, $$sum2$i21$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0, $$sum25$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i27 = 0;
 var $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0, $$sum41$i$i = 0, $$sum42$i$i = 0, $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0;
 var $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0;
 var $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0;
 var $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0;
 var $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0;
 var $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0;
 var $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0;
 var $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0;
 var $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0;
 var $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0;
 var $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0;
 var $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0;
 var $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0;
 var $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0;
 var $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0;
 var $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0;
 var $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0;
 var $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0;
 var $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0;
 var $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0;
 var $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0;
 var $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0;
 var $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0;
 var $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0;
 var $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0;
 var $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0;
 var $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0;
 var $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0;
 var $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0;
 var $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0;
 var $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0;
 var $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0;
 var $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0;
 var $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0;
 var $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0;
 var $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0;
 var $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0;
 var $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0;
 var $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0;
 var $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0;
 var $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0;
 var $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0;
 var $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0;
 var $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0;
 var $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0;
 var $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0;
 var $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0;
 var $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0;
 var $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0;
 var $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0;
 var $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0;
 var $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0;
 var $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0;
 var $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0;
 var $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0;
 var $F5$0$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$029$i = 0, $K2$07$i$i = 0, $K8$051$i$i = 0, $R$0$i = 0, $R$0$i$i = 0, $R$0$i$i$lcssa = 0, $R$0$i$lcssa = 0, $R$0$i18 = 0, $R$0$i18$lcssa = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i$i$lcssa = 0, $RP$0$i$lcssa = 0;
 var $RP$0$i17 = 0, $RP$0$i17$lcssa = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i25$i = 0, $T$028$i = 0, $T$028$i$lcssa = 0, $T$050$i$i = 0, $T$050$i$i$lcssa = 0, $T$06$i$i = 0, $T$06$i$i$lcssa = 0, $br$0$ph$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0, $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0;
 var $not$$i = 0, $not$$i$i = 0, $not$$i26$i = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i30 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond3$i = 0, $or$cond5$i = 0, $or$cond57$i = 0, $or$cond6$i = 0, $or$cond8$i = 0, $or$cond9$i = 0, $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i$lcssa = 0, $rsize$0$i15 = 0, $rsize$1$i = 0;
 var $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$084$i = 0, $sp$084$i$lcssa = 0, $sp$183$i = 0, $sp$183$i$lcssa = 0, $ssize$0$$i = 0, $ssize$0$i = 0, $ssize$1$ph$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0, $t$1$i = 0, $t$2$ph$i = 0;
 var $t$2$v$3$i = 0, $t$230$i = 0, $tbase$255$i = 0, $tsize$0$ph$i = 0, $tsize$0323944$i = 0, $tsize$1$i = 0, $tsize$254$i = 0, $v$0$i = 0, $v$0$i$lcssa = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$3$ph$i = 0, $v$332$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   $2 = (($bytes) + 11)|0;
   $3 = $2 & -8;
   $4 = $1 ? 16 : $3;
   $5 = $4 >>> 3;
   $6 = HEAP32[32612>>2]|0;
   $7 = $6 >>> $5;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($5))|0;
    $13 = $12 << 1;
    $14 = (32652 + ($13<<2)|0);
    $$sum10 = (($13) + 2)|0;
    $15 = (32652 + ($$sum10<<2)|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = ((($16)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[32612>>2] = $22;
     } else {
      $23 = HEAP32[(32628)>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = ((($18)) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = ((($16)) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    return ($mem$0|0);
   }
   $34 = HEAP32[(32620)>>2]|0;
   $35 = ($4>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $5;
     $38 = 2 << $5;
     $39 = (0 - ($38))|0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = (0 - ($41))|0;
     $43 = $41 & $42;
     $44 = (($43) + -1)|0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = (($62) + ($63))|0;
     $65 = $64 << 1;
     $66 = (32652 + ($65<<2)|0);
     $$sum4 = (($65) + 2)|0;
     $67 = (32652 + ($$sum4<<2)|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = ((($68)) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[32612>>2] = $74;
       $88 = $34;
      } else {
       $75 = HEAP32[(32628)>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = ((($70)) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        $$pre = HEAP32[(32620)>>2]|0;
        $88 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($4))|0;
     $82 = $4 | 3;
     $83 = ((($68)) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($4)|0);
     $85 = $81 | 1;
     $$sum56 = $4 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $89 = ($88|0)==(0);
     if (!($89)) {
      $90 = HEAP32[(32632)>>2]|0;
      $91 = $88 >>> 3;
      $92 = $91 << 1;
      $93 = (32652 + ($92<<2)|0);
      $94 = HEAP32[32612>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[32612>>2] = $98;
       $$pre105 = (($92) + 2)|0;
       $$pre106 = (32652 + ($$pre105<<2)|0);
       $$pre$phiZ2D = $$pre106;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = (32652 + ($$sum9<<2)|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[(32628)>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = ((($F4$0)) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = ((($90)) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = ((($90)) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[(32620)>>2] = $81;
     HEAP32[(32632)>>2] = $84;
     $mem$0 = $69;
     return ($mem$0|0);
    }
    $106 = HEAP32[(32616)>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $4;
    } else {
     $108 = (0 - ($106))|0;
     $109 = $106 & $108;
     $110 = (($109) + -1)|0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = (($128) + ($129))|0;
     $131 = (32916 + ($130<<2)|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = ((($132)) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($4))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = ((($t$0$i)) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = ((($t$0$i)) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        $rsize$0$i$lcssa = $rsize$0$i;$v$0$i$lcssa = $v$0$i;
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = ((($144)) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($4))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[(32628)>>2]|0;
     $150 = ($v$0$i$lcssa>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i$lcssa) + ($4)|0);
     $152 = ($v$0$i$lcssa>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = ((($v$0$i$lcssa)) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = ((($v$0$i$lcssa)) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i$lcssa|0);
     do {
      if ($157) {
       $167 = ((($v$0$i$lcssa)) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = ((($v$0$i$lcssa)) + 16|0);
        $171 = HEAP32[$170>>2]|0;
        $172 = ($171|0)==(0|0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i = $171;$RP$0$i = $170;
        }
       } else {
        $R$0$i = $168;$RP$0$i = $167;
       }
       while(1) {
        $173 = ((($R$0$i)) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if (!($175)) {
         $R$0$i = $174;$RP$0$i = $173;
         continue;
        }
        $176 = ((($R$0$i)) + 16|0);
        $177 = HEAP32[$176>>2]|0;
        $178 = ($177|0)==(0|0);
        if ($178) {
         $R$0$i$lcssa = $R$0$i;$RP$0$i$lcssa = $RP$0$i;
         break;
        } else {
         $R$0$i = $177;$RP$0$i = $176;
        }
       }
       $179 = ($RP$0$i$lcssa>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i$lcssa>>2] = 0;
        $R$1$i = $R$0$i$lcssa;
        break;
       }
      } else {
       $158 = ((($v$0$i$lcssa)) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = ((($159)) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i$lcssa|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = ((($156)) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i$lcssa|0);
       if ($166) {
        HEAP32[$161>>2] = $156;
        HEAP32[$164>>2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $180 = ($154|0)==(0|0);
     do {
      if (!($180)) {
       $181 = ((($v$0$i$lcssa)) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = (32916 + ($182<<2)|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i$lcssa|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[(32616)>>2]|0;
         $189 = $188 & $187;
         HEAP32[(32616)>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[(32628)>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = ((($154)) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i$lcssa|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = ((($154)) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[(32628)>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = ((($R$1$i)) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = ((($v$0$i$lcssa)) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = ($201>>>0)<($197>>>0);
         if ($203) {
          _abort();
          // unreachable;
         } else {
          $204 = ((($R$1$i)) + 16|0);
          HEAP32[$204>>2] = $201;
          $205 = ((($201)) + 24|0);
          HEAP32[$205>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $206 = ((($v$0$i$lcssa)) + 20|0);
       $207 = HEAP32[$206>>2]|0;
       $208 = ($207|0)==(0|0);
       if (!($208)) {
        $209 = HEAP32[(32628)>>2]|0;
        $210 = ($207>>>0)<($209>>>0);
        if ($210) {
         _abort();
         // unreachable;
        } else {
         $211 = ((($R$1$i)) + 20|0);
         HEAP32[$211>>2] = $207;
         $212 = ((($207)) + 24|0);
         HEAP32[$212>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $213 = ($rsize$0$i$lcssa>>>0)<(16);
     if ($213) {
      $214 = (($rsize$0$i$lcssa) + ($4))|0;
      $215 = $214 | 3;
      $216 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$216>>2] = $215;
      $$sum4$i = (($214) + 4)|0;
      $217 = (($v$0$i$lcssa) + ($$sum4$i)|0);
      $218 = HEAP32[$217>>2]|0;
      $219 = $218 | 1;
      HEAP32[$217>>2] = $219;
     } else {
      $220 = $4 | 3;
      $221 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$221>>2] = $220;
      $222 = $rsize$0$i$lcssa | 1;
      $$sum$i35 = $4 | 4;
      $223 = (($v$0$i$lcssa) + ($$sum$i35)|0);
      HEAP32[$223>>2] = $222;
      $$sum1$i = (($rsize$0$i$lcssa) + ($4))|0;
      $224 = (($v$0$i$lcssa) + ($$sum1$i)|0);
      HEAP32[$224>>2] = $rsize$0$i$lcssa;
      $225 = HEAP32[(32620)>>2]|0;
      $226 = ($225|0)==(0);
      if (!($226)) {
       $227 = HEAP32[(32632)>>2]|0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = (32652 + ($229<<2)|0);
       $231 = HEAP32[32612>>2]|0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $231 | $232;
        HEAP32[32612>>2] = $235;
        $$pre$i = (($229) + 2)|0;
        $$pre8$i = (32652 + ($$pre$i<<2)|0);
        $$pre$phi$iZ2D = $$pre8$i;$F1$0$i = $230;
       } else {
        $$sum3$i = (($229) + 2)|0;
        $236 = (32652 + ($$sum3$i<<2)|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[(32628)>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $236;$F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $227;
       $240 = ((($F1$0$i)) + 12|0);
       HEAP32[$240>>2] = $227;
       $241 = ((($227)) + 8|0);
       HEAP32[$241>>2] = $F1$0$i;
       $242 = ((($227)) + 12|0);
       HEAP32[$242>>2] = $230;
      }
      HEAP32[(32620)>>2] = $rsize$0$i$lcssa;
      HEAP32[(32632)>>2] = $151;
     }
     $243 = ((($v$0$i$lcssa)) + 8|0);
     $mem$0 = $243;
     return ($mem$0|0);
    }
   } else {
    $nb$0 = $4;
   }
  } else {
   $244 = ($bytes>>>0)>(4294967231);
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = (($bytes) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[(32616)>>2]|0;
    $248 = ($247|0)==(0);
    if ($248) {
     $nb$0 = $246;
    } else {
     $249 = (0 - ($246))|0;
     $250 = $245 >>> 8;
     $251 = ($250|0)==(0);
     if ($251) {
      $idx$0$i = 0;
     } else {
      $252 = ($246>>>0)>(16777215);
      if ($252) {
       $idx$0$i = 31;
      } else {
       $253 = (($250) + 1048320)|0;
       $254 = $253 >>> 16;
       $255 = $254 & 8;
       $256 = $250 << $255;
       $257 = (($256) + 520192)|0;
       $258 = $257 >>> 16;
       $259 = $258 & 4;
       $260 = $259 | $255;
       $261 = $256 << $259;
       $262 = (($261) + 245760)|0;
       $263 = $262 >>> 16;
       $264 = $263 & 2;
       $265 = $260 | $264;
       $266 = (14 - ($265))|0;
       $267 = $261 << $264;
       $268 = $267 >>> 15;
       $269 = (($266) + ($268))|0;
       $270 = $269 << 1;
       $271 = (($269) + 7)|0;
       $272 = $246 >>> $271;
       $273 = $272 & 1;
       $274 = $273 | $270;
       $idx$0$i = $274;
      }
     }
     $275 = (32916 + ($idx$0$i<<2)|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     L123: do {
      if ($277) {
       $rsize$2$i = $249;$t$1$i = 0;$v$2$i = 0;
       label = 86;
      } else {
       $278 = ($idx$0$i|0)==(31);
       $279 = $idx$0$i >>> 1;
       $280 = (25 - ($279))|0;
       $281 = $278 ? 0 : $280;
       $282 = $246 << $281;
       $rsize$0$i15 = $249;$rst$0$i = 0;$sizebits$0$i = $282;$t$0$i14 = $276;$v$0$i16 = 0;
       while(1) {
        $283 = ((($t$0$i14)) + 4|0);
        $284 = HEAP32[$283>>2]|0;
        $285 = $284 & -8;
        $286 = (($285) - ($246))|0;
        $287 = ($286>>>0)<($rsize$0$i15>>>0);
        if ($287) {
         $288 = ($285|0)==($246|0);
         if ($288) {
          $rsize$331$i = $286;$t$230$i = $t$0$i14;$v$332$i = $t$0$i14;
          label = 90;
          break L123;
         } else {
          $rsize$1$i = $286;$v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
        }
        $289 = ((($t$0$i14)) + 20|0);
        $290 = HEAP32[$289>>2]|0;
        $291 = $sizebits$0$i >>> 31;
        $292 = (((($t$0$i14)) + 16|0) + ($291<<2)|0);
        $293 = HEAP32[$292>>2]|0;
        $294 = ($290|0)==(0|0);
        $295 = ($290|0)==($293|0);
        $or$cond19$i = $294 | $295;
        $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
        $296 = ($293|0)==(0|0);
        $297 = $sizebits$0$i << 1;
        if ($296) {
         $rsize$2$i = $rsize$1$i;$t$1$i = $rst$1$i;$v$2$i = $v$1$i;
         label = 86;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $297;$t$0$i14 = $293;$v$0$i16 = $v$1$i;
        }
       }
      }
     } while(0);
     if ((label|0) == 86) {
      $298 = ($t$1$i|0)==(0|0);
      $299 = ($v$2$i|0)==(0|0);
      $or$cond$i = $298 & $299;
      if ($or$cond$i) {
       $300 = 2 << $idx$0$i;
       $301 = (0 - ($300))|0;
       $302 = $300 | $301;
       $303 = $247 & $302;
       $304 = ($303|0)==(0);
       if ($304) {
        $nb$0 = $246;
        break;
       }
       $305 = (0 - ($303))|0;
       $306 = $303 & $305;
       $307 = (($306) + -1)|0;
       $308 = $307 >>> 12;
       $309 = $308 & 16;
       $310 = $307 >>> $309;
       $311 = $310 >>> 5;
       $312 = $311 & 8;
       $313 = $312 | $309;
       $314 = $310 >>> $312;
       $315 = $314 >>> 2;
       $316 = $315 & 4;
       $317 = $313 | $316;
       $318 = $314 >>> $316;
       $319 = $318 >>> 1;
       $320 = $319 & 2;
       $321 = $317 | $320;
       $322 = $318 >>> $320;
       $323 = $322 >>> 1;
       $324 = $323 & 1;
       $325 = $321 | $324;
       $326 = $322 >>> $324;
       $327 = (($325) + ($326))|0;
       $328 = (32916 + ($327<<2)|0);
       $329 = HEAP32[$328>>2]|0;
       $t$2$ph$i = $329;$v$3$ph$i = 0;
      } else {
       $t$2$ph$i = $t$1$i;$v$3$ph$i = $v$2$i;
      }
      $330 = ($t$2$ph$i|0)==(0|0);
      if ($330) {
       $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$3$ph$i;
      } else {
       $rsize$331$i = $rsize$2$i;$t$230$i = $t$2$ph$i;$v$332$i = $v$3$ph$i;
       label = 90;
      }
     }
     if ((label|0) == 90) {
      while(1) {
       label = 0;
       $331 = ((($t$230$i)) + 4|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = $332 & -8;
       $334 = (($333) - ($246))|0;
       $335 = ($334>>>0)<($rsize$331$i>>>0);
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = ((($t$230$i)) + 16|0);
       $337 = HEAP32[$336>>2]|0;
       $338 = ($337|0)==(0|0);
       if (!($338)) {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $337;$v$332$i = $t$2$v$3$i;
        label = 90;
        continue;
       }
       $339 = ((($t$230$i)) + 20|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if ($341) {
        $rsize$3$lcssa$i = $$rsize$3$i;$v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $340;$v$332$i = $t$2$v$3$i;
        label = 90;
       }
      }
     }
     $342 = ($v$3$lcssa$i|0)==(0|0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[(32620)>>2]|0;
      $344 = (($343) - ($246))|0;
      $345 = ($rsize$3$lcssa$i>>>0)<($344>>>0);
      if ($345) {
       $346 = HEAP32[(32628)>>2]|0;
       $347 = ($v$3$lcssa$i>>>0)<($346>>>0);
       if ($347) {
        _abort();
        // unreachable;
       }
       $348 = (($v$3$lcssa$i) + ($246)|0);
       $349 = ($v$3$lcssa$i>>>0)<($348>>>0);
       if (!($349)) {
        _abort();
        // unreachable;
       }
       $350 = ((($v$3$lcssa$i)) + 24|0);
       $351 = HEAP32[$350>>2]|0;
       $352 = ((($v$3$lcssa$i)) + 12|0);
       $353 = HEAP32[$352>>2]|0;
       $354 = ($353|0)==($v$3$lcssa$i|0);
       do {
        if ($354) {
         $364 = ((($v$3$lcssa$i)) + 20|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==(0|0);
         if ($366) {
          $367 = ((($v$3$lcssa$i)) + 16|0);
          $368 = HEAP32[$367>>2]|0;
          $369 = ($368|0)==(0|0);
          if ($369) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18 = $368;$RP$0$i17 = $367;
          }
         } else {
          $R$0$i18 = $365;$RP$0$i17 = $364;
         }
         while(1) {
          $370 = ((($R$0$i18)) + 20|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if (!($372)) {
           $R$0$i18 = $371;$RP$0$i17 = $370;
           continue;
          }
          $373 = ((($R$0$i18)) + 16|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if ($375) {
           $R$0$i18$lcssa = $R$0$i18;$RP$0$i17$lcssa = $RP$0$i17;
           break;
          } else {
           $R$0$i18 = $374;$RP$0$i17 = $373;
          }
         }
         $376 = ($RP$0$i17$lcssa>>>0)<($346>>>0);
         if ($376) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17$lcssa>>2] = 0;
          $R$1$i20 = $R$0$i18$lcssa;
          break;
         }
        } else {
         $355 = ((($v$3$lcssa$i)) + 8|0);
         $356 = HEAP32[$355>>2]|0;
         $357 = ($356>>>0)<($346>>>0);
         if ($357) {
          _abort();
          // unreachable;
         }
         $358 = ((($356)) + 12|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359|0)==($v$3$lcssa$i|0);
         if (!($360)) {
          _abort();
          // unreachable;
         }
         $361 = ((($353)) + 8|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$3$lcssa$i|0);
         if ($363) {
          HEAP32[$358>>2] = $353;
          HEAP32[$361>>2] = $356;
          $R$1$i20 = $353;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $377 = ($351|0)==(0|0);
       do {
        if (!($377)) {
         $378 = ((($v$3$lcssa$i)) + 28|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = (32916 + ($379<<2)|0);
         $381 = HEAP32[$380>>2]|0;
         $382 = ($v$3$lcssa$i|0)==($381|0);
         if ($382) {
          HEAP32[$380>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[(32616)>>2]|0;
           $386 = $385 & $384;
           HEAP32[(32616)>>2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[(32628)>>2]|0;
          $388 = ($351>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = ((($351)) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($v$3$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $R$1$i20;
          } else {
           $392 = ((($351)) + 20|0);
           HEAP32[$392>>2] = $R$1$i20;
          }
          $393 = ($R$1$i20|0)==(0|0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[(32628)>>2]|0;
         $395 = ($R$1$i20>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = ((($R$1$i20)) + 24|0);
         HEAP32[$396>>2] = $351;
         $397 = ((($v$3$lcssa$i)) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = ((($R$1$i20)) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = ((($398)) + 24|0);
            HEAP32[$402>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $403 = ((($v$3$lcssa$i)) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if (!($405)) {
          $406 = HEAP32[(32628)>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = ((($R$1$i20)) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = ((($404)) + 24|0);
           HEAP32[$409>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $410 = ($rsize$3$lcssa$i>>>0)<(16);
       L199: do {
        if ($410) {
         $411 = (($rsize$3$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = ((($v$3$lcssa$i)) + 4|0);
         HEAP32[$413>>2] = $412;
         $$sum18$i = (($411) + 4)|0;
         $414 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $415 = HEAP32[$414>>2]|0;
         $416 = $415 | 1;
         HEAP32[$414>>2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = ((($v$3$lcssa$i)) + 4|0);
         HEAP32[$418>>2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2334 = $246 | 4;
         $420 = (($v$3$lcssa$i) + ($$sum$i2334)|0);
         HEAP32[$420>>2] = $419;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($246))|0;
         $421 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$421>>2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($423) {
          $424 = $422 << 1;
          $425 = (32652 + ($424<<2)|0);
          $426 = HEAP32[32612>>2]|0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428|0)==(0);
          if ($429) {
           $430 = $426 | $427;
           HEAP32[32612>>2] = $430;
           $$pre$i25 = (($424) + 2)|0;
           $$pre43$i = (32652 + ($$pre$i25<<2)|0);
           $$pre$phi$i26Z2D = $$pre43$i;$F5$0$i = $425;
          } else {
           $$sum17$i = (($424) + 2)|0;
           $431 = (32652 + ($$sum17$i<<2)|0);
           $432 = HEAP32[$431>>2]|0;
           $433 = HEAP32[(32628)>>2]|0;
           $434 = ($432>>>0)<($433>>>0);
           if ($434) {
            _abort();
            // unreachable;
           } else {
            $$pre$phi$i26Z2D = $431;$F5$0$i = $432;
           }
          }
          HEAP32[$$pre$phi$i26Z2D>>2] = $348;
          $435 = ((($F5$0$i)) + 12|0);
          HEAP32[$435>>2] = $348;
          $$sum15$i = (($246) + 8)|0;
          $436 = (($v$3$lcssa$i) + ($$sum15$i)|0);
          HEAP32[$436>>2] = $F5$0$i;
          $$sum16$i = (($246) + 12)|0;
          $437 = (($v$3$lcssa$i) + ($$sum16$i)|0);
          HEAP32[$437>>2] = $425;
          break;
         }
         $438 = $rsize$3$lcssa$i >>> 8;
         $439 = ($438|0)==(0);
         if ($439) {
          $I7$0$i = 0;
         } else {
          $440 = ($rsize$3$lcssa$i>>>0)>(16777215);
          if ($440) {
           $I7$0$i = 31;
          } else {
           $441 = (($438) + 1048320)|0;
           $442 = $441 >>> 16;
           $443 = $442 & 8;
           $444 = $438 << $443;
           $445 = (($444) + 520192)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 4;
           $448 = $447 | $443;
           $449 = $444 << $447;
           $450 = (($449) + 245760)|0;
           $451 = $450 >>> 16;
           $452 = $451 & 2;
           $453 = $448 | $452;
           $454 = (14 - ($453))|0;
           $455 = $449 << $452;
           $456 = $455 >>> 15;
           $457 = (($454) + ($456))|0;
           $458 = $457 << 1;
           $459 = (($457) + 7)|0;
           $460 = $rsize$3$lcssa$i >>> $459;
           $461 = $460 & 1;
           $462 = $461 | $458;
           $I7$0$i = $462;
          }
         }
         $463 = (32916 + ($I7$0$i<<2)|0);
         $$sum2$i = (($246) + 28)|0;
         $464 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$464>>2] = $I7$0$i;
         $$sum3$i27 = (($246) + 16)|0;
         $465 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($246) + 20)|0;
         $466 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$466>>2] = 0;
         HEAP32[$465>>2] = 0;
         $467 = HEAP32[(32616)>>2]|0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469|0)==(0);
         if ($470) {
          $471 = $467 | $468;
          HEAP32[(32616)>>2] = $471;
          HEAP32[$463>>2] = $348;
          $$sum5$i = (($246) + 24)|0;
          $472 = (($v$3$lcssa$i) + ($$sum5$i)|0);
          HEAP32[$472>>2] = $463;
          $$sum6$i = (($246) + 12)|0;
          $473 = (($v$3$lcssa$i) + ($$sum6$i)|0);
          HEAP32[$473>>2] = $348;
          $$sum7$i = (($246) + 8)|0;
          $474 = (($v$3$lcssa$i) + ($$sum7$i)|0);
          HEAP32[$474>>2] = $348;
          break;
         }
         $475 = HEAP32[$463>>2]|0;
         $476 = ((($475)) + 4|0);
         $477 = HEAP32[$476>>2]|0;
         $478 = $477 & -8;
         $479 = ($478|0)==($rsize$3$lcssa$i|0);
         L217: do {
          if ($479) {
           $T$0$lcssa$i = $475;
          } else {
           $480 = ($I7$0$i|0)==(31);
           $481 = $I7$0$i >>> 1;
           $482 = (25 - ($481))|0;
           $483 = $480 ? 0 : $482;
           $484 = $rsize$3$lcssa$i << $483;
           $K12$029$i = $484;$T$028$i = $475;
           while(1) {
            $491 = $K12$029$i >>> 31;
            $492 = (((($T$028$i)) + 16|0) + ($491<<2)|0);
            $487 = HEAP32[$492>>2]|0;
            $493 = ($487|0)==(0|0);
            if ($493) {
             $$lcssa232 = $492;$T$028$i$lcssa = $T$028$i;
             break;
            }
            $485 = $K12$029$i << 1;
            $486 = ((($487)) + 4|0);
            $488 = HEAP32[$486>>2]|0;
            $489 = $488 & -8;
            $490 = ($489|0)==($rsize$3$lcssa$i|0);
            if ($490) {
             $T$0$lcssa$i = $487;
             break L217;
            } else {
             $K12$029$i = $485;$T$028$i = $487;
            }
           }
           $494 = HEAP32[(32628)>>2]|0;
           $495 = ($$lcssa232>>>0)<($494>>>0);
           if ($495) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$$lcssa232>>2] = $348;
            $$sum11$i = (($246) + 24)|0;
            $496 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$496>>2] = $T$028$i$lcssa;
            $$sum12$i = (($246) + 12)|0;
            $497 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$497>>2] = $348;
            $$sum13$i = (($246) + 8)|0;
            $498 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$498>>2] = $348;
            break L199;
           }
          }
         } while(0);
         $499 = ((($T$0$lcssa$i)) + 8|0);
         $500 = HEAP32[$499>>2]|0;
         $501 = HEAP32[(32628)>>2]|0;
         $502 = ($500>>>0)>=($501>>>0);
         $not$$i = ($T$0$lcssa$i>>>0)>=($501>>>0);
         $503 = $502 & $not$$i;
         if ($503) {
          $504 = ((($500)) + 12|0);
          HEAP32[$504>>2] = $348;
          HEAP32[$499>>2] = $348;
          $$sum8$i = (($246) + 8)|0;
          $505 = (($v$3$lcssa$i) + ($$sum8$i)|0);
          HEAP32[$505>>2] = $500;
          $$sum9$i = (($246) + 12)|0;
          $506 = (($v$3$lcssa$i) + ($$sum9$i)|0);
          HEAP32[$506>>2] = $T$0$lcssa$i;
          $$sum10$i = (($246) + 24)|0;
          $507 = (($v$3$lcssa$i) + ($$sum10$i)|0);
          HEAP32[$507>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $508 = ((($v$3$lcssa$i)) + 8|0);
       $mem$0 = $508;
       return ($mem$0|0);
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[(32620)>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[(32632)>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[(32632)>>2] = $514;
   HEAP32[(32620)>>2] = $511;
   $515 = $511 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $516 = (($512) + ($$sum2)|0);
   HEAP32[$516>>2] = $515;
   $517 = (($512) + ($509)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = ((($512)) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[(32620)>>2] = 0;
   HEAP32[(32632)>>2] = 0;
   $520 = $509 | 3;
   $521 = ((($512)) + 4|0);
   HEAP32[$521>>2] = $520;
   $$sum1 = (($509) + 4)|0;
   $522 = (($512) + ($$sum1)|0);
   $523 = HEAP32[$522>>2]|0;
   $524 = $523 | 1;
   HEAP32[$522>>2] = $524;
  }
  $525 = ((($512)) + 8|0);
  $mem$0 = $525;
  return ($mem$0|0);
 }
 $526 = HEAP32[(32624)>>2]|0;
 $527 = ($526>>>0)>($nb$0>>>0);
 if ($527) {
  $528 = (($526) - ($nb$0))|0;
  HEAP32[(32624)>>2] = $528;
  $529 = HEAP32[(32636)>>2]|0;
  $530 = (($529) + ($nb$0)|0);
  HEAP32[(32636)>>2] = $530;
  $531 = $528 | 1;
  $$sum = (($nb$0) + 4)|0;
  $532 = (($529) + ($$sum)|0);
  HEAP32[$532>>2] = $531;
  $533 = $nb$0 | 3;
  $534 = ((($529)) + 4|0);
  HEAP32[$534>>2] = $533;
  $535 = ((($529)) + 8|0);
  $mem$0 = $535;
  return ($mem$0|0);
 }
 $536 = HEAP32[33084>>2]|0;
 $537 = ($536|0)==(0);
 do {
  if ($537) {
   $538 = (_sysconf(30)|0);
   $539 = (($538) + -1)|0;
   $540 = $539 & $538;
   $541 = ($540|0)==(0);
   if ($541) {
    HEAP32[(33092)>>2] = $538;
    HEAP32[(33088)>>2] = $538;
    HEAP32[(33096)>>2] = -1;
    HEAP32[(33100)>>2] = -1;
    HEAP32[(33104)>>2] = 0;
    HEAP32[(33056)>>2] = 0;
    $542 = (_time((0|0))|0);
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[33084>>2] = $544;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $545 = (($nb$0) + 48)|0;
 $546 = HEAP32[(33092)>>2]|0;
 $547 = (($nb$0) + 47)|0;
 $548 = (($546) + ($547))|0;
 $549 = (0 - ($546))|0;
 $550 = $548 & $549;
 $551 = ($550>>>0)>($nb$0>>>0);
 if (!($551)) {
  $mem$0 = 0;
  return ($mem$0|0);
 }
 $552 = HEAP32[(33052)>>2]|0;
 $553 = ($552|0)==(0);
 if (!($553)) {
  $554 = HEAP32[(33044)>>2]|0;
  $555 = (($554) + ($550))|0;
  $556 = ($555>>>0)<=($554>>>0);
  $557 = ($555>>>0)>($552>>>0);
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   return ($mem$0|0);
  }
 }
 $558 = HEAP32[(33056)>>2]|0;
 $559 = $558 & 4;
 $560 = ($559|0)==(0);
 L258: do {
  if ($560) {
   $561 = HEAP32[(32636)>>2]|0;
   $562 = ($561|0)==(0|0);
   L260: do {
    if ($562) {
     label = 174;
    } else {
     $sp$0$i$i = (33060);
     while(1) {
      $563 = HEAP32[$sp$0$i$i>>2]|0;
      $564 = ($563>>>0)>($561>>>0);
      if (!($564)) {
       $565 = ((($sp$0$i$i)) + 4|0);
       $566 = HEAP32[$565>>2]|0;
       $567 = (($563) + ($566)|0);
       $568 = ($567>>>0)>($561>>>0);
       if ($568) {
        $$lcssa228 = $sp$0$i$i;$$lcssa230 = $565;
        break;
       }
      }
      $569 = ((($sp$0$i$i)) + 8|0);
      $570 = HEAP32[$569>>2]|0;
      $571 = ($570|0)==(0|0);
      if ($571) {
       label = 174;
       break L260;
      } else {
       $sp$0$i$i = $570;
      }
     }
     $594 = HEAP32[(32624)>>2]|0;
     $595 = (($548) - ($594))|0;
     $596 = $595 & $549;
     $597 = ($596>>>0)<(2147483647);
     if ($597) {
      $598 = (_sbrk(($596|0))|0);
      $599 = HEAP32[$$lcssa228>>2]|0;
      $600 = HEAP32[$$lcssa230>>2]|0;
      $601 = (($599) + ($600)|0);
      $602 = ($598|0)==($601|0);
      $$3$i = $602 ? $596 : 0;
      if ($602) {
       $603 = ($598|0)==((-1)|0);
       if ($603) {
        $tsize$0323944$i = $$3$i;
       } else {
        $tbase$255$i = $598;$tsize$254$i = $$3$i;
        label = 194;
        break L258;
       }
      } else {
       $br$0$ph$i = $598;$ssize$1$ph$i = $596;$tsize$0$ph$i = $$3$i;
       label = 184;
      }
     } else {
      $tsize$0323944$i = 0;
     }
    }
   } while(0);
   do {
    if ((label|0) == 174) {
     $572 = (_sbrk(0)|0);
     $573 = ($572|0)==((-1)|0);
     if ($573) {
      $tsize$0323944$i = 0;
     } else {
      $574 = $572;
      $575 = HEAP32[(33088)>>2]|0;
      $576 = (($575) + -1)|0;
      $577 = $576 & $574;
      $578 = ($577|0)==(0);
      if ($578) {
       $ssize$0$i = $550;
      } else {
       $579 = (($576) + ($574))|0;
       $580 = (0 - ($575))|0;
       $581 = $579 & $580;
       $582 = (($550) - ($574))|0;
       $583 = (($582) + ($581))|0;
       $ssize$0$i = $583;
      }
      $584 = HEAP32[(33044)>>2]|0;
      $585 = (($584) + ($ssize$0$i))|0;
      $586 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $587 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i30 = $586 & $587;
      if ($or$cond$i30) {
       $588 = HEAP32[(33052)>>2]|0;
       $589 = ($588|0)==(0);
       if (!($589)) {
        $590 = ($585>>>0)<=($584>>>0);
        $591 = ($585>>>0)>($588>>>0);
        $or$cond2$i = $590 | $591;
        if ($or$cond2$i) {
         $tsize$0323944$i = 0;
         break;
        }
       }
       $592 = (_sbrk(($ssize$0$i|0))|0);
       $593 = ($592|0)==($572|0);
       $ssize$0$$i = $593 ? $ssize$0$i : 0;
       if ($593) {
        $tbase$255$i = $572;$tsize$254$i = $ssize$0$$i;
        label = 194;
        break L258;
       } else {
        $br$0$ph$i = $592;$ssize$1$ph$i = $ssize$0$i;$tsize$0$ph$i = $ssize$0$$i;
        label = 184;
       }
      } else {
       $tsize$0323944$i = 0;
      }
     }
    }
   } while(0);
   L280: do {
    if ((label|0) == 184) {
     $604 = (0 - ($ssize$1$ph$i))|0;
     $605 = ($br$0$ph$i|0)!=((-1)|0);
     $606 = ($ssize$1$ph$i>>>0)<(2147483647);
     $or$cond5$i = $606 & $605;
     $607 = ($545>>>0)>($ssize$1$ph$i>>>0);
     $or$cond6$i = $607 & $or$cond5$i;
     do {
      if ($or$cond6$i) {
       $608 = HEAP32[(33092)>>2]|0;
       $609 = (($547) - ($ssize$1$ph$i))|0;
       $610 = (($609) + ($608))|0;
       $611 = (0 - ($608))|0;
       $612 = $610 & $611;
       $613 = ($612>>>0)<(2147483647);
       if ($613) {
        $614 = (_sbrk(($612|0))|0);
        $615 = ($614|0)==((-1)|0);
        if ($615) {
         (_sbrk(($604|0))|0);
         $tsize$0323944$i = $tsize$0$ph$i;
         break L280;
        } else {
         $616 = (($612) + ($ssize$1$ph$i))|0;
         $ssize$2$i = $616;
         break;
        }
       } else {
        $ssize$2$i = $ssize$1$ph$i;
       }
      } else {
       $ssize$2$i = $ssize$1$ph$i;
      }
     } while(0);
     $617 = ($br$0$ph$i|0)==((-1)|0);
     if ($617) {
      $tsize$0323944$i = $tsize$0$ph$i;
     } else {
      $tbase$255$i = $br$0$ph$i;$tsize$254$i = $ssize$2$i;
      label = 194;
      break L258;
     }
    }
   } while(0);
   $618 = HEAP32[(33056)>>2]|0;
   $619 = $618 | 4;
   HEAP32[(33056)>>2] = $619;
   $tsize$1$i = $tsize$0323944$i;
   label = 191;
  } else {
   $tsize$1$i = 0;
   label = 191;
  }
 } while(0);
 if ((label|0) == 191) {
  $620 = ($550>>>0)<(2147483647);
  if ($620) {
   $621 = (_sbrk(($550|0))|0);
   $622 = (_sbrk(0)|0);
   $623 = ($621|0)!=((-1)|0);
   $624 = ($622|0)!=((-1)|0);
   $or$cond3$i = $623 & $624;
   $625 = ($621>>>0)<($622>>>0);
   $or$cond8$i = $625 & $or$cond3$i;
   if ($or$cond8$i) {
    $626 = $622;
    $627 = $621;
    $628 = (($626) - ($627))|0;
    $629 = (($nb$0) + 40)|0;
    $630 = ($628>>>0)>($629>>>0);
    $$tsize$1$i = $630 ? $628 : $tsize$1$i;
    if ($630) {
     $tbase$255$i = $621;$tsize$254$i = $$tsize$1$i;
     label = 194;
    }
   }
  }
 }
 if ((label|0) == 194) {
  $631 = HEAP32[(33044)>>2]|0;
  $632 = (($631) + ($tsize$254$i))|0;
  HEAP32[(33044)>>2] = $632;
  $633 = HEAP32[(33048)>>2]|0;
  $634 = ($632>>>0)>($633>>>0);
  if ($634) {
   HEAP32[(33048)>>2] = $632;
  }
  $635 = HEAP32[(32636)>>2]|0;
  $636 = ($635|0)==(0|0);
  L299: do {
   if ($636) {
    $637 = HEAP32[(32628)>>2]|0;
    $638 = ($637|0)==(0|0);
    $639 = ($tbase$255$i>>>0)<($637>>>0);
    $or$cond9$i = $638 | $639;
    if ($or$cond9$i) {
     HEAP32[(32628)>>2] = $tbase$255$i;
    }
    HEAP32[(33060)>>2] = $tbase$255$i;
    HEAP32[(33064)>>2] = $tsize$254$i;
    HEAP32[(33072)>>2] = 0;
    $640 = HEAP32[33084>>2]|0;
    HEAP32[(32648)>>2] = $640;
    HEAP32[(32644)>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $641 = $i$02$i$i << 1;
     $642 = (32652 + ($641<<2)|0);
     $$sum$i$i = (($641) + 3)|0;
     $643 = (32652 + ($$sum$i$i<<2)|0);
     HEAP32[$643>>2] = $642;
     $$sum1$i$i = (($641) + 2)|0;
     $644 = (32652 + ($$sum1$i$i<<2)|0);
     HEAP32[$644>>2] = $642;
     $645 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($645|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $645;
     }
    }
    $646 = (($tsize$254$i) + -40)|0;
    $647 = ((($tbase$255$i)) + 8|0);
    $648 = $647;
    $649 = $648 & 7;
    $650 = ($649|0)==(0);
    $651 = (0 - ($648))|0;
    $652 = $651 & 7;
    $653 = $650 ? 0 : $652;
    $654 = (($tbase$255$i) + ($653)|0);
    $655 = (($646) - ($653))|0;
    HEAP32[(32636)>>2] = $654;
    HEAP32[(32624)>>2] = $655;
    $656 = $655 | 1;
    $$sum$i13$i = (($653) + 4)|0;
    $657 = (($tbase$255$i) + ($$sum$i13$i)|0);
    HEAP32[$657>>2] = $656;
    $$sum2$i$i = (($tsize$254$i) + -36)|0;
    $658 = (($tbase$255$i) + ($$sum2$i$i)|0);
    HEAP32[$658>>2] = 40;
    $659 = HEAP32[(33100)>>2]|0;
    HEAP32[(32640)>>2] = $659;
   } else {
    $sp$084$i = (33060);
    while(1) {
     $660 = HEAP32[$sp$084$i>>2]|0;
     $661 = ((($sp$084$i)) + 4|0);
     $662 = HEAP32[$661>>2]|0;
     $663 = (($660) + ($662)|0);
     $664 = ($tbase$255$i|0)==($663|0);
     if ($664) {
      $$lcssa222 = $660;$$lcssa224 = $661;$$lcssa226 = $662;$sp$084$i$lcssa = $sp$084$i;
      label = 204;
      break;
     }
     $665 = ((($sp$084$i)) + 8|0);
     $666 = HEAP32[$665>>2]|0;
     $667 = ($666|0)==(0|0);
     if ($667) {
      break;
     } else {
      $sp$084$i = $666;
     }
    }
    if ((label|0) == 204) {
     $668 = ((($sp$084$i$lcssa)) + 12|0);
     $669 = HEAP32[$668>>2]|0;
     $670 = $669 & 8;
     $671 = ($670|0)==(0);
     if ($671) {
      $672 = ($635>>>0)>=($$lcssa222>>>0);
      $673 = ($635>>>0)<($tbase$255$i>>>0);
      $or$cond57$i = $673 & $672;
      if ($or$cond57$i) {
       $674 = (($$lcssa226) + ($tsize$254$i))|0;
       HEAP32[$$lcssa224>>2] = $674;
       $675 = HEAP32[(32624)>>2]|0;
       $676 = (($675) + ($tsize$254$i))|0;
       $677 = ((($635)) + 8|0);
       $678 = $677;
       $679 = $678 & 7;
       $680 = ($679|0)==(0);
       $681 = (0 - ($678))|0;
       $682 = $681 & 7;
       $683 = $680 ? 0 : $682;
       $684 = (($635) + ($683)|0);
       $685 = (($676) - ($683))|0;
       HEAP32[(32636)>>2] = $684;
       HEAP32[(32624)>>2] = $685;
       $686 = $685 | 1;
       $$sum$i17$i = (($683) + 4)|0;
       $687 = (($635) + ($$sum$i17$i)|0);
       HEAP32[$687>>2] = $686;
       $$sum2$i18$i = (($676) + 4)|0;
       $688 = (($635) + ($$sum2$i18$i)|0);
       HEAP32[$688>>2] = 40;
       $689 = HEAP32[(33100)>>2]|0;
       HEAP32[(32640)>>2] = $689;
       break;
      }
     }
    }
    $690 = HEAP32[(32628)>>2]|0;
    $691 = ($tbase$255$i>>>0)<($690>>>0);
    if ($691) {
     HEAP32[(32628)>>2] = $tbase$255$i;
     $755 = $tbase$255$i;
    } else {
     $755 = $690;
    }
    $692 = (($tbase$255$i) + ($tsize$254$i)|0);
    $sp$183$i = (33060);
    while(1) {
     $693 = HEAP32[$sp$183$i>>2]|0;
     $694 = ($693|0)==($692|0);
     if ($694) {
      $$lcssa219 = $sp$183$i;$sp$183$i$lcssa = $sp$183$i;
      label = 212;
      break;
     }
     $695 = ((($sp$183$i)) + 8|0);
     $696 = HEAP32[$695>>2]|0;
     $697 = ($696|0)==(0|0);
     if ($697) {
      $sp$0$i$i$i = (33060);
      break;
     } else {
      $sp$183$i = $696;
     }
    }
    if ((label|0) == 212) {
     $698 = ((($sp$183$i$lcssa)) + 12|0);
     $699 = HEAP32[$698>>2]|0;
     $700 = $699 & 8;
     $701 = ($700|0)==(0);
     if ($701) {
      HEAP32[$$lcssa219>>2] = $tbase$255$i;
      $702 = ((($sp$183$i$lcssa)) + 4|0);
      $703 = HEAP32[$702>>2]|0;
      $704 = (($703) + ($tsize$254$i))|0;
      HEAP32[$702>>2] = $704;
      $705 = ((($tbase$255$i)) + 8|0);
      $706 = $705;
      $707 = $706 & 7;
      $708 = ($707|0)==(0);
      $709 = (0 - ($706))|0;
      $710 = $709 & 7;
      $711 = $708 ? 0 : $710;
      $712 = (($tbase$255$i) + ($711)|0);
      $$sum112$i = (($tsize$254$i) + 8)|0;
      $713 = (($tbase$255$i) + ($$sum112$i)|0);
      $714 = $713;
      $715 = $714 & 7;
      $716 = ($715|0)==(0);
      $717 = (0 - ($714))|0;
      $718 = $717 & 7;
      $719 = $716 ? 0 : $718;
      $$sum113$i = (($719) + ($tsize$254$i))|0;
      $720 = (($tbase$255$i) + ($$sum113$i)|0);
      $721 = $720;
      $722 = $712;
      $723 = (($721) - ($722))|0;
      $$sum$i19$i = (($711) + ($nb$0))|0;
      $724 = (($tbase$255$i) + ($$sum$i19$i)|0);
      $725 = (($723) - ($nb$0))|0;
      $726 = $nb$0 | 3;
      $$sum1$i20$i = (($711) + 4)|0;
      $727 = (($tbase$255$i) + ($$sum1$i20$i)|0);
      HEAP32[$727>>2] = $726;
      $728 = ($720|0)==($635|0);
      L324: do {
       if ($728) {
        $729 = HEAP32[(32624)>>2]|0;
        $730 = (($729) + ($725))|0;
        HEAP32[(32624)>>2] = $730;
        HEAP32[(32636)>>2] = $724;
        $731 = $730 | 1;
        $$sum42$i$i = (($$sum$i19$i) + 4)|0;
        $732 = (($tbase$255$i) + ($$sum42$i$i)|0);
        HEAP32[$732>>2] = $731;
       } else {
        $733 = HEAP32[(32632)>>2]|0;
        $734 = ($720|0)==($733|0);
        if ($734) {
         $735 = HEAP32[(32620)>>2]|0;
         $736 = (($735) + ($725))|0;
         HEAP32[(32620)>>2] = $736;
         HEAP32[(32632)>>2] = $724;
         $737 = $736 | 1;
         $$sum40$i$i = (($$sum$i19$i) + 4)|0;
         $738 = (($tbase$255$i) + ($$sum40$i$i)|0);
         HEAP32[$738>>2] = $737;
         $$sum41$i$i = (($736) + ($$sum$i19$i))|0;
         $739 = (($tbase$255$i) + ($$sum41$i$i)|0);
         HEAP32[$739>>2] = $736;
         break;
        }
        $$sum2$i21$i = (($tsize$254$i) + 4)|0;
        $$sum114$i = (($$sum2$i21$i) + ($719))|0;
        $740 = (($tbase$255$i) + ($$sum114$i)|0);
        $741 = HEAP32[$740>>2]|0;
        $742 = $741 & 3;
        $743 = ($742|0)==(1);
        if ($743) {
         $744 = $741 & -8;
         $745 = $741 >>> 3;
         $746 = ($741>>>0)<(256);
         L332: do {
          if ($746) {
           $$sum3738$i$i = $719 | 8;
           $$sum124$i = (($$sum3738$i$i) + ($tsize$254$i))|0;
           $747 = (($tbase$255$i) + ($$sum124$i)|0);
           $748 = HEAP32[$747>>2]|0;
           $$sum39$i$i = (($tsize$254$i) + 12)|0;
           $$sum125$i = (($$sum39$i$i) + ($719))|0;
           $749 = (($tbase$255$i) + ($$sum125$i)|0);
           $750 = HEAP32[$749>>2]|0;
           $751 = $745 << 1;
           $752 = (32652 + ($751<<2)|0);
           $753 = ($748|0)==($752|0);
           do {
            if (!($753)) {
             $754 = ($748>>>0)<($755>>>0);
             if ($754) {
              _abort();
              // unreachable;
             }
             $756 = ((($748)) + 12|0);
             $757 = HEAP32[$756>>2]|0;
             $758 = ($757|0)==($720|0);
             if ($758) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $759 = ($750|0)==($748|0);
           if ($759) {
            $760 = 1 << $745;
            $761 = $760 ^ -1;
            $762 = HEAP32[32612>>2]|0;
            $763 = $762 & $761;
            HEAP32[32612>>2] = $763;
            break;
           }
           $764 = ($750|0)==($752|0);
           do {
            if ($764) {
             $$pre57$i$i = ((($750)) + 8|0);
             $$pre$phi58$i$iZ2D = $$pre57$i$i;
            } else {
             $765 = ($750>>>0)<($755>>>0);
             if ($765) {
              _abort();
              // unreachable;
             }
             $766 = ((($750)) + 8|0);
             $767 = HEAP32[$766>>2]|0;
             $768 = ($767|0)==($720|0);
             if ($768) {
              $$pre$phi58$i$iZ2D = $766;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $769 = ((($748)) + 12|0);
           HEAP32[$769>>2] = $750;
           HEAP32[$$pre$phi58$i$iZ2D>>2] = $748;
          } else {
           $$sum34$i$i = $719 | 24;
           $$sum115$i = (($$sum34$i$i) + ($tsize$254$i))|0;
           $770 = (($tbase$255$i) + ($$sum115$i)|0);
           $771 = HEAP32[$770>>2]|0;
           $$sum5$i$i = (($tsize$254$i) + 12)|0;
           $$sum116$i = (($$sum5$i$i) + ($719))|0;
           $772 = (($tbase$255$i) + ($$sum116$i)|0);
           $773 = HEAP32[$772>>2]|0;
           $774 = ($773|0)==($720|0);
           do {
            if ($774) {
             $$sum67$i$i = $719 | 16;
             $$sum122$i = (($$sum2$i21$i) + ($$sum67$i$i))|0;
             $784 = (($tbase$255$i) + ($$sum122$i)|0);
             $785 = HEAP32[$784>>2]|0;
             $786 = ($785|0)==(0|0);
             if ($786) {
              $$sum123$i = (($$sum67$i$i) + ($tsize$254$i))|0;
              $787 = (($tbase$255$i) + ($$sum123$i)|0);
              $788 = HEAP32[$787>>2]|0;
              $789 = ($788|0)==(0|0);
              if ($789) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $788;$RP$0$i$i = $787;
              }
             } else {
              $R$0$i$i = $785;$RP$0$i$i = $784;
             }
             while(1) {
              $790 = ((($R$0$i$i)) + 20|0);
              $791 = HEAP32[$790>>2]|0;
              $792 = ($791|0)==(0|0);
              if (!($792)) {
               $R$0$i$i = $791;$RP$0$i$i = $790;
               continue;
              }
              $793 = ((($R$0$i$i)) + 16|0);
              $794 = HEAP32[$793>>2]|0;
              $795 = ($794|0)==(0|0);
              if ($795) {
               $R$0$i$i$lcssa = $R$0$i$i;$RP$0$i$i$lcssa = $RP$0$i$i;
               break;
              } else {
               $R$0$i$i = $794;$RP$0$i$i = $793;
              }
             }
             $796 = ($RP$0$i$i$lcssa>>>0)<($755>>>0);
             if ($796) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i$lcssa>>2] = 0;
              $R$1$i$i = $R$0$i$i$lcssa;
              break;
             }
            } else {
             $$sum3536$i$i = $719 | 8;
             $$sum117$i = (($$sum3536$i$i) + ($tsize$254$i))|0;
             $775 = (($tbase$255$i) + ($$sum117$i)|0);
             $776 = HEAP32[$775>>2]|0;
             $777 = ($776>>>0)<($755>>>0);
             if ($777) {
              _abort();
              // unreachable;
             }
             $778 = ((($776)) + 12|0);
             $779 = HEAP32[$778>>2]|0;
             $780 = ($779|0)==($720|0);
             if (!($780)) {
              _abort();
              // unreachable;
             }
             $781 = ((($773)) + 8|0);
             $782 = HEAP32[$781>>2]|0;
             $783 = ($782|0)==($720|0);
             if ($783) {
              HEAP32[$778>>2] = $773;
              HEAP32[$781>>2] = $776;
              $R$1$i$i = $773;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $797 = ($771|0)==(0|0);
           if ($797) {
            break;
           }
           $$sum30$i$i = (($tsize$254$i) + 28)|0;
           $$sum118$i = (($$sum30$i$i) + ($719))|0;
           $798 = (($tbase$255$i) + ($$sum118$i)|0);
           $799 = HEAP32[$798>>2]|0;
           $800 = (32916 + ($799<<2)|0);
           $801 = HEAP32[$800>>2]|0;
           $802 = ($720|0)==($801|0);
           do {
            if ($802) {
             HEAP32[$800>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $803 = 1 << $799;
             $804 = $803 ^ -1;
             $805 = HEAP32[(32616)>>2]|0;
             $806 = $805 & $804;
             HEAP32[(32616)>>2] = $806;
             break L332;
            } else {
             $807 = HEAP32[(32628)>>2]|0;
             $808 = ($771>>>0)<($807>>>0);
             if ($808) {
              _abort();
              // unreachable;
             }
             $809 = ((($771)) + 16|0);
             $810 = HEAP32[$809>>2]|0;
             $811 = ($810|0)==($720|0);
             if ($811) {
              HEAP32[$809>>2] = $R$1$i$i;
             } else {
              $812 = ((($771)) + 20|0);
              HEAP32[$812>>2] = $R$1$i$i;
             }
             $813 = ($R$1$i$i|0)==(0|0);
             if ($813) {
              break L332;
             }
            }
           } while(0);
           $814 = HEAP32[(32628)>>2]|0;
           $815 = ($R$1$i$i>>>0)<($814>>>0);
           if ($815) {
            _abort();
            // unreachable;
           }
           $816 = ((($R$1$i$i)) + 24|0);
           HEAP32[$816>>2] = $771;
           $$sum3132$i$i = $719 | 16;
           $$sum119$i = (($$sum3132$i$i) + ($tsize$254$i))|0;
           $817 = (($tbase$255$i) + ($$sum119$i)|0);
           $818 = HEAP32[$817>>2]|0;
           $819 = ($818|0)==(0|0);
           do {
            if (!($819)) {
             $820 = ($818>>>0)<($814>>>0);
             if ($820) {
              _abort();
              // unreachable;
             } else {
              $821 = ((($R$1$i$i)) + 16|0);
              HEAP32[$821>>2] = $818;
              $822 = ((($818)) + 24|0);
              HEAP32[$822>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum120$i = (($$sum2$i21$i) + ($$sum3132$i$i))|0;
           $823 = (($tbase$255$i) + ($$sum120$i)|0);
           $824 = HEAP32[$823>>2]|0;
           $825 = ($824|0)==(0|0);
           if ($825) {
            break;
           }
           $826 = HEAP32[(32628)>>2]|0;
           $827 = ($824>>>0)<($826>>>0);
           if ($827) {
            _abort();
            // unreachable;
           } else {
            $828 = ((($R$1$i$i)) + 20|0);
            HEAP32[$828>>2] = $824;
            $829 = ((($824)) + 24|0);
            HEAP32[$829>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $744 | $719;
         $$sum121$i = (($$sum9$i$i) + ($tsize$254$i))|0;
         $830 = (($tbase$255$i) + ($$sum121$i)|0);
         $831 = (($744) + ($725))|0;
         $oldfirst$0$i$i = $830;$qsize$0$i$i = $831;
        } else {
         $oldfirst$0$i$i = $720;$qsize$0$i$i = $725;
        }
        $832 = ((($oldfirst$0$i$i)) + 4|0);
        $833 = HEAP32[$832>>2]|0;
        $834 = $833 & -2;
        HEAP32[$832>>2] = $834;
        $835 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i19$i) + 4)|0;
        $836 = (($tbase$255$i) + ($$sum10$i$i)|0);
        HEAP32[$836>>2] = $835;
        $$sum11$i$i = (($qsize$0$i$i) + ($$sum$i19$i))|0;
        $837 = (($tbase$255$i) + ($$sum11$i$i)|0);
        HEAP32[$837>>2] = $qsize$0$i$i;
        $838 = $qsize$0$i$i >>> 3;
        $839 = ($qsize$0$i$i>>>0)<(256);
        if ($839) {
         $840 = $838 << 1;
         $841 = (32652 + ($840<<2)|0);
         $842 = HEAP32[32612>>2]|0;
         $843 = 1 << $838;
         $844 = $842 & $843;
         $845 = ($844|0)==(0);
         do {
          if ($845) {
           $846 = $842 | $843;
           HEAP32[32612>>2] = $846;
           $$pre$i22$i = (($840) + 2)|0;
           $$pre56$i$i = (32652 + ($$pre$i22$i<<2)|0);
           $$pre$phi$i23$iZ2D = $$pre56$i$i;$F4$0$i$i = $841;
          } else {
           $$sum29$i$i = (($840) + 2)|0;
           $847 = (32652 + ($$sum29$i$i<<2)|0);
           $848 = HEAP32[$847>>2]|0;
           $849 = HEAP32[(32628)>>2]|0;
           $850 = ($848>>>0)<($849>>>0);
           if (!($850)) {
            $$pre$phi$i23$iZ2D = $847;$F4$0$i$i = $848;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i23$iZ2D>>2] = $724;
         $851 = ((($F4$0$i$i)) + 12|0);
         HEAP32[$851>>2] = $724;
         $$sum27$i$i = (($$sum$i19$i) + 8)|0;
         $852 = (($tbase$255$i) + ($$sum27$i$i)|0);
         HEAP32[$852>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i19$i) + 12)|0;
         $853 = (($tbase$255$i) + ($$sum28$i$i)|0);
         HEAP32[$853>>2] = $841;
         break;
        }
        $854 = $qsize$0$i$i >>> 8;
        $855 = ($854|0)==(0);
        do {
         if ($855) {
          $I7$0$i$i = 0;
         } else {
          $856 = ($qsize$0$i$i>>>0)>(16777215);
          if ($856) {
           $I7$0$i$i = 31;
           break;
          }
          $857 = (($854) + 1048320)|0;
          $858 = $857 >>> 16;
          $859 = $858 & 8;
          $860 = $854 << $859;
          $861 = (($860) + 520192)|0;
          $862 = $861 >>> 16;
          $863 = $862 & 4;
          $864 = $863 | $859;
          $865 = $860 << $863;
          $866 = (($865) + 245760)|0;
          $867 = $866 >>> 16;
          $868 = $867 & 2;
          $869 = $864 | $868;
          $870 = (14 - ($869))|0;
          $871 = $865 << $868;
          $872 = $871 >>> 15;
          $873 = (($870) + ($872))|0;
          $874 = $873 << 1;
          $875 = (($873) + 7)|0;
          $876 = $qsize$0$i$i >>> $875;
          $877 = $876 & 1;
          $878 = $877 | $874;
          $I7$0$i$i = $878;
         }
        } while(0);
        $879 = (32916 + ($I7$0$i$i<<2)|0);
        $$sum12$i$i = (($$sum$i19$i) + 28)|0;
        $880 = (($tbase$255$i) + ($$sum12$i$i)|0);
        HEAP32[$880>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i19$i) + 16)|0;
        $881 = (($tbase$255$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i19$i) + 20)|0;
        $882 = (($tbase$255$i) + ($$sum14$i$i)|0);
        HEAP32[$882>>2] = 0;
        HEAP32[$881>>2] = 0;
        $883 = HEAP32[(32616)>>2]|0;
        $884 = 1 << $I7$0$i$i;
        $885 = $883 & $884;
        $886 = ($885|0)==(0);
        if ($886) {
         $887 = $883 | $884;
         HEAP32[(32616)>>2] = $887;
         HEAP32[$879>>2] = $724;
         $$sum15$i$i = (($$sum$i19$i) + 24)|0;
         $888 = (($tbase$255$i) + ($$sum15$i$i)|0);
         HEAP32[$888>>2] = $879;
         $$sum16$i$i = (($$sum$i19$i) + 12)|0;
         $889 = (($tbase$255$i) + ($$sum16$i$i)|0);
         HEAP32[$889>>2] = $724;
         $$sum17$i$i = (($$sum$i19$i) + 8)|0;
         $890 = (($tbase$255$i) + ($$sum17$i$i)|0);
         HEAP32[$890>>2] = $724;
         break;
        }
        $891 = HEAP32[$879>>2]|0;
        $892 = ((($891)) + 4|0);
        $893 = HEAP32[$892>>2]|0;
        $894 = $893 & -8;
        $895 = ($894|0)==($qsize$0$i$i|0);
        L418: do {
         if ($895) {
          $T$0$lcssa$i25$i = $891;
         } else {
          $896 = ($I7$0$i$i|0)==(31);
          $897 = $I7$0$i$i >>> 1;
          $898 = (25 - ($897))|0;
          $899 = $896 ? 0 : $898;
          $900 = $qsize$0$i$i << $899;
          $K8$051$i$i = $900;$T$050$i$i = $891;
          while(1) {
           $907 = $K8$051$i$i >>> 31;
           $908 = (((($T$050$i$i)) + 16|0) + ($907<<2)|0);
           $903 = HEAP32[$908>>2]|0;
           $909 = ($903|0)==(0|0);
           if ($909) {
            $$lcssa = $908;$T$050$i$i$lcssa = $T$050$i$i;
            break;
           }
           $901 = $K8$051$i$i << 1;
           $902 = ((($903)) + 4|0);
           $904 = HEAP32[$902>>2]|0;
           $905 = $904 & -8;
           $906 = ($905|0)==($qsize$0$i$i|0);
           if ($906) {
            $T$0$lcssa$i25$i = $903;
            break L418;
           } else {
            $K8$051$i$i = $901;$T$050$i$i = $903;
           }
          }
          $910 = HEAP32[(32628)>>2]|0;
          $911 = ($$lcssa>>>0)<($910>>>0);
          if ($911) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$$lcssa>>2] = $724;
           $$sum23$i$i = (($$sum$i19$i) + 24)|0;
           $912 = (($tbase$255$i) + ($$sum23$i$i)|0);
           HEAP32[$912>>2] = $T$050$i$i$lcssa;
           $$sum24$i$i = (($$sum$i19$i) + 12)|0;
           $913 = (($tbase$255$i) + ($$sum24$i$i)|0);
           HEAP32[$913>>2] = $724;
           $$sum25$i$i = (($$sum$i19$i) + 8)|0;
           $914 = (($tbase$255$i) + ($$sum25$i$i)|0);
           HEAP32[$914>>2] = $724;
           break L324;
          }
         }
        } while(0);
        $915 = ((($T$0$lcssa$i25$i)) + 8|0);
        $916 = HEAP32[$915>>2]|0;
        $917 = HEAP32[(32628)>>2]|0;
        $918 = ($916>>>0)>=($917>>>0);
        $not$$i26$i = ($T$0$lcssa$i25$i>>>0)>=($917>>>0);
        $919 = $918 & $not$$i26$i;
        if ($919) {
         $920 = ((($916)) + 12|0);
         HEAP32[$920>>2] = $724;
         HEAP32[$915>>2] = $724;
         $$sum20$i$i = (($$sum$i19$i) + 8)|0;
         $921 = (($tbase$255$i) + ($$sum20$i$i)|0);
         HEAP32[$921>>2] = $916;
         $$sum21$i$i = (($$sum$i19$i) + 12)|0;
         $922 = (($tbase$255$i) + ($$sum21$i$i)|0);
         HEAP32[$922>>2] = $T$0$lcssa$i25$i;
         $$sum22$i$i = (($$sum$i19$i) + 24)|0;
         $923 = (($tbase$255$i) + ($$sum22$i$i)|0);
         HEAP32[$923>>2] = 0;
         break;
        } else {
         _abort();
         // unreachable;
        }
       }
      } while(0);
      $$sum1819$i$i = $711 | 8;
      $924 = (($tbase$255$i) + ($$sum1819$i$i)|0);
      $mem$0 = $924;
      return ($mem$0|0);
     } else {
      $sp$0$i$i$i = (33060);
     }
    }
    while(1) {
     $925 = HEAP32[$sp$0$i$i$i>>2]|0;
     $926 = ($925>>>0)>($635>>>0);
     if (!($926)) {
      $927 = ((($sp$0$i$i$i)) + 4|0);
      $928 = HEAP32[$927>>2]|0;
      $929 = (($925) + ($928)|0);
      $930 = ($929>>>0)>($635>>>0);
      if ($930) {
       $$lcssa215 = $925;$$lcssa216 = $928;$$lcssa217 = $929;
       break;
      }
     }
     $931 = ((($sp$0$i$i$i)) + 8|0);
     $932 = HEAP32[$931>>2]|0;
     $sp$0$i$i$i = $932;
    }
    $$sum$i14$i = (($$lcssa216) + -47)|0;
    $$sum1$i15$i = (($$lcssa216) + -39)|0;
    $933 = (($$lcssa215) + ($$sum1$i15$i)|0);
    $934 = $933;
    $935 = $934 & 7;
    $936 = ($935|0)==(0);
    $937 = (0 - ($934))|0;
    $938 = $937 & 7;
    $939 = $936 ? 0 : $938;
    $$sum2$i16$i = (($$sum$i14$i) + ($939))|0;
    $940 = (($$lcssa215) + ($$sum2$i16$i)|0);
    $941 = ((($635)) + 16|0);
    $942 = ($940>>>0)<($941>>>0);
    $943 = $942 ? $635 : $940;
    $944 = ((($943)) + 8|0);
    $945 = (($tsize$254$i) + -40)|0;
    $946 = ((($tbase$255$i)) + 8|0);
    $947 = $946;
    $948 = $947 & 7;
    $949 = ($948|0)==(0);
    $950 = (0 - ($947))|0;
    $951 = $950 & 7;
    $952 = $949 ? 0 : $951;
    $953 = (($tbase$255$i) + ($952)|0);
    $954 = (($945) - ($952))|0;
    HEAP32[(32636)>>2] = $953;
    HEAP32[(32624)>>2] = $954;
    $955 = $954 | 1;
    $$sum$i$i$i = (($952) + 4)|0;
    $956 = (($tbase$255$i) + ($$sum$i$i$i)|0);
    HEAP32[$956>>2] = $955;
    $$sum2$i$i$i = (($tsize$254$i) + -36)|0;
    $957 = (($tbase$255$i) + ($$sum2$i$i$i)|0);
    HEAP32[$957>>2] = 40;
    $958 = HEAP32[(33100)>>2]|0;
    HEAP32[(32640)>>2] = $958;
    $959 = ((($943)) + 4|0);
    HEAP32[$959>>2] = 27;
    ;HEAP32[$944>>2]=HEAP32[(33060)>>2]|0;HEAP32[$944+4>>2]=HEAP32[(33060)+4>>2]|0;HEAP32[$944+8>>2]=HEAP32[(33060)+8>>2]|0;HEAP32[$944+12>>2]=HEAP32[(33060)+12>>2]|0;
    HEAP32[(33060)>>2] = $tbase$255$i;
    HEAP32[(33064)>>2] = $tsize$254$i;
    HEAP32[(33072)>>2] = 0;
    HEAP32[(33068)>>2] = $944;
    $960 = ((($943)) + 28|0);
    HEAP32[$960>>2] = 7;
    $961 = ((($943)) + 32|0);
    $962 = ($961>>>0)<($$lcssa217>>>0);
    if ($962) {
     $964 = $960;
     while(1) {
      $963 = ((($964)) + 4|0);
      HEAP32[$963>>2] = 7;
      $965 = ((($964)) + 8|0);
      $966 = ($965>>>0)<($$lcssa217>>>0);
      if ($966) {
       $964 = $963;
      } else {
       break;
      }
     }
    }
    $967 = ($943|0)==($635|0);
    if (!($967)) {
     $968 = $943;
     $969 = $635;
     $970 = (($968) - ($969))|0;
     $971 = HEAP32[$959>>2]|0;
     $972 = $971 & -2;
     HEAP32[$959>>2] = $972;
     $973 = $970 | 1;
     $974 = ((($635)) + 4|0);
     HEAP32[$974>>2] = $973;
     HEAP32[$943>>2] = $970;
     $975 = $970 >>> 3;
     $976 = ($970>>>0)<(256);
     if ($976) {
      $977 = $975 << 1;
      $978 = (32652 + ($977<<2)|0);
      $979 = HEAP32[32612>>2]|0;
      $980 = 1 << $975;
      $981 = $979 & $980;
      $982 = ($981|0)==(0);
      if ($982) {
       $983 = $979 | $980;
       HEAP32[32612>>2] = $983;
       $$pre$i$i = (($977) + 2)|0;
       $$pre14$i$i = (32652 + ($$pre$i$i<<2)|0);
       $$pre$phi$i$iZ2D = $$pre14$i$i;$F$0$i$i = $978;
      } else {
       $$sum4$i$i = (($977) + 2)|0;
       $984 = (32652 + ($$sum4$i$i<<2)|0);
       $985 = HEAP32[$984>>2]|0;
       $986 = HEAP32[(32628)>>2]|0;
       $987 = ($985>>>0)<($986>>>0);
       if ($987) {
        _abort();
        // unreachable;
       } else {
        $$pre$phi$i$iZ2D = $984;$F$0$i$i = $985;
       }
      }
      HEAP32[$$pre$phi$i$iZ2D>>2] = $635;
      $988 = ((($F$0$i$i)) + 12|0);
      HEAP32[$988>>2] = $635;
      $989 = ((($635)) + 8|0);
      HEAP32[$989>>2] = $F$0$i$i;
      $990 = ((($635)) + 12|0);
      HEAP32[$990>>2] = $978;
      break;
     }
     $991 = $970 >>> 8;
     $992 = ($991|0)==(0);
     if ($992) {
      $I1$0$i$i = 0;
     } else {
      $993 = ($970>>>0)>(16777215);
      if ($993) {
       $I1$0$i$i = 31;
      } else {
       $994 = (($991) + 1048320)|0;
       $995 = $994 >>> 16;
       $996 = $995 & 8;
       $997 = $991 << $996;
       $998 = (($997) + 520192)|0;
       $999 = $998 >>> 16;
       $1000 = $999 & 4;
       $1001 = $1000 | $996;
       $1002 = $997 << $1000;
       $1003 = (($1002) + 245760)|0;
       $1004 = $1003 >>> 16;
       $1005 = $1004 & 2;
       $1006 = $1001 | $1005;
       $1007 = (14 - ($1006))|0;
       $1008 = $1002 << $1005;
       $1009 = $1008 >>> 15;
       $1010 = (($1007) + ($1009))|0;
       $1011 = $1010 << 1;
       $1012 = (($1010) + 7)|0;
       $1013 = $970 >>> $1012;
       $1014 = $1013 & 1;
       $1015 = $1014 | $1011;
       $I1$0$i$i = $1015;
      }
     }
     $1016 = (32916 + ($I1$0$i$i<<2)|0);
     $1017 = ((($635)) + 28|0);
     HEAP32[$1017>>2] = $I1$0$i$i;
     $1018 = ((($635)) + 20|0);
     HEAP32[$1018>>2] = 0;
     HEAP32[$941>>2] = 0;
     $1019 = HEAP32[(32616)>>2]|0;
     $1020 = 1 << $I1$0$i$i;
     $1021 = $1019 & $1020;
     $1022 = ($1021|0)==(0);
     if ($1022) {
      $1023 = $1019 | $1020;
      HEAP32[(32616)>>2] = $1023;
      HEAP32[$1016>>2] = $635;
      $1024 = ((($635)) + 24|0);
      HEAP32[$1024>>2] = $1016;
      $1025 = ((($635)) + 12|0);
      HEAP32[$1025>>2] = $635;
      $1026 = ((($635)) + 8|0);
      HEAP32[$1026>>2] = $635;
      break;
     }
     $1027 = HEAP32[$1016>>2]|0;
     $1028 = ((($1027)) + 4|0);
     $1029 = HEAP32[$1028>>2]|0;
     $1030 = $1029 & -8;
     $1031 = ($1030|0)==($970|0);
     L459: do {
      if ($1031) {
       $T$0$lcssa$i$i = $1027;
      } else {
       $1032 = ($I1$0$i$i|0)==(31);
       $1033 = $I1$0$i$i >>> 1;
       $1034 = (25 - ($1033))|0;
       $1035 = $1032 ? 0 : $1034;
       $1036 = $970 << $1035;
       $K2$07$i$i = $1036;$T$06$i$i = $1027;
       while(1) {
        $1043 = $K2$07$i$i >>> 31;
        $1044 = (((($T$06$i$i)) + 16|0) + ($1043<<2)|0);
        $1039 = HEAP32[$1044>>2]|0;
        $1045 = ($1039|0)==(0|0);
        if ($1045) {
         $$lcssa211 = $1044;$T$06$i$i$lcssa = $T$06$i$i;
         break;
        }
        $1037 = $K2$07$i$i << 1;
        $1038 = ((($1039)) + 4|0);
        $1040 = HEAP32[$1038>>2]|0;
        $1041 = $1040 & -8;
        $1042 = ($1041|0)==($970|0);
        if ($1042) {
         $T$0$lcssa$i$i = $1039;
         break L459;
        } else {
         $K2$07$i$i = $1037;$T$06$i$i = $1039;
        }
       }
       $1046 = HEAP32[(32628)>>2]|0;
       $1047 = ($$lcssa211>>>0)<($1046>>>0);
       if ($1047) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$$lcssa211>>2] = $635;
        $1048 = ((($635)) + 24|0);
        HEAP32[$1048>>2] = $T$06$i$i$lcssa;
        $1049 = ((($635)) + 12|0);
        HEAP32[$1049>>2] = $635;
        $1050 = ((($635)) + 8|0);
        HEAP32[$1050>>2] = $635;
        break L299;
       }
      }
     } while(0);
     $1051 = ((($T$0$lcssa$i$i)) + 8|0);
     $1052 = HEAP32[$1051>>2]|0;
     $1053 = HEAP32[(32628)>>2]|0;
     $1054 = ($1052>>>0)>=($1053>>>0);
     $not$$i$i = ($T$0$lcssa$i$i>>>0)>=($1053>>>0);
     $1055 = $1054 & $not$$i$i;
     if ($1055) {
      $1056 = ((($1052)) + 12|0);
      HEAP32[$1056>>2] = $635;
      HEAP32[$1051>>2] = $635;
      $1057 = ((($635)) + 8|0);
      HEAP32[$1057>>2] = $1052;
      $1058 = ((($635)) + 12|0);
      HEAP32[$1058>>2] = $T$0$lcssa$i$i;
      $1059 = ((($635)) + 24|0);
      HEAP32[$1059>>2] = 0;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   }
  } while(0);
  $1060 = HEAP32[(32624)>>2]|0;
  $1061 = ($1060>>>0)>($nb$0>>>0);
  if ($1061) {
   $1062 = (($1060) - ($nb$0))|0;
   HEAP32[(32624)>>2] = $1062;
   $1063 = HEAP32[(32636)>>2]|0;
   $1064 = (($1063) + ($nb$0)|0);
   HEAP32[(32636)>>2] = $1064;
   $1065 = $1062 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1066 = (($1063) + ($$sum$i32)|0);
   HEAP32[$1066>>2] = $1065;
   $1067 = $nb$0 | 3;
   $1068 = ((($1063)) + 4|0);
   HEAP32[$1068>>2] = $1067;
   $1069 = ((($1063)) + 8|0);
   $mem$0 = $1069;
   return ($mem$0|0);
  }
 }
 $1070 = (___errno_location()|0);
 HEAP32[$1070>>2] = 12;
 $mem$0 = 0;
 return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$lcssa = 0, $$pre = 0, $$pre$phi59Z2D = 0, $$pre$phi61Z2D = 0, $$pre$phiZ2D = 0, $$pre57 = 0, $$pre58 = 0, $$pre60 = 0, $$sum = 0, $$sum11 = 0, $$sum12 = 0, $$sum13 = 0, $$sum14 = 0, $$sum1718 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum22 = 0, $$sum23 = 0, $$sum24 = 0;
 var $$sum25 = 0, $$sum26 = 0, $$sum27 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0, $$sum31 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0;
 var $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0;
 var $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0;
 var $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0;
 var $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0;
 var $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0;
 var $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0;
 var $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0;
 var $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0;
 var $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0;
 var $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0;
 var $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0;
 var $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0;
 var $321 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0;
 var $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0;
 var $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $K19$052 = 0, $R$0 = 0, $R$0$lcssa = 0, $R$1 = 0;
 var $R7$0 = 0, $R7$0$lcssa = 0, $R7$1 = 0, $RP$0 = 0, $RP$0$lcssa = 0, $RP9$0 = 0, $RP9$0$lcssa = 0, $T$0$lcssa = 0, $T$051 = 0, $T$051$lcssa = 0, $cond = 0, $cond47 = 0, $not$ = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = ((($mem)) + -8|0);
 $2 = HEAP32[(32628)>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = ((($mem)) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $$sum = (($8) + -8)|0;
 $9 = (($mem) + ($$sum)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[(32632)>>2]|0;
   $18 = ($14|0)==($17|0);
   if ($18) {
    $$sum3 = (($8) + -4)|0;
    $103 = (($mem) + ($$sum3)|0);
    $104 = HEAP32[$103>>2]|0;
    $105 = $104 & 3;
    $106 = ($105|0)==(3);
    if (!($106)) {
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    HEAP32[(32620)>>2] = $15;
    $107 = $104 & -2;
    HEAP32[$103>>2] = $107;
    $108 = $15 | 1;
    $$sum20 = (($$sum2) + 4)|0;
    $109 = (($mem) + ($$sum20)|0);
    HEAP32[$109>>2] = $108;
    HEAP32[$9>>2] = $15;
    return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum30 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum30)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum31 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum31)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = (32652 + ($25<<2)|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = ((($22)) + 12|0);
     $30 = HEAP32[$29>>2]|0;
     $31 = ($30|0)==($14|0);
     if (!($31)) {
      _abort();
      // unreachable;
     }
    }
    $32 = ($24|0)==($22|0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[32612>>2]|0;
     $36 = $35 & $34;
     HEAP32[32612>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre60 = ((($24)) + 8|0);
     $$pre$phi61Z2D = $$pre60;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = ((($24)) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi61Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = ((($22)) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi61Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum22 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum22)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum23 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum23)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum25 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum25)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum24 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum24)|0);
      $61 = HEAP32[$60>>2]|0;
      $62 = ($61|0)==(0|0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $61;$RP$0 = $60;
      }
     } else {
      $R$0 = $58;$RP$0 = $57;
     }
     while(1) {
      $63 = ((($R$0)) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if (!($65)) {
       $R$0 = $64;$RP$0 = $63;
       continue;
      }
      $66 = ((($R$0)) + 16|0);
      $67 = HEAP32[$66>>2]|0;
      $68 = ($67|0)==(0|0);
      if ($68) {
       $R$0$lcssa = $R$0;$RP$0$lcssa = $RP$0;
       break;
      } else {
       $R$0 = $67;$RP$0 = $66;
      }
     }
     $69 = ($RP$0$lcssa>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0$lcssa>>2] = 0;
      $R$1 = $R$0$lcssa;
      break;
     }
    } else {
     $$sum29 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum29)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = ((($49)) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = ((($46)) + 8|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==($14|0);
     if ($56) {
      HEAP32[$51>>2] = $46;
      HEAP32[$54>>2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $70 = ($44|0)==(0|0);
   if ($70) {
    $p$0 = $14;$psize$0 = $15;
   } else {
    $$sum26 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum26)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = (32916 + ($72<<2)|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[(32616)>>2]|0;
      $79 = $78 & $77;
      HEAP32[(32616)>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[(32628)>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = ((($44)) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = ((($44)) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[(32628)>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = ((($R$1)) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum27 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum27)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = ($91>>>0)<($87>>>0);
      if ($93) {
       _abort();
       // unreachable;
      } else {
       $94 = ((($R$1)) + 16|0);
       HEAP32[$94>>2] = $91;
       $95 = ((($91)) + 24|0);
       HEAP32[$95>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum28 = (($$sum2) + 20)|0;
    $96 = (($mem) + ($$sum28)|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = ($97|0)==(0|0);
    if ($98) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $99 = HEAP32[(32628)>>2]|0;
     $100 = ($97>>>0)<($99>>>0);
     if ($100) {
      _abort();
      // unreachable;
     } else {
      $101 = ((($R$1)) + 20|0);
      HEAP32[$101>>2] = $97;
      $102 = ((($97)) + 24|0);
      HEAP32[$102>>2] = $R$1;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;$psize$0 = $8;
  }
 } while(0);
 $110 = ($p$0>>>0)<($9>>>0);
 if (!($110)) {
  _abort();
  // unreachable;
 }
 $$sum19 = (($8) + -4)|0;
 $111 = (($mem) + ($$sum19)|0);
 $112 = HEAP32[$111>>2]|0;
 $113 = $112 & 1;
 $114 = ($113|0)==(0);
 if ($114) {
  _abort();
  // unreachable;
 }
 $115 = $112 & 2;
 $116 = ($115|0)==(0);
 if ($116) {
  $117 = HEAP32[(32636)>>2]|0;
  $118 = ($9|0)==($117|0);
  if ($118) {
   $119 = HEAP32[(32624)>>2]|0;
   $120 = (($119) + ($psize$0))|0;
   HEAP32[(32624)>>2] = $120;
   HEAP32[(32636)>>2] = $p$0;
   $121 = $120 | 1;
   $122 = ((($p$0)) + 4|0);
   HEAP32[$122>>2] = $121;
   $123 = HEAP32[(32632)>>2]|0;
   $124 = ($p$0|0)==($123|0);
   if (!($124)) {
    return;
   }
   HEAP32[(32632)>>2] = 0;
   HEAP32[(32620)>>2] = 0;
   return;
  }
  $125 = HEAP32[(32632)>>2]|0;
  $126 = ($9|0)==($125|0);
  if ($126) {
   $127 = HEAP32[(32620)>>2]|0;
   $128 = (($127) + ($psize$0))|0;
   HEAP32[(32620)>>2] = $128;
   HEAP32[(32632)>>2] = $p$0;
   $129 = $128 | 1;
   $130 = ((($p$0)) + 4|0);
   HEAP32[$130>>2] = $129;
   $131 = (($p$0) + ($128)|0);
   HEAP32[$131>>2] = $128;
   return;
  }
  $132 = $112 & -8;
  $133 = (($132) + ($psize$0))|0;
  $134 = $112 >>> 3;
  $135 = ($112>>>0)<(256);
  do {
   if ($135) {
    $136 = (($mem) + ($8)|0);
    $137 = HEAP32[$136>>2]|0;
    $$sum1718 = $8 | 4;
    $138 = (($mem) + ($$sum1718)|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = $134 << 1;
    $141 = (32652 + ($140<<2)|0);
    $142 = ($137|0)==($141|0);
    if (!($142)) {
     $143 = HEAP32[(32628)>>2]|0;
     $144 = ($137>>>0)<($143>>>0);
     if ($144) {
      _abort();
      // unreachable;
     }
     $145 = ((($137)) + 12|0);
     $146 = HEAP32[$145>>2]|0;
     $147 = ($146|0)==($9|0);
     if (!($147)) {
      _abort();
      // unreachable;
     }
    }
    $148 = ($139|0)==($137|0);
    if ($148) {
     $149 = 1 << $134;
     $150 = $149 ^ -1;
     $151 = HEAP32[32612>>2]|0;
     $152 = $151 & $150;
     HEAP32[32612>>2] = $152;
     break;
    }
    $153 = ($139|0)==($141|0);
    if ($153) {
     $$pre58 = ((($139)) + 8|0);
     $$pre$phi59Z2D = $$pre58;
    } else {
     $154 = HEAP32[(32628)>>2]|0;
     $155 = ($139>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     }
     $156 = ((($139)) + 8|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($9|0);
     if ($158) {
      $$pre$phi59Z2D = $156;
     } else {
      _abort();
      // unreachable;
     }
    }
    $159 = ((($137)) + 12|0);
    HEAP32[$159>>2] = $139;
    HEAP32[$$pre$phi59Z2D>>2] = $137;
   } else {
    $$sum5 = (($8) + 16)|0;
    $160 = (($mem) + ($$sum5)|0);
    $161 = HEAP32[$160>>2]|0;
    $$sum67 = $8 | 4;
    $162 = (($mem) + ($$sum67)|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ($163|0)==($9|0);
    do {
     if ($164) {
      $$sum9 = (($8) + 12)|0;
      $175 = (($mem) + ($$sum9)|0);
      $176 = HEAP32[$175>>2]|0;
      $177 = ($176|0)==(0|0);
      if ($177) {
       $$sum8 = (($8) + 8)|0;
       $178 = (($mem) + ($$sum8)|0);
       $179 = HEAP32[$178>>2]|0;
       $180 = ($179|0)==(0|0);
       if ($180) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $179;$RP9$0 = $178;
       }
      } else {
       $R7$0 = $176;$RP9$0 = $175;
      }
      while(1) {
       $181 = ((($R7$0)) + 20|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ($182|0)==(0|0);
       if (!($183)) {
        $R7$0 = $182;$RP9$0 = $181;
        continue;
       }
       $184 = ((($R7$0)) + 16|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($185|0)==(0|0);
       if ($186) {
        $R7$0$lcssa = $R7$0;$RP9$0$lcssa = $RP9$0;
        break;
       } else {
        $R7$0 = $185;$RP9$0 = $184;
       }
      }
      $187 = HEAP32[(32628)>>2]|0;
      $188 = ($RP9$0$lcssa>>>0)<($187>>>0);
      if ($188) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0$lcssa>>2] = 0;
       $R7$1 = $R7$0$lcssa;
       break;
      }
     } else {
      $165 = (($mem) + ($8)|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = HEAP32[(32628)>>2]|0;
      $168 = ($166>>>0)<($167>>>0);
      if ($168) {
       _abort();
       // unreachable;
      }
      $169 = ((($166)) + 12|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==($9|0);
      if (!($171)) {
       _abort();
       // unreachable;
      }
      $172 = ((($163)) + 8|0);
      $173 = HEAP32[$172>>2]|0;
      $174 = ($173|0)==($9|0);
      if ($174) {
       HEAP32[$169>>2] = $163;
       HEAP32[$172>>2] = $166;
       $R7$1 = $163;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $189 = ($161|0)==(0|0);
    if (!($189)) {
     $$sum12 = (($8) + 20)|0;
     $190 = (($mem) + ($$sum12)|0);
     $191 = HEAP32[$190>>2]|0;
     $192 = (32916 + ($191<<2)|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ($9|0)==($193|0);
     if ($194) {
      HEAP32[$192>>2] = $R7$1;
      $cond47 = ($R7$1|0)==(0|0);
      if ($cond47) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[(32616)>>2]|0;
       $198 = $197 & $196;
       HEAP32[(32616)>>2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[(32628)>>2]|0;
      $200 = ($161>>>0)<($199>>>0);
      if ($200) {
       _abort();
       // unreachable;
      }
      $201 = ((($161)) + 16|0);
      $202 = HEAP32[$201>>2]|0;
      $203 = ($202|0)==($9|0);
      if ($203) {
       HEAP32[$201>>2] = $R7$1;
      } else {
       $204 = ((($161)) + 20|0);
       HEAP32[$204>>2] = $R7$1;
      }
      $205 = ($R7$1|0)==(0|0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[(32628)>>2]|0;
     $207 = ($R7$1>>>0)<($206>>>0);
     if ($207) {
      _abort();
      // unreachable;
     }
     $208 = ((($R7$1)) + 24|0);
     HEAP32[$208>>2] = $161;
     $$sum13 = (($8) + 8)|0;
     $209 = (($mem) + ($$sum13)|0);
     $210 = HEAP32[$209>>2]|0;
     $211 = ($210|0)==(0|0);
     do {
      if (!($211)) {
       $212 = ($210>>>0)<($206>>>0);
       if ($212) {
        _abort();
        // unreachable;
       } else {
        $213 = ((($R7$1)) + 16|0);
        HEAP32[$213>>2] = $210;
        $214 = ((($210)) + 24|0);
        HEAP32[$214>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum14 = (($8) + 12)|0;
     $215 = (($mem) + ($$sum14)|0);
     $216 = HEAP32[$215>>2]|0;
     $217 = ($216|0)==(0|0);
     if (!($217)) {
      $218 = HEAP32[(32628)>>2]|0;
      $219 = ($216>>>0)<($218>>>0);
      if ($219) {
       _abort();
       // unreachable;
      } else {
       $220 = ((($R7$1)) + 20|0);
       HEAP32[$220>>2] = $216;
       $221 = ((($216)) + 24|0);
       HEAP32[$221>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $222 = $133 | 1;
  $223 = ((($p$0)) + 4|0);
  HEAP32[$223>>2] = $222;
  $224 = (($p$0) + ($133)|0);
  HEAP32[$224>>2] = $133;
  $225 = HEAP32[(32632)>>2]|0;
  $226 = ($p$0|0)==($225|0);
  if ($226) {
   HEAP32[(32620)>>2] = $133;
   return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111>>2] = $227;
  $228 = $psize$0 | 1;
  $229 = ((($p$0)) + 4|0);
  HEAP32[$229>>2] = $228;
  $230 = (($p$0) + ($psize$0)|0);
  HEAP32[$230>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = ($psize$1>>>0)<(256);
 if ($232) {
  $233 = $231 << 1;
  $234 = (32652 + ($233<<2)|0);
  $235 = HEAP32[32612>>2]|0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237|0)==(0);
  if ($238) {
   $239 = $235 | $236;
   HEAP32[32612>>2] = $239;
   $$pre = (($233) + 2)|0;
   $$pre57 = (32652 + ($$pre<<2)|0);
   $$pre$phiZ2D = $$pre57;$F16$0 = $234;
  } else {
   $$sum11 = (($233) + 2)|0;
   $240 = (32652 + ($$sum11<<2)|0);
   $241 = HEAP32[$240>>2]|0;
   $242 = HEAP32[(32628)>>2]|0;
   $243 = ($241>>>0)<($242>>>0);
   if ($243) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $240;$F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $244 = ((($F16$0)) + 12|0);
  HEAP32[$244>>2] = $p$0;
  $245 = ((($p$0)) + 8|0);
  HEAP32[$245>>2] = $F16$0;
  $246 = ((($p$0)) + 12|0);
  HEAP32[$246>>2] = $234;
  return;
 }
 $247 = $psize$1 >>> 8;
 $248 = ($247|0)==(0);
 if ($248) {
  $I18$0 = 0;
 } else {
  $249 = ($psize$1>>>0)>(16777215);
  if ($249) {
   $I18$0 = 31;
  } else {
   $250 = (($247) + 1048320)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 8;
   $253 = $247 << $252;
   $254 = (($253) + 520192)|0;
   $255 = $254 >>> 16;
   $256 = $255 & 4;
   $257 = $256 | $252;
   $258 = $253 << $256;
   $259 = (($258) + 245760)|0;
   $260 = $259 >>> 16;
   $261 = $260 & 2;
   $262 = $257 | $261;
   $263 = (14 - ($262))|0;
   $264 = $258 << $261;
   $265 = $264 >>> 15;
   $266 = (($263) + ($265))|0;
   $267 = $266 << 1;
   $268 = (($266) + 7)|0;
   $269 = $psize$1 >>> $268;
   $270 = $269 & 1;
   $271 = $270 | $267;
   $I18$0 = $271;
  }
 }
 $272 = (32916 + ($I18$0<<2)|0);
 $273 = ((($p$0)) + 28|0);
 HEAP32[$273>>2] = $I18$0;
 $274 = ((($p$0)) + 16|0);
 $275 = ((($p$0)) + 20|0);
 HEAP32[$275>>2] = 0;
 HEAP32[$274>>2] = 0;
 $276 = HEAP32[(32616)>>2]|0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278|0)==(0);
 L199: do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[(32616)>>2] = $280;
   HEAP32[$272>>2] = $p$0;
   $281 = ((($p$0)) + 24|0);
   HEAP32[$281>>2] = $272;
   $282 = ((($p$0)) + 12|0);
   HEAP32[$282>>2] = $p$0;
   $283 = ((($p$0)) + 8|0);
   HEAP32[$283>>2] = $p$0;
  } else {
   $284 = HEAP32[$272>>2]|0;
   $285 = ((($284)) + 4|0);
   $286 = HEAP32[$285>>2]|0;
   $287 = $286 & -8;
   $288 = ($287|0)==($psize$1|0);
   L202: do {
    if ($288) {
     $T$0$lcssa = $284;
    } else {
     $289 = ($I18$0|0)==(31);
     $290 = $I18$0 >>> 1;
     $291 = (25 - ($290))|0;
     $292 = $289 ? 0 : $291;
     $293 = $psize$1 << $292;
     $K19$052 = $293;$T$051 = $284;
     while(1) {
      $300 = $K19$052 >>> 31;
      $301 = (((($T$051)) + 16|0) + ($300<<2)|0);
      $296 = HEAP32[$301>>2]|0;
      $302 = ($296|0)==(0|0);
      if ($302) {
       $$lcssa = $301;$T$051$lcssa = $T$051;
       break;
      }
      $294 = $K19$052 << 1;
      $295 = ((($296)) + 4|0);
      $297 = HEAP32[$295>>2]|0;
      $298 = $297 & -8;
      $299 = ($298|0)==($psize$1|0);
      if ($299) {
       $T$0$lcssa = $296;
       break L202;
      } else {
       $K19$052 = $294;$T$051 = $296;
      }
     }
     $303 = HEAP32[(32628)>>2]|0;
     $304 = ($$lcssa>>>0)<($303>>>0);
     if ($304) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$$lcssa>>2] = $p$0;
      $305 = ((($p$0)) + 24|0);
      HEAP32[$305>>2] = $T$051$lcssa;
      $306 = ((($p$0)) + 12|0);
      HEAP32[$306>>2] = $p$0;
      $307 = ((($p$0)) + 8|0);
      HEAP32[$307>>2] = $p$0;
      break L199;
     }
    }
   } while(0);
   $308 = ((($T$0$lcssa)) + 8|0);
   $309 = HEAP32[$308>>2]|0;
   $310 = HEAP32[(32628)>>2]|0;
   $311 = ($309>>>0)>=($310>>>0);
   $not$ = ($T$0$lcssa>>>0)>=($310>>>0);
   $312 = $311 & $not$;
   if ($312) {
    $313 = ((($309)) + 12|0);
    HEAP32[$313>>2] = $p$0;
    HEAP32[$308>>2] = $p$0;
    $314 = ((($p$0)) + 8|0);
    HEAP32[$314>>2] = $309;
    $315 = ((($p$0)) + 12|0);
    HEAP32[$315>>2] = $T$0$lcssa;
    $316 = ((($p$0)) + 24|0);
    HEAP32[$316>>2] = 0;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $317 = HEAP32[(32644)>>2]|0;
 $318 = (($317) + -1)|0;
 HEAP32[(32644)>>2] = $318;
 $319 = ($318|0)==(0);
 if ($319) {
  $sp$0$in$i = (33068);
 } else {
  return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $320 = ($sp$0$i|0)==(0|0);
  $321 = ((($sp$0$i)) + 8|0);
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[(32644)>>2] = -1;
 return;
}
function runPostSets() {
}
function _bitshift64Ashr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = (high|0) < 0 ? -1 : 0;
    return (high >> (bits - 32))|0;
}
function _i64Subtract(a, b, c, d) {
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a - c)>>>0;
    h = (b - d)>>>0;
    h = (b - d - (((c>>>0) > (a>>>0))|0))>>>0; // Borrow one from high word to low word on underflow.
    return ((tempRet0 = h,l|0)|0);
}
function _i64Add(a, b, c, d) {
    /*
      x = a + b*2^32
      y = c + d*2^32
      result = l + h*2^32
    */
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a + c)>>>0;
    h = (b + d + (((l>>>0) < (a>>>0))|0))>>>0; // Add carry from low word to high word on overflow.
    return ((tempRet0 = h,l|0)|0);
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
}
function _bitshift64Shl(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits));
      return low << bits;
    }
    tempRet0 = low << (bits - 32);
    return 0;
}
function _memcpy(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}
function _llvm_cttz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((cttz_i8)+(x & 0xff))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((cttz_i8)+(x >>> 24))>>0)])|0) + 24)|0;
  }

// ======== compiled code from system/lib/compiler-rt , see readme therein
function ___muldsi3($a, $b) {
  $a = $a | 0;
  $b = $b | 0;
  var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
  $1 = $a & 65535;
  $2 = $b & 65535;
  $3 = Math_imul($2, $1) | 0;
  $6 = $a >>> 16;
  $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
  $11 = $b >>> 16;
  $12 = Math_imul($11, $1) | 0;
  return (tempRet0 = (($8 >>> 16) + (Math_imul($11, $6) | 0) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, 0 | ($8 + $12 << 16 | $3 & 65535)) | 0;
}
function ___divdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $7$0 = 0, $7$1 = 0, $8$0 = 0, $10$0 = 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  $7$0 = $2$0 ^ $1$0;
  $7$1 = $2$1 ^ $1$1;
  $8$0 = ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, 0) | 0;
  $10$0 = _i64Subtract($8$0 ^ $7$0, tempRet0 ^ $7$1, $7$0, $7$1) | 0;
  return $10$0 | 0;
}
function ___remdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $10$0 = 0, $10$1 = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  $rem = __stackBase__ | 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, $rem) | 0;
  $10$0 = _i64Subtract(HEAP32[$rem >> 2] ^ $1$0, HEAP32[$rem + 4 >> 2] ^ $1$1, $1$0, $1$1) | 0;
  $10$1 = tempRet0;
  STACKTOP = __stackBase__;
  return (tempRet0 = $10$1, $10$0) | 0;
}
function ___muldi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0, $2 = 0;
  $x_sroa_0_0_extract_trunc = $a$0;
  $y_sroa_0_0_extract_trunc = $b$0;
  $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
  $1$1 = tempRet0;
  $2 = Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0;
  return (tempRet0 = ((Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $2 | 0) + $1$1 | $1$1 & 0, 0 | $1$0 & -1) | 0;
}
function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0;
  $1$0 = ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
  return $1$0 | 0;
}
function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  $rem = __stackBase__ | 0;
  ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
  STACKTOP = __stackBase__;
  return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}
function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  $rem = $rem | 0;
  var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $49 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $86 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $117 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $147 = 0, $149 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $152 = 0, $154$0 = 0, $r_sroa_0_0_extract_trunc = 0, $r_sroa_1_4_extract_trunc = 0, $155 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $q_sroa_0_0_insert_insert77$1 = 0, $_0$0 = 0, $_0$1 = 0;
  $n_sroa_0_0_extract_trunc = $a$0;
  $n_sroa_1_4_extract_shift$0 = $a$1;
  $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
  $d_sroa_0_0_extract_trunc = $b$0;
  $d_sroa_1_4_extract_shift$0 = $b$1;
  $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
  if (($n_sroa_1_4_extract_trunc | 0) == 0) {
    $4 = ($rem | 0) != 0;
    if (($d_sroa_1_4_extract_trunc | 0) == 0) {
      if ($4) {
        HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
        HEAP32[$rem + 4 >> 2] = 0;
      }
      $_0$1 = 0;
      $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$4) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    }
  }
  $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
  do {
    if (($d_sroa_0_0_extract_trunc | 0) == 0) {
      if ($17) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
          HEAP32[$rem + 4 >> 2] = 0;
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      if (($n_sroa_0_0_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0;
          HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
      if (($37 & $d_sroa_1_4_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0 | $a$0 & -1;
          HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
        }
        $_0$1 = 0;
        $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $49 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
      $51 = $49 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
      if ($51 >>> 0 <= 30) {
        $57 = $51 + 1 | 0;
        $58 = 31 - $51 | 0;
        $sr_1_ph = $57;
        $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
        $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
        $q_sroa_0_1_ph = 0;
        $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
        break;
      }
      if (($rem | 0) == 0) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = 0 | $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$17) {
        $117 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
        $119 = $117 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        if ($119 >>> 0 <= 31) {
          $125 = $119 + 1 | 0;
          $126 = 31 - $119 | 0;
          $130 = $119 - 31 >> 31;
          $sr_1_ph = $125;
          $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
          $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
          $q_sroa_0_1_ph = 0;
          $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
          break;
        }
        if (($rem | 0) == 0) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = 0 | $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
      if (($66 & $d_sroa_0_0_extract_trunc | 0) != 0) {
        $86 = (Math_clz32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 | 0;
        $88 = $86 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        $89 = 64 - $88 | 0;
        $91 = 32 - $88 | 0;
        $92 = $91 >> 31;
        $95 = $88 - 32 | 0;
        $105 = $95 >> 31;
        $sr_1_ph = $88;
        $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
        $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
        $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
        $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
        break;
      }
      if (($rem | 0) != 0) {
        HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
        HEAP32[$rem + 4 >> 2] = 0;
      }
      if (($d_sroa_0_0_extract_trunc | 0) == 1) {
        $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$0 = 0 | $a$0 & -1;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
        $_0$1 = 0 | $n_sroa_1_4_extract_trunc >>> ($78 >>> 0);
        $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
    }
  } while (0);
  if (($sr_1_ph | 0) == 0) {
    $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
    $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
    $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
    $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = 0;
  } else {
    $d_sroa_0_0_insert_insert99$0 = 0 | $b$0 & -1;
    $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
    $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0 | 0, $d_sroa_0_0_insert_insert99$1 | 0, -1, -1) | 0;
    $137$1 = tempRet0;
    $q_sroa_1_1198 = $q_sroa_1_1_ph;
    $q_sroa_0_1199 = $q_sroa_0_1_ph;
    $r_sroa_1_1200 = $r_sroa_1_1_ph;
    $r_sroa_0_1201 = $r_sroa_0_1_ph;
    $sr_1202 = $sr_1_ph;
    $carry_0203 = 0;
    while (1) {
      $147 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
      $149 = $carry_0203 | $q_sroa_0_1199 << 1;
      $r_sroa_0_0_insert_insert42$0 = 0 | ($r_sroa_0_1201 << 1 | $q_sroa_1_1198 >>> 31);
      $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
      _i64Subtract($137$0, $137$1, $r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1) | 0;
      $150$1 = tempRet0;
      $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
      $152 = $151$0 & 1;
      $154$0 = _i64Subtract($r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1, $151$0 & $d_sroa_0_0_insert_insert99$0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1) | 0;
      $r_sroa_0_0_extract_trunc = $154$0;
      $r_sroa_1_4_extract_trunc = tempRet0;
      $155 = $sr_1202 - 1 | 0;
      if (($155 | 0) == 0) {
        break;
      } else {
        $q_sroa_1_1198 = $147;
        $q_sroa_0_1199 = $149;
        $r_sroa_1_1200 = $r_sroa_1_4_extract_trunc;
        $r_sroa_0_1201 = $r_sroa_0_0_extract_trunc;
        $sr_1202 = $155;
        $carry_0203 = $152;
      }
    }
    $q_sroa_1_1_lcssa = $147;
    $q_sroa_0_1_lcssa = $149;
    $r_sroa_1_1_lcssa = $r_sroa_1_4_extract_trunc;
    $r_sroa_0_1_lcssa = $r_sroa_0_0_extract_trunc;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = $152;
  }
  $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
  $q_sroa_0_0_insert_ext75$1 = 0;
  $q_sroa_0_0_insert_insert77$1 = $q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1;
  if (($rem | 0) != 0) {
    HEAP32[$rem >> 2] = 0 | $r_sroa_0_1_lcssa;
    HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa | 0;
  }
  $_0$1 = (0 | $q_sroa_0_0_insert_ext75$0) >>> 31 | $q_sroa_0_0_insert_insert77$1 << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
  $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
  return (tempRet0 = $_0$1, $_0$0) | 0;
}
// =======================================================================



  
function dynCall_ii(index,a1) {
  index = index|0;
  a1=a1|0;
  return FUNCTION_TABLE_ii[index&1](a1|0)|0;
}


function dynCall_iiii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  return FUNCTION_TABLE_iiii[index&3](a1|0,a2|0,a3|0)|0;
}


function dynCall_vi(index,a1) {
  index = index|0;
  a1=a1|0;
  FUNCTION_TABLE_vi[index&1](a1|0);
}

function b0(p0) {
 p0 = p0|0; abort(0);return 0;
}
function b1(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; abort(1);return 0;
}
function b2(p0) {
 p0 = p0|0; abort(2);
}

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_ii = [b0,___stdio_close];
var FUNCTION_TABLE_iiii = [b1,___stdout_write,___stdio_seek,___stdio_write];
var FUNCTION_TABLE_vi = [b2,_cleanup526];

  return { _sign: _sign, _i64Subtract: _i64Subtract, _verify: _verify, _fflush: _fflush, _i64Add: _i64Add, _bitshift64Ashr: _bitshift64Ashr, _memset: _memset, _malloc: _malloc, _free: _free, _memcpy: _memcpy, _bitshift64Lshr: _bitshift64Lshr, _create_keypair: _create_keypair, ___errno_location: ___errno_location, _bitshift64Shl: _bitshift64Shl, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, establishStackSpace: establishStackSpace, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_ii: dynCall_ii, dynCall_iiii: dynCall_iiii, dynCall_vi: dynCall_vi };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var _create_keypair = Module["_create_keypair"] = asm["_create_keypair"];
var _sign = Module["_sign"] = asm["_sign"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _verify = Module["_verify"] = asm["_verify"];
var _fflush = Module["_fflush"] = asm["_fflush"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _bitshift64Ashr = Module["_bitshift64Ashr"] = asm["_bitshift64Ashr"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _free = Module["_free"] = asm["_free"];
var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
;

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.establishStackSpace = asm['establishStackSpace'];

Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];



// === Auto-generated postamble setup entry stuff ===


function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);


  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();


    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    return;
  }

  if (Module['noExitRuntime']) {
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}



