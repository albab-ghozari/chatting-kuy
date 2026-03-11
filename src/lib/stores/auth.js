import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const stored = browser
   ? JSON.parse(localStorage.getItem('user') ?? 'null')
   : null;

const { subscribe, set, update } = writable(stored);

export const authStore = {
   subscribe,

   login(token, user) {
      if (browser) {
         localStorage.setItem('token', token);
         localStorage.setItem('user', JSON.stringify(user));
      }
      set(user);
   },

   // Update profil tanpa logout
   updateUser(user) {
      if (browser) {
         localStorage.setItem('user', JSON.stringify(user));
      }
      set(user);
   },

   logout() {
      if (browser) {
         localStorage.removeItem('token');
         localStorage.removeItem('user');
      }
      set(null);
   }
};