import { BigNumber } from "ethers";

export enum Outcome {
  FALSE = "False",
  TRUE = "True",
  OPINION = "Opinion",
}

const outcomeToBigNumberMap = new Map<Outcome, number>([
  [Outcome.FALSE, 0],
  [Outcome.TRUE, 1],
  [Outcome.OPINION, 2],
]);

export const toBigNumber = (outcome: Outcome) => {
  if (outcomeToBigNumberMap.has(outcome))
    return BigNumber.from(outcomeToBigNumberMap.get(outcome));

  throw new Error("Error in outcomeToBigNumber, no choice possible");
};
