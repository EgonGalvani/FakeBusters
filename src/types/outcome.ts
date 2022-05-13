import { BigNumber } from "ethers";

export enum Outcome {
  FALSE = "Fake",
  TRUE = "Real",
  OPINION = "Opinion",
}

const outcomeToNumberMap = new Map<Outcome, number>([
  [Outcome.FALSE, 0],
  [Outcome.TRUE, 1],
  [Outcome.OPINION, 2],
]);

export const toBigNumber = (outcome: Outcome) => {
  if (outcomeToNumberMap.has(outcome))
    return BigNumber.from(outcomeToNumberMap.get(outcome));

  throw new Error("Error in outcomeToBigNumber, no choice possible");
};

export const fromBigNumber = (outcome: BigNumber) => {
  return [...outcomeToNumberMap].find(
    ([key, val]) => BigNumber.from(val) === outcome
  )![0];
};
