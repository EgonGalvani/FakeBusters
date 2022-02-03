import { Filter, JsonRpcProvider, Provider } from "@ethersproject/providers";
import {
  BigNumber,
  Contract,
  ContractFactory,
  ethers,
  Signer,
  Wallet,
} from "ethers";
const csv = require("csv-parser");
const fs = require("fs");

require("dotenv").config();
const ASTRAEA = require("../build/ASTRAEA.json");

enum Outcome {
  FALSE,
  TRUE,
  OPINION,
}

const provider: JsonRpcProvider = new ethers.providers.JsonRpcProvider(
  "http://127.0.0.1:7545"
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
  const deployerWallet = new Wallet(process.env.DEPLOYER_PRIVATE_KEY!);
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

const parseCVS = (path: string) => {
  fs.createReadStream("data.csv")
    .pipe(csv())
    .on("data", (row: any) => {
      console.log(row);
    })
    .on("end", () => {
      console.log("CSV file successfully processed");
    });
};

const init = async () => {
  // const contractAddress = await deployFirstTime();
  // const contract = new Contract(contractAddress, ASTRAEA.abi);

  // listenForEvents(contract);
  console.log("Reading...");
  parseCVS("../data/answers.csv");
};

init();
