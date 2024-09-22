<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { auth, db } from '$lib/firebase';
    import { collection, query, getDocs, where } from 'firebase/firestore';
    import { ChevronDown, ChevronUp } from 'lucide-svelte';
    import Navbar from './Navbar.svelte';
    import SearchBar from './SearchBar.svelte';
    import UserProfileCard from './UserProfileCard.svelte';
    import MobileSearchComponent from './MobileSearchComponent.svelte';
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';

    let searchTerm = '';
    let selectedState = '';
    let selectedPracticeArea = '';
    let searchResults = [];
    let states = [];
    let practiceAreas = [];
    let showNavbar = true;
    let resultsContainer;
    let isAuthenticated = false;
    let isLoading = true;
    let isMobile = false;
    let lastScrollTop = 0;
    let isSearchExpanded = false;
    let innerHeight;

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                isAuthenticated = true;
                await fetchUniqueFields();
                checkMobile();
                window.addEventListener('resize', checkMobile);
                
                resultsContainer = document.getElementById('results-container');
                if (resultsContainer) {
                    resultsContainer.addEventListener('scroll', handleScroll, { passive: true });
                }

                const urlSearchParams = new URLSearchParams($page.url.searchParams);
                const incomingSearchTerm = urlSearchParams.get('q');
                if (incomingSearchTerm) {
                    searchTerm = incomingSearchTerm;
                    await handleSearch();
                }
            } else {
                goto('/login');
            }
            isLoading = false;
        });

        const updateInnerHeight = () => {
            innerHeight = window.innerHeight;
        };
        updateInnerHeight();
        window.addEventListener('resize', updateInnerHeight);

        return () => {
            unsubscribe();
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('resize', updateInnerHeight);
            if (resultsContainer) {
                resultsContainer.removeEventListener('scroll', handleScroll);
            }
        };
    });

    function checkMobile() {
        isMobile = window.innerWidth <= 768;
    }

    function handleScroll(event) {
        const scrollTop = event.target.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 50) {
            showNavbar = false;
        } else if (scrollTop < lastScrollTop || scrollTop === 0) {
            showNavbar = true;
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }

    function toggleSearchExpansion() {
        isSearchExpanded = !isSearchExpanded;
    }

    async function fetchUniqueFields() {
        // Fetch states
        const statesQuery = query(collection(db, "states"));
        const statesSnapshot = await getDocs(statesQuery);
        statesSnapshot.docs.forEach(doc => {
        });
        states = statesSnapshot.docs.map(doc => doc.data().state);

        // Fetch practice areas
        const practiceAreasQuery = query(collection(db, "practiceAreas"));
        const practiceAreasSnapshot = await getDocs(practiceAreasQuery);
        practiceAreasSnapshot.docs.forEach(doc => {
        });
        practiceAreas = practiceAreasSnapshot.docs.map(doc => doc.data().practiceArea);
    }

    async function handleSearch(event) {
        if (event && event.detail) {
            searchTerm = event.detail;
        }

        let searchQuery = collection(db, "attorneyProfiles");

        if (selectedState) {
            searchQuery = query(searchQuery, where("state", "==", selectedState));
        }

        if (selectedPracticeArea) {
            searchQuery = query(searchQuery, where("practiceAreas", "array-contains", selectedPracticeArea));
        }

        if (searchTerm) {
            searchQuery = query(searchQuery, where("name", "==", searchTerm));
        }

        const searchSnapshot = await getDocs(searchQuery);
        const results = searchSnapshot.docs.map(doc => doc.data());

        const querySnapshot = await getDocs(results);
        searchResults = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data };
        });
    }

    function handleSearchBarSearch(event) {
        if (typeof event.detail === 'string') {
            searchTerm = event.detail;
        }
        handleSearch();
    }

    $: if (isMobile) {
        isSearchExpanded = true;
    }
</script>

<main class="bg-no-repeat bg-center bg-cover flex flex-col min-h-screen" style="background-image: url({backgroundImage})">
    <Navbar bind:visible={showNavbar} />
    <div class="flex-grow flex flex-col overflow-hidden {showNavbar ? 'mt-16' : 'mt-0'}" style="height: {innerHeight}px">
        <div class="w-full transition-all duration-300 ease-in-out {showNavbar ? '' : 'fixed top-0 left-0 right-0 z-40 bg-zinc-800 bg-opacity-90'}">
            {#if isMobile}
                <MobileSearchComponent
                    {states}
                    {practiceAreas}
                    on:search={handleSearchBarSearch}
                />
            {:else}
                <div class="max-w-4xl mx-auto bg-zinc-800 bg-opacity-90 rounded-md shadow-md p-4">
                    <button class="flex justify-between items-center cursor-pointer w-full text-left" on:click={toggleSearchExpansion} aria-expanded={isSearchExpanded} type="button">
                        <h2 class="text-2xl font-bold text-cyan-400 font-inter">Search Attorneys</h2>
                        {#if isSearchExpanded}
                            <ChevronUp class="text-cyan-400" size={24} />
                        {:else}
                            <ChevronDown class="text-cyan-400" size={24} />
                        {/if}
                    </button>
                    
                    {#if isSearchExpanded}
                        <div class="mt-4 space-y-4">
                            <div class="w-full">
                                <SearchBar
                                    placeholder="Search by name or username"
                                    bind:value={searchTerm}
                                    on:search={handleSearchBarSearch}
                                />
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label for="state" class="block text-emerald-400 text-sm mb-1">State</label>
                                    <select id="state" bind:value={selectedState} class="w-full px-3 py-2 text-sm border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-zinc-700 text-white">
                                        <option value="">All States</option>
                                        {#each states as state}
                                            <option value={state}>{state}</option>
                                        {/each}
                                    </select>
                                </div>
                                
                                <div>
                                    <label for="practiceArea" class="block text-emerald-400 text-sm mb-1">Practice Area</label>
                                    <select id="practiceArea" bind:value={selectedPracticeArea} class="w-full px-3 py-2 text-sm border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-zinc-700 text-white">
                                        <option value="">All Practice Areas</option>
                                        {#each practiceAreas as area}
                                            <option value={area}>{area}</option>
                                        {/each}
                                    </select>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <div id="results-container" class="flex-grow overflow-y-auto px-4 pb-16 mt-4" style="max-height: calc(100% - {isMobile ? '120px' : '0px'});">
            {#if searchResults.length > 0}
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {#each searchResults as result}
                        <div class="w-full flex justify-center">
                            <div class="w-full sm:w-full">
                                <UserProfileCard user={result} />
                            </div>
                        </div>
                    {/each}
                </div>
            {:else if searchResults.length === 0 && searchTerm}
                <p class="text-emerald-400 text-center mt-4">No results found.</p>
            {/if}
        </div>
    </div>
</main>

<style>
    :global(body) {
        overflow: hidden;
    }
</style>