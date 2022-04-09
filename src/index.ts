import { Provider } from "@ethersproject/abstract-provider";
import { BigNumber, Contract, utils, Wallet } from "ethers";
import { FakeBusters } from "./FakeBusters";
import { Outcome } from "./types/outcome";
import {
  SystemOutcome,
  fromBigNumber as bigNumberToSystemOutcome,
} from "./types/systemOutcome";
import { Vote } from "./types/vote";
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

  // evaluations given by the system
  let systemEvaluation: Map<string, SystemOutcome> = new Map([]);

  // map: news url => [vote1, vote2, ...voteN]
  const votes: Map<string, Array<Vote>> = await parseVotes(
    "data/raw/answer.csv"
  );

  // object used to connect to the smart contract
  // if no address is passed, a new contract is created
  const contract: FakeBusters = await FakeBusters.build(provider);

  const pollCreatedHandler = (
    id: BigNumber,
    submitter: string,
    url: string
  ) => {
    console.log(`[PollCreated] ${id} ${submitter} ${url}`);

    urlIds.set(id, url);
  };

  const pollClosedHandler = (
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
        const withdrawResult = await contract.withdraw(voter, id);
      }
    });
  };

  // submitter and expert wallets
  const submitter = new Wallet(process.env.SUBMITTER_PRIVATE_KEY!, provider);
  const expert = new Wallet(process.env.EXPERT_PRIVATE_KEY!, provider);

  // listen for events (open, closed poll(s))
  contract.listenForEvents(pollCreatedHandler, pollClosedHandler);

  // execute the evaluation process for each news
  news.forEach(async (currentNews: string) => {
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

    currentVotes.forEach(async (vote: Vote) => {
      const voter = new Wallet(vote.account, provider);

      // first, request vote
      const requestVoteResult = await contract.requestVote(voter, votingFee);

      // second, actually vote
      const voteResult = await contract.vote(voter, vote.answer);
    });
    // ===== VOTING FOR THE CURRENT PIECE OF NEWS ENDS =====
  });
};

init();
