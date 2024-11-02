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
    let keywords = '';
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

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) goto('/login');
        });

        const urlSearchParams = new URLSearchParams($page.url.searchParams);
        const incomingSearchTerm = urlSearchParams.get('q');
        if (incomingSearchTerm) {
            searchTerm = incomingSearchTerm;
            handleSearch();
        }

        return unsubscribe;
    });

    async function handleSearch(page = 1) {
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

    function applyFilters() {
        searchTerm = keywords;
        handleSearch(1);
    }

    function changePage(direction) {
        const newPage = currentPage + direction;
        if (newPage >= 1 && newPage <= totalPages) {
            handlePageChange(newPage);
        }
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter') {
            applyFilters();
        }
    }
</script>

<main class="bg-no-repeat bg-center bg-cover h-screen fixed w-full" style="background-image: url({backgroundImage})">
    <Navbar />
    
    <div class="container mx-auto px-4 py-8 mt-16 h-[calc(100vh-6rem)]">
        <!-- Search Header -->
        <div class="flex flex-col md:flex-row justify-between items-center mb-8">
            <h1 class="text-3xl font-bold text-custom-color-tertiary mb-4 md:mb-0">Search Attorneys</h1>
            <div class="flex items-center space-x-2">
                <span class="text-emerald-400">Page {currentPage} of {totalPages}</span>
                <div class="flex space-x-2">
                    <button 
                        on:click={() => changePage(-1)}
                        disabled={currentPage === 1}
                        class="p-2 rounded-lg bg-zinc-700/50 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button 
                        on:click={() => changePage(1)}
                        disabled={currentPage === totalPages}
                        class="p-2 rounded-lg bg-zinc-700/50 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- Search Grid Layout -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-[calc(100%-5rem)]">
            <!-- Search Filters Panel -->
            <div class="lg:col-span-1">
                <div class="bg-zinc-800 bg-opacity-90 rounded-xl shadow-2xl p-6">
                    <h2 class="text-xl font-semibold text-custom-color-tertiary mb-6">Search</h2>
                    
                    <div class="mb-6">
                        <input 
                            id="keywords"
                            type="text" 
                            bind:value={keywords}
                            on:keypress={handleKeyPress}
                            placeholder="Search by name or keyword"
                            class="w-full bg-zinc-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                    </div>

                    <button 
                        on:click={applyFilters}
                        class="w-full bg-custom-color-tertiary text-blue-950 py-2 px-4 rounded-lg hover:bg-blue-900 hover:text-custom-color-tertiary transition-all transform active:scale-95"
                    >
                        Search
                    </button>
                </div>
            </div>

            <!-- Results Grid - Add overflow -->
            <div class="lg:col-span-2 overflow-y-auto pr-2 scrollbar-hide">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {#each searchResults as attorney}
                        <div 
                            class="bg-zinc-800 bg-opacity-90 rounded-xl shadow-2xl overflow-hidden hover:transform hover:scale-105 transition-all duration-300 cursor-pointer"
                            on:click={() => handleProfileClick(attorney.id)}
                            on:keydown={(e) => e.key === 'Enter' && handleProfileClick(attorney.id)}
                            tabindex="0"
                            role="button"
                        >
                            <div class="relative h-36 bg-gradient-to-r from-cyan-600 to-cyan-800">
                                <img 
                                    src={attorney.profilePictureUrl || '/default-profile.png'} 
                                    alt={attorney.firstName} 
                                    class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-20 h-20 rounded-xl object-cover border-4 border-zinc-800"
                                >
                            </div>
                            
                            <div class="pt-12 p-4 text-center">
                                <h3 class="text-lg font-semibold text-cyan-400 mb-1">
                                    {attorney.firstName} {attorney.lastName}
                                </h3>
                                <p class="text-emerald-400 text-xs mb-2">
                                    {attorney.city}, {attorney.state}
                                </p>
                                <div class="flex flex-wrap justify-center gap-1">
                                    {#each attorney.practiceAreas.slice(0, 3) as area}
                                        <span class="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-lg text-xs">
                                            {area}
                                        </span>
                                    {/each}
                                    {#if attorney.practiceAreas.length > 3}
                                        <span class="text-emerald-400/70 text-xs">
                                            +{attorney.practiceAreas.length - 3} more
                                        </span>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</main>

<style>
    :global(body) {
        overflow: hidden;
    }

    /* Add custom scrollbar hiding */
    :global(.scrollbar-hide) {
        -ms-overflow-style: none;  /* IE and Edge */
        scrollbar-width: none;     /* Firefox */
    }
    :global(.scrollbar-hide::-webkit-scrollbar) {
        display: none;            /* Chrome, Safari and Opera */
    }
</style>