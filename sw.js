// --- IndexedDB utility for storing last notification version ---
function idbGet(key) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('documagic-sw', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('kv', 'readonly');
      const store = tx.objectStore('kv');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    };
    open.onerror = () => reject(open.error);
  });
}
function idbSet(key, value) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('documagic-sw', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('kv', 'readwrite');
      const store = tx.objectStore('kv');
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    };
    open.onerror = () => reject(open.error);
  });
}

// --- Poll for notification updates every 60s ---
const NOTIF_URL = '/notifications/latest.json';
const DB_KEY = 'notif-version';

async function checkForNotificationUpdate() {
  try {
    const resp = await fetch(NOTIF_URL, { cache: "no-store" });
    if (!resp.ok) return;
    const notif = await resp.json();
    let prevVersion = await idbGet(DB_KEY);
    if (typeof prevVersion !== 'number') prevVersion = 0;
    if (notif.version > prevVersion) {
      // Show notification
      self.registration.showNotification(notif.title, {
        body: notif.body,
        icon: 'icon-192.png',
        badge: 'notification-badge.png',
        image: notif.image
      });
      await idbSet(DB_KEY, notif.version);
    }
  } catch (e) {
    // Optionally log error
  }
}

// --- Periodic polling logic ---
let pollingInterval = null;
function startPolling() {
  if (pollingInterval) return;
  checkForNotificationUpdate();
  pollingInterval = setInterval(checkForNotificationUpdate, 60 * 1000);
}

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim().then(() => startPolling()));
});

self.addEventListener('install', event => {
  self.skipWaiting();
});

// For when the service worker takes control without reload
self.addEventListener('controllerchange', () => startPolling());

// Also, start polling as soon as the service worker is loaded
startPolling();

// --- Listen for push events (legacy, not used for polling) ---
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
