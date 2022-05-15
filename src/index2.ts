import { ethers, Wallet } from "ethers";
import { getProvider, sendMoney } from "./utils/eth";
import { getBalance } from "./utils/balance";
import { parse as parseCSV } from "./utils/csv";
import { writeFileSync } from "fs";

require("dotenv").config();

type Balance = {
  ADDRESS: string;
  BALANCE: string;
};

const init = async () => {
  const initial: Array<Balance> = await parseCSV("balances_0"),
    middle: Array<Balance> = await parseCSV("balances_1"),
    end: Array<Balance> = await parseCSV("balances_2");

  if (initial.length != middle.length || end.length != middle.length) {
    console.log("Error on lengths");
    return;
  }

  let diffFirstPhase: Array<Number> = [],
    diffSecondPhase: Array<Number> = [];

  for (var i = 0; i < initial.length; i++) {
    diffFirstPhase.push(
      parseFloat(middle[i].BALANCE) - parseFloat(initial[i].BALANCE)
    );
    diffSecondPhase.push(
      parseFloat(end[i].BALANCE) - parseFloat(middle[i].BALANCE)
    );
  }

  let csvStringFirstPhase: string = '"ADDRESS","BALANCE"\n',
    csvStringSecondPhase: string = '"ADDRESS","BALANCE"\n';

  for (var i = 0; i < initial.length; i++) {
    csvStringFirstPhase += `"${initial[i].ADDRESS}","${diffFirstPhase[i]}"\n`;
    csvStringSecondPhase += `"${initial[i].ADDRESS}","${diffSecondPhase[i]}"\n`;
  }

  writeFileSync("diffFirstPhase.txt", csvStringFirstPhase);
  writeFileSync("diffSecondPhase.txt", csvStringSecondPhase);
};

init();
