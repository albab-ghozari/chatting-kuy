// src/lib/socket.js
// Singleton Socket.io client — SSR-safe untuk SvelteKit
// Pastikan sudah: npm install socket.io-client

import { browser } from '$app/environment'

let _socket = null

async function getSocket() {
   if (!browser) return null   // jangan jalankan di server (SSR)

   if (!_socket) {
      const { io } = await import('socket.io-client')
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000'
      console.log('🔌 connecting socket to:', SOCKET_URL)
      _socket = io(SOCKET_URL, {
         autoConnect: false,
         transports: ['websocket', 'polling'],
      })
      // ← tambah semua log ini
      _socket.on('connect', () => console.log('✅ socket connected:', _socket.id))
      _socket.on('disconnect', () => console.log('❌ socket disconnected'))
      _socket.on('receive_message', (msg) => console.log('📨 receive_message RAW:', msg))
      _socket.on('connect_error', (e) => console.log('❌ socket error:', e.message))

   }

   return _socket
}

/** Connect dan daftarkan userId ke server. Panggil setelah login. */
export async function connectSocket(userId) {
   const s = await getSocket()
   if (!s) return

   if (!s.connected) {
      s.connect()
      s.once('connect', () => s.emit('join', userId))
   } else {
      s.emit('join', userId)
   }
}

/** Masuk ke room conversation tertentu */
export async function joinRoom(conversationId) {
   const s = await getSocket()
   if (!s) return
   s.emit('join_room', conversationId)
}

/** Kirim pesan lewat socket */
export async function sendSocketMessage({ content, senderId, conversationId }) {
   const s = await getSocket()
   if (!s) return
   s.emit('send_message', { content, senderId, conversationId, room: conversationId })
}

/** Daftarkan listener event */
export async function onSocketEvent(event, callback) {
   const s = await getSocket()
   if (!s) return
   s.on(event, callback)
}

/** Hapus listener event */
export async function offSocketEvent(event, callback) {
   const s = await getSocket()
   if (!s) return
   callback ? s.off(event, callback) : s.off(event)
}

/** Emit sedang mengetik */
export async function emitTyping(conversationId, userId) {
   const s = await getSocket()
   if (!s) return
   s.emit('typing', { room: conversationId, userId })
}

/** Emit berhenti mengetik */
export async function emitStopTyping(conversationId, userId) {
   const s = await getSocket()
   if (!s) return
   s.emit('stop_typing', { room: conversationId, userId })
}

/** Disconnect socket */
export async function disconnectSocket() {
   const s = await getSocket()
   if (s?.connected) s.disconnect()
}

/** Emit mark read — tandai semua pesan di conversation sudah dibaca */
export async function emitMarkRead(conversationId, userId) {
   const s = await getSocket()
   if (!s) return
   s.emit('mark_read', { conversationId, userId })
}