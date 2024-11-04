<script>
    import { onMount } from 'svelte';
    import { initializePracticeAreas } from '$lib/stores/practiceAreas';
    import SearchBar from './SearchBar.svelte';
    import AttorneyCard from './AttorneyCard.svelte';
    import LoadingSpinner from './LoadingSpinner.svelte';
    import Pagination from './Pagination.svelte';

    // State management
    let searchTerm = '';
    let currentPage = 1;
    let loading = false;
    let error = null;
    let searchResults = {
        attorneys: [],
        total: 0,
        totalPages: 0,
        parsedQuery: null
    };

    async function performSearch() {
        try {
            loading = true;
            error = null;

            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    searchTerm,
                    currentPage
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'Search failed');
            }

            searchResults = await response.json();
        } catch (err) {
            console.error('Search error:', err);
            error = err.message || 'An error occurred while searching';
        } finally {
            loading = false;
        }
    }

    function handleSearchInput(event) {
        searchTerm = event.detail;
        if (!searchTerm.trim()) {
            performSearch(); // Perform search when input is cleared
        }
    }

    function handleSearchSubmit() {
        currentPage = 1;
        performSearch();
    }

    function handlePageChange(newPage) {
        currentPage = newPage;
        performSearch();
    }

    onMount(async () => {
        await initializePracticeAreas();
        performSearch(); // Initial search with empty term
    });
</script>

<div class="min-h-screen bg-[#1a2632] bg-dark-lattice bg-fixed bg-center bg-cover py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Search Header -->
        <h1 class="text-5xl font-bold text-[#00e6e6] mb-12 tracking-tight">
            Search Attorneys
        </h1>
        
        <!-- Search Form -->
        <div class="max-w-4xl mx-auto mb-12">
            <SearchBar
                value={searchTerm}
                on:input={handleSearchInput}
                on:search={handleSearchSubmit}
            />
        </div>

        <!-- Results Section -->
        {#if error}
            <div class="text-red-500 text-center my-8 bg-red-500/10 py-4 rounded-lg">
                {error}
            </div>
        {:else if loading}
            <div class="flex justify-center my-16">
                <LoadingSpinner />
            </div>
        {:else}
            <!-- Results -->
            {#if searchResults.attorneys.length > 0}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {#each searchResults.attorneys as attorney (attorney.id)}
                        <div class="transform hover:-translate-y-1 transition-all duration-300">
                            <AttorneyCard {attorney} />
                        </div>
                    {/each}
                </div>
                
                <!-- Pagination -->
                {#if searchResults.totalPages > 1}
                    <div class="mt-12">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={searchResults.totalPages}
                            on:pageChange={({ detail }) => handlePageChange(detail)}
                        />
                    </div>
                {/if}
            {:else}
                <div class="text-center text-white/60 my-16 backdrop-blur-sm bg-black/20 py-12 rounded-lg border border-[#00e6e6]/10">
                    No attorneys found matching your search criteria
                </div>
            {/if}
        {/if}
    </div>
</div>

<style>
    .bg-dark-lattice {
        background-image: url('../images/dark_lattice.png');
    }

    :global(.input::placeholder) {
        opacity: 0.5;
    }
</style>