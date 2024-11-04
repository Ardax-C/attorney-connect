<script>
    import { onMount } from 'svelte';
    import SearchBar from './SearchBar.svelte';
    import AttorneyCard from './AttorneyCard.svelte';
    import Pagination from './Pagination.svelte';
    import LoadingSpinner from './LoadingSpinner.svelte';

    let searchTerm = '';
    let currentPage = 1;
    let searchResults = [];
    let totalPages = 0;
    let isLoading = false;
    let error = null;

    async function handleSearch(event) {
        console.log('[Search Component] Search initiated:', { searchTerm, currentPage });
        event?.preventDefault();
        await performSearch();
    }

    function handleSearchInput(event) {
        searchTerm = event.detail;
        currentPage = 1;
        console.log('[Search Component] Search input updated:', { searchTerm });
    }

    async function handlePageChange(newPage) {
        console.log('[Search Component] Page change:', { from: currentPage, to: newPage });
        currentPage = newPage;
        await performSearch();
    }

    async function performSearch() {
        isLoading = true;
        error = null;

        try {
            console.log('[Search Component] Fetching results:', { searchTerm, currentPage });
            
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ searchTerm, currentPage })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[Search Component] Search API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData
                });
                
                throw new Error(errorData.error || 'Search failed');
            }

            const data = await response.json();
            console.log('[Search Component] Search results:', data);

            searchResults = data.results;
            totalPages = Math.ceil(data.total / 10);

        } catch (e) {
            console.error('[Search Component] Search error:', e);
            error = e.message || 'Failed to fetch results';
            searchResults = [];
            totalPages = 0;
        } finally {
            isLoading = false;
            console.log('[Search Component] Search state updated:', {
                resultsCount: searchResults.length,
                totalPages,
                isLoading
            });
        }
    }

    onMount(() => {
        console.log('[Search Component] Component mounted, initiating initial search');
        performSearch();
    });
</script>

<div class="min-h-screen bg-[#1a2632] bg-dark-lattice bg-fixed bg-center bg-cover py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Search Header -->
        <h1 class="text-4xl font-bold text-[#00e6e6] text-left mb-8">Search Attorneys</h1>
        
        <!-- Search Form -->
        <form on:submit={handleSearch} class="mb-8">
            <SearchBar 
                value={searchTerm}
                on:input={handleSearchInput}
                on:search={handleSearch}
            />
        </form>

        <!-- Loading State -->
        {#if isLoading}
            <div class="flex justify-center my-8">
                <LoadingSpinner />
            </div>
        {:else}
            <!-- Results -->
            {#if searchResults.length > 0}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {#each searchResults as attorney (attorney.id)}
                        <AttorneyCard {attorney} />
                    {/each}
                </div>
                
                <!-- Pagination -->
                {#if totalPages > 1}
                    <div class="mt-8">
                        <Pagination
                            {currentPage}
                            {totalPages}
                            on:pageChange={({ detail }) => handlePageChange(detail)}
                        />
                    </div>
                {/if}
            {:else}
                <div class="text-center text-gray-400 my-8">
                    No attorneys found matching your search criteria.
                </div>
            {/if}
        {/if}
    </div>
</div>

<style>
    .bg-dark-lattice {
        background-image: url('../images/dark_lattice.png');
    }
</style>