const zmq = require('zeromq');
const fs = require('fs');
const readline = require('readline');

const sock = new zmq.Publisher();
const coinsFile = 'coins.json';

// Create a readline interface to capture input from the console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function run() {
  await sock.bind("tcp://127.0.0.1:3001");
  console.log("Publisher bound to port 3001");
  // Listen for manual price updates
  await promptManualPriceUpdate();
}

// Function to prompt the user for manual price input
async function promptManualPriceUpdate() {
  rl.question('Enter a crypto symbol (e.g., BTC, ETH) to update its price: ', async (symbol) => {
    let coin = await getCoinBySymbol(symbol.toUpperCase());

    if (!coin) {
      // If the coin doesn't exist, create it
      console.log('Coin symbol not recognized. Adding new coin...');
      coin = createNewCoin(symbol);
    }

    rl.question(`Enter new price for ${symbol}: `, (price) => {
      coin.price = price;
      
      // Update the full list of coins and write back to the file
      const coins = JSON.parse(fs.readFileSync(coinsFile, 'utf-8'));
      const updatedCoins = coins.filter(c => c.cryptoSymbol !== symbol.toUpperCase());
      updatedCoins.push(coin);

      fs.writeFileSync(coinsFile, JSON.stringify(updatedCoins, null, 2)); // Save updated list to file

      // Publish the updated price
      sock.send([coin.cryptoSymbol, JSON.stringify(coin)]);
      console.log(`Updated ${coin.cryptoSymbol} price to: ${coin.price}`);

      // Prompt again for the next manual price update
      promptManualPriceUpdate();
    });
  });
}

// Helper function to create a new coin
function createNewCoin(symbol) {
  return {
    cryptoSymbol: symbol.toUpperCase(),
    price: "0", // Default price
  };
}

// Function to get the coin by symbol
function getCoinBySymbol(symbol) {
  const coins = JSON.parse(fs.readFileSync(coinsFile, 'utf-8'));
  return coins.find(coin => coin.cryptoSymbol === symbol);
}

run();
