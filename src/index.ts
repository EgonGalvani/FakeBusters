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
const newsRealEvaluation: Map<string, Outcome> = new Map([
  // [newsUrl, evaluation],
  ["https://www.ansa.it/canale_saluteebenessere/notizie/salute_bambini/medicina/2021/05/11/covidspike-danneggia-direttamente-cellule-di-vasi-sanguigni_6ba56a18-2c1a-48c5-9ae5-51a7204054f9.html", Outcome.FALSE],
  ["https://www.ilfattoquotidiano.it/2022/01/16/le-universita-dimenticate-vanno-in-ordine-sparso-serve-didattica-integrata-chiudere-e-la-strada-piu-facile-ma-penalizza-i-fuorisede-e-chi-non-ha-aiuti/6453227/", Outcome.OPINION],
  ["https://www.pianetadonne.blog/trasformare-vostri-cari-diamanti-si-puo-anche-italia/", Outcome.TRUE],
  ["https://www.infowars.com/posts/sweden-democrats-ban-all-refugees-except-ukrainians/", Outcome.FALSE],	
  ["https://www.bbc.com/news/technology-60709208", Outcome.TRUE],	
  ["https://www.fixthisnation.com/police-disarm-st-louis-couple-who-defended-their-home-from-wild-protesters/", Outcome.OPINION],	
  ["https://www.investmentwatchblog.com/a-shockingly-high-percentage-of-the-u-s-population-actually-wants-an-authoritarian-big-brother-police-state/", Outcome.OPINION],	
  ["https://www.globalresearch.ca/the-incidence-of-cancer-triggered-by-the-covid-19-vaccine/5758110", Outcome.FALSE],
  ["https://www.healio.com/news/primary-care/20201208/this-was-a-gift-to-us-ivermectin-effective-for-covid19-prophylaxis-treatment", Outcome.FALSE],	
  ["https://www.euronews.com/2022/01/06/italian-mafia-fugitive-arrested-after-being-spotted-on-google-maps-street-view", Outcome.TRUE],	
  ["https://www.activistpost.com/2021/09/what-exactly-is-this-great-reset-people-keep-talking-about.html", Outcome.FALSE],	
  ["https://www.dailymail.co.uk/tvshowbiz/article-10633905/Netflix-tones-sex-scenes-Bridgerton-series-two.html", Outcome.OPINION],	
  ["https://www.dailymail.co.uk/property/article-10626953/Property-prices-hit-record-high-354-564-demand-exceeds-supply.html", Outcome.TRUE],	
  ["https://www.ogginotizie.eu/attualita/i-completamente-vaccinati-sarebbero-condannati-a-infettarsi-per-sempre-lo-studio-choc-dal-regno-unito/", Outcome.FALSE],
  ["https://www.mentecomportamento.it/la-donna-che-riconosceva-solo-berlusconi-psicologo-cologno-monzese/", Outcome.TRUE],	
  ["https://www.ogginotizie.eu/attualita/il-parere-degli-avvocati-il-green-pass-si-puo-sostituire-con-lautocertificazione/", Outcome.FALSE],		
  ["https://edition.cnn.com/2022/03/15/media/fox-cameraman-killed-pierre-zakrzewski/index.html", Outcome.TRUE],	
  ["https://worldnewsdailyreport.com/japanese-whaling-crew-eaten-alive-by-killer-whales-16-dead/", Outcome.FALSE],
  ["https://www.cnbc.com/2022/01/11/crypto-scams-are-the-top-threat-to-investors-by-far-say-regulators.html", Outcome.OPINION],
  ["https://www.realmicentral.com/2022/03/15/europe-wants-removable-and-replaceable-batteries/", Outcome.TRUE],	
  ["https://www.theguardian.com/world/2022/mar/21/when-is-a-window-not-a-window-bewleys-cafe-claims-stained-glass-are-moveable-artworks-in-court", Outcome.OPINION],	
  ["https://football-italia.net/dybala-will-leave-juventus-at-the-end-of-the-season-as-contract-talks-collapse/", Outcome.TRUE],	
  ["https://www.theguardian.com/world/2022/mar/19/china-reports-first-coronavirus-deaths-in-over-a-year-amid-omicron-surge", Outcome.TRUE],	
  ["https://dailybuzzlive.com/human-meat-found-mcdonalds-meat-factory/", Outcome.FALSE],	
  ["https://www.washingtonpost.com/opinions/2022/03/18/texas-kkk-building-white-supremacy-arts-center/", Outcome.OPINION],	
  ["https://beforeitsnews.com/health/2022/03/uk-government-report-shows-9-out-of-10-covid-19-deaths-occur-in-fully-vaxxed-3044826.html", Outcome.FALSE]
]);

const news: Array<string> = [
  "https://www.ansa.it/canale_saluteebenessere/notizie/salute_bambini/medicina/2021/05/11/covidspike-danneggia-direttamente-cellule-di-vasi-sanguigni_6ba56a18-2c1a-48c5-9ae5-51a7204054f9.html",
  "https://www.ilfattoquotidiano.it/2022/01/16/le-universita-dimenticate-vanno-in-ordine-sparso-serve-didattica-integrata-chiudere-e-la-strada-piu-facile-ma-penalizza-i-fuorisede-e-chi-non-ha-aiuti/6453227/",
  "https://www.pianetadonne.blog/trasformare-vostri-cari-diamanti-si-puo-anche-italia/",
  "https://www.infowars.com/posts/sweden-democrats-ban-all-refugees-except-ukrainians/",	
  "https://www.bbc.com/news/technology-60709208",	
  "https://www.fixthisnation.com/police-disarm-st-louis-couple-who-defended-their-home-from-wild-protesters/",	
  "https://www.investmentwatchblog.com/a-shockingly-high-percentage-of-the-u-s-population-actually-wants-an-authoritarian-big-brother-police-state/",	
  "https://www.globalresearch.ca/the-incidence-of-cancer-triggered-by-the-covid-19-vaccine/5758110",
  "https://www.healio.com/news/primary-care/20201208/this-was-a-gift-to-us-ivermectin-effective-for-covid19-prophylaxis-treatment",	
  "https://www.euronews.com/2022/01/06/italian-mafia-fugitive-arrested-after-being-spotted-on-google-maps-street-view",	
  "https://www.activistpost.com/2021/09/what-exactly-is-this-great-reset-people-keep-talking-about.html",	
  "https://www.dailymail.co.uk/tvshowbiz/article-10633905/Netflix-tones-sex-scenes-Bridgerton-series-two.html",	
  "https://www.dailymail.co.uk/property/article-10626953/Property-prices-hit-record-high-354-564-demand-exceeds-supply.html",	
  "https://www.ogginotizie.eu/attualita/i-completamente-vaccinati-sarebbero-condannati-a-infettarsi-per-sempre-lo-studio-choc-dal-regno-unito/",
  "https://www.mentecomportamento.it/la-donna-che-riconosceva-solo-berlusconi-psicologo-cologno-monzese/",	
  "https://www.ogginotizie.eu/attualita/il-parere-degli-avvocati-il-green-pass-si-puo-sostituire-con-lautocertificazione/",		
  "https://edition.cnn.com/2022/03/15/media/fox-cameraman-killed-pierre-zakrzewski/index.html",	
  "https://worldnewsdailyreport.com/japanese-whaling-crew-eaten-alive-by-killer-whales-16-dead/",
  "https://www.cnbc.com/2022/01/11/crypto-scams-are-the-top-threat-to-investors-by-far-say-regulators.html",
  "https://www.realmicentral.com/2022/03/15/europe-wants-removable-and-replaceable-batteries/",	
  "https://www.theguardian.com/world/2022/mar/21/when-is-a-window-not-a-window-bewleys-cafe-claims-stained-glass-are-moveable-artworks-in-court",	
  "https://football-italia.net/dybala-will-leave-juventus-at-the-end-of-the-season-as-contract-talks-collapse/",	
  "https://www.theguardian.com/world/2022/mar/19/china-reports-first-coronavirus-deaths-in-over-a-year-amid-omicron-surge",	
  "https://dailybuzzlive.com/human-meat-found-mcdonalds-meat-factory/",	
  "https://www.washingtonpost.com/opinions/2022/03/18/texas-kkk-building-white-supremacy-arts-center/",	
  "https://beforeitsnews.com/health/2022/03/uk-government-report-shows-9-out-of-10-covid-19-deaths-occur-in-fully-vaxxed-3044826.html"
];

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
