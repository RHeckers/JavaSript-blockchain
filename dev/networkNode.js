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
    const newBlock = bitcoin.createNewBlock(nonce, lastBlockHash, blockHash);
    const promiseArr = [];

    bitcoin.networkNodes.forEach(nodeURL => {
        const requestOptions = {
            uri: nodeURL + '/receive-new-block',
            method: 'POST',
            body: { newBlock: newBlock },
            json: true
        }
        promiseArr.push(requestPromise(requestOptions));
    });

    Promise.all(promiseArr).then(data => {
        const requestOptions = {
            uri: bitcoin.currentNodeURL + '/transaction/broadcast',
            method: 'POST',
            body: { 
                amount: '12.5',
                sender: '00',
                recipient: nodeAddress
            },
            json: true
        };

        return requestPromise(requestOptions);

    }).then(data => {
        res.json({
            note: "New block mined and broadcasted successfully",
            block: newBlock
        });
    });
});

app.post('/transaction', (req, res) => {
        const newTransaction = req.body;
        const blockIndex = bitcoin.addTransactionToPending(newTransaction);
        console.log(123)
        res.json({ note: `Transaction will be added in Block ${blockIndex}`});
});

app.post('/transaction/broadcast', (req, res) => {
    const newTransaction = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
    bitcoin.addTransactionToPending(newTransaction);

    console.log(bitcoin.networkNodes)
    const requestPromises = [];
    bitcoin.networkNodes.forEach(nodeURL => {
        const requestOptions = {
            uri: nodeURL + '/transaction',
            method: 'POST',
            body: { newTransaction: newTransaction},
            json: true
        };

        requestPromises.push(requestPromise(requestOptions));
    });

    Promise.all(requestPromises).then(data => {
        res.json({
            note: "Boardcast was successfull!"
        });
    });
});

app.post('/register-and-broadcast-node', (req, res) => {
    const newNodeURL = req.body.newNodeURL;

    if(bitcoin.networkNodes.indexOf(newNodeURL) == -1) bitcoin.networkNodes.push(newNodeURL);

    const regNodesPromises = [];

    bitcoin.networkNodes.forEach(nodeURL => {
        const requestOptions = {
            uri: nodeURL + '/register-node',
            method: 'POST',
            body: { newNodeURL: newNodeURL},
            json: true
        }

        regNodesPromises.push(requestPromise(requestOptions));
    });

    Promise.all(regNodesPromises).then(data => {
        const bulkRegOptions = {
            uri: newNodeURL + '/register-nodes-bulk',
            method: 'POST',
            body: { allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeURL]},
            json: true
        };

        return requestPromise(bulkRegOptions);
    }).then(data => {
        res.json({
            note: "New node successfully registered to the network"
        })
    }).catch(err => console.log(err));
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