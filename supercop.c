#ifndef ED25519_NO_SEED
#define ED25519_NO_SEED value
#endif
#include "vendor/src/ed25519.h"
#include <stdio.h>
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
void create_keypair(unsigned char *public_key, unsigned char *private_key, const unsigned char *seed){
  ed25519_create_keypair(public_key, private_key, seed);
}

EMSCRIPTEN_KEEPALIVE
void sign(unsigned char *signature, const unsigned char *message, size_t message_len, const unsigned char *public_key, const unsigned char *private_key){
  ed25519_sign(signature, message, message_len, public_key, private_key);
}

EMSCRIPTEN_KEEPALIVE
int verify(const unsigned char *signature, const unsigned char *message, size_t message_len, const unsigned char *public_key){
  return ed25519_verify(signature, message, message_len, public_key);
}
