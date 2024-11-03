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

    // Handle the search submission
    async function handleSearch(event) {
        event?.preventDefault(); // Prevent form submission if called from form
        await fetchResults();
    }

    // Handle search bar input
    function handleSearchInput(event) {
        searchTerm = event.detail;
        currentPage = 1; // Reset to first page on new search
    }

    // Handle pagination
    async function handlePageChange(newPage) {
        currentPage = newPage;
        await fetchResults();
    }

    async function fetchResults() {
        isLoading = true;
        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    searchTerm: searchTerm?.trim(),
                    page: currentPage 
                })
            });
            
            if (!response.ok) {
                throw new Error('Search failed');
            }
            
            const data = await response.json();
            searchResults = data.results || [];
            totalPages = data.totalPages || 0;
        } catch (error) {
            console.error('Search error:', error);
            searchResults = [];
            totalPages = 0;
        } finally {
            isLoading = false;
        }
    }

    // Initial load
    onMount(() => {
        fetchResults();
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