var Module = require('./lib.js')
var randomBytes = require('crypto').randomBytes

exports.createSeed = function(){
  return randomBytes(32)
}

exports.createKeyPair = function(seed){
  if(!Buffer.isBuffer(seed)){
    throw new Error('not buffers!')
  }
  var seedPtr = Module._malloc(32)
  var seedBuf = new Uint8Array(Module.HEAPU8.buffer, seedPtr, 32)
  var pubKeyPtr = Module._malloc(32)
  var pubKey = new Uint8Array(Module.HEAPU8.buffer, pubKeyPtr, 32)
  var privKeyPtr = Module._malloc(64)
  var privKey = new Uint8Array(Module.HEAPU8.buffer, privKeyPtr, 64)
  seedBuf.set(seed)
  Module._create_keypair(pubKeyPtr, privKeyPtr, seedPtr)
  Module._free(seedPtr)
  Module._free(pubKeyPtr)
  Module._free(privKeyPtr)
  return {
    publicKey: new Buffer(pubKey),
    secretKey: new Buffer(privKey)
  }
}

exports.sign = function(msg, pubKey, privKey){
  if(!Buffer.isBuffer(msg) || !Buffer.isBuffer(pubKey) || !Buffer.isBuffer(privKey)){
    throw new Error('not buffers!')
  }
  var msgLen = msg.length
  var msgArrPtr = Module._malloc(msgLen)
  var msgArr = new Uint8Array(Module.HEAPU8.buffer, msgArrPtr, msgLen)
  var pubKeyArrPtr = Module._malloc(32)
  var pubKeyArr = new Uint8Array(Module.HEAPU8.buffer, pubKeyArrPtr, 32)
  var privKeyArrPtr = Module._malloc(64)
  var privKeyArr = new Uint8Array(Module.HEAPU8.buffer, privKeyArrPtr, 64)
  var sigPtr = Module._malloc(64)
  var sig = new Uint8Array(Module.HEAPU8.buffer, sigPtr, 64)
  msgArr.set(msg)
  pubKeyArr.set(pubKey)
  privKeyArr.set(privKey)
  Module._sign(sigPtr, msgArrPtr, msgLen, pubKeyArrPtr, privKeyArrPtr)
  Module._free(msgArrPtr)
  Module._free(pubKeyArrPtr)
  Module._free(privKeyArrPtr)
  Module._free(sigPtr)
  return new Buffer(sig)
}

exports.verify = function(sig, msg, pubKey){
  if(!Buffer.isBuffer(msg) || !Buffer.isBuffer(sig) || !Buffer.isBuffer(pubKey)){
    throw new Error('not buffers!')
  }
  var msgLen = msg.length
  var msgArrPtr = Module._malloc(msgLen)
  var msgArr = new Uint8Array(Module.HEAPU8.buffer, msgArrPtr, msgLen)
  var sigArrPtr = Module._malloc(64)
  var sigArr = new Uint8Array(Module.HEAPU8.buffer, sigArrPtr, 64)
  var pubKeyArrPtr = Module._malloc(32)
  var pubKeyArr = new Uint8Array(Module.HEAPU8.buffer, pubKeyArrPtr, 32)
  msgArr.set(msg)
  sigArr.set(sig)
  pubKeyArr.set(pubKey)
  var res =  Module._verify(sigArrPtr, msgArrPtr, msgLen, pubKeyArrPtr) === 1
  Module._free(msgArrPtr)
  Module._free(sigArrPtr)
  Module._free(pubKeyArrPtr)
  return res
}
