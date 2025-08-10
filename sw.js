// --- IndexedDB Helpers for Storing Notification Version ---
const DB_NAME = 'DocuMagicDB';
const STORE_NAME = 'KeyValueStore';

function getDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = (event) => reject("IndexedDB error: " + event.target.errorCode);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        };
    });
}

async function getVal(key) {
    const db = await getDb();
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
            resolve(request.result ? request.result.value : null);
        };
        request.onerror = () => resolve(null); // Resolve with null on error
    });
}

async function setVal(key, value) {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ key, value });
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject("Error setting value in DB: " + event.target.errorCode);
    });
}


// --- Notification Logic ---
async function checkForUpdatesAndNotify() {
    try {
        // Fetch the notification manifest file. Add a cache-busting query parameter.
        const response = await fetch(`notifications.json?t=${new Date().getTime()}`);
        if (!response.ok) {
            console.log('Could not fetch notifications.json');
            return;
        }
        
        const data = await response.json();
        const { version, title, body, image } = data;

        // Get the last version we notified the user about from IndexedDB.
        const lastNotifiedVersion = await getVal('lastNotifiedVersion') || 0;

        if (version > lastNotifiedVersion) {
            console.log(`New notification version found: ${version}. Last version was: ${lastNotifiedVersion}`);
            
            const options = {
                body: body,
                icon: 'icon-192.png',
                badge: 'notification-badge.png',
                image: image 
            };
            
            await self.registration.showNotification(title, options);
            await setVal('lastNotifiedVersion', version);
        } else {
            console.log('No new notification version found.');
        }
    } catch (error) {
        console.error('Error during notification check:', error);
    }
}


// --- Service Worker Event Listeners ---

// On install, the service worker is installed.
self.addEventListener('install', event => {
    console.log('Service Worker: Installed');
    // Skip waiting to ensure the new service worker activates immediately.
    self.skipWaiting(); 
});

// On activate, the service worker takes control.
// This is a great place to run the first check.
self.addEventListener('activate', event => {
    console.log('Service Worker: Activated');
    // Ensure the service worker takes control of pages immediately
    clients.claim();
    // Perform an initial check as soon as the service worker is active.
    event.waitUntil(checkForUpdatesAndNotify());
});

// Listen for messages from the main application.
// This allows the open app to trigger checks periodically.
self.addEventListener('message', event => {
    if (event.data === 'checkForUpdates') {
        console.log('Service Worker: Received message to check for updates.');
        event.waitUntil(checkForUpdatesAndNotify());
    }
});

// This is the original notification handler for user-triggered events (like download complete)
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: 'icon-192.png',
    badge: 'notification-badge.png',
    image: data.image
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
