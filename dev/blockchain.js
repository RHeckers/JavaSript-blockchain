const sha256 = require('sha256');
const currentURL = process.argv[3];

class Blockchain {

    constructor(){
        this.chain = [];
        this.pendingTransactions = [];

        this.currentNodeURL = currentURL;
        this.networkNodes = [];

        //Create genisis block
        this.createNewBlock(100, '0', '0');
    }

    createNewBlock(nonce, prevBlockHash, hash){
        const newBlock = {
            index: this.chain.length + 1,
            timestamp: Date.now(),
            transactions: this.pendingTransactions,
            nonce: nonce,
            hash: hash,
            prevBlockHash: prevBlockHash
        };
        
        this.pendingTransactions = [];
        this.chain.push(newBlock);

        return newBlock;
    };

    createNewTransaction(amount, sender, recipient){
        const newTransaction = {
            amount: amount, 
            sender: sender,
            recipient: recipient
        };

        this.pendingTransactions.push(newTransaction);

        return this.getLastBlock()['index'] + 1;
    };

    getLastBlock(){
        return this.chain[this.chain.length - 1];
    }

    hashBlock(prevBlockHash, currentBlockData, nonce){
        const dataAsString = prevBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
        const hash = sha256(dataAsString);
        return hash;        
    };

    proofOfWork(prevBlockHash, currentBlockData){
        //Hash block until you find a hash that starts with 0000
        let nonce = 0;
        let hash = this.hashBlock(prevBlockHash, currentBlockData, nonce);

        while(hash.substr(0, 4) !== '0000'){
            nonce++;
            hash = this.hashBlock(prevBlockHash, currentBlockData, nonce);
        }

        return nonce;
    }

}

module.exports = Blockchain;