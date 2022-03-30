import { Outcome } from "./outcome";

export type Vote = {
  user: string;
  index: number; // index or id of the news considered
  answer: Outcome;
};
