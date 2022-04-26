

import assert from "assert";
import fs from "fs";
import { FAUCET_URL, FaucetClient } from "./utils/faucet";
import { RestClient, TESTNET_URL } from "./utils/restClient"
import { Account } from "./utils/account";



const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

async function main() {
    assert(process.argv.length == 3, "Expecting an argument that points to the helloblockchain module");
  
    const restClient = new RestClient(TESTNET_URL);
    const faucetClient = new FaucetClient(FAUCET_URL, restClient);
  
    // Create new Pontis account for testing \
    const Pontis = new Account();
  
    console.log("\n=== Addresses ===");
    console.log(`Pontis: ${Pontis.address()}`);

  
    await faucetClient.fundAccount(Pontis.address(), 10_000_000);
 
  
    console.log("\n=== Initial Balance ===");
    console.log(`Alice: ${await restClient.accountBalance(Pontis.address())}`);
  
    await new Promise<void>(resolve => {
      readline.question("Update the module with Pontis's address, build, copy to the provided path, and press enter.", () => {
        resolve();
        readline.close();
      });
    });
    const modulePath = process.argv[2];
    const moduleHex = fs.readFileSync(modulePath).toString("hex");
  
    console.log("\n=== Testing aptEth ===");
    console.log("Publishing...");
  
    let txHash = await restClient.publishModule(Pontis, moduleHex);
    await restClient.waitForTransaction(txHash);
    //console.log(`Initial value: ${await restClient.getMessage(Pontis.address(), alice.address())}`);
  
    // console.log("Setting the message to \"Hello, Blockchain\"");
    // txHash = await restClient.setMessage(alice.address(), alice, "Hello, Blockchain");
    // await restClient.waitForTransaction(txHash);
    // console.log(`New value: ${await restClient.getMessage(alice.address(), alice.address())}`);
  
    // console.log("\n=== Testing Bob ===");
    // console.log(`Initial value: ${await restClient.getMessage(alice.address(), bob.address())}`);
    // console.log("Setting the message to \"Hello, Blockchain\"");
    // txHash = await restClient.setMessage(alice.address(), bob, "Hello, Blockchain");
    // await restClient.waitForTransaction(txHash);
    // console.log(`New value: ${await restClient.getMessage(alice.address(), bob.address())}`);
  }
  
  if (require.main === module) {
    main().then((resp) => console.log(resp));
  }