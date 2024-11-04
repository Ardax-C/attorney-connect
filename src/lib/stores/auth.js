import { writable } from 'svelte/store';
import { auth } from '$lib/firebase';
import { initializePresence, cleanupPresence } from '$lib/services/presenceService';
import { goto } from '$app/navigation';

export const authStore = writable({
    user: null,
    loading: true
});

// Add a global map to track chat subscriptions
const chatSubscriptions = new Map();

export async function logout() {
    try {
        // First cleanup all presence data
        await cleanupPresence();
        
        // Cleanup all chat subscriptions
        chatSubscriptions.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        chatSubscriptions.clear();

        // Sign out from Firebase
        await auth.signOut();
        
        // Navigate to login page
        await goto('/login');
    } catch (error) {
        console.error('Error during logout:', error);
        throw error;
    }
}

// Add helper functions to manage subscriptions
export function addChatSubscription(chatId, unsubscribe) {
    chatSubscriptions.set(chatId, unsubscribe);
}

export function removeChatSubscription(chatId) {
    chatSubscriptions.delete(chatId);
}

auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            await initializePresence();
            authStore.set({ user, loading: false });
        } catch (error) {
            console.error('Error initializing presence:', error);
            authStore.set({ user, loading: false });
        }
    } else {
        try {
            await cleanupPresence();
            authStore.set({ user: null, loading: false });
        } catch (error) {
            console.error('Error cleaning up presence:', error);
            authStore.set({ user: null, loading: false });
        }
    }
}); 