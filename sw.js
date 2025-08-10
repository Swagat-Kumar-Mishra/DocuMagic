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


// --- Main Notification Logic ---
async function checkForUpdatesAndNotify() {
    console.log('Checking for notification updates...');
    try {
        // Add a cache-busting query to ensure we get the latest file
        const response = await fetch(`/notifications.json?v=${new Date().getTime()}`);
        if (!response.ok) {
            console.error('Could not fetch notifications.json. Status:', response.status);
            return;
        }
        
        const data = await response.json();
        const { version, title, body, image } = data;

        // Get the last version we notified the user about from IndexedDB
        const lastNotifiedVersion = await getVal('lastNotifiedVersion') || 0;

        if (version > lastNotifiedVersion) {
            console.log(`New notification found. Version: ${version}, Last Version: ${lastNotifiedVersion}`);
            
            const options = {
                body: body,
                icon: 'icon-192.png',
                badge: 'notification-badge.png',
                image: image,
                data: {
                    url: self.location.origin, // URL to open on click
                }
            };
            
            await self.registration.showNotification(title, options);
            await setVal('lastNotifiedVersion', version);
        } else {
            console.log('No new notification found. Current version is up-to-date.');
        }
    } catch (error) {
        console.error('Error during notification check:', error);
    }
}


// --- Service Worker Event Listeners ---

self.addEventListener('install', event => {
    console.log('Service Worker: New version installed.');
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activated.');
    // Take control of all open clients immediately.
    event.waitUntil(clients.claim().then(() => {
        // Perform an initial check as soon as the new service worker is active.
        return checkForUpdatesAndNotify();
    }));
});

// Listen for periodic background sync events
self.addEventListener('periodicsync', event => {
    if (event.tag === 'get-notifications') {
        console.log('Periodic sync triggered for notifications.');
        event.waitUntil(checkForUpdatesAndNotify());
    }
});

// This is for notifications sent from the app itself (e.g., on download complete)
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

// Open the app when the notification is clicked
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});
