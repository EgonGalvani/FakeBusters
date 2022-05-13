import { ethers, Wallet } from "ethers";
import { getProvider, sendMoney } from "./utils/eth";
import { getBalance } from "./utils/balance";

require("dotenv").config();

const privateKeys = [
  process.env.DEPLOYER_PRIVATE_KEY!,
  process.env.EXPERT_PRIVATE_KEY!,
  process.env.SUBMITTER_PRIVATE_KEY!,
];

const init = async () => {
  privateKeys.forEach(async (privateKey) => {
    const wallet: Wallet = new Wallet(privateKey, getProvider());
    const balance = await getBalance(wallet);
    console.log(wallet.address + " " + balance);
  });

  /*
  const from = new Wallet(process.env.EXPERT_PRIVATE_KEY!, getProvider()); 
  const to = new Wallet(process.env.DEPLOYER_PRIVATE_KEY!, getProvider()); 
  sendMoney(from, to, 1); */
};

init();
