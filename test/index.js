var test = require('tape')
var lib = require('..')
var crypto = require('crypto')

test('key generation', function(t){
  t.plan(6)

  var seed = lib.createSeed()
  t.is(Buffer.isBuffer(seed), true, 'seed is a buffer')
  t.is(seed.length, 32, 'seed\'s length is 32')
  var keys = lib.createKeyPair(seed)
  t.is(Buffer.isBuffer(keys.publicKey), true, 'pub key is a buffer')
  t.is(keys.publicKey.length, 32, 'pub key\'s length is 32')
  t.is(Buffer.isBuffer(keys.secretKey), true, 'priv key is a buffer')
  t.is(keys.secretKey.length, 64, 'priv key\'s length is 64')
})

test('signatures', function(t){
  t.plan(2)

  var seed = lib.createSeed()
  var keys = lib.createKeyPair(seed)
  var sig = lib.sign(new Buffer('hello there m8'), keys.publicKey, keys.secretKey)
  t.is(Buffer.isBuffer(sig), true, 'is signature buffer')
  t.is(sig.length, 64, 'is signature\'s length 64')
})

test('verify', function(t){
  t.plan(3)

  var seed = lib.createSeed()
  var keys = lib.createKeyPair(seed)
  var msg = new Buffer('hello there m8')
  var wrongMsg = crypto.randomBytes(msg.length)
  var sig = lib.sign(msg, keys.publicKey, keys.secretKey)
  var wrongSeed = lib.createSeed()
  var wrongKeys = lib.createKeyPair(wrongSeed)
  t.is(lib.verify(sig, msg, keys.publicKey), true, 'right stuff verifies correctly')
  t.is(lib.verify(sig, wrongMsg, keys.publicKey), false, 'wrong message is incorrect')
  t.is(lib.verify(sig, msg, wrongKeys.publicKey), false, 'wrong key is incorrect')
})
