self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: 'icon-192.png', // Small icon in the notification header
    badge: 'notification-badge.png', // Monochrome icon for the status bar
    image: data.image // The large image displayed in the notification body
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
