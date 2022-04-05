import { Action as UserAction } from "../types/action";
import { parseFees } from "./csv";
import { utils } from "ethers";
export const FEE_LOGS_PATH = "fee/logs.txt";

export const computeAvarageFees = async (
  action: UserAction,
  feeLogsFilePath: string = FEE_LOGS_PATH
) => {
  const fees = await parseFees(feeLogsFilePath);
  var tot = 0;
  var counter = 0;

  for (var i = 0; i < fees.length; i++) {
    if (fees[i].action == action) {
      console.log(fees[i]);
      tot += fees[i].fee;
      counter++;
    }
  }

  return tot / counter;
};

export const computeFeesFromReceipt = (receipt: any) => {
  return utils.formatEther(
    receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice)
  );
};
