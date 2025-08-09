// A simple function to store and retrieve the last seen version number.
// This prevents showing the same notification over and over.
async function getStorage() {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("NotificationDB", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("KeyValueStore");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return {
    get: key => new Promise(resolve => db.transaction("KeyValueStore").objectStore("KeyValueStore").get(key).onsuccess = event => resolve(event.target.result)),
    set: (key, value) => new Promise(resolve => {
        const req = db.transaction("KeyValueStore", "readwrite").objectStore("KeyValueStore").put(value, key);
        req.onsuccess = () => resolve();
    }),
  };
}

// The main function that checks for updates.
async function checkForUpdates() {
  try {
    // Fetch the notification file from your repository.
    // The 'cache: "no-store"' is VITAL to make sure we get the latest version.
    const response = await fetch('notification.json', { cache: 'no-store' });
    const data = await response.json();

    const storage = await getStorage();
    const lastVersion = await storage.get('last_version');

    // If the version in the file is new, show the notification.
    if (data.version !== lastVersion) {
      console.log(`New notification found. Version: ${data.version}`);
      const options = {
        body: data.body,
        icon: 'icon-192.png',
        badge: 'notification-badge.png',
        image: data.image,
        vibrate: [200, 100, 200]
      };
      // Show the notification.
      await self.registration.showNotification(data.title, options);
      // Save the new version so we don't show it again.
      await storage.set('last_version', data.version);
    } else {
      console.log('Notification is up to date.');
    }
  } catch (error) {
    console.error('Error during update check:', error);
  }
}

// When the PWA is first installed, it should be ready immediately.
self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

// This is the background timer. It runs automatically.
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-for-updates') {
    event.waitUntil(checkForUpdates());
  }
});
