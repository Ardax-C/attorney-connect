<script>
    import { onMount } from 'svelte';
    import { requireAuth } from '$lib/auth.js';
    import AttorneyProfile from '../../../lib/components/AttorneyProfile.svelte'
    import { goto } from '$app/navigation';

    let isAuthenticated = false;

    onMount(async () => {
        try {
            await requireAuth();
            isAuthenticated = true;
        } catch (error) {
            console.error('Authentication error:', error);
            // The user will be redirected by the requireAuth function
        }
    });
</script>

{#if isAuthenticated}
    <AttorneyProfile />
{:else}
    <p>Authenticating...</p>
{/if}