<script>
    import { auth } from '$lib/firebase';
    import { goto } from '$app/navigation';

    async function handleLogout() {
        await auth.signOut();
        goto('/login');
    }
</script>

<div class="container mx-auto p-4 text-center">
    <h1 class="text-2xl font-bold mb-4 text-custom-color-tertiary">Registration Pending Approval</h1>
    <p class="mb-4 text-emerald-400">Your account is currently pending approval by an administrator. Please check back later.</p>
    <button on:click={handleLogout} class="bg-custom-btn-bg text-custom-btn-text hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text font-bold py-2 px-4 rounded">
        Return
    </button>
</div>