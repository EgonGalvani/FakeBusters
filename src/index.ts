import { Provider } from "@ethersproject/abstract-provider";
import { BigNumber, Contract, utils, Wallet } from "ethers";
import { FakeBusters } from "./FakeBusters";
import { Outcome } from "./types/outcome";
import {
  SystemOutcome,
  fromBigNumber as bigNumberToSystemOutcome,
} from "./types/systemOutcome";
import { Vote } from "./types/vote";
import { saveBalances } from "./utils/balance";
import { parseVotes } from "./utils/csv";
import { getProvider } from "./utils/eth";

require("dotenv").config();

// correct evaluation of each piece of news
// TODO: fill this map
const newsRealEvaluation: Map<string, Outcome> = new Map([
  // [newsUrl, evaluation],
]);

// TODO: fill with the news srcs
const news: Array<string> = [];

const init = async () => {
  // id -> news url
  let urlIds: Map<BigNumber, string> = new Map([]);

  // provider used to connect to the considered network
  let provider: Provider = getProvider();

  console.log("Provider connected");
  // evaluations given by the system
  let systemEvaluation: Map<string, SystemOutcome> = new Map([]);

  console.log("Evaluations initialized");
  // map: news url => [vote1, vote2, ...voteN]
  const votes: Map<string, Array<Vote>> = await parseVotes(
    "data/raw/answer.csv"
  );
  console.log("Data loaded");
  // object used to connect to the smart contract
  // if no address is passed, a new contract is created
  const contract: FakeBusters = await FakeBusters.build(provider);
  console.log("Contract built");
  
  const pollCreatedHandler = (
    id: BigNumber,
    submitter: string,
    url: string
  ) => {
    console.log(`[PollCreated] ${id} ${submitter} ${url}`);

    urlIds.set(id, url);
  };

  const pollClosedHandler = async (
    id: BigNumber,
    gameOutcome: BigNumber,
    votingOutcome: BigNumber,
    certOutcome: BigNumber
  ) => {
    console.log(
      `[PollClosed] ${id} ${gameOutcome} ${votingOutcome} ${certOutcome}`
    );

    // url of the current news
    const currentNews: string = urlIds.get(id)!;

    // add system evaluation of the current piece of news to the systemEvaluation map
    systemEvaluation.set(currentNews, bigNumberToSystemOutcome(gameOutcome));

    let promises: Promise<any>[] = [];
    votes.get(currentNews)?.forEach(async (vote: Vote) => {
      /* withdraw only if one of the following statements is true: 
      - the considered piece of news is evaluated as null (NO_DECISION) by the system 
      - the user has voted correctly
    */
      if (
        systemEvaluation.get(currentNews) == null ||
        vote.answer == systemEvaluation.get(currentNews)
      ) {
        const voter = new Wallet(vote.account, provider);
        promises.push(contract.withdraw(voter, id));
      }
    });

    await Promise.all(promises);
  };

  // submitter and expert wallets
  const submitter = new Wallet(process.env.SUBMITTER_PRIVATE_KEY!, provider);
  const expert = new Wallet(process.env.EXPERT_PRIVATE_KEY!, provider);

  // listen for events (open, closed poll(s))
  contract.listenForEvents(pollCreatedHandler, pollClosedHandler);

  let voters: Wallet[] = [];
  votes.get(news[0])?.forEach((el)=>{
    voters.push(new Wallet(el.account, provider));
    console.log("New voter %s added", el.account);
  });

  let i = 0;
  saveBalances(voters, "balances_0");

  console.log("The votations have started");
  // execute the evaluation process for each news
  news.every(async (currentNews: string) => {
    if (i == 13) {
      saveBalances(voters, "balances_1");
    }
    console.log("Now voting on %s", currentNews);

    // 1. submit
    const submitResult = await contract.submitNews(currentNews, submitter);

    // 2. expert
    const newsId = (await contract.getActivePolls())[0];
    const certFee = await contract.getMinCertFee();
    const certificationResult = await contract.cerify(
      expert,
      newsId,
      certFee,
      newsRealEvaluation.get(currentNews)! // the expert certify in the correct way TODO: check toBigNumber
    );

    // 3. buster
    const votingFee = await contract.getMaxVotingFee();
    const currentVotes = votes.get(currentNews)!;

    let requestVotePromises : Promise<any>[] = []; 
    currentVotes.forEach(async (vote: Vote) => {
      const voter = new Wallet(vote.account, provider);
      // first, request vote
      requestVotePromises.push(contract.requestVote(voter, votingFee)); 
    });
    await Promise.all(requestVotePromises); 

    let votePromises : Promise<any>[] = []; 
    currentVotes.forEach(async (vote: Vote) => {
      const voter = new Wallet(vote.account, provider);
      
      // second, actually vote
      votePromises.push(contract.vote(voter, vote.answer)); 
    });
    await Promise.all(votePromises); 

    i++;
    return false;
    // ===== VOTING FOR THE CURRENT PIECE OF NEWS ENDS =====
  });
  saveBalances(voters, "balances_2");
};

init();
