// src/lib/socket.js
import { browser } from '$app/environment'

let _socket = null
let _userId = null

async function getSocket() {
   if (!browser) return null

   if (!_socket) {
      const { io } = await import('socket.io-client')
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000'
      console.log('🔌 connecting socket to:', SOCKET_URL)
      _socket = io(SOCKET_URL, {
         autoConnect: false,
         transports: ['polling', 'websocket'],
         reconnection: true,
         reconnectionAttempts: Infinity,
         reconnectionDelay: 1000,
         reconnectionDelayMax: 5000,
         upgrade: true,
         timeout: 20000,
      })

      _socket.on('connect', () => {
         console.log('✅ socket connected:', _socket.id)
         if (_userId) {
            _socket.emit('join', _userId)
            console.log('🔁 re-join userId:', _userId)
         }
         if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('socket-reconnected'))
         }
      })
      _socket.on('disconnect', () => console.log('❌ socket disconnected'))
      _socket.on('connect_error', (e) => console.log('❌ socket error:', e.message))
   }

   return _socket
}

export async function connectSocket(userId) {
   _userId = userId
   const s = await getSocket()
   if (!s) return
   if (!s.connected) {
      s.connect()
   } else {
      s.emit('join', userId)
   }
}

export async function joinRoom(conversationId) {
   const s = await getSocket()
   if (!s) return
   s.emit('join_room', conversationId)
}

export async function sendSocketMessage({ content, senderId, conversationId }) {
   const s = await getSocket()
   if (!s) return
   s.emit('send_message', { content, senderId, conversationId, room: conversationId })
}

export async function onSocketEvent(event, callback) {
   const s = await getSocket()
   if (!s) return
   s.on(event, callback)
}

export async function offSocketEvent(event, callback) {
   const s = await getSocket()
   if (!s) return
   callback ? s.off(event, callback) : s.off(event)
}

export async function emitTyping(conversationId, userId) {
   const s = await getSocket()
   if (!s) return
   s.emit('typing', { room: conversationId, userId })
}

export async function emitStopTyping(conversationId, userId) {
   const s = await getSocket()
   if (!s) return
   s.emit('stop_typing', { room: conversationId, userId })
}

export async function disconnectSocket() {
   _userId = null
   const s = _socket  // [M1 FIX] ambil referensi dulu
   _socket = null     // [M1 FIX] reset ke null agar getSocket() buat instance baru saat login lagi
   if (s?.connected) s.disconnect()
}

export async function emitMarkRead(conversationId, userId) {
   const s = await getSocket()
   if (!s) return
   s.emit('mark_read', { conversationId, userId })
}

export async function isSocketConnected() {
   const s = await getSocket()
   return s?.connected ?? false
}
