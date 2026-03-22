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
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Kalau app sudah terbuka di tab manapun — focus dan kirim pesan untuk buka percakapan
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          client.postMessage({ type: 'OPEN_CONVERSATION', conversationId: convId })
          return
        }
      }
      // Kalau app belum terbuka sama sekali — buka dengan query param conversationId
      // +page.svelte akan baca param ini saat onMount dan langsung buka percakapan
      if (self.clients.openWindow) {
        self.clients.openWindow(`/chat?conv=${convId}`)
      }
    })
  )
})
