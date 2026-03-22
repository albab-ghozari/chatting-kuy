// src/lib/api.js
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"

function getToken() {
   if (typeof localStorage === "undefined") return ""
   return localStorage.getItem("token") ?? ""
}

async function request(path, options = {}) {
   const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer ${getToken()}`,
         ...options.headers,
      },
   })

   if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      if (res.status === 401 && typeof localStorage !== "undefined") {
         localStorage.removeItem("token")
         localStorage.removeItem("user")
         window.location.href = "/"
         return
      }
      throw new Error(err.message ?? `HTTP ${res.status}`)
   }

   return res.json()
}

export const authApi = {
   login: (username, password) =>
      request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
   register: (username, password) =>
      request("/auth/register", { method: "POST", body: JSON.stringify({ username, password }) }),
   getMe: () => request("/auth/me"),
   updateProfile: (data) =>
      request("/auth/profile", { method: "PUT", body: JSON.stringify(data) }),
}

export const conversationApi = {
   getAll: () => request("/conversations"),
   create: (targetUserId) =>
      request("/conversations", { method: "POST", body: JSON.stringify({ targetUserId }) }),
   createGroup: (groupName, memberIds) =>
      request("/conversations/group", { method: "POST", body: JSON.stringify({ groupName, memberIds }) }),
   addMember: (conversationId, targetUserId) =>
      request(`/conversations/${conversationId}/members`, { method: "POST", body: JSON.stringify({ targetUserId }) }),
   removeMember: (conversationId, userId) =>
      request(`/conversations/${conversationId}/members/${userId}`, { method: "DELETE" }),
   searchUsers: (q) =>
      request(`/conversations/users?q=${encodeURIComponent(q)}`),
}

export const messageApi = {
   getByConversation: (conversationId) => request(`/messages/${conversationId}`),
   send: (conversationId, content) =>
      request("/messages", { method: "POST", body: JSON.stringify({ conversationId, content }) }),
}
