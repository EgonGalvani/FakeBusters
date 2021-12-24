require("dotenv").config();
import { Filter, JsonRpcProvider, Provider } from "@ethersproject/providers";
import { BigNumber, Contract, ContractFactory, ethers, Signer } from "ethers";

const ASTRAEA = require("../build/ASTRAEA.json");

const provider: JsonRpcProvider = new ethers.providers.JsonRpcProvider(
  "http://127.0.0.1:7545"
);

const wallet = new ethers.Wallet(
  process.env.WALLET_PRIVATE_KEY as string
).connect(provider);

const deployContract: (
  abi: string,
  bytecode: string,
  signer: Signer
) => Promise<Contract> = async (abi, bytecode, signer) => {
  const factory = new ContractFactory(abi, bytecode, signer);
  return await factory.deploy();
};

const deployAstraeaContract: () => Promise<Contract> = async () => {
  return deployContract(ASTRAEA.abi, ASTRAEA.bytecode, wallet);
};

const contractAddress = "0x5195F9Dd99B32bD61AC3360d65f0c1aB018438de";
const init = async () => {
  const contract = await deployAstraeaContract(); // new Contract(contractAddress, ASTRAEA.abi, wallet); //
  console.log(`Contract Address: ${contract.address}`);

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

  contract.on(contract.filters.Reward(), (value) =>
    console.log(`[Reward] ${value} wei`)
  );

  /** SUBMITTER - submit an url **/
  const submissionFee = await contract.SUBMISSION_FEE();
  const url =
    "https://www.lercio.it/in-arrivo-gomorras-walking-dead-la-serie-con-tutti-i-morti-di-gomorra-in-versione-zombie/";

  let activePolls = await contract.getActivePolls();
  console.log(`Active polls: ${activePolls}`);

  let recipt = await contract.submit(url, { value: submissionFee });
  await recipt.wait();

  // get list of active pools
  activePolls = await contract.getActivePolls();
  console.log(`Active polls: ${activePolls}`);

  /** VOTER - try to vote */
  // 1. request a reservation
  recipt = await contract.requestVote({ value: 50 });
  await recipt.wait();

  // 2. get the poll id
  let reservation = await contract.voterReservations(wallet.address);
  console.log(`Reservation id: ${reservation.pollId}`);

  // 3. actually vote
  let belief = true; // after checking online i think that the news is true
  recipt = await contract.vote(belief);
  await recipt.wait();

  /** CERTIFIER - try to certify the same poll of voter */
  const minCertStake = await contract.MIN_CERT_STAKE();
  recipt = await contract.certify(reservation.pollId, belief, {
    value: minCertStake,
  });
  await recipt.wait();
  console.log("Certification done");

  /** VOTER - FINISH VOTING PROCESS - SINCE THERE IS ONLY 1 POLL */
  // 1. request a reservation
  recipt = await contract.requestVote({ value: 55 }); // in this way we reach the quota to close the poll
  await recipt.wait();

  // 2. get the poll id
  reservation = await contract.voterReservations(wallet.address);
  console.log(`Reservation id: ${reservation.pollId}`);

  // 3. actually vote
  belief = true; // after checking online i think that the news is true
  recipt = await contract.vote(belief);
  await recipt.wait();

  // get list of active pools
  activePolls = await contract.getActivePolls();
  console.log(`Active polls: ${activePolls}`);

  // withdraw money 🤑🤑🤑
  let balance = await wallet.getBalance();
  console.log(`Balance before withdraw: ${balance}`);

  recipt = await contract.withdraw(reservation.pollId);
  await recipt.wait();

  balance = await wallet.getBalance();
  console.log(`Balance after withdraw: ${balance}`);
};

init();
