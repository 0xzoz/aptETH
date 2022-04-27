

import assert from "assert";
import fs from "fs";
import * as dotenv from 'dotenv'
import { FAUCET_URL, FaucetClient } from "./utils/faucet";
import { RestClient, TESTNET_URL } from "./utils/restClient"
import { Account } from "./utils/account";



const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

async function main() {

    dotenv.config();
    const aptEthContractAddress = process.env.APT_ETH_ADDRESS;
    const aptEthContractName = process.env.APT_ETH_NAME;
    assert(process.argv.length == 3, "Expecting an argument that points to the helloblockchain module");
  
    const restClient = new RestClient(TESTNET_URL);
    const faucetClient = new FaucetClient(FAUCET_URL, restClient);
  
    // Create new Pontis account for testing \
    const Pontis = new Account();
    const Mark = new Account();
  
    console.log("\n=== Addresses ===");
    console.log(`Pontis: ${Pontis.address()}`);
    console.log(`Mark: ${Mark.address()}`);

    await faucetClient.fundAccount(Pontis.address(), 1_000_000)
    await faucetClient.fundAccount(Mark.address(), 1_000_000_000)
  
    console.log("\n=== Initial Balance ===");
    console.log(`Pontis: ${await restClient.accountBalance("0x1", "TestCoin", Pontis.address())}`);
    console.log(`Mark: ${await restClient.accountBalance("0x1", "TestCoin", Mark.address())}`);
    console.log(`Pontis: ${await restClient.accountBalance(aptEthContractAddress, aptEthContractName, Pontis.address())}`);
    console.log(`Mark: ${await restClient.accountBalance(aptEthContractAddress, aptEthContractName, Mark.address())}`);

  
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
    console.log("\n=== Tx Hash ===")
    console.log(txHash);

    await restClient.waitForTransaction(txHash);

    await restClient.initializeAptETH(Pontis.address(), Pontis, 18);

    await restClient.bridgeToAptos(Pontis.address(), Mark, Pontis, 10000000000);

    console.log("\n=== AFter Balance ===");
    console.log(`Pontis: ${await restClient.accountBalance(Pontis.address(), aptEthContractName, Pontis.address())}`);
    console.log(`Mark: ${await restClient.accountBalance(Pontis.address(), aptEthContractName, Mark.address())}`);


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