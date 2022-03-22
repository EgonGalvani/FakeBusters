import { Provider } from "@ethersproject/providers";
import { Contract, Wallet, ethers, BigNumber } from "ethers";
import { deployContract } from "./utils/eth";
import { Outcome, toBigNumber as outcomeToBigNumber } from "./types/outcome";

const FAKE_BUSTERS_DATA = require("../build/FakeBusters.json");

export class FakeBusters {
  private _contract: Contract;
  private static TRANSACTION_GAS_LIMIT = 300000;

  // the constructor is private to force the usage of the build function to create new objects
  private constructor(contract: Contract) {
    this._contract = contract;
  }

  /* return a promise for a new object of type FakeBusters
    if an address is passed, then the contract object used inside the class will refer to that address, 
    otherwise it deploys a new smart contract
  */
  public static async build(
    provider: Provider,
    address?: string
  ): Promise<FakeBusters> {
    const deployer = new Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);

    const contract =
      address === undefined
        ? await deployContract(
            FAKE_BUSTERS_DATA.abi,
            FAKE_BUSTERS_DATA.bytecode,
            deployer
          )
        : new Contract(address, FAKE_BUSTERS_DATA.abi, deployer);

    return new FakeBusters(contract);
  }

  // submit url to the contract using the submitterWallet
  submitNews = async (url: string, submitterWallet: Wallet) => {
    const submitterContract = this._contract.connect(submitterWallet);

    // get the submission fee
    const submissionFee = await submitterContract.SUBMISSION_FEE({
      gasLimit: FakeBusters.TRANSACTION_GAS_LIMIT,
    });

    // send the url to the contract and pay the submissionFee to it
    const receipt = await submitterContract.submit(url, {
      value: submissionFee,
      gasLimit: FakeBusters.TRANSACTION_GAS_LIMIT,
    });

    // wait for 1 confirm for the transaction
    return receipt.wait();
  };

  // return list of active pools
  getActivePolls = () => {
    return this._contract.getActivePolls({
      gasLimit: FakeBusters.TRANSACTION_GAS_LIMIT,
    });
  };

  getMaxVotingFee = () => {
    return this._contract.MAX_VOTE_STAKE({
      gasLimit: FakeBusters.TRANSACTION_GAS_LIMIT,
    });
  };

  getMinCertFee = () => {
    return this._contract.MIN_CERT_STAKE({
      gasLimit: FakeBusters.TRANSACTION_GAS_LIMIT,
    });
  };

  // request a vote reservation
  requestVote = async (busterWallet: Wallet, fee: number) => {
    // connect busterWallet to the contract
    const busterContract = this._contract.connect(busterWallet);

    // request vote
    const receipt = await busterContract.requestVote({
      value: fee,
      gasLimit: FakeBusters.TRANSACTION_GAS_LIMIT,
    });
    return receipt.wait();

    // 2. get the poll id
    /*let reservation = await contract.voterReservations(wallet.address, {
      gasLimit: 300000,
    });*/
  };

  // vote for the specified belief with busterWallet
  vote = async (busterWallet: Wallet, belief: Outcome) => {
    // connect busterWallet to _contract
    const busterContract = this._contract.connect(busterWallet);

    // vote with the specified belief
    const receipt = await busterContract.vote(outcomeToBigNumber(belief), {
      gasLimit: FakeBusters.TRANSACTION_GAS_LIMIT,
    });
    return receipt.wait();
  };

  // certify news using specified id and belief
  cerify = async (
    expertWallet: Wallet,
    id: any,
    fee: number,
    belief: Outcome
  ) => {
    // connect contract to expert wallet
    const expertContract = this._contract.connect(expertWallet);
    const receipt = await expertContract.certify(
      id,
      outcomeToBigNumber(belief),
      {
        value: fee,
        gasLimit: FakeBusters.TRANSACTION_GAS_LIMIT,
      }
    );
    return receipt.wait();
  };

  // withdraw the reward for a specific poll (indentified by the specified id)
  withdraw = async (wallet: Wallet, id: any) => {
    const connectedContract = this._contract.connect(wallet);
    const receipt = await connectedContract.withdraw(id, {
      gasLimit: FakeBusters.TRANSACTION_GAS_LIMIT,
    });
    return receipt.wait();
  };

  /* 
  outcome values: 
    - 0: FALSE
    - 1: TRUE 
    - 2: OPINION 
    - 3: NO DECISION 
  */
  listenForEvents = (
    poolCreatedHandler: (id: BigNumber, submitter: string, url: string) => void,
    poolClosedHandler: (
      id: BigNumber,
      gameOutcome: BigNumber,
      votingOutcome: BigNumber,
      certOutcome: BigNumber
    ) => void
  ) => {
    this._contract.on(this._contract.filters.PollCreated(), poolCreatedHandler);
    this._contract.on(this._contract.filters.PoolClosed(), poolClosedHandler);
  };
}
