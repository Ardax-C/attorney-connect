<script>
    import { onMount } from 'svelte';
    import { auth, db } from '$lib/firebase';
    import { onAuthStateChanged } from 'firebase/auth';
    import { doc, getDoc } from 'firebase/firestore';
    import { goto } from '$app/navigation';
    import Navbar from './Navbar.svelte';
    import backgroundImage from '../images/dark_lattice.png';

    let user = null;
    let profile = null;
    let showNavbar = true;
    let lastScrollTop = 0;
    let mainContent;

    onMount(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            user = firebaseUser;
            if (user) {
                const docRef = doc(db, "attorneyProfiles", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    profile = docSnap.data();
                }
            }
        });

        mainContent = document.getElementById('main-content');
        mainContent.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            unsubscribe();
            mainContent.removeEventListener('scroll', handleScroll);
        };
    });

    function handleScroll() {
        const scrollTop = mainContent.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 50) {
            showNavbar = false;
        } else if (scrollTop < lastScrollTop || scrollTop === 0) {
            showNavbar = true;
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }

    function handleGetStarted() {
        if (user) {
            goto('/search');
        } else {
            goto('/signup');
        }
    }
</script>

<main class="bg-no-repeat bg-center bg-cover h-screen flex flex-col" style="background-image: url({backgroundImage})">
    <Navbar bind:visible={showNavbar} />
    <div id="main-content" class="flex-grow overflow-y-auto pt-16">
        <div class="container mx-auto px-4 py-8">
            <div class="max-w-lg mx-auto my-16 text-center">
                <p class="font-inter text-amber-200 text-3xl sm:text-4xl mb-2">Attorney Connect</p>
                <p class="font-inter text-amber-200 text-5xl sm:text-6xl md:text-7xl"><span class="text-custom-color-tertiary">Trusted</span> Attorneys</p>
                <p class="text-amber-100 text-lg sm:text-xl mt-6 mb-8">
                    An exclusive <span class="text-custom-color-tertiary">attorney-only</span> referral network.
                </p>
                <button
                    class="bg-custom-btn-bg text-custom-btn-text font-inter py-3 px-6 rounded-sm border-none text-xl sm:text-2xl w-full sm:w-auto cursor-pointer transition duration-300 ease-in-out transform hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text active:scale-95"
                    on:click={handleGetStarted}
                >
                    {user ? 'Search Attorneys' : 'Get Started'}
                </button>
            </div>
        </div>
    </div>
</main>