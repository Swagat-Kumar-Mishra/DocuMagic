// --- Service Worker Lifecycle: Make it update and activate immediately ---

self.addEventListener('install', event => {
  console.log('SW (New Version): Installing...');
  // This is the most important part: it tells the browser
  // "Don't wait, activate this new service worker as soon as it's installed."
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('SW: Activated. Ready to take control.');
  // This command tells the service worker to take control of all open app pages.
  // After it succeeds, it runs our notification check immediately.
  event.waitUntil(
    clients.claim().then(() => {
      console.log('SW: Clients claimed. Running the first notification check...');
      return checkForUpdatesAndNotify();
    })
  );
});

// --- Main Notification Logic ---
async function checkForUpdatesAndNotify() {
    console.log('SW: Starting checkForUpdatesAndNotify().');
    try {
        // Fetch the notification file with a cache-busting query to ensure it's fresh.
        const response = await fetch(`/notifications.json?cachebust=${new Date().getTime()}`);
        console.log('SW: Fetched notifications.json. Status:', response.status);

        if (!response.ok) {
            console.error('SW: Failed to fetch notifications.json.');
            return;
        }

        const data = await response.json();
        console.log('SW: Successfully parsed JSON data:', data);

        const { version, title, body, image } = data;

        // Get the last version we notified about from the browser's internal database.
        const lastNotifiedVersion = await getVal('lastNotifiedVersion');
        console.log(`SW: Server version is ${version}. The last version I showed was ${lastNotifiedVersion || 0}.`);

        if (version > (lastNotifiedVersion || 0)) {
            console.log('SW: New version detected! Preparing to show notification.');

            // Show the notification.
            await self.registration.showNotification(title, {
                body: body,
                icon: 'icon-192.png',
                badge: 'notification-badge.png',
                image: image,
                tag: `documagic-v${version}` // Give a unique tag to prevent duplicates
            });

            console.log('SW: Notification should be visible now. Storing new version in DB.');
            // Store the new version number so we don't show this notification again.
            await setVal('lastNotifiedVersion', version);
            console.log('SW: Version updated in DB to', version);
        } else {
            console.log('SW: No new version found. Ending check.');
        }
    } catch (error) {
        console.error('SW: A critical error occurred in checkForUpdatesAndNotify:', error);
    }
}

// --- Event listener for clicking the notification ---
self.addEventListener('notificationclick', event => {
    event.notification.close();
    // Opens your app when the notification is clicked.
    event.waitUntil(clients.openWindow('/'));
});


// --- IndexedDB Helper Functions (Unchanged) ---
const DB_NAME = 'DocuMagicDB';
const STORE_NAME = 'KeyValueStore';

function getDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = (event) => reject("IndexedDB error: " + event.target.errorCode);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });
}
async function getVal(key) {
    const db = await getDb();
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.value : null);
        request.onerror = () => resolve(null);
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
