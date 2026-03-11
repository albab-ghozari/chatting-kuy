// src/lib/notification.js
import { writable } from 'svelte/store'

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

// ── Service Worker registration ───────────────────────────
let swRegistration = null

async function registerSW() {
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

   // Pakai Service Worker jika tersedia (required di HTTPS/production)
   if (swRegistration) {
      await swRegistration.showNotification(title, {
         body,
         icon: './assets/favicon.svg',
         badge: './assets/favicon.svg',
         tag: 'chat-message',   // replace notif sebelumnya kalau belum diklik
         renotify: true,
      })
   } else {
      // Fallback untuk localhost
      const notif = new Notification(title, { body, icon: './assets/favicon.svg' })
      if (onClick) notif.onclick = () => { window.focus(); onClick(); notif.close() }
      setTimeout(() => notif.close(), 5000)
   }
}

// ── Trigger keduanya sekaligus ────────────────────────────
export function notify({ senderName, message, avatar = null, onClickCb = null }) {
   // Toast selalu tampil
   showToast({ title: senderName, message, avatar, onClick: onClickCb })

   // Browser notif hanya kalau tab tidak fokus
   if (document.hidden || !document.hasFocus()) {
      showBrowserNotification({ title: senderName, body: message, onClick: onClickCb })
   }
}