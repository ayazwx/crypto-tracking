const WebSocket = require('ws');
const axios = require('axios');

// WebSocket server setup
const wss = new WebSocket.Server({ port: 8080 });

// Store clients and their subscriptions
const clientSubscriptions = new Map(); // Using Map for better performance

// Cache for cryptocurrency prices with timestamp
const priceCache = new Map();
const CACHE_DURATION = 10000; // 10 seconds cache duration
const UPDATE_INTERVAL = 5000; // 5 seconds between updates

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  maxRequests: 30, // Max 30 requests per minute per client
};

// Track client request counts
const clientRequestCounts = new Map();

const fetchCryptoData = async (symbol) => {
  const currentTime = Date.now();
  const cacheKey = symbol.toLowerCase();

  // Check cache first
  if (priceCache.has(cacheKey)) {
    const cache = priceCache.get(cacheKey);
    if (currentTime - cache.timestamp < CACHE_DURATION) {
      return cache.price;
    }
  }

  // If not in cache or cache expired, fetch from API
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cacheKey}&vs_currencies=usd`;
  
  try {
    const response = await axios.get(url, {
      timeout: 5000, // 5 second timeout
      headers: {
        'Accept-Encoding': 'gzip',
        'User-Agent': 'Crypto-Tracker-Server/1.0'
      }
    });
    
    const price = response.data[cacheKey]?.usd;
    
    if (price !== undefined) {
      priceCache.set(cacheKey, { 
        price, 
        timestamp: currentTime 
      });
      return price;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching data for ${cacheKey}:`, error.message);
    // Return cached price if available, even if expired
    if (priceCache.has(cacheKey)) {
      return priceCache.get(cacheKey).price;
    }
    return null;
  }
};

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New client connected');
  const clientId = Date.now().toString(); // Simple client identifier
  const clientCrypto = new Map(); // Track user's crypto subscriptions
  const clientInterval = null; // Will hold the interval reference

  // Initialize client data
  clientSubscriptions.set(clientId, { 
    ws, 
    clientCrypto,
    lastActivity: Date.now()
  });

  // Initialize rate limiting
  clientRequestCounts.set(clientId, {
    count: 0,
    lastReset: Date.now()
  });

  // Send welcome message
  ws.send(JSON.stringify({ 
    message: 'Welcome to Crypto Tracker!',
    status: 'connected',
    timestamp: Date.now()
  }));

  // Handle incoming messages
  ws.on('message', async (message) => {
    try {
      // Update last activity
      clientSubscriptions.get(clientId).lastActivity = Date.now();
  
      const msg = JSON.parse(message);
      console.log('Received message:', msg); // Log incoming messages for debugging
  
      if (!msg.action) {
        throw new Error('Invalid message format: missing action');
      }
  
      if (msg.action === 'subscribe') {
        // Validate required fields
        if (!msg.stock || msg.buyPrice === undefined || msg.quantity === undefined) {
          throw new Error('Missing required fields for subscription. Need stock, buyPrice, and quantity');
        }
  
        const stockSymbol = msg.stock.toLowerCase();
        const buyPrice = parseFloat(msg.buyPrice);
        const quantity = parseFloat(msg.quantity);
  
        if (isNaN(buyPrice)) throw new Error('Invalid buyPrice: must be a number');
        if (isNaN(quantity)) throw new Error('Invalid quantity: must be a number');
        if (buyPrice <= 0) throw new Error('buyPrice must be greater than 0');
        if (quantity <= 0) throw new Error('quantity must be greater than 0');
  
        const price = await fetchCryptoData(stockSymbol);
  
        if (price !== null) {
          clientCrypto.set(stockSymbol, { 
            buyPrice, 
            quantity, 
            currentPrice: price 
          });
  
          ws.send(JSON.stringify({
            action: 'subscribed',
            status: 'success',
            symbol: stockSymbol,
            price: price,
            buyPrice: buyPrice,
            quantity: quantity,
            timestamp: Date.now()
          }));
        } else {
          throw new Error(`Failed to fetch price for ${stockSymbol}`);
        }
      } 
      // ... rest of the message handling code ...
    } catch (error) {
      console.error('Error processing message:', error.message);
      ws.send(JSON.stringify({
        action: 'error',
        error: error.message,
        status: 'error',
        timestamp: Date.now()
      }));
    }
  });

  // Setup update interval for this client
  const intervalId = setInterval(async () => {
    try {
      const clientData = clientSubscriptions.get(clientId);
      if (!clientData || clientData.ws.readyState !== WebSocket.OPEN) {
        clearInterval(intervalId);
        return;
      }

      // Check for inactive clients (30 minutes no activity)
      if (Date.now() - clientData.lastActivity > 1800000) {
        console.log(`Disconnecting inactive client ${clientId}`);
        clientData.ws.close();
        return;
      }

      // Send updates for each subscribed cryptocurrency
      for (const [stockSymbol, { buyPrice, quantity }] of clientCrypto) {
        const price = await fetchCryptoData(stockSymbol);
        
        if (price !== null) {
          const profitLoss = (price - buyPrice) * quantity;
          const profitLossPercentage = (profitLoss / (buyPrice * quantity)) * 100;

          clientData.ws.send(JSON.stringify({
            action: 'update',
            symbol: stockSymbol,
            price: price,
            buyPrice: buyPrice,
            quantity: quantity,
            profitLoss: profitLoss,
            profitLossPercentage: profitLossPercentage,
            timestamp: Date.now()
          }));

          // Update current price in the subscription
          clientCrypto.set(stockSymbol, { 
            buyPrice, 
            quantity, 
            currentPrice: price 
          });
        }
      }
    } catch (error) {
      console.error('Error in update interval:', error);
    }
  }, UPDATE_INTERVAL);

  // Store interval reference
  clientSubscriptions.get(clientId).intervalId = intervalId;

  // Clean up when client disconnects
  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    clearInterval(intervalId);
    clientSubscriptions.delete(clientId);
    clientRequestCounts.delete(clientId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    clearInterval(intervalId);
    clientSubscriptions.delete(clientId);
    clientRequestCounts.delete(clientId);
  });
});

// Cleanup function for server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });
  wss.close();
  process.exit();
});

console.log('Crypto ticker server running on ws://localhost:8080');