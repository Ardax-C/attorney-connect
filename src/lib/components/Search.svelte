<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { auth, db } from '$lib/firebase';
    import { collection, query, getDocs, where, orderBy, limit, startAfter } from 'firebase/firestore';
    import { ChevronDown, ChevronUp } from 'lucide-svelte';
    import Navbar from './Navbar.svelte';
    import SearchBar from './SearchBar.svelte';
    import UserProfileCard from './UserProfileCard.svelte';
    import MobileSearchComponent from './MobileSearchComponent.svelte';
    import backgroundImage from '../images/dark_lattice.png';
    import { searchAttorneys, calculateRelevanceScore } from '$lib/vertexAI';

    let errorMessage = '';
    let searchTerm = '';
    let searchResults = [];
    let showNavbar = true;
    let resultsContainer;
    let isAuthenticated = false;
    let isLoading = true;
    let isMobile = false;
    let lastScrollTop = 0;
    let isSearchExpanded = false;
    let innerHeight;

    // Pagination variables
    let currentPage = 1;
    let totalPages = 1;
    let attorneysPerPage = 20;
    let lastVisible = null;
    let isViewingAllAttorneys = false;

    // New variable to indicate we're on the search page
    let isSearchPage = true;

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                isAuthenticated = true;
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
                } else {
                    // Initialize with all attorneys if no search term
                    handleSearch();
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

    async function handleSearch(event, page = 1) {
        if (event && event.detail) {
            searchTerm = event.detail.searchTerm || '';
        }

        errorMessage = '';
        searchResults = [];
        isLoading = true;
        currentPage = page;

        try {
            const queryAnalysis = await searchAttorneys(searchTerm);

            let firestoreQuery = collection(db, "attorneyProfiles");
            let conditions = [];

            if (queryAnalysis.locations.states.length > 0) {
                conditions.push(where("state", "in", queryAnalysis.locations.states));
            }
            if (queryAnalysis.locations.cities.length > 0) {
                conditions.push(where("city", "in", queryAnalysis.locations.cities));
            }

            if (conditions.length > 0) {
                firestoreQuery = query(firestoreQuery, ...conditions, orderBy("lastName"), limit(100));
            } else {
                firestoreQuery = query(firestoreQuery, orderBy("lastName"), limit(100));
            }

            if (page > 1 && lastVisible) {
                firestoreQuery = query(firestoreQuery, startAfter(lastVisible));
            }

            const querySnapshot = await getDocs(firestoreQuery);

            let allResults = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data };
            });

            if (searchTerm.trim() !== '') {
                allResults = allResults
                    .filter(attorney => attorney.searchTerms && attorney.searchTerms.keywords)
                    .map(attorney => ({
                    ...attorney,
                    relevanceScore: calculateRelevanceScore(attorney, queryAnalysis)
                    }))
                    .filter(attorney => attorney.relevanceScore > 0)
                    .sort((a, b) => b.relevanceScore - a.relevanceScore);
            }

            // Paginate results
            const startIndex = (page - 1) * attorneysPerPage;
            searchResults = allResults.slice(startIndex, startIndex + attorneysPerPage);

            if (searchResults.length > 0) {
                lastVisible = querySnapshot.docs[searchResults.length - 1];
            }

            // Calculate total pages
            totalPages = Math.ceil(allResults.length / attorneysPerPage);

            if (searchResults.length === 0 && searchTerm.trim() !== '') {
                errorMessage = "No attorneys found matching your search criteria. Please try different keywords or broaden your search.";
            }
        } catch (error) {
            errorMessage = "An error occurred while searching. Please try again.";
            searchResults = [];
        } finally {
            isLoading = false;
        }
    }

    function handleSearchBarSearch(event) {
        if (event.detail && isMobile) {
            searchTerm = event.detail.searchTerm;
        } else {
            searchTerm = event.detail;
        }
        handleSearch();
    }

    function handleProfileClick(attorneyId) {
        goto(`/attorney/${attorneyId}`);
    }

    function handlePageChange(newPage) {
        handleSearch(null, newPage);
    }

    function handleAttorneysPerPageChange(event) {
        attorneysPerPage = parseInt(event.target.value);
        handleSearch();
    }

    $: if (isMobile) {
        isSearchExpanded = true;
    }
</script>

<Navbar 
    bind:visible={showNavbar}
    {isSearchPage}
    {currentPage}
    {totalPages}
    onPageChange={handlePageChange}
/>

<main class="bg-no-repeat bg-center bg-cover flex flex-col min-h-screen" style="background-image: url({backgroundImage})">
    <div class="flex-grow flex flex-col overflow-hidden {showNavbar ? 'mt-16' : 'mt-0'}" style="height: {innerHeight}px">
        <div class="w-full transition-all duration-300 ease-in-out {showNavbar ? '' : 'fixed top-0 left-0 right-0 z-40 bg-zinc-800 bg-opacity-90'}">
            {#if isMobile}
                <MobileSearchComponent
                    headerText="Search Attorneys"
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
                                    placeholder="Search for attorneys (e.g., 'divorce lawyer in New York')"
                                    bind:value={searchTerm}
                                    on:search={handleSearchBarSearch}
                                    showSearchButton={true}
                                />
                            </div>
                            <div class="flex justify-between items-center">
                                <select bind:value={attorneysPerPage} on:change={handleAttorneysPerPageChange} class="bg-zinc-700 text-white rounded p-2">
                                    <option value="10">10 per page</option>
                                    <option value="20">20 per page</option>
                                    <option value="50">50 per page</option>
                                </select>
                                {#if isViewingAllAttorneys}
                                    <span class="text-cyan-400">Viewing all attorneys</span>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
        <div id="results-container" class="flex-grow overflow-y-auto px-4 pb-16 mt-4 mb-4" style="max-height: calc(100% - {isMobile ? '120px' : '0px'});">
            {#if isLoading}
                <p class="text-cyan-400 text-center mt-4">Searching for attorneys...</p>
            {:else if errorMessage}
                <p class="text-red-500 text-center mt-4">{errorMessage}</p>
            {:else if searchResults.length > 0}
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {#each searchResults as result}
                        <div class="w-full flex justify-center">
                            <button class="w-full sm:w-full cursor-pointer" on:click={() => handleProfileClick(result.id)} type="button">
                                <UserProfileCard user={result} />
                            </button>
                        </div>
                    {/each}
                </div>
            {:else if searchResults.length === 0 && searchTerm}
                <p class="text-emerald-400 text-center mt-4">No results found. Please try a different search.</p>
            {:else}
                <p class="text-xl text-orange-300 font-bold text-center mt-4">Enter a search query to find attorneys.</p>
            {/if}
        </div>
    </div>
</main>

<style>
    :global(body) {
        overflow: hidden;
    }
</style>