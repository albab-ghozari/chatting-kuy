// src/lib/notification.js
// Handle browser notification + toast

import { writable } from 'svelte/store'

// ── Toast store ───────────────────────────────────────────
export const toasts = writable([])

let toastId = 0

export function showToast({ title, message, avatar = null, onClick = null }) {
   const id = ++toastId
   toasts.update((t) => [...t, { id, title, message, avatar, onClick }])

   // Auto hilang setelah 4 detik
   setTimeout(() => {
      toasts.update((t) => t.filter((x) => x.id !== id))
   }, 4000)
}

export function dismissToast(id) {
   toasts.update((t) => t.filter((x) => x.id !== id))
}

// ── Browser Notification ──────────────────────────────────
let permissionGranted = false

export async function requestNotificationPermission() {
   if (!('Notification' in window)) return false

   if (Notification.permission === 'granted') {
      permissionGranted = true
      return true
   }

   if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission()
      permissionGranted = result === 'granted'
      return permissionGranted
   }

   return false
}

export function showBrowserNotification({ title, body, icon = '/favicon.png', onClick = null }) {
   if (!('Notification' in window)) return
   if (Notification.permission !== 'granted') return

   const notif = new Notification(title, { body, icon })

   if (onClick) {
      notif.onclick = () => {
         window.focus()
         onClick()
         notif.close()
      }
   } else {
      notif.onclick = () => { window.focus(); notif.close() }
   }

   // Auto close setelah 5 detik
   setTimeout(() => notif.close(), 5000)
}

// ── Trigger keduanya sekaligus ────────────────────────────
export function notify({ senderName, message, avatar = null, onClickCb = null }) {
   // Toast selalu tampil
   showToast({
      title: senderName,
      message,
      avatar,
      onClick: onClickCb,
   })

   // Browser notif hanya kalau tab tidak fokus
   if (document.hidden || !document.hasFocus()) {
      showBrowserNotification({
         title: senderName,
         body: message,
         onClick: onClickCb,
      })
   }
}