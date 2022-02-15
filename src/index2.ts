const csv = require("csv-parser");
const fs = require("fs");

const parseCVS = (path: string) => {
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

const init = async () => {
  const fees = await parseCVS("fees/logs.csv");
  var tot = 0;
  var counter = 0;

  console.log(fees);

  /*for (var i = 0; i < fees.length; i++) {
    if (fees[i].action == "WITHDRAW") {
      console.log(fees[i]);
      tot += fees[i].fee;
      counter++;
    }
  }
  console.log("Avarage: " + tot / counter);*/
};

// cert 0.00021252642955679754
// submit 0.0025307964388642233
// vote 0.0016561988243844199
// withdraw 0.004218212049861034
// request_vote 0.0018395146097046438

init();
