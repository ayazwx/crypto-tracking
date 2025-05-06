const zmq = require('zeromq');
const fs = require('fs');

const sock = new zmq.Publisher();
const coinsFile = 'coins.json';

async function run() {
  await sock.bind("tcp://127.0.0.1:3001");
  console.log("Publisher bound to port 3001");

  setInterval(() => {
    const coins = [
      { cryptoSymbol: 'BTC', price: randomPrice(95000, 63000) },
      { cryptoSymbol: 'ETH', price: randomPrice(1400, 2500) },
    ];
    fs.writeFileSync(coinsFile, JSON.stringify(coins, null, 2));

    for (const coin of coins) {
      sock.send([coin.cryptoSymbol, JSON.stringify(coin)]);
      console.log("Published:", coin);
    }
  }, 5000);
}

function randomPrice(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

run();
