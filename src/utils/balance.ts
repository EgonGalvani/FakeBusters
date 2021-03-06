import { Wallet, utils } from "ethers";
import * as fs from "fs";

// check if the passed wallet has at least "threshold" eth as balance
export const hasAtLeast = async (wallet: Wallet, threshold: number) => {
  const balance: number = await getBalance(wallet);
  return balance >= threshold;
};

// call hasAtLeast function for each wallet in the list
// return the list of wallet not respecting this condition
export const allHaveAtLeast = async (
  wallets: Array<Wallet>,
  threshold: number
) => {
  var wrongWallets: Array<Wallet> = [];

  wallets.forEach(async (wallet: Wallet) => {
    if (!(await hasAtLeast(wallet, threshold))) wrongWallets.push(wallet);
  });

  return wrongWallets;
};

// save the balance of each wallet inside the list inside the specified file
// the format is csv, in the form: "ADDRESS", "BALANCE"
export const saveBalances = async (
  wallets: Array<Wallet>,
  fileName: string
) => {
  let balances = '"ADDRESS","BALANCE"\n';

  for (var i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const balance = await getBalance(wallet);
    balances += `"${wallet.address}","${balance}"\n`;
  }

  fs.writeFileSync(fileName, balances);
};

export const getBalance = async (wallet: Wallet) => {
  return parseFloat(utils.formatEther(await wallet.getBalance()));
};
