'use strict';

const config = require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const Nexmo = require('nexmo');
const socketio = require('socket.io');

// Initialize app

const app = express();
const server = app.listen(3000, () => {
  console.log('[Server] The server is listening on port %d in %s mode', server.address().port, app.settings.env);
});

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