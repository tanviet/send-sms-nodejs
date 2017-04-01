'use strict';

const config = require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const Nexmo = require('nexmo');
const socketio = require('socket.io');
const storage = require('node-persist');  // Same with HTML5 LocalStorage, but this is for Node

// Initialize app

const app = express();
const server = app.listen(3000, () => {
  console.log('[Server] The server is listening on port %d in %s mode', server.address().port, app.settings.env);
});

// Setup storage to save inbound messages (only for testing purpose, should store all messages into a database)

storage.init();

// Initialize nexmo

const nexmo = new Nexmo({
  apiKey: config.API_KEY,
  apiSecret: config.API_SECRET
}, {debug: true});

// Initialize Socket.io to communicate both front-end and back-end sides

const io = socketio(server);
io.on('connection', (socket) => {
  console.log('[Server] Socket connected');

  socket.on('disconnect', () => {
    console.log('[Server] Socket disconnected');
  });
});

// Configure Express

app.set('views', __dirname + '/../views');
app.set('view engine', 'html');
app.engine('html', ejs.renderFile);
app.use(express.static(__dirname + '/../public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routers

app.get('/', (req, res) => {
  res.render('index');
});


/***************************
  Send SMS messages (Send Outbound messages)
 ***************************/
app.post('/', (req, res) => {
  res.send(req.body);

  let toNumber = req.body.number;
  let text = req.body.text;
  let data = {};  // the data to be emitted to front-end

  // Get info about phone number
  nexmo.numberInsight.get({level: 'basic', number: toNumber}, (err, responseData) => {
    if (err) {
      data = {error: err};

      // Emit data to front-end
      io.emit('smsStatus', data);
    } else {
      console.dir('[Server] Basic info about phone number', responseData);
    }
  });

  nexmo.message.sendSms(
    config.NUMBER, toNumber, text, {type: 'unicode'},
    (err, responseData) => {
      if (err) {
        data = {error: err};
      } else {
        console.dir('[Server] Successfully sent SMS', responseData);

        if (responseData.messages[0]['error-text']) {
          data = {error: responseData.messages[0]['error-text']};
        } else {
          data = {id: responseData.messages[0]['message-id'], number: responseData.messages[0]['to']};
        }

        // Emit data to front-end
        io.emit('smsStatus', data);
      }
    }
  );
});

/***************************
  Receive SMS messages (Receive Inbound messages)
 ***************************/
app.post('/inbound', (req, res) => {
  handleInboundWebhook(req.body, res);
});

app.get('/inbound', (req, res) => {
  handleInboundWebhook(req.query, res);
});

app.get('/inbound/:id', (req, res) => {
  try {
    storage
      .getItem('id_' + req.params.id)
      .then((value) => {
        res.json(value);
      });
  } catch(e) {
    res.status(404).end();
  }
});

/**
 * Parse inbound message data which was sent from users via Nexmo to our application.
 * @param  {Object} params Message data object
 * @example
 *   {
 *     "messageId": "080000001947F7B2",
 *     "msisdn": "14159873202",
 *     "to": "123456789",
 *     "text": "Hello!",
 *     "keyword": "Hello!",
 *     "type": "text",
 *     "message-timestamp": "2016-10-26 17:47:26"
 *   }
 *
 * @param  {Object} res    Response
 * @return {void}          Send back message data to front-end and store message on server.
 */
function handleInboundWebhook(params, res) {
  if (!params.to || !params.msisdn) {
    console.log('Invalid inbound SMS message');
  } else {
    let inboundData = {
      messageId: params.messageId,
      from: params.msisdn,
      to: params.to,
      text: params.text,
      type: params.type,
      timestamp: params['message-timestamp']
    };

    storage.setItem('id_' + params.messageId, inboundData);

    res.send(inboundData);
  }

  res.status(200).end();
}

/***************************
  Receive Delivery Receipt from recipient's carrier
 ***************************/
app.post('/delivery-receipt', (req, res) => {
  handleDeliveryReceiptWebhook(req.body, res);
});

app.get('/delivery-receipt', (req, res) => {
  handleDeliveryReceiptWebhook(req.query, res);
});

/**
 * Parse information from recipient's carrier
 * @param  {Object} params Receipt data
 * @example
 *   {
 *     "msisdn": "14155551234",
 *     "to": "12015556666",
 *     "network-code": "310090",
 *     "messageId": "02000000FEA5EE9B",
 *     "price": "0.00570000",
 *     "status": "delivered",
 *     "scts": "1610192240", // The Coordinated Universal Time (UTC)
 *     "err-code": "0",
 *     "message-timestamp": "2016-10-19 22:40:30"
 *   }
 * @param  {Object} res    Response
 * @return {void}          Check information
 */
function handleDeliveryReceiptWebhook(params, res) {
  if (!params['status'] || !params['messageId']) {
    console.log('Invalid delivery receipt');
  } else {
    // This is a DLR, check that your message has been delivered correctly
    if (params['status'] !== 'delivered') {
      console.log('Failed: ' + params['status'] );
    } else {
      console.log('Successfully sent message', params);
    }
  }

  res.status(200).end();
}