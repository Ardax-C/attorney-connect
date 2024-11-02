<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { auth, db } from '$lib/firebase';
    import { doc, getDoc } from 'firebase/firestore';
    import CourtBriefs from '$lib/components/CourtBriefs.svelte';

    let isAuthenticated = false;
    let isApprovedAttorney = false;

    onMount(async () => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDoc = await getDoc(doc(db, 'attorneyProfiles', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.status === 'approved') {
                        isAuthenticated = true;
                        isApprovedAttorney = true;
                        return;
                    }
                }
            }
            goto('/login');
        });

        return () => unsubscribe();
    });
</script>

{#if isAuthenticated && isApprovedAttorney}
    <CourtBriefs />
{:else}
    <div class="flex items-center justify-center min-h-screen bg-zinc-900">
        <p class="text-emerald-400">Verifying credentials...</p>
    </div>
{/if}