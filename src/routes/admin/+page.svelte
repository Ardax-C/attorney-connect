<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { auth, db } from '$lib/firebase';
    import { doc, getDoc } from 'firebase/firestore';
    import AdminDashboard from '../../lib/components/AdminDashboard.svelte';
    import Search from '../../lib/components/Search.svelte';

    let isAdmin = false;

    onMount(async () => {
        const user = auth.currentUser;
        if (user) {
            const userDoc = await getDoc(doc(db, 'attorneyProfiles', user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                isAdmin = true;
            } else {
                goto('/');
            }
        } else {
            goto('/login');
        }
    });
</script>

{#if isAdmin}
    <AdminDashboard />
{:else}
    <Search />
{/if}
