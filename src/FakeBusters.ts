import { Provider } from "@ethersproject/providers";
import { Contract, Wallet } from "ethers";
import { deployContract } from "./utils/eth";

const FAKE_BUSTERS_DATA = require("../build/ASTRAEA.json");

export class FakeBusters {

  private _contract: Contract;

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
    address?: string, 
  ): Promise<FakeBusters> {

    const deployer = new Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider); 

    const contract = address === undefined 
      ? await deployContract(FAKE_BUSTERS_DATA.abi, FAKE_BUSTERS_DATA.bytecode, deployer)
      : new Contract(address, FAKE_BUSTERS_DATA.abi, deployer); 

    return new FakeBusters(contract);
  }
}
