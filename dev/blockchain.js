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

        while(hash.substring(0, 4) !== '0000'){
            nonce++;
            hash = this.hashBlock(prevBlockHash, currentBlockData, nonce);
        }

        return nonce;
    }

    chainIsValid(blockchain){
        let validChain = true;

        for (var i = 1; i < blockchain.length; i++) {
            const currentBlock = blockchain[i];
            console.log('Current block = ', currentBlock)
            const prevBlock = blockchain[i - 1];
            const blockHash = this.hashBlock(prevBlock['hash'], { transactions: currentBlock['transactions'], index: currentBlock['index'] }, currentBlock['nonce']);
            
            console.log("One", validChain);

            if (blockHash.substring(0, 4) !== '0000') validChain = false;
            console.log("Two",validChain);
            
            console.log(currentBlock['prevBlockHash'], prevBlock['hash'])
            if (currentBlock['prevBlockHash'] !== prevBlock['hash']) validChain = false;
            console.log("Three", validChain);

        };
    
        const genesisBlock = blockchain[0];
        const correctNonce = genesisBlock['nonce'] === 100;
        const correctPreviousBlockHash = genesisBlock['prevBlockHash'] === '0';
        const correctHash = genesisBlock['hash'] === '0';
        const correctTransactions = genesisBlock['transactions'].length === 0;
    
        if (!correctNonce || !correctPreviousBlockHash || !correctHash || !correctTransactions) validChain = false;
        console.log("Four", validChain);
        
        return validChain;
    }

}

module.exports = Blockchain;