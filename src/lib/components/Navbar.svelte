<script>
    import '../../styles/custom-filters.css';
    import brandLogo from '../images/logo-small.png';
    import { onMount } from 'svelte';
    import { base } from '$app/paths';
    import { auth, db } from '$lib/firebase';
    import { signOut } from 'firebase/auth';
    import { goto } from '$app/navigation';
    import { doc, getDoc } from 'firebase/firestore';
    import { ChevronLeft, ChevronRight } from 'lucide-svelte';
    import { notificationCount } from '$lib/stores/notificationStore';

    let currentPath = '';
    let isMenuOpen = false;
    let user = null;
    let userRole = null;
    let userStatus = null;
    
    // for use on the search page when a user has initiated a search
    export let visible = true; 
    export let isSearchPage = false; 
    export let currentPage = 1; 
    export let totalPages = 1; 
    export let onPageChange; 

    let hasNotifications = false;

    $: hasNotifications = $notificationCount > 0;

    onMount(() => {
        if (typeof window !== 'undefined') {
            currentPath = window.location.pathname;
            window.addEventListener('popstate', () => {
                currentPath = window.location.pathname;
            });
        }
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

<nav class="fixed top-0 left-0 right-0 z-50 shadow-xl">
    <div class="w-full flex items-center justify-between bg-zinc-900 p-3">
        <!-- Left section (Logo) -->
        <div class="flex-shrink-0 w-1/4">
            <a href="{currentPath === '/' ? `${base}/login` : `${base}/`}">
                <img src="{brandLogo}" alt="" class="filter-brand-logo-1 h-12 w-auto">
            </a>
        </div>

        <!-- Center section (Pagination) -->
        <div class="flex-grow flex justify-center items-center w-1/2">
            {#if isSearchPage}
                <div class="flex items-center space-x-2">
                    <button on:click={handlePreviousPage} class="text-white" disabled={currentPage === 1}>
                        <ChevronLeft size={24} />
                    </button>
                    <span class="text-white mx-2">{currentPage}</span>
                    <button on:click={handleNextPage} class="text-white" disabled={currentPage === totalPages}>
                        <ChevronRight size={24} />
                    </button>
                </div>
            {/if}
        </div>

        <!-- Right section (Menu items) -->
        <div class="flex-shrink-0 w-1/4 flex justify-end items-center">
            <div class="hidden lg:flex items-center space-x-4">
                {#if user && userStatus === 'approved'}
                    <a href="/search" class="text-white hover:text-orange-400 text-lg">Search</a>
                    <a href="/profile" class="text-white hover:text-orange-400 text-lg">Profile</a>
                    <div class="relative inline-flex items-center">
                        <a href="/chats" class="text-white hover:text-orange-400 text-lg">Chats</a>
                        {#if hasNotifications}
                            <span class="absolute -top-1 -right-3 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">{$notificationCount}</span>
                        {/if}
                    </div>
                    {#if userRole === 'admin'}
                        <a href="/admin" class="text-white hover:text-orange-400 text-lg">Admin Dashboard</a>
                    {/if}
                    <button on:click={handleLogout} class="text-white hover:text-orange-400 text-lg">Logout</button>
                {:else if user && userStatus === 'pending'}
                    <a href="/registration-pending" class="text-white hover:text-orange-400 text-lg">Registration Pending</a>
                    <button on:click={handleLogout} class="text-white hover:text-orange-400 text-lg">Logout</button>
                {:else}
                    <a href="/login" class="text-white hover:text-orange-400 text-lg">Login</a>
                    <a href="/signup" class="text-white hover:text-orange-400 text-lg">Sign Up</a>
                {/if}
            </div>
            <div class="lg:hidden">
                <button on:click={toggleMenu} class="text-white hover:text-orange-400">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <!-- Mobile menu -->
    {#if isMenuOpen}
        <div class="lg:hidden bg-zinc-800">
            <div class="px-2 pt-2 pb-3 space-y-1">
                {#if user && userStatus === 'approved'}
                    <a href="/search" class="block text-white hover:text-orange-400 text-lg">Search</a>
                    <a href="/profile" class="block text-white hover:text-orange-400 text-lg">Profile</a>
                    <div class="relative inline-flex items-center">
                        <a href="/chats" class="block text-white hover:text-orange-400 text-lg">Chats</a>
                        {#if hasNotifications}
                            <span class="absolute -top-1 -right-4 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">{$notificationCount}</span>
                        {/if}
                    </div>
                    {#if userRole === 'admin'}
                        <a href="/admin" class="block text-white hover:text-orange-400 text-lg">Admin Dashboard</a>
                    {/if}
                    <button on:click={handleLogout} class="block w-full text-left text-white hover:text-orange-400 text-lg">Logout</button>
                {:else if user && userStatus === 'pending'}
                    <a href="/registration-pending" class="block text-white hover:text-orange-400 text-lg">Registration Pending</a>
                    <button on:click={handleLogout} class="block w-full text-left text-white hover:text-orange-400 text-lg">Logout</button>
                {:else}
                    <a href="/login" class="block text-white hover:text-orange-400 text-lg">Login</a>
                    <a href="/signup" class="block text-white hover:text-orange-400 text-lg">Sign Up</a>
                {/if}
            </div>
        </div>
    {/if}
</nav>