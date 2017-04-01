'use strict';

const config = require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const Nexmo = require('nexmo');
const socketio = require('socket.io');
const storage = require('node-persist');

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
  Send SMS messages
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

  /**
   * Send SMS messages via Nexmo
   *
   * The Nexmo SMS API returns a payload that indicates if the result of the request.
   * This status indicates that the SMS is successfully sent by you via Nexmo, and not an actual delivery receipt from the recipient's carrier.
   * To get an actual delivery receipt from the recipient's carrier, you should register a webhook in "Callback URL for Inbound Message" field in your API Settings page.
   * You can use "ngrok" to create a new URL for your webhook if you are developing on localhost.
   */
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
  Receive SMS messages
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
 *     "messageId":"080000001947F7B2",
 *     "msisdn":"14159873202",
 *     "to":"123456789",
 *     "text":"Hello!",
 *     "keyword":"Hello!",
 *     "type":"text",
 *     "message-timestamp":"2016-10-26 17:47:26"
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