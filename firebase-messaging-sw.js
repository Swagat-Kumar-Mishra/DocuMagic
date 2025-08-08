// Import and configure the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// WARNING: This is insecure. Do not expose your config in production.
const firebaseConfig = {
    apiKey: "AIzaSyB9QUKJVEkxig7oi8u9A2z1bbwrgSJHw_A",
    authDomain: "documagic-4e803.firebaseapp.com",
    projectId: "documagic-4e803",
    storageBucket: "documagic-4e803.appspot.com",
    messagingSenderId: "697027141753",
    appId: "1:697027141753:web:3b3ca85ff656f37bcbb4a8",
    measurementId: "G-RXB9ECLDZ3"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle incoming messages when the app is not in the foreground
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Customize the notification here
    const notificationTitle = payload.data.title;
    const notificationOptions = {
        body: payload.data.message,
        icon: 'icon-192.png', // Default icon
        image: payload.data.image // The full-size image
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
