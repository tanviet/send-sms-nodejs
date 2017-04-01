# Send SMS with Nodejs

This web app is written in Nodejs with Express. On front-end, it used Web Notification to show SMS receipt message with Socket.io.

### 1. Install dependencies

```bash
$ npm install
```

### 2. Setup your credentials on config.js

Sign up an acount at [Nexmo](https://nexmo.com) to get your own API keys and secret.

Create `config.js` file in `server` folder and you should include your credentials into that file.

```javascript
module.exports = {
  API_KEY: '<your-api-key>',
  API_SECRET: '<your-api-secret>',
  NUMBER: '<your-phone-number-to-send>'
};
```

#### 2a. Register Webhook Endpoint to receive Inbound SMS messages

First, download `ngrok` from [https://ngrok.com](https://ngrok.com). Once installed, run ngrok on terminal:

```bash
$ ngrok http 3000
```

Your local server (localhost:3000) now has a ngrok URL, https://435f0d962.ngrok.io that can be used as your webhook endpoint during development.

Sign in to your Nexmo account, and go to Settings. Scroll all way down to **API Settings** and fill out the **Webhook URL for Inbound Message** with the ngrok URL with a route, let’s call it inbound, enter *https://435f0d962.ngrok.io/inbound*, and let’s set the **HTTP Method** to POST then save.

#### 2b. Register Webhook Endpoint to get Delivery Receipt

When we send a message from our app to user, the message will be sent by following diagram

```bash
Our app <-> Nexmo <-> Recipient's carrier <-> User's phone number
```

The Nexmo SMS API returns a payload that indicates if the result of the request. This status indicates that the SMS is successfully sent by you via Nexmo, and not an actual delivery receipt from the recipient's carrier. To get an actual delivery receipt from the recipient's carrier, you should register a webhook in "Webhook URL for Delivery Receipt" field in your API Settings page.

Fill out the **Webhook URL for Delivery Receipt** with the ngrok URL with a route, enter *https://435f0d962.ngrok.io/delivery-receipt*

### 3. Run the app

```bash
$ node server/index.js
```

### 4. Lauch it on browser

Go to [http://localhost:3000](http://localhost:3000) and send text messages.
