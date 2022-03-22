import ethers from "ethers";

export enum Outcome {
  FALSE = "FALSE",
  TRUE = "TRUE",
  OPINION = "OPINION",
}

export const toBigNumber = (outcome: Outcome) => {
  if (outcome == Outcome.FALSE) return ethers.BigNumber.from(0);
  if (outcome == Outcome.TRUE) return ethers.BigNumber.from(1);
  if (outcome == Outcome.OPINION) return ethers.BigNumber.from(2);

  throw new Error("Error in outcomeToBigNumber, no choice possible");
};
