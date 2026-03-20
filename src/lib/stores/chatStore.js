import { writable } from 'svelte/store'

export const currentUser = writable(null)
export const activeChat = writable(null)
export const messages = writable([])
export const onlineUsers = writable([])
export const typingUsers = writable([])

// Store untuk conversations — persist saat navigasi
export const conversationsStore = writable([])
export const conversationsLoaded = writable(false)

// Cache messages per conversation — { [conversationId]: messages[] }
export const messagesCache = writable({})