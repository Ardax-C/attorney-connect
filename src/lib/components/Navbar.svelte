<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { auth, db } from '$lib/firebase';
    import { signOut } from 'firebase/auth';
    import { doc, getDoc } from 'firebase/firestore';
    import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-svelte';
    import { notificationCount } from '$lib/stores/notificationStore';
    import brandLogo from '../images/logo-small.png';
    import { page } from '$app/stores';

    export let isSearchPage = false;
    export let currentPage = 1;
    export let totalPages = 1;
    export let onPageChange = () => {};

    let user = null;
    let userRole = null;
    let userStatus = null;
    let isMenuOpen = false;
    let hasNotifications = false;

    $: hasNotifications = $notificationCount > 0;

    $: {
        $page;
        isMenuOpen = false;
    }

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            user = firebaseUser;
            if (user) {
                const userDoc = await getDoc(doc(db, 'attorneyProfiles', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    userRole = userData.role;
                    userStatus = userData.status;
                }
            } else {
                userRole = null;
                userStatus = null;
            }
        });
        return unsubscribe;
    });

    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
    }

    async function handleLogout() {
        try {
            await signOut(auth);
            goto('/login');
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    }

    function handlePreviousPage() {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    }

    function handleNextPage() {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    }
</script>

<nav class="fixed top-0 left-0 right-0 z-50 bg-zinc-900 shadow-xl">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
            <div class="flex-shrink-0">
                <a href="/">
                    <img src="{brandLogo}" alt="Logo" class="h-8 w-auto filter-brand-logo-1">
                </a>
            </div>
            
            {#if isSearchPage}
                <div class="flex items-center space-x-2">
                    <button on:click={handlePreviousPage} class="text-white" disabled={currentPage === 1}>
                        <ChevronLeft size={24} />
                    </button>
                    <span class="text-white mx-2">{currentPage} / {totalPages}</span>
                    <button on:click={handleNextPage} class="text-white" disabled={currentPage === totalPages}>
                        <ChevronRight size={24} />
                    </button>
                </div>
            {/if}
            
            <div class="hidden md:block">
                <div class="ml-10 flex items-baseline space-x-4">
                    {#if user && userStatus === 'approved'}
                        <a href="/search" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Search</a>
                        <a href="/profile" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Profile</a>
                        <div class="relative">
                            <a href="/chats" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Chats</a>
                            {#if hasNotifications}
                                <span class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
                            {/if}
                        </div>
                        {#if userRole === 'admin'}
                            <a href="/admin" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Admin Dashboard</a>
                        {/if}
                        <a
                            href="/requests"
                            class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                        >
                            Legal Requests
                        </a>
                        <a 
                            href="/briefs"
                            class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                        >
                            Court Opinions
                        </a>
                        <button on:click={handleLogout} class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Logout</button>
                    {:else if user && userStatus === 'pending'}
                        <a href="/registration-pending" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Registration Pending</a>
                        <button on:click={handleLogout} class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Logout</button>
                    {:else}
                        <a href="/login" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Login</a>
                        <a href="/signup" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Sign Up</a>
                        <a href="/about" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">About</a>
                    {/if}
                </div>
            </div>
            
            <div class="md:hidden">
                <button on:click={toggleMenu} class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                    {#if isMenuOpen}
                        <X size={24} />
                    {:else}
                        <Menu size={24} />
                    {/if}
                </button>
            </div>
        </div>
    </div>

    {#if isMenuOpen}
        <div class="md:hidden">
            <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                {#if user && userStatus === 'approved'}
                    <a href="/search" class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Search</a>
                    <a href="/profile" class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Profile</a>
                    <a href="/chats" class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
                        Chats
                        {#if hasNotifications}
                            <span class="ml-2 inline-block h-2 w-2 rounded-full bg-red-400"></span>
                        {/if}
                    </a>
                    {#if userRole === 'admin'}
                        <a href="/admin" class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Admin Dashboard</a>
                    {/if}
                    <a
                        href="/requests"
                        class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    >
                        Legal Requests
                    </a>
                    <a 
                        href="/briefs"
                        class="text-emerald-400 hover:text-cyan-400 block px-3 py-2 rounded-md text-base font-medium"
                    >
                        Court Opinions
                    </a>
                    {#if !user}
                        <a 
                            href="/about" 
                            class="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                        >
                            About
                        </a>
                    {/if}
                    <button on:click={handleLogout} class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left">Logout</button>
                {:else if user && userStatus === 'pending'}
                    <a href="/registration-pending" class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Registration Pending</a>
                    <button on:click={handleLogout} class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left">Logout</button>
                {:else}
                    <a href="/login" class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Login</a>
                    <a href="/signup" class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Sign Up</a>
                {/if}
            </div>
        </div>
    {/if}
</nav>

<style>
    nav {
        background-color: #18181b; /* Equivalent to bg-zinc-900 */
    }

    .filter-brand-logo-1 {
        filter: invert(0%) sepia(4%) saturate(13%) hue-rotate(314deg) brightness(98%) contrast(105%);
    }
</style>