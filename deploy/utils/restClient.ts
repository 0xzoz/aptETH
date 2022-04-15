import assert from "assert";
import fs from "fs";
import { Account } from "./account";

export const TESTNET_URL = "https://fullnode.devnet.aptoslabs.com";
/** A subset of the fields of a TransactionRequest*/
export type TxnRequest = Record<string, any> & { sequence_number: string };
/** A wrapper around the Aptos-core Rest API */
export class RestClient {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  //<:!:section_2
  //:!:>section_3
  /** Returns the sequence number and authentication key for an account */
  async account(accountAddress: string): Promise<Record<string, string> & { sequence_number: string }> {
    const response = await fetch(`${this.url}/accounts/${accountAddress}`, {method: "GET"});
    if (response.status != 200) {
      assert(response.status == 200, await response.text());
    }
    return await response.json();
  }

  /** Returns all resources associated with the account */
  async accountResources(accountAddress: string): Promise<Record<string, any> & { type: string }> {
    const response = await fetch(`${this.url}/accounts/${accountAddress}/resources`, {method: "GET"});
    if (response.status != 200) {
      assert(response.status == 200, await response.text());
    }
    return await response.json();
  }

  //<:!:section_3

  //:!:>section_4
  /** Generates a transaction request that can be submitted to produce a raw transaction that
   can be signed, which upon being signed can be submitted to the blockchain. */
  async generateTransaction(sender: string, payload: Record<string, any>): Promise<TxnRequest> {
    const account = await this.account(sender);
    const seqNum = parseInt(account["sequence_number"]);
    return {
      "sender": `0x${sender}`,
      "sequence_number": seqNum.toString(),
      "max_gas_amount": "2000",
      "gas_unit_price": "1",
      "gas_currency_code": "XUS",
      // Unix timestamp, in seconds + 10 minutes
      "expiration_timestamp_secs": (Math.floor(Date.now() / 1000) + 600).toString(),
      "payload": payload,
    };
  }

  /** Converts a transaction request produced by `generate_transaction` into a properly signed
   transaction, which can then be submitted to the blockchain. */
  async signTransaction(accountFrom: Account, txnRequest: TxnRequest): Promise<TxnRequest> {
    const response = await fetch(`${this.url}/transactions/signing_message`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(txnRequest)
    });
    if (response.status != 200) {
      assert(response.status == 200, (await response.text()) + " - " + JSON.stringify(txnRequest));
    }
    const result: Record<string, any> & { message: string } = await response.json();
    const toSign = Buffer.from(result["message"].substring(2), "hex");
    const signature = Nacl.sign(toSign, accountFrom.signingKey.secretKey);
    const signatureHex = Buffer.from(signature).toString("hex").slice(0, 128);
    txnRequest["signature"] = {
      "type": "ed25519_signature",
      "public_key": `0x${accountFrom.pubKey()}`,
      "signature": `0x${signatureHex}`,
    };
    return txnRequest;
  }

  /** Submits a signed transaction to the blockchain. */
  async submitTransaction(accountFrom: Account, txnRequest: TxnRequest): Promise<Record<string, any>> {
    const response = await fetch(`${this.url}/transactions`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(txnRequest)
    });
    if (response.status != 202) {
      assert(response.status == 202, (await response.text()) + " - " + JSON.stringify(txnRequest));
    }
    return await response.json();
  }

  async transactionPending(txnHash: string): Promise<boolean> {
    const response = await fetch(`${this.url}/transactions/${txnHash}`, {method: "GET"});
    if (response.status == 404) {
      return true;
    }
    if (response.status != 200) {
      assert(response.status == 200, await response.text());
    }
    return (await response.json())["type"] == "pending_transaction";
  }

  /** Waits up to 10 seconds for a transaction to move past pending state */
  async waitForTransaction(txnHash: string) {
    let count = 0;
    while (await this.transactionPending(txnHash)) {
      assert(count < 10);
      await new Promise(resolve => setTimeout(resolve, 1000));
      count += 1;
      if (count >= 10) {
        throw new Error(`Waiting for transaction ${txnHash} timed out!`);
      }
    }
  }

  //<:!:section_4
  //:!:>section_5
  /** Returns the test coin balance associated with the account */
  async accountBalance(accountAddress: string): Promise<number | null> {
    const resources = await this.accountResources(accountAddress);
    for (const key in resources) {
      const resource = resources[key];
      if (resource["type"] == "0x1::TestCoin::Balance") {
        return parseInt(resource["data"]["coin"]["value"]);
      }
    }
    return null;
  }

  /** Transfer a given coin amount from a given Account to the recipient's account address.
   Returns the sequence number of the transaction used to transfer. */
  async transfer(accountFrom: Account, recipient: string, amount: number): Promise<string> {
    const payload: { function: string; arguments: string[]; type: string; type_arguments: any[] } = {
      type: "script_function_payload",
      function: "0x1::TestCoin::transfer",
      type_arguments: [],
      arguments: [
        `0x${recipient}`,
        amount.toString(),
      ]
    };
    const txnRequest = await this.generateTransaction(accountFrom.address(), payload);
    const signedTxn = await this.signTransaction(accountFrom, txnRequest);
    const res = await this.submitTransaction(accountFrom, signedTxn);
    return res["hash"].toString();
  }

      /** Publish a new module to the blockchain within the specified account */
      async publishModule(accountFrom: Account, moduleHex: string): Promise<string> {
        const payload = {
          "type": "module_bundle_payload",
          "modules": [
            {"bytecode": `0x${moduleHex}`},
          ],
        };
        const txnRequest = await this.generateTransaction(accountFrom.address(), payload);
        const signedTxn = await this.signTransaction(accountFrom, txnRequest);
        const res = await this.submitTransaction(accountFrom, signedTxn);
        return res["hash"];
      }
      //<:!:section_1
      //:!:>section_2
      /** Retrieve the resource Message::MessageHolder::message */
      async getMessage(contractAddress: string, accountAddress: string): Promise<string> {
        const resources = await this.accountResources(accountAddress);
        for (const key in resources) {
          const resource = resources[key];
          if (resource["type"] == `0x${contractAddress}::Message::MessageHolder`) {
            return resource["data"]["message"];
          }
        }
      }
      //<:!:section_2
      //:!:>section_3
      /**  Potentially initialize and set the resource Message::MessageHolder::message */
      async setMessage(contractAddress: string, accountFrom: Account, message: string): Promise<string> {
        let payload: { function: string; arguments: string[]; type: string; type_arguments: any[] };
        payload = {
          "type": "script_function_payload",
          "function": `0x${contractAddress}::Message::set_message`,
          "type_arguments": [],
          "arguments": [
            Buffer.from(message, "utf-8").toString("hex")
          ]
        };
    
        const txnRequest = await this.generateTransaction(accountFrom.address(), payload);
        const signedTxn = await this.signTransaction(accountFrom, txnRequest);
        const res = await this.submitTransaction(accountFrom, signedTxn);
        return res["hash"];
      }

}

