// src/lib/socket.js
import { browser } from '$app/environment'

let _socket = null
let _userId = null  // simpan userId untuk reconnect otomatis

async function getSocket() {
   if (!browser) return null

   if (!_socket) {
      const { io } = await import('socket.io-client')
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000'
      console.log('🔌 connecting socket to:', SOCKET_URL)
      _socket = io(SOCKET_URL, {
         autoConnect: false,
         transports: ['polling', 'websocket'],  // polling dulu agar Safari support
         reconnection: true,
         reconnectionAttempts: 10,
         reconnectionDelay: 1000,
         upgrade: true,  // upgrade ke websocket kalau bisa
      })

      _socket.on('connect', () => {
         console.log('✅ socket connected:', _socket.id)
         // Kirim join ulang saat reconnect
         if (_userId) {
            _socket.emit('join', _userId)
            console.log('🔁 re-join userId:', _userId)
         }
      })
      _socket.on('disconnect', () => console.log('❌ socket disconnected'))
      _socket.on('connect_error', (e) => console.log('❌ socket error:', e.message))
   }

   return _socket
}

export async function connectSocket(userId) {
   _userId = userId  // simpan untuk reconnect
   const s = await getSocket()
   if (!s) return

   if (!s.connected) {
      s.connect()
      // on('connect') di atas akan handle emit join
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
   const s = await getSocket()
   if (s?.connected) s.disconnect()
}

export async function emitMarkRead(conversationId, userId) {
   const s = await getSocket()
   if (!s) return
   s.emit('mark_read', { conversationId, userId })
}