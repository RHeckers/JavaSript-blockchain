const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const uuid = require('uuid/v1');
const requestPromise = require('request-promise')

const port = process.argv[2];
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

app.post('/register-and-broadcast-node', (req, res) => {
    const newNodeURL = req.body.newNodeURL;

    if(bitcoin.networkNodes.indexOf(newNodeURL) == -1) bitcoin.networkNodes.push(newNodeURL);

    const regNodesPromises = [];

    bitcoin.networkNodes.forEach(nodeURL => {
        const requestOptions = {
            uri: networkNodeUrl + 'register-node',
            method: 'POST',
            body: { newNodeURL: newNodeURL},
            json: true
        }

        regNodesPromises.push(requestPromise(requestOptions));
    });

    Promise.all(regNodesPromises).then(data => {
        const bulkRegOptions = {
            uri: networkNodeUrl + 'register-nodes-bulk',
            method: 'POST',
            body: { allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeURL]},
            json: true
        };

        return requestPromise(bulkRegOptions);
    }).then(data => {
        res.json({
            note: "New node successfully registered to the network"
        })
    });
});

app.post('/register-node', (req, res) => {
    const newNodeURL = req.body.newNodeURL;
    
    if(notPresentAndNotCurrent(newNodeURL)) bitcoin.networkNodes.push(newNodeURL);

    res.json({
        note: "New node registered successfully."
    });
});

app.post('/register-nodes-bulk', (req, res) => {
    const allNetworkNodes = req.body.allNetworkNodes;

    allNetworkNodes.forEach(node => {
        if(notPresentAndNotCurrent(node)) bitcoin.networkNodes.push(node);
    });

    res.json({ note: 'Bulk registered successfull'});
});

app.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});

notPresentAndNotCurrent = (node, newNodeURL=null) => {
    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(node) == -1;
    let notCurrentNode;
    if(newNodeURL !== null){
        notCurrentNode = bitcoin.currentNodeURL !== newNodeURL;
    }else{
        notCurrentNode = bitcoin.currentNodeURL !== node;        
    }
    if(nodeNotAlreadyPresent && notCurrentNode) return true;
}