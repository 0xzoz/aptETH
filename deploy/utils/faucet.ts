import { RestClient } from "./restClient";
import assert from "assert";

export class FaucetClient {
    url: string;
    restClient: RestClient;
  
    constructor(url: string, restClient: RestClient) {
      this.url = url;
      this.restClient = restClient;
    }
  
    /** This creates an account if it does not exist and mints the specified amount of
     coins into that account */
    async fundAccount(address: string, amount: number) {
      const url = `${this.url}/mint?amount=${amount}&address=${address}`;
      const response = await fetch(url, {method: "POST"});
      if (response.status != 200) {
        assert(response.status == 200, await response.text());
      }
      const tnxHashes = await response.json() as Array<string>;
      for (const tnxHash of tnxHashes) {
        await this.restClient.waitForTransaction(tnxHash);
      }
    }
  
  }