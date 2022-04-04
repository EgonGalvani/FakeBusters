import { Signer, Contract, ContractFactory, Wallet, utils } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";

export const deployContract: (
  abi: string,
  bytecode: string,
  signer: Signer
) => Promise<Contract> = async (abi, bytecode, signer) => {
  const factory = new ContractFactory(abi, bytecode, signer);
  return await factory.deploy();
};

export const getProvider = () =>
  new JsonRpcProvider(
    "https://rpc-mumbai.matic.today" // local net: "http://127.0.0.1:7545"
  );

export const sendMoney = async (from: Wallet, to: Wallet, eth: number) => {
  return from.sendTransaction({
    to: to.address,
    value: utils.parseEther(eth.toString()),
  });
};


