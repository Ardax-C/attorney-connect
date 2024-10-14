<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { auth } from '$lib/firebase';
    import { ChevronDown, ChevronUp, ChevronLeft, Search, Info } from 'lucide-svelte';
    import Navbar from './Navbar.svelte';
    import UserProfileCard from './UserProfileCard.svelte';
    import backgroundImage from '../images/dark_lattice.png';
    import { searchAttorneys } from '$lib/vertexAI';

    let searchTerm = '';
    let searchResults = [];
    let extractedInfo = null;
    let isLoading = false;
    let errorMessage = '';
    let isSearchExpanded = true;
    let totalResults = 0;
    let isInfoExpanded = false;
    let hasSearched = false;

    // Pagination
    let currentPage = 1;
    let totalPages = 1;
    let resultsPerPage = 20;

    $: isSearchPage = true;

    onMount(async () => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) goto('/login');
        });

        const urlSearchParams = new URLSearchParams($page.url.searchParams);
        const incomingSearchTerm = urlSearchParams.get('q');
        if (incomingSearchTerm) {
            searchTerm = incomingSearchTerm;
            await handleSearch();
        }

        return unsubscribe;
    });

    async function handleSearch(page = 1) {
        if (!searchTerm.trim()) return;

        isLoading = true;
        errorMessage = '';
        currentPage = page;

        try {
            const { extractedInfo: newExtractedInfo, results } = await searchAttorneys(searchTerm);
            extractedInfo = newExtractedInfo;
            totalResults = results.length;
            totalPages = Math.ceil(totalResults / resultsPerPage);
            
            const startIndex = (page - 1) * resultsPerPage;
            searchResults = results.slice(startIndex, startIndex + resultsPerPage);

            if (searchResults.length === 0) {
                errorMessage = "No attorneys found matching your search criteria. Please try different keywords or broaden your search.";
            }
        } catch (error) {
            errorMessage = "An error occurred while searching. Please try again.";
            searchResults = [];
        } finally {
            isLoading = false;
        }

        toggleSearchBar();
        hasSearched = true;
    }

    function handlePageChange(newPage) {
        handleSearch(newPage);
    }

    function handleProfileClick(attorneyId) {
        goto(`/attorney/${attorneyId}`);
    }

    function getFuzzyMatchFeedback() {
        let feedback = [];
        if (extractedInfo?.originalLocations) {
            extractedInfo.originalLocations.forEach((loc, index) => {
                if (loc !== extractedInfo.locations[index]) {
                    feedback.push(`"${loc}" corrected to "${extractedInfo.locations[index]}"`);
                }
            });
        }
        if (extractedInfo?.originalPracticeAreas) {
            extractedInfo.originalPracticeAreas.forEach((area, index) => {
                if (area !== extractedInfo.practiceAreas[index]) {
                    feedback.push(`"${area}" corrected to "${extractedInfo.practiceAreas[index]}"`);
                }
            });
        }
        return feedback;
    }

    function toggleSearchBar() {
        isSearchExpanded = !isSearchExpanded;
    }

    function toggleInfoBox() {
        isInfoExpanded = !isInfoExpanded;
    }
</script>

<Navbar 
    {isSearchPage}
    {currentPage}
    {totalPages}
    onPageChange={handlePageChange}
/>

<main class="bg-no-repeat bg-center bg-cover min-h-screen pt-10 flex" style="background-image: url({backgroundImage})">
    <!-- Left Sidebar for Search Information -->
    {#if hasSearched}
        <div class="fixed left-0 top-16 bottom-0 w-64 bg-zinc-800 bg-opacity-90 overflow-y-auto transition-all duration-300 ease-in-out"
             class:w-64={isInfoExpanded} class:w-12={!isInfoExpanded}>
            <button on:click={toggleInfoBox} class="absolute top-2 right-2 text-cyan-400 hover:text-cyan-300">
                {#if isInfoExpanded}
                    <ChevronLeft size={24} />
                {:else}
                    <Info size={24} />
                {/if}
            </button>
            
            {#if isInfoExpanded && extractedInfo}
                <div class="p-4">
                    <h3 class="text-cyan-400 font-semibold mb-2 text-lg">Search Information:</h3>
                    <p class="text-emerald-400 text-base mb-1">Keywords: {extractedInfo.keywords.join(', ')}</p>
                    <p class="text-emerald-400 text-base mb-1">Practice Areas: {extractedInfo.practiceAreas.join(', ')}</p>
                    <p class="text-emerald-400 text-base mb-1">Locations: {extractedInfo.locations.join(', ')}</p>
                    
                    {#if getFuzzyMatchFeedback().length > 0}
                        <div class="mt-2">
                            <h4 class="text-yellow-400 font-semibold text-base">Search Corrections:</h4>
                            <ul class="list-disc list-inside text-sm">
                                {#each getFuzzyMatchFeedback() as feedback}
                                    <li class="text-yellow-400">{feedback}</li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}

    <!-- Main Content Area -->
    <div class="flex-grow" class:ml-64={hasSearched && isInfoExpanded} class:ml-12={hasSearched && !isInfoExpanded}>
        <div class="max-w-4xl mx-auto px-4 py-4">
            <div class="bg-zinc-900 rounded-md mb-4 py-4 px-4">
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-2xl font-bold text-cyan-400">Search Attorneys</h2>
                    <button on:click={toggleSearchBar} class="text-cyan-400 hover:text-cyan-300">
                        {#if isSearchExpanded}
                            <ChevronUp size={24} />
                        {:else}
                            <ChevronDown size={24} />
                        {/if}
                    </button>
                </div>
                {#if isSearchExpanded}
                    <div class="relative">
                        <input
                            type="text"
                            placeholder="Search for attorneys (e.g., 'divorce lawyer in New York')"
                            bind:value={searchTerm}
                            on:keydown={(e) => e.key === 'Enter' && handleSearch()}
                            class="w-full bg-zinc-700 text-white px-4 py-2 pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <button 
                            on:click={() => handleSearch()}
                            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-cyan-400 hover:text-cyan-300"
                        >
                            <Search size={20} />
                        </button>
                    </div>
                {/if}
            </div>

            <div class="overflow-y-auto" style="max-height: calc(100vh - 12rem);">
                {#if isLoading}
                    <div class="text-center">
                        <p class="text-cyan-400">Searching for attorneys...</p>
                    </div>
                {:else if errorMessage}
                    <div class="bg-red-500 bg-opacity-75 text-white p-4 rounded-md">
                        <p>{errorMessage}</p>
                    </div>
                {:else if searchResults.length > 0}
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {#each searchResults as result}
                            <button class="w-full text-left" on:click={() => handleProfileClick(result.id)}>
                                <UserProfileCard user={result} />
                            </button>
                        {/each}
                    </div>

                    <div class="mt-4 text-center text-emerald-400">
                        Showing {(currentPage - 1) * resultsPerPage + 1} - {Math.min(currentPage * resultsPerPage, totalResults)} of {totalResults} results
                    </div>

                {/if}
            </div>
        </div>
    </div>
</main>

<style>
    :global(body) {
        background-color: #18181b; /* Equivalent to bg-zinc-900 */
    }
</style>