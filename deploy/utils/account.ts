import * as Nacl from "tweetnacl";
import * as SHA3 from "js-sha3";


export class Account {
    signingKey: Nacl.SignKeyPair;
  
    constructor(seed?: Uint8Array | undefined) {
      if (seed) {
        this.signingKey = Nacl.sign.keyPair.fromSeed(seed);
      } else {
        this.signingKey = Nacl.sign.keyPair();
      }
    }
  
    /** Returns the address associated with the given account */
    address(): string {
      return this.authKey();
    }
  
    /** Returns the authKey for the associated account */
    authKey(): string {
      let hash = SHA3.sha3_256.create();
      hash.update(Buffer.from(this.signingKey.publicKey));
      hash.update("\x00");
      return hash.hex();
    }
  
    /** Returns the public key for the associated account */
    pubKey(): string {
      return Buffer.from(this.signingKey.publicKey).toString("hex");
    }
  }