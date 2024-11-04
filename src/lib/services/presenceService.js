import { db, auth, rtdb } from '$lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { browser } from '$app/environment';

let heartbeatInterval;
let unsubscribeConnected;
let idleTimeout;
const IDLE_TIMEOUT =30000; 

function resetIdleTimer() {
    if (!browser) return;
    
    if (idleTimeout) {
        clearTimeout(idleTimeout);
    }
    
    if (!auth.currentUser) return;
    
    const uid = auth.currentUser.uid;
    const userStatusFirestoreRef = doc(db, 'userStatus', uid);
    const userStatusRef = ref(rtdb, `/status/${uid}`);
    
    // Set status to online in both databases
    setDoc(userStatusFirestoreRef, {
        online: true,
        idle: false,
        lastSeen: serverTimestamp()
    }, { merge: true });

    set(userStatusRef, {
        state: 'online',
        idle: false,
        last_seen: serverTimestamp()
    });
    
    // Start idle timer
    idleTimeout = setTimeout(async () => {
        if (auth.currentUser) {
            await setDoc(userStatusFirestoreRef, {
                online: true,
                idle: true,
                lastSeen: serverTimestamp()
            }, { merge: true });

            await set(userStatusRef, {
                state: 'online',
                idle: true,
                last_seen: serverTimestamp()
            });
        }
    }, IDLE_TIMEOUT);
}

export async function initializePresence() {
    if (!browser || !auth.currentUser) return;

    const uid = auth.currentUser.uid;
    
    try {
        // Clear any existing presence
        await cleanupPresence();
        
        const userStatusRef = ref(rtdb, `/status/${uid}`);
        const userStatusFirestoreRef = doc(db, 'userStatus', uid);
        const connectedRef = ref(rtdb, '.info/connected');

        // Set initial status
        await set(userStatusRef, {
            state: 'online',
            idle: false,
            last_seen: serverTimestamp()
        });

        await setDoc(userStatusFirestoreRef, {
            online: true,
            idle: false,
            lastSeen: serverTimestamp()
        }, { merge: true });

        // Add event listeners for user activity only in browser
        if (browser) {
            const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
            events.forEach(event => {
                document.addEventListener(event, resetIdleTimer, true);
            });
            
            // Initial reset of idle timer
            resetIdleTimer();
        }

        // Monitor connection state
        unsubscribeConnected = onValue(connectedRef, async (snapshot) => {
            if (snapshot.val() === true) {
                try {
                    // Set up disconnect handler
                    const rtdbDisconnectRef = onDisconnect(userStatusRef);
                    await rtdbDisconnectRef.set({
                        state: 'offline',
                        idle: false,
                        last_seen: serverTimestamp()
                    });

                    // Set online status
                    await set(userStatusRef, {
                        state: 'online',
                        idle: false,
                        last_seen: serverTimestamp()
                    });

                    await setDoc(userStatusFirestoreRef, {
                        online: true,
                        idle: false,
                        lastSeen: serverTimestamp()
                    }, { merge: true });

                // eslint-disable-next-line no-unused-vars
                } catch (error) {
                    // Ignore presence errors
                }
            }
        });
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
        // Ignore presence errors
    }
}

export async function cleanupPresence() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }

    if (unsubscribeConnected) {
        unsubscribeConnected();
        unsubscribeConnected = null;
    }

    if (idleTimeout) {
        clearTimeout(idleTimeout);
        idleTimeout = null;
    }
    
    // Remove event listeners only in browser
    if (browser) {
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.removeEventListener(event, resetIdleTimer, true);
        });
    }

    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    
    try {
        const userStatusFirestoreRef = doc(db, 'userStatus', uid);
        await setDoc(userStatusFirestoreRef, {
            online: false,
            idle: false,
            lastSeen: serverTimestamp()
        }, { merge: true });

        const userStatusRef = ref(rtdb, `/status/${uid}`);
        await set(userStatusRef, {
            state: 'offline',
            idle: false,
            last_seen: serverTimestamp()
        });
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
        // Ignore presence errors
    }
} 