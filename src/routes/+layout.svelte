<script>
    import '../app.css'

    import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
    import { inject } from '@vercel/analytics'
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { auth, db } from '$lib/firebase';
    import { doc, getDoc } from 'firebase/firestore';

    let user = null;
    let userRole = null;

    onMount(() => {
        return auth.onAuthStateChanged(async (firebaseUser) => {
            user = firebaseUser;
            if (user) {
                const userDoc = await getDoc(doc(db, 'attorneyProfiles', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    userRole = userData.role;
                    
                    // Redirect based on user status
                    if (userData.status === 'pending' && $page.url.pathname !== '/registration-pending') {
                        goto('/registration-pending');
                    } else if (userData.status === 'denied') {
                        auth.signOut();
                        goto('/login');
                    }
                }
            }
        });
    });

    injectSpeedInsights();
    inject();
</script>

<slot></slot>