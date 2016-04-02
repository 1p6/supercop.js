var test = require('tape')
var lib = require('..')
var crypto = require('crypto')

test('key generation', function(t){
  t.plan(4)

  var keys = lib.createKeypair()
  t.is(Buffer.isBuffer(keys.pubKey), true, 'pub key is a buffer')
  t.is(keys.pubKey.length, 32, 'pub key\'s length is 32')
  t.is(Buffer.isBuffer(keys.privKey), true, 'priv key is a buffer')
  t.is(keys.privKey.length, 64, 'priv key\'s length is 64')
})

test('signatures', function(t){
  t.plan(2)

  var keys = lib.createKeypair()
  var sig = lib.sign(new Buffer('hello there m8'), keys.pubKey, keys.privKey)
  t.is(Buffer.isBuffer(sig), true, 'is signature buffer')
  t.is(sig.length, 64, 'is signature\'s length 64')
})

test('verify', function(t){
  t.plan(3)

  var keys = lib.createKeypair()
  var msg = new Buffer('hello there m8')
  var wrongMsg = crypto.randomBytes(msg.length)
  var sig = lib.sign(msg, keys.pubKey, keys.privKey)
  var wrongKey = lib.createKeypair()
  t.is(lib.verify(msg, sig, keys.pubKey), true, 'right stuff verifies correctly')
  t.is(lib.verify(wrongMsg, sig, keys.pubKey), false, 'wrong message is incorrect')
  t.is(lib.verify(msg, sig, wrongKey.pubKey), false, 'wrong key is incorrect')
})
