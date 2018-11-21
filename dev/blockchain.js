const sha256 = require('sha256');
const uuid = require('uuid/v1');
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
            recipient: recipient,
            transactionId: uuid().split('-').join('')
        };

        return newTransaction;
        
    };

    addTransactionToPending(transactionObj){
        this.pendingTransactions.push(transactionObj);
        return this.getLastBlock()['index'] + 1;
    }

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

    chainIsValid(blockchain){
        let validChain = true;

        for(let i = 1; i < blockchain.length; i++){
            const currentBlock = blockchain[i];
            const prevBlock = blockchain[i - 1];
            const blockHash = this.blockHash(prevBlock['hash'], { transactions: currentBlock['transactions'], index: currentBlock['index'] }, currentBlock['nonce']);

            if(blockHash.substr(0, 4) !== '0000') validChain = false;
            if(currentBlock['prevBlockHash'] !== prevBlock['hash']) validChain = false;
        };

        const genisisBlock = blockchain[0];
        const correctNonce = genisisBlock['nonce'] === 100
        const correctPrevBlockHash = genisisBlock['prevBlockHash'] === 0;
        const correctBlockHash = genisisBlock['hash'] === 0;
        const correctTransactions = genisisBlock['transactions'].length === 0;

        if(!correctNonce || !correctPrevBlockHash || !correctBlockHash || !correctTransactions) validChain = false;

        return validChain;
    }

}

module.exports = Blockchain;