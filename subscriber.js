const zmq = require('zeromq');
const fs = require('fs');
const twilio = require('twilio');
require('dotenv').config();

const sock = new zmq.Subscriber();
const subscribersFile = 'subscribers.json';


async function run() {
  sock.connect("tcp://127.0.0.1:3001");
  sock.subscribe(); // Subscribe to all topics
  console.log("Subscriber connected to port 3001");

  for await (const [topic, msg] of sock) {
    const update = JSON.parse(msg.toString());
    const subscribers = readJSON(subscribersFile);

    for (const user of subscribers) {
      for (const sub of user.subscriptions) {
        if (sub.cryptoSymbol !== update.cryptoSymbol) continue;

        const price = update.price;
        if (sub.isNotify) {
          console.log(`Received update for ${sub.cryptoSymbol}: $${price}`);
          console.log(`User ${user.phoneNumber} subscribed to ${sub.cryptoSymbol} with price alert: $${sub.isSmallerThan} - $${sub.isBiggerThan}`);
          if (price <= sub.isSmallerThan || price >= sub.isBiggerThan) {
            sendSMS(user.phoneNumber, `${sub.cryptoSymbol} is now $${price}, alert triggered.`);
            console.log(`Sending SMS to ${user.phoneNumber}: ${sub.cryptoSymbol} is now $${price}, alert triggered.`);
          }
        }
      }
    }
  }
}

function readJSON(path) {
  if (!fs.existsSync(path)) return [];
  return JSON.parse(fs.readFileSync(path));
}

function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = require('twilio')(accountSid, authToken);
  client.messages
    .create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+${to}`
    })
    .then(message => console.log(message.sid));
}

run();
