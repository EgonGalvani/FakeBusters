
const csv = require("csv-parser");
const fs = require("fs");

require("dotenv").config();

const submitNews = async (url: string, contract: Contract, wallet: Wallet) => {
  // connect to another wallet
  const submitterContract = contract.connect(wallet);
  const submissionFee = await contract.SUBMISSION_FEE({ gasLimit: 300000 });

  console.log("SUBMISSION FEE: " + ethers.utils.formatEther(submissionFee));

  const receipt = await submitterContract.submit(url, {
    value: submissionFee,
    gasLimit: 300000,
  });
  const result = await receipt.wait();
  return result;
};

const getActivePolls = async (contract: Contract) => {
  const activePolls = await contract.getActivePolls({ gasLimit: 300000 });
  console.log(`Active polls: ${activePolls}`);
  return activePolls;
};

const listenForEvents = (contract: Contract) => {
  // log di creazione di nuovi poll
  contract.on(contract.filters.PollCreated(), (id, submitter, url) => {
    console.log(`[PollCreated] ${id} ${submitter} ${url}`);
  });
  /*
  contract.on(contract.filters.Voted(), (id, voter, belief) => {
    console.log(`[Voted] ${id} ${voter} ${belief}`);
  });

  contract.on(contract.filters.Certified(), (id, certifier, belief) => {
    console.log(`[Certified] ${id} ${certifier} ${belief}`);
  });

  contract.on(
    contract.filters.ClosingDetails(),
    (
      id,
      totalTrueVoteStake,
      totalFalseVoteStake,
      totalOpinionVoteStake,
      totalTrueCertStake,
      totalFalseCertStake,
      totalOpinionCertStakel
    ) => {
      console.log(
        `[ClosingDetails] ${id} \n Voting stakes: ${totalTrueVoteStake} ${totalFalseVoteStake} ${totalOpinionVoteStake} \nCert stakes: ${totalTrueCertStake} ${totalFalseCertStake} ${totalOpinionCertStakel}`
      );
    }
  );

  contract.on(contract.filters.Debug(), (info) => {
    console.log("[DEBUG] " + info);
  });*/

  /* 
	  outcome values: 
	   - 0: FALSE
	   - 1: TRUE 
	   - 2: OPINION 
     - 3: NO DECISION 
	*/
  // log di chiusura di poll
  contract.on(
    contract.filters.PollClosed(),
    (id, gameOutcome, votingOutcome, certOutcome) => {
      console.log(
        `[PollClosed] ${id} ${gameOutcome} ${votingOutcome} ${certOutcome}`
      );
    }
  );
};

const requestVote = async (contract: Contract, wallet: Wallet, fee: number) => {
  contract = contract.connect(wallet);

  // 1. request a reservation
  const receipt = await contract.requestVote({ value: fee, gasLimit: 300000 });
  const result = await receipt.wait();

  // 2. get the poll id
  /*let reservation = await contract.voterReservations(wallet.address, {
    gasLimit: 300000,
  });*/

  return result;
};

const outcomeToBigNumber = (outcome: Outcome) => {
  if (outcome == Outcome.FALSE) return ethers.BigNumber.from(0);
  if (outcome == Outcome.TRUE) return ethers.BigNumber.from(1);
  if (outcome == Outcome.OPINION) return ethers.BigNumber.from(2);

  throw new Error("Error in outcomeToBigNumber, no choice possible");
};
const vote = async (contract: Contract, wallet: Wallet, belief: Outcome) => {
  contract = contract.connect(wallet);
  const receipt = await contract.vote(outcomeToBigNumber(belief), {
    gasLimit: 300000,
  });
  const result = await receipt.wait();
  return result;
};

const cerify = async (
  contract: Contract,
  wallet: Wallet,
  id: any,
  fee: number,
  belief: Outcome
) => {
  contract = contract.connect(wallet);
  const receipt = await contract.certify(id, outcomeToBigNumber(belief), {
    value: fee,
    gasLimit: 300000,
  });
  const result = await receipt.wait();
  return result;
};

const withdraw = async (contract: Contract, wallet: Wallet, id: any) => {
  contract = contract.connect(wallet);
  const receipt = await contract.withdraw(id, { gasLimit: 300000 });
  const result = await receipt.wait();
  return result;
};

type AnswerItem = {
  firstAnswerIndex: number;
  firstAnswer: Outcome;
  secondAnswerIndex: number;
  secondAnswer: Outcome;
};
const fromItalianToOutcome = (italian: string) => {
  //console.log("Converting from italian: " + italian);

  if (italian == "Reale") return Outcome.TRUE;
  if (italian == "Fake") return Outcome.FALSE;
  if (italian == "Opinione") return Outcome.OPINION;

  throw new Error("Error parsing answer.csv");
};
const parseCVS = (path: string) => {
  return new Promise<Array<AnswerItem>>((resolve, reject) => {
    let items: Array<AnswerItem> = [];
    let stream = fs.createReadStream(path);
    stream = stream.pipe(csv());
    stream.on("data", (row: any) => {
      //console.log(row);

      // const index1 : number = parseInt(Object.entries(row)[3][1] as string);
      // const index2 : number = parseInt(Object.entries(row)[8][1] as string);
      // const firstAnswer : string = Object.entries(row)[index1 + 4][1] as string;
      // const secondAnswer : string = Object.entries(row)[index2 + ]
      items.push({
        firstAnswerIndex: row.index1,
        secondAnswerIndex: row.index2,
        firstAnswer: fromItalianToOutcome(row["answer_1_" + row.index1]),
        secondAnswer: fromItalianToOutcome(row["answer_2_" + row.index2]),
      });
    });

    return stream.on("end", () => {
      resolve(items);
    });
  });
};

type Vote = {
  key: string;
  index: number;
  answer: Outcome;
};
const parseElabCSV = (path: string) => {
  return new Promise<Array<Vote>>((resolve, reject) => {
    let items: Array<Vote> = [];
    let stream = fs.createReadStream(path);
    stream = stream.pipe(csv());
    stream.on("data", (row: any) => {
      const outcomeString: string = Object.entries(row)[2][1] as string;
      let outcome: Outcome;
      if (outcomeString.includes("TRUE")) outcome = Outcome.TRUE;
      else if (outcomeString.includes("FALSE")) outcome = Outcome.FALSE;
      else if (outcomeString.includes("OPINION")) outcome = Outcome.OPINION;
      else throw Error("No correct value for outcome in csv file!!!");

      items.push({
        key: row["privateKey"],
        index: parseInt(Object.entries(row)[1][1] as string),
        answer: outcome,
      });
    });

    return stream.on("end", () => {
      resolve(items);
    });
  });
};

const sendMoneyToAll = async () => {
  const keys = require("fs")
    .readFileSync("secrets.txt", "utf-8")
    .split(/\r?\n/);

  for (var i = 0; i < 10; i++) {
    const sender = new Wallet(keys[i], provider);
    console.log("Sending money from " + sender.address);

    for (var j = 0; j < 9; j++) {
      const receiver = new Wallet(keys[9 + i * 9 + j]);
      await sender.sendTransaction({
        to: receiver.address,
        value: ethers.utils.parseEther("0.05"),
      });
    }
  }
};

const checkMoneyForAll = async () => {
  let keys = require("fs").readFileSync("secrets.txt", "utf-8").split(/\r?\n/);
  keys.forEach(async (key: string) => {
    const wallet = new Wallet(key, provider);
    const balance = ethers.utils.formatEther(await wallet.getBalance());

    if (parseFloat(balance) < 0.048)
      console.log(wallet.address + " has " + balance + " matic");
  });
};

const saveBalances = async (fileName: string) => {
  //let keys = require("fs").readFileSync("secrets.txt", "utf-8").split(/\r?\n/);
  let balances = "";
  const votes = await parseElabCSV("data/elabAnswersOKK.csv");

  for (var i = 0; i < votes.length; i = i + 2) {
    const key = votes[i].key;

    const wallet = new Wallet(key, provider);
    const balance = `"${ethers.utils.formatEther(
      await wallet.getBalance(24669113)
    )}","${wallet.address}"`;
    balances += balance + "\n";
  }

  fs.writeFileSync(fileName, balances);
};

const news: Array<string> = [
  "https://www.ansa.it/canale_saluteebenessere/notizie/salute_bambini/medicina/2021/05/11/covidspike-danneggia-direttamente-cellule-di-vasi-sanguigni_6ba56a18-2c1a-48c5-9ae5-51a7204054f9.html",
  "https://www.ilfattoquotidiano.it/2022/01/16/le-universita-dimenticate-vanno-in-ordine-sparso-serve-didattica-integrata-chiudere-e-la-strada-piu-facile-ma-penalizza-i-fuorisede-e-chi-non-ha-aiuti/6453227",
  "https://www.pianetadonne.blog/trasformare-vostri-cari-diamanti-si-puo-anche-italia/",
  "https://www.ogginotizie.eu/attualita/i-completamente-vaccinati-sarebbero-condannati-a-infettarsi-per-sempre-lo-studio-choc-dal-regno-unito/",
  "https://www.mentecomportamento.it/la-donna-che-riconosceva-solo-berlusconi-psicologo-cologno-monzese/",
  "https://www.ogginotizie.eu/attualita/il-parere-degli-avvocati-il-green-pass-si-puo-sostituire-con-lautocertificazione/",
];

const newsRealEvaluation: Array<Outcome> = [
  Outcome.FALSE,
  Outcome.OPINION,
  Outcome.TRUE,
  Outcome.FALSE,
  Outcome.TRUE,
  Outcome.FALSE,
];

const systemEvaluation: Array<Outcome | null> = [
  Outcome.FALSE,
  null,
  Outcome.TRUE,
  Outcome.FALSE,
  Outcome.TRUE,
  Outcome.FALSE,
];

const computeFees = (receipt: any) => {
  return ethers.utils.formatEther(
    receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice)
  );
};
// 0xcB4A9b47cFa6Fa5E1A7a783C7E9221A6fa367206

type BalanceItem = {
  address: string;
  balance: number;
};
const parseBalanceCSV = (path: string) => {
  return new Promise<Array<BalanceItem>>((resolve, reject) => {
    let items: Array<BalanceItem> = [];
    let stream = fs.createReadStream(path);
    stream = stream.pipe(csv());
    stream.on("data", (row: any) => {
      items.push({
        balance: parseFloat(row.balance as string),
        address: row.address as string,
      });
    });

    return stream.on("end", () => {
      resolve(items);
    });
  });
};

const init = async () => {
  // const contractAddress = await deployFirstTime();
  // await saveBalances("balances/middle.txt");

  /*const deployer = new Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
  const submitter = new Wallet(process.env.SUBMITTER_PRIVATE_KEY!, provider);
  const expert = new Wallet(process.env.EXPERT_PRIVATE_KEY!, provider);

  const contract = new Contract(
    process.env.CONTRACT_ADDRESS!,
    ASTRAEA.abi,
    deployer
  );

  console.log("Open events: ");
  const openEvents = await contract.queryFilter(
    contract.filters.PollCreated(),
    24668562,
    24669765
  );
  for (var i = 0; i < openEvents.length; i++) {
    const currentEvent: any = contract.interface.parseLog(openEvents[i]);
    console.log(
      `[PollCreated] ${openEvents[i].blockNumber} ${currentEvent.args._id}`
    );
  }*/

  let diff = "";
  const initBalances = await parseBalanceCSV("balances/middle.txt");
  const endBalances = await parseBalanceCSV("balances/end.txt");

  if (initBalances.length != endBalances.length) {
    console.log("[ERROR] Different lengths");
  } else {
    for (var i = 0; i < initBalances.length; i++) {
      if (initBalances[i].address != endBalances[i].address) {
        console.log("[Error] Different addresses");
        break;
      } else {
        diff += `"${endBalances[i].balance - initBalances[i].balance}", "${
          initBalances[i].address
        }"\n`;
      }
    }
  }

  fs.writeFileSync("balances/diff2.txt", diff);

  /*await saveBalances("balances/init.txt");

  
  console.log("Open events: ");
  const openEvents = await contract.queryFilter(
    contract.filters.PollCreated(),
    24668562,
    24669765
  );
  for (var i = 0; i < openEvents.length; i++) {
    const currentEvent: any = contract.interface.parseLog(openEvents[i]);
    console.log(
      `[PollCreated] ${currentEvent.args._id} ${currentEvent.args._submitter} ${currentEvent.args._url}`
    );
  }

  console.log("Closding events: ");
  const closeEvent = await contract.queryFilter(
    contract.filters.PollClosed(),
    24668562,
    24669765
  );
  for (var i = 0; i < closeEvent.length; i++) {
    const currentEvent: any = contract.interface.parseLog(closeEvent[i]);

    console.log(
      `[PollClosed] ${currentEvent.args._id} ${currentEvent.args._gameOutcome} ${currentEvent.args._votingOutcome} ${currentEvent.args._certOutcome}`
    );
  }

  return;
  listenForEvents(contract);

  var submitterFeesStream = fs.createWriteStream("fees/submitter.txt", {
    flags: "a",
  });
  var votersFeesStream = fs.createWriteStream("fees/voters.txt", {
    flags: "a",
  });
  var expertsFeesStream = fs.createWriteStream("fees/experts.txt", {
    flags: "a",
  });

  const votes = await parseElabCSV("data/elabAnswersOKK.csv");

  for (var newsIndex = 0; newsIndex < news.length; newsIndex++) {
    // 1. submit
    const submitResult = await submitNews(news[newsIndex], contract, submitter);
    submitterFeesStream.write(`"SUBMIT","${computeFees(submitResult)}"\n`);

    // 2. expert
    const newsId = (await getActivePolls(contract))[0];
    const certFee = await contract.MIN_CERT_STAKE({ gasLimit: 300000 });
    const certificationResult = await cerify(
      contract,
      expert,
      newsId,
      certFee,
      newsRealEvaluation[newsIndex]
    );
    expertsFeesStream.write(
      `"CERTIFY","${computeFees(certificationResult)}"\n`
    );

    // 3. buster
    const votingFee = await contract.MAX_VOTE_STAKE({ gasLimit: 300000 });
    for (var i = 0; i < votes.length; i++) {
      if (votes[i].index == newsIndex + 1) {
        const voter = new Wallet(votes[i].key, provider);

        // first, request vote
        const requestVoteResult = await requestVote(contract, voter, votingFee);
        votersFeesStream.write(
          `"REQUEST_VOTE","${voter.address}","${computeFees(
            requestVoteResult
          )}"\n`
        );

        // second, actually vote
        const voteResult = await vote(contract, voter, votes[i].answer);
        votersFeesStream.write(
          `"VOTE","${voter.address}","${computeFees(voteResult)}"\n`
        );
      }
    }

    // 4. withdraw
    for (var i = 0; i < votes.length; i++) {
      if (
        votes[i].index == newsIndex + 1 &&
        (systemEvaluation[newsIndex] == null ||
          votes[i].answer == newsRealEvaluation[newsIndex])
      ) {
        const voter = new Wallet(votes[i].key, provider);
        const withdrawResult = await withdraw(contract, voter, newsId);
        votersFeesStream.write(
          `"WITHDRAW","${voter.address}","${computeFees(withdrawResult)}"\n`
        );
      }
    }
  }

  submitterFeesStream.end();
  votersFeesStream.end();
  expertsFeesStream.end();

  await saveBalances("balances/end.txt");*/
};

init();
/*
listenForEvents(contract);
  const submitResult = await submitNews(news[2], contract, submitter);

  // 2. expert
  const newsId = (await getActivePolls(contract))[0];
  const certFee = await contract.MIN_CERT_STAKE({ gasLimit: 300000 });
  const certificationResult = await cerify(
    contract,
    expert,
    newsId,
    certFee,
    newsRealEvaluation[2]
  );

  // 3. buster
  const votingFee = await contract.MAX_VOTE_STAKE({ gasLimit: 300000 });
  const voterKey =
    "0xbdb09c457d2e4d8b1d511e59e9f81b94a4f2abcd567233a9b0c54aae705862bf";
  const voter = new Wallet(voterKey, provider);

  // first, request vote
  const requestVoteResult = await requestVote(contract, voter, votingFee);

  // second, actually vote
  const voteResult = await vote(contract, voter, Outcome.FALSE);
*/

/*const votes = await parseElabCSV("data/elabAnswersOKK.csv");

  for (var i = 0; i < 20; i = i + 2) {
    const key = votes[i].key;

    const from = new Wallet(key, provider);
    // console.log(from.address);

    for (
      var j = 18 + 18 * i + 2;
      j < 18 + 18 * (i + 1) + 2 && votes.length;
      j = j + 2
    ) {
      const to = new Wallet(votes[j].key, provider);
      await from.sendTransaction({
        to: to.address,
        value: ethers.utils.parseEther("0.05"),
      });
    }
  }*/

/*
const voter = new Wallet(
    "0xbdb09c457d2e4d8b1d511e59e9f81b94a4f2abcd567233a9b0c54aae705862bf",
    provider
  );
  const deployer = new Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
  const submitter = new Wallet(process.env.SUBMITTER_PRIVATE_KEY!, provider);
  const expert = new Wallet(process.env.EXPERT_PRIVATE_KEY!, provider);
  const contract = new Contract(
    process.env.CONTRACT_ADDRESS!,
    ASTRAEA.abi,
    deployer
  );

  listenForEvents(contract);

  await submitNews(news[0], contract, submitter);

  const newsId = (await getActivePolls(contract))[0];
  const certFee = await contract.MIN_CERT_STAKE({ gasLimit: 300000 });
  await cerify(contract, expert, newsId, certFee, newsRealEvaluation[0]);

  const votingFee = await contract.MAX_VOTE_STAKE({ gasLimit: 300000 });
  const requestVoteResult = await requestVote(contract, voter, votingFee);
  const voteResult = await vote(contract, voter, newsRealEvaluation[0]);

  console.log(await voter.getBalance());
  await withdraw(contract, voter, newsId);
  console.log(await voter.getBalance());
  */

/*let counter: Array<Array<number>> = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  for (var i = 0; i < votes.length; i++) {
    const index: number = +votes[i].index;
    counter[index - 1][
      votes[i].answer == Outcome.TRUE
        ? 0
        : votes[i].answer == Outcome.FALSE
        ? 1
        : 2
    ]++;
  }
  for (var i = 0; i < counter.length; i++) {
    console.log(
      `#${i + 1}\nNUMBER:${
        counter[i][0] + counter[i][1] + counter[i][2]
      } \nTRUE: ${counter[i][0]}\nFALSE: ${counter[i][1]}\nOPINION: ${
        counter[i][2]
      }`
    );
  }*/

/*const keys = require("fs")
    .readFileSync("secrets.txt", "utf-8")
    .split(/\r?\n/);
  const votes = await parseCVS("data/answers.csv");

  let data = "";

  if (keys.length != votes.length) {
    console.log("different sizes");
    return;
  }

  for (var i = 0; i < votes.length; i++) {
    const currentVote = votes[i];
    data += `"${keys[i]}","${currentVote.firstAnswerIndex}", "${
      currentVote.firstAnswer
    }"\n"${keys[i]}","${+currentVote.secondAnswerIndex + +3}","${
      currentVote.secondAnswer
    }"\n`;
  }

  fs.writeFileSync("data/elabAnswers.csv", data);
*/

/**
 for (var i = 0; i < 4; i++) {
    const receiver = Wallet.createRandom();
    await wallet.sendTransaction({
      to: receiver.address,
      value: ethers.utils.parseEther("0.05"),
    });
    console.log(receiver.privateKey);
  }

 */

/*let data = ""; 
  items.forEach((item : AnswerItem) => {
    const wallet = Wallet.createRandom(); 
    data += wallet.privateKey + "\n"; 
  }); 
  fs.writeFileSync("secrets.txt", data)*/

/*const wallet = new Wallet(
    "0x4300c95015434808c7fae9319c9f2410ab97516bd9e53984cd83db234233ec08"
  );
  console.log(wallet.address);

  const wallet2 = new Wallet(
    "0x1c5363dd55b6de0cfaf7ead7dd0c8af689796c7c8eec0199a5e4fcc86e3dbb61"
  );
  console.log(wallet2.address);*/
