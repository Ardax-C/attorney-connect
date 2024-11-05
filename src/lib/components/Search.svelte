<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import SearchBar from './SearchBar.svelte';
    import AdvancedSearch from './AdvancedSearch.svelte';
    import AttorneyCard from './AttorneyCard.svelte';
    import LoadingSpinner from './LoadingSpinner.svelte';
    import MobileSearchComponent from './MobileSearchComponent.svelte';
    import { browser } from '$app/environment';
    import { ChevronUp } from 'lucide-svelte';

    let isMobile = browser ? window.innerWidth < 1024 : false;
    let showMobileFilters = false;

    let searchTerm = '';
    let selectedFilters = [];
    let loading = false;
    let error = null;
    
    let searchResults = {
        attorneys: [],
        total: 0,
        totalPages: 0,
        facets: {
            practiceAreas: [],
            states: [],
            cities: []
        }
    };

    // Check if we're on the admin page
    $: isAdminPage = $page.url.pathname === '/admin';

    let currentPage = 1;
    let totalPages = 0;

    let showScrollTop = false;

    async function performSearch(page = 1) {
        try {
            loading = true;
            currentPage = page;

            const categorizedFilters = {
                practiceAreas: [],
                states: [],
                cities: []
            };

            selectedFilters.forEach(filter => {
                if (searchResults.facets.practiceAreas.includes(filter)) {
                    categorizedFilters.practiceAreas.push(filter);
                } else if (searchResults.facets.states.includes(filter)) {
                    categorizedFilters.states.push(filter);
                } else if (searchResults.facets.cities.includes(filter)) {
                    categorizedFilters.cities.push(filter);
                }
            });

            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: searchTerm,
                    filters: categorizedFilters,
                    page: currentPage
                })
            });

            if (!response.ok) throw new Error('Search failed');
            
            const data = await response.json();
            data.attorneys = data.attorneys.map(attorney => ({
                ...attorney,
                profilePictureUrl: attorney.profilePictureUrl || '/images/default-avatar.png'
            }));
            searchResults = data;
            totalPages = data.totalPages;
        } catch (err) {
            console.error('Search error:', err);
            error = 'Failed to load search results';
        } finally {
            loading = false;
        }
    }

    function handleFilterChange(event) {
        selectedFilters = event.detail;
        performSearch();
    }

    function handleResize() {
        isMobile = window.innerWidth < 1024;
        if (!isMobile) {
            showMobileFilters = false;
        }
    }

    function handleMobileSearch(event) {
        const searchParams = event.detail;
        searchTerm = searchParams.searchTerm;
        performSearch();
    }

    function handlePrevPage() {
        if (currentPage > 1) {
            performSearch(currentPage - 1);
        }
    }

    function handleNextPage() {
        if (currentPage < totalPages) {
            performSearch(currentPage + 1);
        }
    }

    function getPageNumbers(currentPage, totalPages) {
        const pages = [];
        
        if (totalPages <= 3) {
            // Show all pages if total is 4 or less
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);
            
            if (currentPage > 3) {
                pages.push('...');
            }
            
            // Show pages around current page
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(currentPage + 1, totalPages - 1); i++) {
                pages.push(i);
            }
            
            if (currentPage < totalPages - 2) {
                pages.push('...');
            }
            
            // Always show last page
            pages.push(totalPages);
        }
        
        return pages;
    }

    function handlePageClick(page) {
        if (typeof page === 'number' && page !== currentPage) {
            performSearch(page);
        }
    }

    onMount(() => {
        performSearch();
        window.addEventListener('resize', handleResize);
        
        // Listen to the main window scroll instead of a specific container
        window.addEventListener('scroll', () => {
            showScrollTop = window.scrollY > 200;
        }, { passive: true });

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', () => {
                showScrollTop = window.scrollY > 200;
            });
        };
    });

    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    $: {
        if (searchResults.facets) {
            searchResults.facets = {
                practiceAreas: [...searchResults.facets.practiceAreas].sort(),
                states: [...searchResults.facets.states].sort(),
                cities: [...searchResults.facets.cities].sort()
            };
        }
    }
</script>

<div class="min-h-screen bg-[#1a2632] bg-dark-lattice bg-fixed bg-center bg-cover py-8 lg:py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl lg:text-5xl font-bold text-[#00e6e6] mb-6 lg:mb-12 tracking-tight">
            Search Attorneys
        </h1>

        <div class="mb-4 lg:mb-8">
            <SearchBar 
                bind:value={searchTerm}
                on:input={() => performSearch()}
                on:search={() => performSearch()}
                placeholder="Search by name, practice area, or location..."
            />
        </div>

        <!-- Mobile Filter Button -->
        {#if isMobile}
            <div class="mb-4">
                <button
                    class="w-full bg-[#243442] p-4 rounded-lg text-[#00e6e6] flex justify-between items-center"
                    on:click={() => showMobileFilters = !showMobileFilters}
                >
                    <span>Filters</span>
                    <span>{selectedFilters.length} selected</span>
                </button>
            </div>
        {/if}

        <!-- After the search input and before the grid layout -->
        {#if searchResults.attorneys.length > 0}
            <div class="w-full flex justify-center mb-8 border-b border-cyan-500/20 pb-4">
                <div class="w-[400px] flex justify-between items-center">
                    <button
                        class="px-2 py-1 rounded bg-[#243442] text-[#00e6e6] disabled:opacity-50
                               hover:bg-[#2d4456] transition-colors text-xs"
                        on:click={handlePrevPage}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    
                    <div class="flex items-center gap-1">
                        {#each getPageNumbers(currentPage, totalPages) as page}
                            {#if page === '...'}
                                <span class="text-[#00e6e6] text-xs px-1">...</span>
                            {:else}
                                <button
                                    class="min-w-[24px] px-1.5 py-1 rounded text-xs transition-colors
                                           {currentPage === page ? 
                                             'bg-[#00e6e6] text-[#1a2632]' : 
                                             'bg-[#243442] text-[#00e6e6] hover:bg-[#2d4456]'}"
                                    on:click={() => handlePageClick(page)}
                                >
                                    {page}
                                </button>
                            {/if}
                        {/each}
                    </div>
                    
                    <button
                        class="px-2 py-1 rounded bg-[#243442] text-[#00e6e6] disabled:opacity-50
                               hover:bg-[#2d4456] transition-colors text-xs"
                        on:click={handleNextPage}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            </div>
        {/if}

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <!-- Filters -->
            <div class="lg:col-span-1">
                {#if !isMobile || (isMobile && showMobileFilters)}
                    <div class="lg:block {isMobile ? 'fixed inset-0 bg-[#1a2632] z-50 overflow-auto p-4' : ''}">
                        {#if isMobile}
                            <div class="flex justify-between items-center mb-4">
                                <h2 class="text-xl font-semibold text-[#00e6e6]">Filters</h2>
                                <button 
                                    class="text-[#00e6e6]"
                                    on:click={() => showMobileFilters = false}
                                >
                                    Close
                                </button>
                            </div>
                        {/if}
                        <AdvancedSearch
                            facets={searchResults.facets}
                            {selectedFilters}
                            on:filterChange={handleFilterChange}
                        />
                    </div>
                {/if}
            </div>

            <!-- Results Section -->
            <div class="lg:col-span-3">
                {#if error}
                    <div class="text-red-500 text-center p-4">{error}</div>
                {:else if loading}
                    <div class="flex justify-center">
                        <LoadingSpinner />
                    </div>
                {:else if searchResults.attorneys.length === 0}
                    <div class="text-[#00e6e6] text-center p-4">
                        No attorneys found matching your search criteria.
                    </div>
                {:else}
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
                        {#each searchResults.attorneys as attorney (attorney.id)}
                            <AttorneyCard {attorney} />
                        {/each}
                    </div>

                    <!-- Pagination -->
                    {#if searchResults.totalPages > 1}
                        <div class="mt-8 flex justify-center">
                            <div class="w-[400px] flex justify-between items-center">
                                <button
                                    class="px-2 py-1 rounded bg-[#243442] text-[#00e6e6] disabled:opacity-50
                                           hover:bg-[#2d4456] transition-colors text-xs"
                                    on:click={handlePrevPage}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </button>
                                
                                <div class="flex items-center gap-1">
                                    {#each getPageNumbers(currentPage, totalPages) as page}
                                        {#if page === '...'}
                                            <span class="text-[#00e6e6] text-xs px-1">...</span>
                                        {:else}
                                            <button
                                                class="min-w-[24px] px-1.5 py-1 rounded text-xs transition-colors
                                                       {currentPage === page ? 
                                                         'bg-[#00e6e6] text-[#1a2632]' : 
                                                         'bg-[#243442] text-[#00e6e6] hover:bg-[#2d4456]'}"
                                                on:click={() => handlePageClick(page)}
                                            >
                                                {page}
                                            </button>
                                        {/if}
                                    {/each}
                                </div>
                                
                                <button
                                    class="px-2 py-1 rounded bg-[#243442] text-[#00e6e6] disabled:opacity-50
                                           hover:bg-[#2d4456] transition-colors text-xs"
                                    on:click={handleNextPage}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    </div>

    {#if isMobile && isAdminPage}
        <MobileSearchComponent
            facets={searchResults.facets}
            on:search={handleMobileSearch}
        />
    {/if}

    {#if showScrollTop}
        <button
            on:click={scrollToTop}
            class="fixed bottom-6 right-6 p-2 rounded-full bg-[#243442] text-[#00e6e6]
                   hover:bg-[#2d4456] transition-all transform hover:scale-110
                   shadow-lg border border-cyan-500/20 z-[100]"
            aria-label="Scroll to top"
        >
            <ChevronUp size={20} />
        </button>
    {/if}
</div>

<style>
    .bg-dark-lattice {
        background-image: url('../images/dark_lattice.png');
    }

    button {
        opacity: 0.8;
        transition: opacity 0.3s, transform 0.3s;
    }

    button:hover {
        opacity: 1;
    }

    :global(body) {
        position: relative; /* Ensure fixed positioning works correctly */
    }
</style>