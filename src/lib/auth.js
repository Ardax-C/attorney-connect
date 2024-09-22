import { auth } from '$lib/firebase';
import { goto } from '$app/navigation';

export function requireAuth() {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            if (user) {
                resolve(user);
            } else {
                goto('/login');
                reject('Not authenticated');
            }
        });
    });
}