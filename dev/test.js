const Blockchain = require('./blockchain');

const bitcoin = new Blockchain();

bitcoin.createNewBlock(431, 'efaf5432', 'frqr3231');

bitcoin.createNewTransaction(100, 'ALEXfwe543gf43', 'PETER56hgfd321')

console.log(bitcoin)