import { Outcome } from "./types/outcome";

require("dotenv").config();

// let keys = require("fs").readFileSync("secrets.txt", "utf-8").split(/\r?\n/);

const newsUrls: Array<string> = [""];

// correct evaluation of each piece of news
const newsRealEvaluation: Map<string, Outcome> = new Map([
  // [newsUrl, evaluation]
]);

// evaluations given by the system
// null = NO_DECISION
type SystemOutcome = Outcome | null;
const systemEvaluation: Map<string, SystemOutcome> = new Map([]);

const init = async () => {};

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
/*
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
//};

//init();
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
