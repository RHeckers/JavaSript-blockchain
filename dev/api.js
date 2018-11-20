const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const uuid = require('uuid/v1');

const nodeAddress = uuid().split('-').join('');

const Blockchain = require('./blockchain');

const bitcoin = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/blockchain', (req, res) => {
    res.send(bitcoin);    
});

app.get('/mine', (req, res) => {
    const lastBlock = bitcoin.getLastBlock();
    const lastBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions: bitcoin.pendingTransactions,
        index: lastBlock['index'] + 1
    }

    const nonce = bitcoin.proofOfWork(lastBlockHash, currentBlockData);

    const blockHash = bitcoin.hashBlock(lastBlock, currentBlockData, nonce);

    bitcoin.createNewTransaction(12.5, "00", nodeAddress);

    const newBlock = bitcoin.createNewBlock(nonce, lastBlockHash, blockHash);

    res.json({
        note: "New block mined successfully",
        block: newBlock
    });
    
});

app.post('/transaction', (req, res) => {
    const blockIndex = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
    res.json({ note: `Transaction will be added in block ${blockIndex}.`});
    
});

app.listen(3000, () => {
    console.log('Listening on port 3000...');
});