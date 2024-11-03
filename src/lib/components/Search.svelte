<script>
    import { onMount } from 'svelte';
    
    let searchTerm = '';
    let searchResults = [];
    let currentPage = 1;
    let totalPages = 1;
    let isLoading = false;

    // Transform Elasticsearch results
    function transformSearchResults(data) {
        if (!data || !data.results || !Array.isArray(data.results)) return [];
        totalPages = data.totalPages;
        return data.results;
    }

    // Separate functions for search and pagination
    async function handleSearch(e) {
        if (e?.preventDefault) {
            e.preventDefault();
        }
        currentPage = 1; // Reset to first page on new search
        await fetchResults();
    }

    async function handlePageChange(newPage) {
        currentPage = newPage;
        await fetchResults();
    }

    // Common fetch function for both search and pagination
    async function fetchResults() {
        console.log('[Search Component] Initiating search:', { 
            searchTerm: searchTerm.trim(), 
            page: currentPage 
        });
        isLoading = true;
        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    searchTerm: searchTerm.trim(),
                    page: currentPage 
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('[Search Component] Search failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData
                });
                throw new Error('Search failed');
            }
            
            const data = await response.json();
            console.log('[Search Component] Raw search response:', data);
            searchResults = transformSearchResults(data);
        } catch (error) {
            console.error('[Search Component] Search error:', error);
            searchResults = [];
        } finally {
            isLoading = false;
        }
    }

    onMount(() => {
        fetchResults();
    });
</script>

<div class="min-h-screen bg-[#1a2632] bg-dark-lattice bg-fixed bg-center bg-cover py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Search Header -->
        <h1 class="text-4xl font-bold text-[#00e6e6] text-left mb-8">Search Attorneys</h1>
        <form on:submit={handleSearch} class="flex gap-4 mb-8">
            <div class="flex-1">
                <input
                    type="text"
                    bind:value={searchTerm}
                    placeholder="Search by name or keyword"
                    class="w-full px-4 py-3 rounded-md border-0 bg-[#2a3744] text-white placeholder-gray-400"
                />
            </div>
            <button
                type="submit"
                disabled={isLoading}
                class="px-8 py-3 bg-[#00e6e6] hover:bg-[#00cccc] text-black font-medium rounded-md transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Searching...' : 'Search'}
            </button>
        </form>

        <!-- Results Grid -->
        {#if searchResults.length === 0}
            <p class="text-[#00e6e6] text-center">No results found</p>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {#each searchResults as attorney}
                    <a 
                        href="/attorney/{attorney.id}" 
                        class="block bg-gradient-to-b from-[#008080] to-[#2a3744] rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200"
                    >
                        <div class="p-6">
                            <div class="flex items-start gap-4">
                                {#if attorney.profilePictureUrl}
                                    <div class="w-16 h-16 rounded-full bg-[#2a3744] overflow-hidden flex-shrink-0">
                                        <img 
                                            src={attorney.profilePictureUrl} 
                                            alt={`${attorney.firstName} ${attorney.lastName}`}
                                            class="w-full h-full object-cover"
                                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                        />
                                        <div 
                                            class="w-full h-full bg-[#2a3744] hidden items-center justify-center text-[#00e6e6] text-xl"
                                        >
                                            {attorney.firstName[0]}{attorney.lastName[0]}
                                        </div>
                                    </div>
                                {:else}
                                    <div class="w-16 h-16 rounded-full bg-[#2a3744] flex items-center justify-center text-[#00e6e6] text-xl flex-shrink-0">
                                        {attorney.firstName[0]}{attorney.lastName[0]}
                                    </div>
                                {/if}
                                <div>
                                    <h3 class="text-xl font-semibold text-white">
                                        {attorney.firstName} {attorney.lastName}
                                    </h3>
                                    <p class="text-gray-300">
                                        {attorney.city}, {attorney.state}
                                    </p>
                                    <div class="flex flex-wrap gap-2 mt-3">
                                        {#each attorney.practiceAreas as area}
                                            <span class="px-3 py-1 text-sm bg-black/20 text-[#00e6e6] rounded-full">
                                                {area}
                                            </span>
                                        {/each}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </a>
                {/each}
            </div>
        {/if}

        <!-- Pagination -->
        {#if totalPages > 1}
            <div class="flex items-center justify-between mt-8">
                <span class="text-[#00e6e6]">Page {currentPage} of {totalPages}</span>
                <div class="flex gap-2">
                    <button
                        on:click={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isLoading}
                        class="px-3 py-1 bg-[#2a3744] text-[#00e6e6] rounded hover:bg-[#3a4754] disabled:opacity-50"
                    >
                        ←
                    </button>
                    <button
                        on:click={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || isLoading}
                        class="px-3 py-1 bg-[#2a3744] text-[#00e6e6] rounded hover:bg-[#3a4754] disabled:opacity-50"
                    >
                        →
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .bg-dark-lattice {
        background-image: url('../images/dark_lattice.png');
    }
</style>