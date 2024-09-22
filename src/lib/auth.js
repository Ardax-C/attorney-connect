import { auth, db } from '$lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { goto } from '$app/navigation';

export async function requireAuth(requiredRole = 'user') {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(async user => {
            unsubscribe();
            if (user) {
                const userDoc = await getDoc(doc(db, 'attorneyProfiles', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.status === 'approved' && (userData.role === requiredRole || userData.role === 'admin')) {
                        resolve(user);
                    } else if (userData.status === 'pending') {
                        goto('/registration-pending');
                        reject('User approval pending');
                    } else if (userData.status === 'denied') {
                        goto('/access-denied');
                        reject('User access denied');
                    } else {
                        goto('/unauthorized');
                        reject('User not authorized');
                    }
                } else {
                    goto('/login');
                    reject('User profile not found');
                }
            } else {
                goto('/login');
                reject('Not authenticated');
            }
        });
    });
}