const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

const USERS_FILE = 'subscribers.json';

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Register
app.post('/register', (req, res) => {
  const { username, password, phoneNumber } = req.body;
  const users = readJSON(USERS_FILE);
  if (users.find(u => u.userId === username)) {
    return res.status(400).send("Username already exists.");
  }

  users.push({
    userId: username,
    password,
    phoneNumber,
    subscriptions: []
  });

  writeJSON(USERS_FILE, users);
  res.send("Registered successfully.");
});

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.userId === username && u.password === password);
  if (!user) return res.status(401).send("Invalid credentials");
  res.send("Login successful");
});

// Add subscription
app.post('/subscribe', (req, res) => {
  const {
    username, cryptoSymbol, buyPrice, quantity,
    isSmallerThan, isBiggerThan
  } = req.body;

  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.userId === username);
  if (!user) return res.status(404).send("User not found");

  user.subscriptions.push({
    cryptoSymbol,
    buyPrice: parseFloat(buyPrice),
    quantity: parseFloat(quantity),
    isNotify: true,
    isSmallerThan: parseFloat(isSmallerThan),
    isBiggerThan: parseFloat(isBiggerThan)
  });

  writeJSON(USERS_FILE, users);
  res.send("Subscription added");
});

// Get subscriptions
app.get('/subscriptions', (req, res) => {
  const { username } = req.query;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.userId === username);
  if (!user) return res.status(404).send([]);
  res.json(user.subscriptions);
});

app.post('/update-subscription', (req, res) => {
  const {
    username, index, cryptoSymbol, buyPrice, quantity,
    isSmallerThan, isBiggerThan
  } = req.body;

  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.userId === username);
  if (!user) return res.status(404).send("User not found");

  const sub = user.subscriptions[index];
  if (!sub) return res.status(404).send("Subscription not found");

  sub.cryptoSymbol = cryptoSymbol;
  sub.buyPrice = parseFloat(buyPrice);
  sub.quantity = parseFloat(quantity);
  sub.isSmallerThan = parseFloat(isSmallerThan);
  sub.isBiggerThan = parseFloat(isBiggerThan);

  writeJSON(USERS_FILE, users);
  res.send("Subscription updated");
});


// Unsubscribe selected
app.post('/unsubscribe', (req, res) => {
  const { username, indexes } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.userId === username);
  if (!user) return res.status(404).send("User not found");

  user.subscriptions = user.subscriptions.filter((_, i) => !indexes.includes(i.toString()));
  writeJSON(USERS_FILE, users);
  res.send("Removed");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
