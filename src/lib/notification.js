import { writable } from 'svelte/store'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// ── Toast store ───────────────────────────────────────────
export const toasts = writable([])
let toastId = 0

export function showToast({ title, message, avatar = null, onClick = null }) {
   const id = ++toastId
   toasts.update((t) => [...t, { id, title, message, avatar, onClick }])
   setTimeout(() => {
      toasts.update((t) => t.filter((x) => x.id !== id))
   }, 4000)
}

export function dismissToast(id) {
   toasts.update((t) => t.filter((x) => x.id !== id))
}

// ── Service Worker ────────────────────────────────────────
let swRegistration = null

export async function registerSW() {
   if (!('serviceWorker' in navigator)) return null
   try {
      swRegistration = await navigator.serviceWorker.register('/sw.js')
      console.log('✅ SW registered')
      return swRegistration
   } catch (e) {
      console.warn('SW register failed:', e)
      return null
   }
}

// ── Push Subscription ─────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
   const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
   const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
   const rawData = atob(base64)
   return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export async function subscribePush(token) {
   if (!VAPID_PUBLIC_KEY) {
      console.warn('VITE_VAPID_PUBLIC_KEY tidak ada')
      return
   }

   try {
      const reg = swRegistration ?? await registerSW()
      if (!reg) return

      // Cek apakah sudah subscribe
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
         await sendSubscriptionToServer(existing, token)
         return
      }

      // Subscribe baru
      const subscription = await reg.pushManager.subscribe({
         userVisibleOnly: true,
         applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      await sendSubscriptionToServer(subscription, token)
      console.log('✅ Push subscription berhasil')
   } catch (e) {
      console.warn('Push subscribe gagal:', e.message)
   }
}

async function sendSubscriptionToServer(subscription, token) {
   const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
   await fetch(`${BASE}/push/subscribe`, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
         Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(subscription)
   })
}

export async function unsubscribePush(token) {
   try {
      const reg = swRegistration ?? await registerSW()
      if (!reg) return
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return

      const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
      await fetch(`${BASE}/push/unsubscribe`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
         },
         body: JSON.stringify({ endpoint: sub.endpoint })
      })

      await sub.unsubscribe()
      console.log('✅ Push unsubscribe berhasil')
   } catch (e) {
      console.warn('Push unsubscribe gagal:', e.message)
   }
}

// ── Browser Notification ──────────────────────────────────
export async function requestNotificationPermission() {
   if (!('Notification' in window)) return false

   if (Notification.permission === 'granted') {
      await registerSW()
      return true
   }

   if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission()
      if (result === 'granted') {
         await registerSW()
         return true
      }
   }

   return false
}

export async function showBrowserNotification({ title, body, onClick = null }) {
   if (!('Notification' in window)) return
   if (Notification.permission !== 'granted') return

   if (swRegistration) {
      await swRegistration.showNotification(title, {
         body,
         icon: '/apple-touch-icon.png',
         badge: '/apple-touch-icon.png',
         tag: 'chat-message',
         renotify: true
      })
   } else {
      const notif = new Notification(title, { body, icon: '/apple-touch-icon.png' })
      if (onClick) notif.onclick = () => { window.focus(); onClick(); notif.close() }
      setTimeout(() => notif.close(), 5000)
   }
}

// ── Trigger toast + browser notif ────────────────────────
export function notify({ senderName, message, avatar = null, onClickCb = null }) {
   showToast({ title: senderName, message, avatar, onClick: onClickCb })

   if (document.hidden || !document.hasFocus()) {
      showBrowserNotification({ title: senderName, body: message, onClick: onClickCb })
   }
}