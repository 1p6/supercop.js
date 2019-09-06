# supercop.js
[orlp/ed25519](https://github.com/orlp/ed25519) compiled to pure javascript using Emscripten

A version compiled to WASM and also better maintained can be found at [nazar-pc/supercop.wasm](https://github.com/nazar-pc/supercop.wasm).  It probably works as opposed to this old code.

# example
## signing and verifying stuff
``` javascript
var lib = require('supercop.js')

var seed = lib.createSeed()
var keys = lib.createKeyPair(seed)
var msg = new Buffer('hello there')
var sig = lib.sign(msg, keys.publicKey, keys.secretKey)
console.log(lib.verify(sig, msg, keys.publicKey)) // true
```

## storing keypairs
``` javascript
var lib = require('supercop.js')
var fs = require('fs')

var seed = lib.createSeed()
var keys = lib.createKeyPair(seed)

fs.writeFileSync('keys.json', JSON.stringify({
  publicKey: keys.publicKey.toString('base64'),
  secretKey: keys.secretKey.toString('base64')
}))
```

## loading keypairs
``` javascript
var fs = require('fs')

var keys = require('./keys.json')
keys = {
  publicKey: new Buffer(keys.publicKey, 'base64'),
  secretKey: new Buffer(keys.secretKey, 'base64')
}
```

# api
## var seed = lib.createSeed()
Generates a cryptographically-secure 32-byte seed.

## var keys = lib.createKeyPair(seed)
Generates a keypair from the provided 32-byte seed with the following properties:
* `keys.publicKey` - A 32 byte public key as a buffer.
* `keys.secretKey` - A 64 byte private key as a buffer.

## var sig = lib.sign(msg, publicKey, secretKey)
Signs a given message of any length.
* `msg` - A buffer of any length containing a message.
* `publicKey` - The public key to sign with as a buffer.
* `secretKey` - The private key to sign with as a buffer.
* `sig` - The resulting signature as a buffer of length 64 bytes.

## var valid = lib.verify(sig, msg, publicKey)
Verifies a given signature goes with the message and key.
* `sig` - The signature to verify.
* `msg` - The message that the signature represents.
* `publicKey` - The public key used to generate the signature.
* `valid` - A boolean telling whether the signature is valid(`true`) or invalid(`false`).
