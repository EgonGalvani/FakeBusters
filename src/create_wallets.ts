import {ethers} from 'ethers'; 
const fs = require('fs');

const init = async () => {
	let walletInfos: string = ""; 
	
	for(var i = 0; i < 29; i++) {
		const wallet = ethers.Wallet.createRandom(); 
		walletInfos += `"${wallet.address}","${wallet.privateKey}"\n`; 
	}
	
	fs.writeFileSync('/bellissimi.txt', walletInfos);
}; 


init(); 