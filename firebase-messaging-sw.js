importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB9QUKJVEkxig7oi8u9A2z1bbwrgSJHw_A",
  authDomain: "documagic-4e803.firebaseapp.com",
  projectId: "documagic-4e803",
  storageBucket: "documagic-4e803.firebasestorage.app",
  messagingSenderId: "697027141753",
  appId: "1:697027141753:web:3b3ca85ff656f37bcbb4a8"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: './icon-192.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
