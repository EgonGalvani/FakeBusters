import {
  InfuraWebSocketProvider,
  JsonRpcProvider,
} from "@ethersproject/providers";
import { Console } from "console";
import { Contract, ContractFactory, ethers, Signer, Wallet } from "ethers";
const csv = require("csv-parser");
const fs = require("fs");

require("dotenv").config();
const ASTRAEA = require("../build/ASTRAEA.json");

enum Outcome {
  FALSE,
  TRUE,
  OPINION,
}

/*const provider: JsonRpcProvider = new ethers.providers.JsonRpcProvider(
  "http://127.0.0.1:7545"
);*/
const provider: JsonRpcProvider = new JsonRpcProvider(
  "https://rpc-mumbai.maticvigil.com/"
);

const deployContract: (
  abi: string,
  bytecode: string,
  signer: Signer
) => Promise<Contract> = async (abi, bytecode, signer) => {
  const factory = new ContractFactory(abi, bytecode, signer);
  return await factory.deploy();
};

const deployAstraeaContract: (
  contract_wallet: any
) => Promise<Contract> = async (contract_wallet) => {
  return deployContract(ASTRAEA.abi, ASTRAEA.bytecode, contract_wallet);
};

const submitNews = async (url: string, contract: Contract, wallet: Wallet) => {
  // connect to another wallet
  const submitterContract = contract.connect(wallet);
  const submissionFee = await contract.SUBMISSION_FEE();

  const receipt = await submitterContract.submit(url, { value: submissionFee });
  const result = await receipt.wait();

  // get list of active pools

  return result;
};

const getActivePolls = async (contract: Contract) => {
  const activePolls = await contract.getActivePolls();
  console.log(`Active polls: ${activePolls}`);
  return activePolls;
};

const deployFirstTime = async () => {
  const deployerWallet = new Wallet(
    process.env.DEPLOYER_PRIVATE_KEY!,
    provider
  );
  const contract = await deployAstraeaContract(deployerWallet);

  console.log(`Contract Address: ${contract.address}`);
  return contract.address;
};

const listenForEvents = (contract: Contract) => {
  // log di creazione di nuovi poll
  contract.on(contract.filters.PollCreated(), (id, submitter, url) => {
    console.log(`[PollCreated] ${id} ${submitter} ${url}`);
  });

  /* 
	  outcome values: 
	   - 0: FALSE
	   - 1: TRUE 
	   - 2: NO DECISION
	*/
  // log di chiusura di poll
  contract.on(
    contract.filters.PollClosed(),
    (id, gameOutcome, votingOutcome, certOutcome) => {
      console.log(
        `[PollClosed] ${id} ${gameOutcome} ${votingOutcome} ${certOutcome}`
      );
    }
  );
};

const requestVote = async (contract: Contract, wallet: Wallet, fee: number) => {
  contract = contract.connect(wallet);

  // 1. request a reservation
  const receipt = await contract.requestVote({ value: fee });
  await receipt.wait();

  // 2. get the poll id
  let reservation = await contract.voterReservations(wallet.address);
  console.log(`Reservation id: ${reservation.pollId}`);

  return reservation;
};

const vote = async (contract: Contract, wallet: Wallet, belief: Outcome) => {
  const receipt = await contract.vote(belief);
  const result = await receipt.wait();
  return result;
};

const cerify = async (
  contract: Contract,
  wallet: Wallet,
  id: any,
  fee: number,
  belief: Outcome
) => {
  const receipt = await contract.certify(id, belief, {
    value: fee,
  });
  const result = await receipt.wait();
  return result;
};

const withdraw = async (contract: Contract, wallet: Wallet, id: any) => {
  const receipt = await contract.withdraw(id);
  const result = await receipt.wait();
  return result;
};

type AnswerItem = {
  firstAnswerIndex: number;
  firstAnswer: Outcome;
  secondAnswerIndex: number;
  secondAnswer: Outcome;
};
const fromItalianToOutcome = (italian: string) => {
  if (italian == "Reale") return Outcome.TRUE;
  if (italian == "Fake") return Outcome.FALSE;
  return Outcome.OPINION;
};
const parseCVS = (path: string) => {
  return new Promise<Array<AnswerItem>>((resolve, reject) => {
    let items: Array<AnswerItem> = [];
    let stream = fs.createReadStream(path);
    stream = stream.pipe(csv());
    stream.on("data", (row: any) => {
      items.push({
        firstAnswerIndex: row.index1,
        secondAnswerIndex: row.index2,
        firstAnswer: fromItalianToOutcome(row["answer_1_" + row.index1]),
        secondAnswer: fromItalianToOutcome(row["answer_2_" + row.index2]),
      });
    });

    return stream.on("end", () => {
      resolve(items);
    });
  });
};

const sendMoneyToAll = async () => {
  const keys = require("fs")
    .readFileSync("secrets.txt", "utf-8")
    .split(/\r?\n/);

  for (var i = 0; i < 10; i++) {
    const sender = new Wallet(keys[i], provider);
    console.log("Sending money from " + sender.address);

    for (var j = 0; j < 9; j++) {
      const receiver = new Wallet(keys[9 + i * 9 + j]);
      await sender.sendTransaction({
        to: receiver.address,
        value: ethers.utils.parseEther("0.05"),
      });
    }
  }
};

const readKeys = () => {};

const checkMoneyForAll = async () => {
  let keys = require("fs").readFileSync("secrets.txt", "utf-8").split(/\r?\n/);
  keys.forEach(async (key: string) => {
    const wallet = new Wallet(key, provider);
    const balance = ethers.utils.formatEther(await wallet.getBalance());

    if (parseFloat(balance) < 0.048)
      console.log(wallet.address + " has " + balance + " matic");
  });
};

const saveBalances = async (fileName: string) => {
  let keys = require("fs").readFileSync("secrets.txt", "utf-8").split(/\r?\n/);
  let balances = "";

  for (var i = 0; i < keys.length; i++) {
    const key = keys[i];

    const wallet = new Wallet(key, provider);
    const balance = ethers.utils.formatEther(await wallet.getBalance());
    balances += balance + "\n";
  }

  fs.writeFileSync(fileName, balances);
};

const init = async () => {
  // const contractAddress = await deployFirstTime();
  // console.log(contractAddress);
  // const contract = new Contract(contractAddress, ASTRAEA.abi);
  // listenForEvents(contract);

  await saveBalances("balances0.txt");
};

init();

/**
 for (var i = 0; i < 4; i++) {
    const receiver = Wallet.createRandom();
    await wallet.sendTransaction({
      to: receiver.address,
      value: ethers.utils.parseEther("0.05"),
    });
    console.log(receiver.privateKey);
  }

 */

/*let data = ""; 
  items.forEach((item : AnswerItem) => {
    const wallet = Wallet.createRandom(); 
    data += wallet.privateKey + "\n"; 
  }); 
  fs.writeFileSync("secrets.txt", data)*/

/*const wallet = new Wallet(
    "0x4300c95015434808c7fae9319c9f2410ab97516bd9e53984cd83db234233ec08"
  );
  console.log(wallet.address);

  const wallet2 = new Wallet(
    "0x1c5363dd55b6de0cfaf7ead7dd0c8af689796c7c8eec0199a5e4fcc86e3dbb61"
  );
  console.log(wallet2.address);*/
