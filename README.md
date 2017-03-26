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

### 3. Run the app

```bash
$ node server/index.js
```

### 4. Lauch it on browser

Go to [http://localhost:3000](http://localhost:3000) and send text messages.
