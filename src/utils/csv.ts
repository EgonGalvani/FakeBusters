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