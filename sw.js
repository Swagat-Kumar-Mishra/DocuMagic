// This service worker is intentionally simple for this demo.
// It allows the app to be installed and to show notifications.

self.addEventListener('install', event => {
    console.log('Service worker installing...');
    // You can add caching logic here in the future
});

self.addEventListener('activate', event => {
    console.log('Service worker activating...');
});
