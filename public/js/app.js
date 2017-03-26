(function() {
  'use strict';

  // Get DOM elements in form
  var numberField = document.querySelector('input[name=number]');
  var textField = document.querySelector('input[name=text]');
  var button = document.querySelector('input[type=button]');
  var msg = document.querySelector('.response');

  // Get value which was stored in localstorage
  var lastNumber = localStorage.getItem('number');
  if (lastNumber) {
    numberField.value = lastNumber;
  }

  // Web Notification permission
  var permission = 'denied';

  try {
    Notification.requestPermission().then(function(status) {
      console.log('[Client] Web Notification status', status);
      permission = status;
    });
  } catch (error) {  // Safari 9 doesn't return a promise for requestPermissions
    Notification.requestPermission(function(status) {
      console.log('[Client] Web Notification status', status);
      permission = status;
    });
  }

  // Initialize Socket.io
  var socket = io();
  socket.on('connet', function() {
    console.log('[Client] Socket connected');
  });

  socket.on('smsStatus', function(data) {
    console.log('[Client] SMS Status', data);

    if (!data) return;

    if (data.error) {
      displayStatus('Error: ' + data.error, permission);
    } else {
      displayStatus('Message ID: ' + data.id + ' successfully sent to ' + data.number, permission);
    }
  });

  ////////////////////////

  // UI events

  textField.addEventListener('keyup', function(e) {
    (e.keyCode || e.charCode) === 13 && sendSMS();
  }, false);

  button.addEventListener('click', sendSMS, false);

  ////////////////////////

  function displayStatus(message, notification) {
    console.log('[Client] Message', message);
    console.log('[Client] Notification', notification);

    if (notification === 'granted') {   // Web Notification permission
      new Notification('SMS Nodejs', {
        body: message
      });
    } else {  // Notification is denied by user so we just show text
      msg.classList.add('poof');
      msg.textContent = message;
      msg.addEventListener('animationend', function() {
        msg.textContent = '';
        msg.classList.remove('poof');
      }, false);
    }
  }

  function sendSMS() {
    var number = numberField.value.replace(/\D/g, '');  // Remove all non-numeric characters
    var text = textField.value || 'This is sample text';

    if (!number) return;

    localStorage.setItem('number', number);   // Store number to use later

    if (!self.fetch) {
      alert('Your browser does not support Fetch API');
      return false;
    }

    fetch('/', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: number,
        text: text
      })
    })
    .then(function(response) {
      if (response.status !== 200) {
        displayStatus(response.statusText, notification);
      }

      textField.value = '';
    })
    .catch(function(error) {
      displayStatus(error, notification);
    });
  }

})();