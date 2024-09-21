<script>
    import '../../styles/custom-filters.css';
    import brandLogo from '../images/logo-small.png';
    import { onMount } from 'svelte';
    import { base } from '$app/paths';
    import { auth } from '$lib/firebase';
    import { signOut } from 'firebase/auth';
    import { goto } from '$app/navigation';

    let currentPath = '';
    let isMenuOpen = false;
    let user = null;

    onMount(() => {
        if (typeof window !== 'undefined') {
            currentPath = window.location.pathname;
            window.addEventListener('popstate', () => {
                currentPath = window.location.pathname;
            });
        }

        const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
            user = firebaseUser;
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
</script>

<nav class="w-full flex items-center justify-between flex-wrap bg-zinc-900 p-3">
    <div class="flex items-center flex-shrink-0 text-white mr-6">
        <a href="{currentPath === '/' ? `${base}/login` : `${base}/`}">
            <img src="{brandLogo}" alt="" class="filter-brand-logo-1 h-12 w-auto">
        </a>
    </div>
    <div class="block lg:hidden">
        <button on:click={toggleMenu} class="flex items-center px-3 py-2 border rounded text-custom-color-secondary border-custom-color-secondary hover:text-white hover:border-white">
            <svg class="fill-current h-3 w-3" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <title>Menu</title>
                <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z"/>
            </svg>
        </button>
    </div>
    <div class="w-full block lg:flex lg:items-center lg:w-auto {isMenuOpen ? 'block' : 'hidden'}" id="nav-content">
        <ul class="text-sm lg:flex-grow lg:flex lg:justify-end">
            {#if user}
                <li>
                    <a href="/profile" class="block mt-4 lg:inline-block lg:mt-0 text-white hover:text-orange-400 mr-4 text-lg">Profile</a>
                </li>
                <li>
                    <button on:click={handleLogout} class="block mt-4 lg:inline-block lg:mt-0 text-white hover:text-orange-400 mr-4 text-lg">Logout</button>
                </li>
            {:else}
                <li>
                    <a href="/login" class="block mt-4 lg:inline-block lg:mt-0 text-white hover:text-orange-400 mr-4 text-lg">Login</a>
                </li>
                <li>
                    <a href="/signup" class="block mt-4 lg:inline-block lg:mt-0 text-white hover:text-orange-400 mr-4 text-lg">Sign Up</a>
                </li>
            {/if}
        </ul>
    </div>
</nav>