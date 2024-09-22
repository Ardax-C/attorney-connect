<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { db } from '$lib/firebase';
    import { collection, query, where, getDocs } from 'firebase/firestore';
    import Navbar from './Navbar.svelte';
    import SearchBar from './SearchBar.svelte';
    import UserProfileCard from './UserProfileCard.svelte';
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';
	import { goto } from '$app/navigation';

    let searchTerm = '';
    let selectedState = '';
    let selectedPracticeArea = '';
    let searchResults = [];
    let states = [];
    let practiceAreas = [];
    let showNavbar = true;
    let showSearchBar = true;
    let resultsContainer;
    let isLoading = true;
    let isAuthenticated = false;

    onMount(async () => {
        try {
            await requireAuth();
            isAuthenticated = true;
            await fetchUniqueFields();
            resultsContainer = document.getElementById('results-container');
            resultsContainer.addEventListener('scroll', handleScroll, { passive: true });

            // Handle incoming search query
            const urlSearchParams = new URLSearchParams($page.url.searchParams);
            const incomingSearchTerm = urlSearchParams.get('q');
            if (incomingSearchTerm) {
                searchTerm = incomingSearchTerm;
                await handleSearch();
            }
        } catch (error) {
            console.error("Authentication failed:", error);
            goto('/login');
        } finally {
            isLoading = false;
        }

        return () => {
            if (resultsContainer) {
                resultsContainer.removeEventListener('scroll', handleScroll);
            }
        };
    });

    function handleScroll() {
        const scrollTop = resultsContainer.scrollTop;
        if (scrollTop > 100) {
            showSearchBar = false;
        } else {
            showSearchBar = true;
        }
    }

    async function fetchUniqueFields() {
        // Implement fetching unique states and practice areas
        // This is a placeholder and needs to be implemented
        states = ['Wisconsin', 'California', 'New York', 'Alabama', 'Maryland'];
        practiceAreas = ['International Law', 'Memetic Warfare', 'Criminal Law', 'Family Law', 'Tax Law'];
    }


    async function handleSearch() {
        let q = collection(db, "attorneyProfiles");

        if (searchTerm) {
            q = query(q, 
                where('firstName', '>=', searchTerm), 
                where('firstName', '<=', searchTerm + '\uf8ff')
            );
        }

        if (selectedState) {
            q = query(q, where('state', '==', selectedState));
        }

        if (selectedPracticeArea) {
            q = query(q, where('practiceAreas', 'array-contains', selectedPracticeArea));
        }

        const querySnapshot = await getDocs(q);
        searchResults = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data };
        });
    }

    function handleSearchInput(event) {
        searchTerm = event.detail;
    }

    function handleSearchSubmit() {
        handleSearch();
    }
</script>

{#if isLoading}
    <div class="flex justify-center items-center h-screen">
        <p class="text-white">Loading...</p>
    </div>
{:else if isAuthenticated}
<main class="bg-no-repeat bg-center bg-cover h-screen flex flex-col" style="background-image: url({backgroundImage})">
    <Navbar bind:visible={showNavbar} />
    <div class="flex-grow flex flex-col items-center overflow-hidden px-4 mt-20">
        <div class="w-full max-w-4xl transition-all duration-300 ease-in-out {showSearchBar ? 'max-h-[1000px] opacity-100 mb-4' : 'max-h-0 opacity-0 overflow-hidden'}">
            <div class="bg-zinc-800 bg-opacity-90 rounded-md shadow-md p-4 sm:p-6">
                <h2 class="text-2xl font-bold mb-4 text-center text-custom-color-tertiary font-inter">Search Attorneys</h2>
                
                <div class="mb-4">
                    <SearchBar 
                        placeholder="Search by name or username"
                        bind:value={searchTerm}
                        on:input={handleSearchInput}
                        on:submit={handleSearchSubmit}
                    />
                </div>
                
                <div class="mb-4">
                    <label for="state" class="block text-emerald-400 text-base mb-1">State</label>
                    <select id="state" bind:value={selectedState} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary bg-zinc-700 text-white">
                        <option value="">All States</option>
                        {#each states as state}
                            <option value={state}>{state}</option>
                        {/each}
                    </select>
                </div>
                
                <div class="mb-4">
                    <label for="practiceArea" class="block text-emerald-400 text-base mb-1">Practice Area</label>
                    <select id="practiceArea" bind:value={selectedPracticeArea} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary bg-zinc-700 text-white">
                        <option value="">All Practice Areas</option>
                        {#each practiceAreas as area}
                            <option value={area}>{area}</option>
                        {/each}
                    </select>
                </div>
            </div>
        </div>

        <div id="results-container" class="w-full max-w-4xl flex-grow overflow-y-auto no-scrollbar">
            {#if searchResults.length > 0}
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {#each searchResults as result (result.id)}
                        <div class="w-full min-h-[250px]">
                            <UserProfileCard user={result} />
                        </div>
                    {/each}
                </div>
            {:else if searchResults.length === 0 && searchTerm}
                <p class="text-emerald-400 text-center mt-4">No results found.</p>
            {/if}
        </div>
    </div>
</main>
{/if}



<style>
    :global(body) {
        overflow: hidden;
    }
</style>