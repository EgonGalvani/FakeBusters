import { Outcome } from "./outcome";

export type Vote = {
  account: string; // private key of the user
  answer: Outcome;
};
