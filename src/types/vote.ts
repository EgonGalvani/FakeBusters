import { Outcome } from "./outcome";

export type Vote = {
  account: string; // private key of the user
  index: number; // index or id of the news considered
  answer: Outcome;
};
