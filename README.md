# FakeBusters: a Voting-Based Game for Fake News Detection
FakeBuster is an academic project, developed with the purpose of allowing the detection of Fake News, using a decentralized approach. The goal of this project is to provide a democratic way to manage the choice of which news should be marked as fake, in order to prevent possible bias from centralized entities. 

A paper dedicated to a more thorough discussion of the system can be found at the following link: *[TBA when paper is published]*

The system was developed using Solidity smart contracts, and it runs a truth discovery algorithm for the identification of Fake News through a voting-based game.

## System overview
![Screenshot 2022-01-16 at 11 48 37 (1)](https://user-images.githubusercontent.com/16836365/161933047-c15a342b-d458-4fa0-8beb-cb7d3b72b686.png)

This system manages three main roles:
* *Submitter*: user who submits a piece of news for an evaluation by the system.
* *Buster*: user who bet a low amount of money on the result of an evaluation, and obtain a small reward if right.
* *Expert*: user who bet an high amount of money on the result of an evaluation, and obtain a big reward if right.

And three possible evaluation choices/outcomes:
* *True*: if the evaluated piece of news is considered to be real.
* *False*: if the evaluated piece of news is considered to be fake.
* *Opinion*: if the evaluated piece of news is considered to be an opinion article.
<br/>

The workflow for the evaluation of a piece of news is the following:
1. A submitter communicates to the system a piece of news to be evaluated.
2. The busters and the experts stake their money to bet on the result they believe to be correct.
3. If the outcomes for, respectively, most of the busters and most of the experts match on a single one, then this is the final result of the evaluation.
    * If the outcomes do not match, the final result of the evaluation will be *Unknown*.
<img src="https://user-images.githubusercontent.com/16836365/161933715-9f5c029d-a6ec-4da5-b0cf-432801b12f02.png" width="525" height="150" />

4. Finally, the votation participants will receive their rewards.

## Requirements

## Installation
