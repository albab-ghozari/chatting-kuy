import { writable } from "svelte/store"

export const currentUser = writable(null)
export const activeChat = writable(null)

export const messages = writable([])

export const onlineUsers = writable([])

export const typingUsers = writable([])