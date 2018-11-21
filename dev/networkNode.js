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
                amount: 12.5,
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
    }).catch(err => console.log(err));
});

app.get('/consensus', (req, res) => {
	const requestPromises = [];
	bitcoin.networkNodes.forEach(networkNodeUrl => {
		const requestOptions = {
			uri: networkNodeUrl + '/blockchain',
			method: 'GET',
			json: true
		};

		requestPromises.push(requestPromise(requestOptions));
	});

	Promise.all(requestPromises)
	.then(blockchains => {
		const currentChainLength = bitcoin.chain.length;
		let maxChainLength = currentChainLength;
		let newLongestChain = null;
		let newPendingTransactions = null;

		blockchains.forEach(blockchain => {
			if (blockchain.chain.length > maxChainLength) {
				maxChainLength = blockchain.chain.length;
				newLongestChain = blockchain.chain;
				newPendingTransactions = blockchain.pendingTransactions;
			};
		});


		if (!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))) {
			res.json({
				note: 'Current chain has not been replaced.',
				chain: bitcoin.chain
			});
		}
		else {
			bitcoin.chain = newLongestChain;
			bitcoin.pendingTransactions = newPendingTransactions;
			res.json({
				note: 'This chain has been replaced.',
				chain: bitcoin.chain
			});
		}
	});
});

app.post('/receive-new-block', (req, res) => {
    const newBlock = req.body.newBlock;
    const lastBlock = bitcoin.getLastBlock();
    const isCorrectHash = lastBlock.hash === newBlock.prevBlockHash;
    const isCorrectIndex = lastBlock['index'] + 1 === newBlock['index'];

    if(isCorrectHash && isCorrectIndex){
        bitcoin.chain.push(newBlock);
        bitcoin.pendingTransactions = [];
        res.json({ 
            note: 'New Block Received and Accepted',
            newBlock: newBlock
        });
    }else{
        res.json({  
            note: 'New Block Rejected',
            newBlock: newBlock
        });  
    }
})

app.post('/transaction', (req, res) => {
        const newTransaction = req.body;
        const blockIndex = bitcoin.addTransactionToPending(newTransaction);
        res.json({ note: `Transaction will be added in Block ${blockIndex}`});
});

app.post('/transaction/broadcast', (req, res) => {
    const newTransaction = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
    bitcoin.addTransactionToPending(newTransaction);

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
    }).catch(err => console.log(err));
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


//Explorer routes below
app.get('/block/:blockHash', (req, res) => {
    const blockHash = req.params.blockHash;
	const correctBlock = bitcoin.getBlock(blockHash);
	res.json({
		block: correctBlock
	});

});

app.get('/transaction/:transactionId', (req, res) => {
    const transactionId = req.params.transactionId;
	const trasactionData = bitcoin.getTransaction(transactionId);
	res.json({
		transaction: trasactionData.transaction,
		block: trasactionData.block
	});

});

app.get('/address/:addresss', (req, res) => {
    const address = req.params.address;
	const addressData = bitcoin.getAddressData(address);
	res.json({
		addressData: addressData
	});

});

app.get('/', (req, res) => {
	res.sendFile('./block-explorer/index.html', { root: __dirname });
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