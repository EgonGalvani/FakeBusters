// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;

contract ASTRAEA {
    
    event PollCreated(uint256 indexed _id, address indexed _submitter, string _url); 
    event PollClosed(uint256 indexed _id, Outcome _gameOutcome, Outcome _votingOutcome, Outcome _certOutcome); 

    enum Outcome { FALSE, TRUE, NO_DECISION }

    struct Belief {
        uint256 trueStake; 
        uint256 falseStake; 
    }
 
    struct Poll {
        address submitter; 
        bool open;

        uint256 totalTrueVoteStake; 
        uint256 totalFalseVoteStake; 
        mapping(address => Belief) votes; 

        uint256 totalTrueCertStake;
        uint256 totalFalseCertStake; 
        mapping(address => Belief) certs; 

        // outcomes 
        Outcome votingOutcome; 
        Outcome certOutcome; 
        Outcome gameOutcome; 

        uint256 certReward; 
    }

    // all polls 
    mapping(uint256 => Poll) polls; 

    // active polls
    uint256[] public activePolls; 
    mapping(uint256 => uint256) pollToIndex; 

    function getActivePolls() public view returns(uint256[] memory) {
        return activePolls; 
    }

    function addActivePoll(uint256 pollId) public {
        activePolls.push(pollId); 
        pollToIndex[pollId] = activePolls.length; // store the index+1 (to avoid problems since default for uint is 0)  
    }

    function removeActivePoll(uint256 pollId) public {
        uint index = pollToIndex[pollId]; 
        require(index > 0); // otherwise means that the poll is not inside the activePolls array 

        // swap the last and the removed elements 
        if(activePolls.length > 1) {
            activePolls[index-1] = activePolls[activePolls.length-1]; 
            pollToIndex[activePolls[index-1]] = index;  // store always the index+1
        }
        activePolls.pop(); // remove last element and update length 
    }

    uint256 public constant MAX_VOTE_STAKE = 200; // this should be lower than VOTE_STAKE_LIMIT 
    uint256 public constant MIN_CERT_STAKE = 50; 
    uint256 public constant VOTE_STAKE_LIMIT = 100; 
    uint256 public constant SUBMISSION_FEE = 200; 

    uint256 trueRewardPool = 0; 
    uint256 falseRewardPool = 0; 
    uint256 tetha = 10; 

    /** SUBMITTER **/ 
    function submit(string memory url) public payable { 
        // check minimum submission fee 
        require(msg.value >= SUBMISSION_FEE); 

        // check that the url has not been already sent     
        uint256 hash = uint(keccak256(abi.encodePacked(url)));
        require(polls[hash].submitter == address(0)); 

        // set the poll to active status 
        polls[hash].submitter = msg.sender; 
        polls[hash].open = true; 

        // add poll to the active polls 
        addActivePoll(hash); 

        emit PollCreated(hash, msg.sender, url); 
    }

    /** VOTER **/ 
    function random() public view returns(uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender)));  
    }

    struct VoteReservation {
        uint256 pollId; 
        uint256 stake; 
    }
    mapping(address => VoteReservation) public voterReservations;  
    function requestVote() public payable {
        // check the voter has not already request an id (assume no poll has id == 0) 
        require(voterReservations[msg.sender].pollId == 0); 

        // check max voting stake 
        require(msg.value <= MAX_VOTE_STAKE); 
        
        // get id of random poll 
        uint randomIndex = random() % activePolls.length;  
        uint256 randomId = activePolls[randomIndex]; 

        // store the reservation 
        VoteReservation memory voteReservation = VoteReservation({pollId: randomId, stake: msg.value});
        voterReservations[msg.sender] = voteReservation; 
    }

    function vote(bool belief) public {
        // check that the voter has previously request a reservation 
        VoteReservation storage reservation = voterReservations[msg.sender]; 
        require(reservation.pollId != 0); 

        Poll storage currentPoll = polls[reservation.pollId];  

        // check that the poll actually exist and its open 
        require(currentPoll.submitter != address(0));
        require(currentPoll.open == true); 

        // check maximum voting stake ??? 
        // require(reservation.stake + polls[reservation.pollId].votes[msg.sender] <= MAX_VOTE_STAKE);  
        
        if(belief) {
            currentPoll.votes[msg.sender].trueStake += reservation.stake; 
            currentPoll.totalTrueVoteStake += reservation.stake; 
        } else {
            currentPoll.votes[msg.sender].falseStake += reservation.stake; 
            currentPoll.totalFalseVoteStake += reservation.stake; 
        }        

        // Termination condition 
        if(currentPoll.totalTrueVoteStake + currentPoll.totalFalseVoteStake >= VOTE_STAKE_LIMIT) {
            currentPoll.open = false; 
            
            // set outcomes 
            currentPoll.votingOutcome = currentPoll.totalFalseVoteStake == currentPoll.totalTrueVoteStake
                ? Outcome.NO_DECISION : currentPoll.totalFalseVoteStake > currentPoll.totalTrueVoteStake ? 
                    Outcome.FALSE : Outcome.TRUE; 
                    
            currentPoll.certOutcome = currentPoll.totalFalseCertStake == currentPoll.totalTrueCertStake
                ? Outcome.NO_DECISION : currentPoll.totalFalseCertStake > currentPoll.totalTrueCertStake ? 
                    Outcome.FALSE : Outcome.TRUE; 
            
            currentPoll.gameOutcome = currentPoll.votingOutcome == currentPoll.certOutcome ? 
                currentPoll.votingOutcome : Outcome.NO_DECISION; 

            if(currentPoll.gameOutcome == Outcome.NO_DECISION) {
                // if no decision is taken, the submission fee goes to the reward pools 
                trueRewardPool += SUBMISSION_FEE; 

                // reward pools swap
                if(currentPoll.certOutcome == Outcome.TRUE) {
                    falseRewardPool += trueRewardPool / tetha; 
                } else if(currentPoll.certOutcome == Outcome.FALSE) {
                    trueRewardPool += falseRewardPool / tetha; 
                }
            } else {
                // save the reward to give to the certifiers 
                if(currentPoll.certOutcome == Outcome.TRUE) {
                    currentPoll.certReward = trueRewardPool / tetha; 
                } else if(currentPoll.certOutcome == Outcome.FALSE) {
                    currentPoll.certReward = falseRewardPool / tetha; 
                }
            }
        
            // emit closing event 
            emit PollClosed(reservation.pollId, currentPoll.gameOutcome, currentPoll.votingOutcome, currentPoll.certOutcome); 

            // remove poll from activePolls 
            removeActivePoll(reservation.pollId); 
        }

        // delete reservation (all values are set to 0 or default) 
        delete voterReservations[msg.sender]; 
    }

    /** CERTIFIER **/ 
    function certify(uint256 pollId, bool belief) public payable {
        // check that the poll actually exist and its open 
        require(polls[pollId].submitter != address(0));
        require(polls[pollId].open == true); 

        // check min voting stake 
        require(msg.value >= MIN_CERT_STAKE);  
        
        if(belief) {
            polls[pollId].certs[msg.sender].trueStake += msg.value; 
            polls[pollId].totalTrueCertStake += msg.value; 
        } else {
            polls[pollId].certs[msg.sender].falseStake += msg.value; 
            polls[pollId].totalFalseCertStake += msg.value; 
        }
     
    }

    event Reward(uint256 value); 
    function withdraw(uint256 poolId) public payable{
        Poll storage currentPoll = polls[poolId]; 
        require(currentPoll.open == false); 

        uint256 reward = 0; 
    
        // check votes 
        if(currentPoll.gameOutcome == Outcome.NO_DECISION) 
            reward += currentPoll.votes[msg.sender].trueStake + currentPoll.votes[msg.sender].falseStake; 
        else if(currentPoll.gameOutcome == Outcome.TRUE && currentPoll.votes[msg.sender].trueStake > 0)
            reward += currentPoll.votes[msg.sender].trueStake / currentPoll.totalTrueVoteStake * SUBMISSION_FEE; 
        else if(currentPoll.gameOutcome == Outcome.FALSE && currentPoll.votes[msg.sender].falseStake > 0)
            reward += currentPoll.votes[msg.sender].falseStake / currentPoll.totalFalseVoteStake * SUBMISSION_FEE; 

        // check certs 
        if(currentPoll.gameOutcome == Outcome.TRUE && currentPoll.certs[msg.sender].trueStake > 0)
            reward += currentPoll.certReward / currentPoll.totalTrueCertStake * currentPoll.certs[msg.sender].trueStake; 
        else if (currentPoll.gameOutcome == Outcome.FALSE && currentPoll.certs[msg.sender].falseStake > 0)
            reward += currentPoll.certReward / currentPoll.totalFalseCertStake * currentPoll.certs[msg.sender].falseStake;            
    
        emit Reward(reward); 

        // send reward
        if(reward > 0) {
            (bool sent, bytes memory data) = msg.sender.call{value: reward}("");
            require(sent, "Failed to send Ether");
        }
    }   
}
