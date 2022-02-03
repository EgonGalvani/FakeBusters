import { Filter, JsonRpcProvider, Provider } from "@ethersproject/providers";
import { BigNumber, Contract, ContractFactory, ethers, Signer, Wallet } from "ethers";

require("dotenv").config();
const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');
const wallet = require('ethereumjs-wallet');

const ASTRAEA = require("../build/ASTRAEA.json");

enum Outcome { FALSE, TRUE, OPINION }

const provider: JsonRpcProvider = new ethers.providers.JsonRpcProvider(
	"http://127.0.0.1:7545"
);

var ACCOUNT_INDEX = 0;

const get_wallet = (hdk: any) => {
	ACCOUNT_INDEX += 1;
	const addr_node = hdk.derivePath("m/44'/60'/0'/0/" + ACCOUNT_INDEX).getWallet(); //m/44'/60'/0'/0/0 is derivation path for the first account. m/44'/60'/0'/0/1 is the derivation path for the second account and so on
	console.log("Wallet created with address: " + addr_node.getAddressString());
	//check that this is the same with the address that ganache list for the first account to make sure the derivation is correct
	const private_key = addr_node.getPrivateKey();
	return new ethers.Wallet(
		private_key
	).connect(provider);
}

// const contract_wallet = get_wallet();

const deployContract: (
	abi: string,
	bytecode: string,
	signer: Signer
) => Promise<Contract> = async (abi, bytecode, signer) => {
	const factory = new ContractFactory(abi, bytecode, signer);
	return await factory.deploy();
};

const deployAstraeaContract: (contract_wallet: any) => Promise<Contract> = async (contract_wallet) => {
	return deployContract(ASTRAEA.abi, ASTRAEA.bytecode, contract_wallet);
};

let players_wallets: Array<any> = [];

const registerPlayer = (hdk: any) => {
	players_wallets.push(get_wallet(hdk));
}

const submitPoll: (url: string, contract: any, wallet: Wallet) => Promise<any> = async (url, contract) => {
	// connect to another wallet
	let submitter_contract = contract.connect(wallet);

	const submissionFee = await contract.SUBMISSION_FEE();

	let receipt = await submitter_contract.submit(url, { value: submissionFee });
	await receipt.wait();

	// get list of active pools
	let activePolls = await contract.getActivePolls();
	console.log(`Active polls: ${activePolls}`);

	return receipt;
}

const buster_vote: () => any = () => {

}

// const contractAddress = "0x5195F9Dd99B32bD61AC3360d65f0c1aB018438de";
const init = async () => {

	const seed = await bip39.mnemonicToSeed("spend course text core brief dutch motion electric swear settle ride gold"); // change with your mnemonic in .env!
	const hdk = hdkey.fromMasterSeed(seed);

	const contract = await deployAstraeaContract(get_wallet(hdk)); // new Contract(contractAddress, ASTRAEA.abi, wallet); //
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
	const url =
		"https://www.lercio.it/in-arrivo-gomorras-walking-dead-la-serie-con-tutti-i-morti-di-gomorra-in-versione-zombie/";

	// let activePolls = await contract.getActivePolls();
	// console.log(`Active polls: ${activePolls}`);

	let submitter_wallet: Wallet = get_wallet(hdk);

	let receipt = await submitPoll(url, contract, submitter_wallet);
	
	/** VOTER - try to vote */
	// 1. request a reservation
	receipt = await contract.requestVote({ value: 50 });
	await receipt.wait();

	// 2. get the poll id
	let reservation = await contract.voterReservations(wallet.address);
	console.log(`Reservation id: ${reservation.pollId}`);

	// 3. actually vote
	let belief = Outcome.TRUE; // after checking online i think that the news is true
	receipt = await contract.vote(belief);
	await receipt.wait();

	/** CERTIFIER - try to certify the same poll of voter */
	const minCertStake = await contract.MIN_CERT_STAKE();
	receipt = await contract.certify(reservation.pollId, belief, {
		value: minCertStake,
	});
	await receipt.wait();
	console.log("Certification done");

	/** VOTER - FINISH VOTING PROCESS - SINCE THERE IS ONLY 1 POLL */
	// 1. request a reservation
	receipt = await contract.requestVote({ value: 55 }); // in this way we reach the quota to close the poll
	await receipt.wait();

	// 2. get the poll id
	reservation = await contract.voterReservations(wallet.address);
	console.log(`Reservation id: ${reservation.pollId}`);

	// 3. actually vote
	belief = Outcome.TRUE; // after checking online i think that the news is true
	receipt = await contract.vote(belief);
	await receipt.wait();

	// get list of active pools
	let activePolls = await contract.getActivePolls();
	console.log(`Active polls: ${activePolls}`);

	// withdraw money 🤑🤑🤑
	let balance = await wallet.getBalance();
	console.log(`Balance before withdraw: ${balance}`);

	receipt = await contract.withdraw(reservation.pollId);
	await receipt.wait();

	balance = await wallet.getBalance();
	console.log(`Balance after withdraw: ${balance}`);
};

init();
