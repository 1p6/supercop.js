# supercop.js
[orlp/ed25519](https://github.com/orlp/ed25519) compiled to pure javascript using Emscripten

# example
## signing and verifying stuff
``` javascript
var lib = require('supercop.js')

var seed = lib.createSeed()
var keys = lib.createKeyPair(seed)
var msg = new Buffer('hello there')
var sig = lib.sign(msg, keys.pubKey, keys.privKey)
console.log(lib.verify(sig, msg, keys.pubKey)) // true
```

## storing keypairs
``` javascript
var lib = require('supercop.js')
var fs = require('fs')

var seed = lib.createSeed()
var keys = lib.createKeyPair(seed)

fs.writeFileSync('keys.json', JSON.stringify({
  pubKey: keys.pubKey.toString('base64'),
  privKey: keys.privKey.toString('base64')
}))
```

## loading keypairs
``` javascript
var fs = require('fs')

var keys = require('keys.json')
keys = {
  pubKey: new Buffer(keys.pubKey, 'base64'),
  privKey: new Buffer(keys.privKey, 'base64')
}
```

# api
## var seed = lib.createSeed()
Generates a cryptographically-secure 32-byte seed.

## var keys = lib.createKeyPair(seed)
Generates a keypair from the provided 32-byte seed with the following properties:
* `keys.publicKey` - A 32 byte public key as a buffer.
* `keys.secretKey` - A 64 byte private key as a buffer.

## var sig = lib.sign(msg, pubKey, privKey)
Signs a given message of any length.
* `msg` - A buffer of any length containing a message.
* `pubKey` - The public key to sign with as a buffer.
* `privKey` - The private key to sign with as a buffer.
* `sig` - The resulting signature as a buffer of length 64 bytes.

## var valid = lib.verify(sig, msg, pubKey)
Verifies a given signature goes with the message and key.
* `sig` - The signature to verify.
* `msg` - The message that the signature represents.
* `pubKey` - The public key used to generate the signature.
* `valid` - A boolean telling whether the signature is valid(`true`) or invalid(`false`).
