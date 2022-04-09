import { Outcome } from "../types/outcome";
import { Vote } from "../types/vote";

const csv = require("csv-parser");
const fs = require("fs");

export const parse = (path: string) => {
  return new Promise<Array<any>>((resolve, reject) => {
    let items: Array<any> = [];
    let stream = fs.createReadStream(path);
    stream = stream.pipe(csv());
    stream.on("data", (row: any) => {
      items.push(row);
    });

    return stream.on("end", () => {
      resolve(items);
    });
  });
};

export const parseVotes = (path: string) => {
  return new Promise<Map<string, Array<Vote>>>((resolve, reject) => {
    let votes: Map<string, Array<Vote>> = new Map([]);

    let stream = fs.createReadStream(path);
    stream = stream.pipe(csv());
    stream.on("data", (row: any) => {
      // for each attribute of resulting row obj
      const account = row["Private key"];
      Object.keys(row).forEach((key: string) => {
        if (key != "Private key") {
          const vote: Vote = {
            account: row["Private key"],
            answer: row[key] as Outcome,
          };
          if (votes.has(key)) votes.get(key)?.push(vote);
          else votes.set(key, [vote]);
        }
      });
    });
    stream.on("error", () => {
      console.log("file not found");
    });

    return stream.on("end", () => {
      resolve(votes);
    });
  });
};
