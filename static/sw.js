// Service Worker — handle push notification saat app tertutup

self.addEventListener('push', (event) => {
   if (!event.data) return

   const data = event.data.json()

   event.waitUntil(
      self.registration.showNotification(data.title, {
         body: data.body,
         icon: '/apple-touch-icon.png',
         badge: '/apple-touch-icon.png',
         tag: `chat-${data.conversationId}`,
         renotify: true,
         data: { conversationId: data.conversationId }
      })
   )
})

self.addEventListener('notificationclick', (event) => {
   event.notification.close()
   const convId = event.notification.data?.conversationId
   event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
         // Kalau app sudah terbuka — focus dan navigate
         for (const client of clientList) {
            if (client.url.includes('/chat') && 'focus' in client) {
               client.focus()
               client.postMessage({ type: 'OPEN_CONVERSATION', conversationId: convId })
               return
            }
         }
         // Kalau app belum terbuka — buka baru
         clients.openWindow('/chat')
      })
   )
})