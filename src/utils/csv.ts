import { Outcome } from "../types/outcome";
import { Vote } from "../types/vote";

const csv = require("csv-parser");
const fs = require("fs");

const ingnoredColumn: Array<string> = ["Age range", "Informazioni cronologiche" ]

export const parse_fees = (path: string) => {
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

export const parse_votes = (path: string, newsRealEvaluation: Map<string, Outcome>, votes: Map<string, Array<Vote>>) => {
	return new Promise<Map<string, Array<Vote>>>((resolve, reject) => {
		let stream = fs.createReadStream(path);
		stream = stream.pipe(csv());
		stream.on("data", (row: any) => {
			// for each attribute of resulting row obj
			Object.keys(row).forEach( (attr) => {
				// that if skips all the not significant columns
				if(!ingnoredColumn.includes(attr)){
					let vote: Vote = { account: "", answer: outcome_translator(row[attr])};
					let entry = votes.get(attr);
					// first row is reserved for real votes
					if(entry == undefined)
					{
						newsRealEvaluation.set(attr, vote.answer )
						votes.set(attr, new Array<Vote>());
					}
					else
						entry.push(vote);
				}
			});
		});
		stream.on("error", () => {
			console.log("file not found");
		})
		return stream.on("end", () => {
			resolve(votes);
		});
	});
};

export const outcome_translator = (out: string) =>
{
	switch(out)
	{
		case "Fake":
			return Outcome.FALSE;
		case "True":
			return Outcome.TRUE;
		default:
			return Outcome.OPINION;
	};
};