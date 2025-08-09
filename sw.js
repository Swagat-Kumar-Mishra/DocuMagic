// --- IndexedDB for storing the last notification version ---
const DB_NAME = 'DocuMagicDB';
const STORE_NAME = 'KeyValueStore';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getFromDB(db, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function setToDB(db, key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- Main function to check for updates and notify ---
async function checkForUpdatesAndNotify() {
  try {
    // Fetch the latest notification data from the server file
    // The 'cache: "no-store"' is crucial to ensure we get the latest version
    const response = await fetch('notification.json', { cache: 'no-store' });
    if (!response.ok) {
        console.error('Failed to fetch notification.json');
        return;
    }
    const data = await response.json();

    const db = await openDB();
    const lastVersion = await getFromDB(db, 'lastNotificationVersion');

    // If the version in the file is new, show a notification
    if (data.version !== lastVersion) {
      console.log('New notification version found:', data.version);
      const options = {
        body: data.body,
        icon: 'icon-192.png',
        badge: 'notification-badge.png',
        image: data.image,
        vibrate: [200, 100, 200]
      };
      await self.registration.showNotification(data.title, options);
      // Save the new version so we don't show this notification again
      await setToDB(db, 'lastNotificationVersion', data.version);
    } else {
      console.log('Notification version is up to date.');
    }
  } catch (error) {
    console.error('Error during periodic sync check:', error);
  }
}

// --- Service Worker Event Listeners ---

// This ensures the new service worker activates immediately
self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

// Listen for the 'periodicsync' event
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-for-updates') {
    // Run our update check function
    event.waitUntil(checkForUpdatesAndNotify());
  }
});
