import { BigNumber } from "ethers";
import { Outcome, fromBigNumber as bigNumberToOutcome } from "./outcome";

// null = NO_DECISION
export type SystemOutcome = Outcome | null;

export const fromBigNumber = (outcome: BigNumber) => {
  if (outcome === BigNumber.from(3)) return null;

  return bigNumberToOutcome(outcome);
};
