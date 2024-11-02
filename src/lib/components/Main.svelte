<script>
    import { goto } from '$app/navigation';
    import { auth } from '$lib/firebase';
    import { onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import backgroundImage from '$lib/images/dark_lattice.png';
    import { Search, UserCircle, HandHelping } from 'lucide-svelte';

    let user = null;

    onMount(() => {
        return auth.onAuthStateChanged((currentUser) => {
            user = currentUser;
        });
    });
</script>

<main class="min-h-screen bg-no-repeat bg-cover bg-center relative" style="background-image: url({backgroundImage})">
    <div class="container mx-auto px-4 py-16 md:py-24">
        <!-- Hero Section -->
        <div class="text-center mb-16" in:fade={{ duration: 800, delay: 200 }}>
            <h1 class="text-5xl md:text-7xl font-bold text-custom-color-tertiary mb-4 tracking-tight">
                Attorney Connect
            </h1>
            <h2 class="text-3xl md:text-4xl font-semibold text-emerald-400 mb-4">
                Trusted Attorneys
            </h2>
            <p class="text-xl md:text-2xl text-cyan-400 max-w-2xl mx-auto">
                An exclusive attorney-only referral network
            </p>
        </div>

        {#if user}
            <!-- Logged In: Search Card -->
            <div class="max-w-xl mx-auto" in:fly={{ y: 50, duration: 800, delay: 400 }}>
                <button 
                    class="w-full bg-zinc-800/90 p-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all cursor-pointer group border border-cyan-500/20"
                    on:click={() => goto('/search')}
                >
                    <div class="flex items-center space-x-6">
                        <div class="bg-gradient-to-br from-cyan-500 to-emerald-500 w-16 h-16 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Search class="w-8 h-8 text-zinc-900" />
                        </div>
                        <div class="flex-1">
                            <h2 class="text-2xl font-bold text-custom-color-tertiary mb-2">Search Attorneys</h2>
                            <p class="text-emerald-400">Find and connect with trusted attorneys in your practice area.</p>
                        </div>
                    </div>
                </button>
            </div>
        {:else}
            <!-- Not Logged In: Login & Request Help Cards -->
            <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto" in:fly={{ y: 50, duration: 800, delay: 400 }}>
                <!-- Attorney Login Card -->
                <button 
                    class="w-full bg-zinc-800/90 p-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all cursor-pointer group border border-cyan-500/20"
                    on:click={() => goto('/login')}
                >
                    <div class="flex items-center space-x-6">
                        <div class="bg-gradient-to-br from-cyan-500 to-emerald-500 w-16 h-16 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <UserCircle class="w-8 h-8 text-zinc-900" />
                        </div>
                        <div class="flex-1">
                            <h2 class="text-2xl font-bold text-custom-color-tertiary mb-2">Attorney Login</h2>
                            <p class="text-emerald-400">Access your professional network.</p>
                        </div>
                    </div>
                </button>

                <!-- Request Help Card -->
                <button 
                    class="w-full bg-zinc-800/90 p-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all cursor-pointer group border border-cyan-500/20"
                    on:click={() => goto('/request')}
                >
                    <div class="flex items-center space-x-6">
                        <div class="bg-gradient-to-br from-purple-500 to-pink-500 w-16 h-16 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <HandHelping class="w-8 h-8 text-zinc-900" />
                        </div>
                        <div class="flex-1">
                            <h2 class="text-2xl font-bold text-custom-color-tertiary mb-2">Need Legal Help?</h2>
                            <p class="text-emerald-400">Request assistance from our network.</p>
                        </div>
                    </div>
                </button>
            </div>
        {/if}
    </div>

    <!-- Decorative Elements -->
    <div class="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div class="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div class="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
    </div>
</main>