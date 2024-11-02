<script>
    import { onMount } from 'svelte';
    import { fetchRecentBriefs } from '$lib/services/courtListener';


    const PAGE_SIZE = 5;

    let briefs = [];
    let loading = true;
    let error = null;
    let searchTerm = '';
    let totalResults = 0;
    let nextCursor = null;
    let previousCursor = null;
    let currentPage = 1;
    let baseUrl = 'https://www.courtlistener.com'

    $: hasNextPage = !!nextCursor;
    $: hasPreviousPage = !!previousCursor;

    let scrollY;
    let headerCollapsed = false;

    let searchQuery = '';
    let isSearchFocused = false;

    // Add state for mobile sidebar
    let isSidebarOpen = false;
    let isMobile = false;

    // Replace dateRange object with updated version
    let dateRange = {
        minYear: 1791,
        maxYear: new Date().getFullYear(),
        fromYear: new Date().getFullYear() - 1,
        toYear: new Date().getFullYear(),
        fromMonth: 0, // January
        toMonth: 11  // December
    };

    // Update the date calculations
    $: {
        const startDate = new Date(dateRange.fromYear, dateRange.fromMonth, 1);
        const endDate = new Date(dateRange.toYear, dateRange.toMonth + 1, 0);
        dateRange.start = startDate;
        dateRange.end = endDate;
    }

    // Helper function to format dates for the API
    function formatDateForApi(date) {
        return date.toISOString().split('T')[0];
    }

    onMount(() => {
        const handleScroll = () => {
            headerCollapsed = window.scrollY > 100;
        };
        
        // Check initial screen size
        checkMobile();
        
        // Add both event listeners
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', checkMobile);
        
        // Close sidebar by default on mobile
        const isMobile = window.innerWidth < 1024;
        isSidebarOpen = !isMobile;
        
        // Return cleanup function for both listeners
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', checkMobile);
        };
    });

    function checkMobile() {
        isMobile = window.innerWidth < 1024;
        if (!isMobile) isSidebarOpen = false;
    }

    function toggleSidebar() {
        isSidebarOpen = !isSidebarOpen;
        if (isSidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }

    async function loadBriefs(cursor = null, direction = null, query = null) {
        loading = true;
        error = null;
        
        try {
            const data = await fetchRecentBriefs({ 
                cursor, 
                pageSize: PAGE_SIZE,
                query: query || searchQuery
            });
            
            briefs = data.results;
            totalResults = data.count;
            nextCursor = data.next;
            previousCursor = data.previous;
            
            if (direction === 'next') {
                currentPage++;
            } else if (direction === 'prev') {
                currentPage--;
            } else if (!cursor) {
                currentPage = 1;
            }
        } catch (err) {
            error = 'Error loading court briefs';
        } finally {
            loading = false;
        }
    }

    async function handlePageChange(direction) {
        if ((direction === 'next' && !hasNextPage) || 
            (direction === 'prev' && !hasPreviousPage)) {
            return;
        }

        loading = true;
        try {
            const cursor = direction === 'next' ? nextCursor : previousCursor;
            
            // Build the query with current filters
            let fullQuery = [];
            
            // Add search query if it exists
            if (searchQuery.trim()) {
                fullQuery.push(`(${searchQuery.trim()})`); // Wrap in parentheses to ensure proper AND operation
            }
            
            // Add date range filter
            fullQuery.push(`dateFiled:[${formatDateForApi(dateRange.start)} TO ${formatDateForApi(dateRange.end)}]`);
            
            // Join all filters with AND
            const finalQuery = fullQuery.join(' AND ').trim();
            console.log('Query being sent:', finalQuery); // For debugging
            
            // Pass both cursor and query to loadBriefs
            await loadBriefs(cursor, direction, finalQuery);
        } catch (err) {
            error = 'Error loading court briefs';
            console.error('Error:', err); // For debugging
        } finally {
            loading = false;
        }
    }

    async function handleSearch(query) {
        loading = true;
        try {
            let fullQuery = [];
            
            if (query) {
                fullQuery.push(query);
            }
            
            fullQuery.push(`dateFiled:[${formatDateForApi(dateRange.start)} TO ${formatDateForApi(dateRange.end)}]`);
            
            const response = await fetchRecentBriefs({ 
                cursor: null, 
                pageSize: 5, 
                query: fullQuery.join(' AND ').trim()
            });
            briefs = response.results;
            nextCursor = response.next;
            previousCursor = response.previous;
            totalResults = response.count;
            currentPage = 1;
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            loading = false;
        }
    }

    onMount(async () => {
        await loadBriefs(null);
    });
</script>

<div class="min-h-screen bg-gray-900 text-gray-100">

    <div class="flex h-[calc(100vh-4rem)]">
        <!-- Sidebar - Hidden by default on mobile -->
        <aside class="fixed lg:relative lg:flex 
                      w-[85vw] lg:w-96 h-full 
                      bg-gray-900/95 border-r border-gray-700
                      transform transition-transform duration-300 ease-in-out
                      z-40 overflow-y-auto
                      {isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
        >
            <!-- Logo and Title -->
            <div class="p-6 border-b border-gray-800 w-full">
                <div class="flex items-center space-x-4 mb-8">
                    <svg class="w-10 h-10 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
                    </svg>
                    <h1 class="text-2xl font-serif font-bold">Repository</h1>
                </div>

                <!-- Search Section - Expanded width -->
                <div class="space-y-3 w-full">
                    <!-- Full-width Search Bar -->
                    <div class="relative w-full">
                        <input
                            type="text"
                            placeholder="Search by case name, court, or docket #"
                            class="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 
                                   text-gray-100 placeholder-gray-400 focus:outline-none 
                                   focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50
                                   transition-all duration-200"
                            bind:value={searchQuery}
                        />
                    </div>

                    <!-- Full-width Search Button -->
                    <button
                        class="w-full group relative inline-flex items-center justify-center
                               px-4 py-3 overflow-hidden rounded-lg
                               bg-gradient-to-b from-gray-600 via-gray-700 to-gray-800
                               text-gray-100 font-medium
                               border border-gray-600/50
                               shadow-lg shadow-black/30
                               transition-all duration-200 ease-out
                               hover:shadow-cyan-900/20
                               active:scale-[0.98]
                               focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                        on:click={() => handleSearch(searchQuery)}
                    >
                        <!-- Metallic Base Layer - Enhanced Contrast -->
                        <div class="absolute inset-0 w-full h-full 
                                    bg-gradient-to-b from-gray-500/30 via-gray-600/30 to-gray-700/30
                                    opacity-0 group-hover:opacity-100 
                                    transition-opacity duration-300 ease-out">
                        </div>

                        <!-- Sheen Animation Effect - Brighter -->
                        <div class="absolute inset-0 w-[200%] h-full
                                    bg-gradient-to-r from-transparent via-gray-100/15 to-transparent
                                    -translate-x-full group-hover:translate-x-full
                                    transition-transform duration-1000 ease-in-out">
                        </div>

                        <!-- Metallic Border Effect - Enhanced -->
                        <div class="absolute inset-0 rounded-lg
                                    bg-gradient-to-r from-gray-400/20 via-gray-300/20 to-gray-400/20
                                    opacity-0 group-hover:opacity-100
                                    transition-opacity duration-300">
                        </div>

                        <!-- Button Content - Brighter Text -->
                        <div class="relative flex items-center justify-center space-x-2
                                    text-sm tracking-wider uppercase font-semibold
                                    text-gray-100 group-hover:text-white
                                    transition-colors duration-200">
                            <svg class="w-4 h-4 transform group-hover:scale-110 transition-transform duration-200" 
                                 fill="none" 
                                 stroke="currentColor" 
                                 viewBox="0 0 24 24"
                            >
                                <path stroke-linecap="round" 
                                      stroke-linejoin="round" 
                                      stroke-width="2.5" 
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            <span class="transform group-hover:translate-x-0.5 transition-transform duration-200">
                                Search Repository
                            </span>
                        </div>

                        <!-- Click Effect Highlight - Enhanced -->
                        <div class="absolute inset-0 rounded-lg
                                    bg-gradient-to-t from-cyan-400/10 to-transparent
                                    opacity-0 group-active:opacity-100
                                    transition-opacity duration-75">
                        </div>

                        <!-- Additional Highlight for Better Contrast -->
                        <div class="absolute inset-0 rounded-lg
                                    bg-gradient-to-t from-white/5 to-transparent
                                    opacity-100">
                        </div>
                    </button>

                    <!-- Date Range Filters - New Addition -->
                    <div class="space-y-3 mt-6 border-t border-gray-700/50 pt-6">
                        <div class="text-sm text-gray-400 mb-4">Date Range</div>
                        
                        <!-- From Year slider -->
                        <div class="space-y-2">
                            <div class="flex justify-between text-xs text-gray-400">
                                <span>From Year: {dateRange.fromYear}</span>
                            </div>
                            <input
                                type="range"
                                class="w-full h-2 bg-gray-800 rounded-full appearance-none"
                                min={dateRange.minYear}
                                max={dateRange.toYear}
                                bind:value={dateRange.fromYear}
                            />
                        </div>

                        <!-- From Month slider -->
                        <div class="space-y-2">
                            <div class="flex justify-between text-xs text-gray-400">
                                <span>From Month: {new Date(2000, dateRange.fromMonth).toLocaleString('default', { month: 'long' })}</span>
                            </div>
                            <input
                                type="range"
                                class="w-full h-2 bg-gray-800 rounded-full appearance-none"
                                min={0}
                                max={dateRange.fromYear === dateRange.toYear ? dateRange.toMonth : 11}
                                bind:value={dateRange.fromMonth}
                            />
                        </div>

                        <!-- To Year slider -->
                        <div class="space-y-2 mt-6">
                            <div class="flex justify-between text-xs text-gray-400">
                                <span>To Year: {dateRange.toYear}</span>
                            </div>
                            <input
                                type="range"
                                class="w-full h-2 bg-gray-800 rounded-full appearance-none"
                                min={dateRange.fromYear}
                                max={dateRange.maxYear}
                                bind:value={dateRange.toYear}
                            />
                        </div>

                        <!-- To Month slider -->
                        <div class="space-y-2">
                            <div class="flex justify-between text-xs text-gray-400">
                                <span>To Month: {new Date(2000, dateRange.toMonth).toLocaleString('default', { month: 'long' })}</span>
                            </div>
                            <input
                                type="range"
                                class="w-full h-2 bg-gray-800 rounded-full appearance-none"
                                min={dateRange.fromYear === dateRange.toYear ? dateRange.fromMonth : 0}
                                max={11}
                                bind:value={dateRange.toMonth}
                            />
                        </div>

                        <!-- Updated date display -->
                        <div class="text-xs text-gray-400 mt-4">
                            Selected: {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
                            <div class="mt-1 text-cyan-400/70">
                                Range: {dateRange.toYear - dateRange.fromYear + 1} years, 
                                {dateRange.fromYear === dateRange.toYear 
                                    ? dateRange.toMonth - dateRange.fromMonth + 1 
                                    : ((12 - dateRange.fromMonth) + dateRange.toMonth + 1 + (dateRange.toYear - dateRange.fromYear - 1) * 12)} months
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Navigation moved inside this div, remove separate border -->
                {#if briefs.length > 0 && !loading}
                    <div class="mt-8">
                        <h2 class="text-sm font-serif text-gray-400 mb-6">Navigation</h2>
                        <div class="space-y-4">
                            <button 
                                class="w-full flex items-center px-4 py-3 text-sm rounded-md 
                                       text-cyan-400 hover:bg-gray-800/50
                                       disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                disabled={!hasPreviousPage}
                                on:click={() => handlePageChange('prev')}
                            >
                                <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                                </svg>
                                Previous Volume
                            </button>

                            <div class="text-sm text-center py-3 px-4 text-gray-400 bg-gray-800/30 rounded-md">
                                Volume {currentPage} of {Math.ceil(totalResults / PAGE_SIZE)}
                                <div class="text-xs mt-1">
                                    {totalResults.toLocaleString()} records
                                </div>
                            </div>

                            <button 
                                class="w-full flex items-center px-3 py-2 text-sm rounded-md 
                                       text-cyan-400 hover:bg-gray-800/50
                                       disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                disabled={!hasNextPage}
                                on:click={() => handlePageChange('next')}
                            >
                                Next Volume
                                <svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        </aside>

        <!-- Overlay - Only show when sidebar is open on mobile -->
        {#if isSidebarOpen}
            <button 
                class="lg:hidden fixed inset-0 bg-black/50 z-30"
                on:click={() => isSidebarOpen = false}
                aria-label="Close sidebar overlay"
            ></button>
        {/if}

        <!-- Results Container - Adjusted margin -->
        <main class="flex-1 w-full overflow-y-auto bg-gray-900/50 px-4 lg:px-8 py-6 mt-16">
            {#if loading}
                <div class="flex justify-center items-center py-12">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                </div>
            {:else if error}
                <div class="max-w-3xl mx-auto">
                    <div class="bg-red-900/20 border border-red-800 rounded-lg p-4">
                        <p class="text-red-400 font-serif">{error}</p>
                    </div>
                </div>
            {:else if briefs.length > 0}
                <div class="max-w-3xl mx-auto space-y-4">
                    {#each briefs as brief}
                        <article class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-200">
                            <div class="p-6">
                                <h2 class="text-xl font-serif text-cyan-400 hover:text-cyan-300 transition-colors duration-200">
                                    <a href={baseUrl + brief.fullTextUrl} target="_blank" rel="noopener noreferrer">
                                        {brief.title}
                                    </a>
                                </h2>
                                
                                <div class="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-400">
                                    <div class="flex items-center space-x-2">
                                        <svg class="w-4 h-4 text-cyan-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/>
                                        </svg>
                                        <span>{brief.court}</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <svg class="w-4 h-4 text-cyan-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                        </svg>
                                        <span>{new Date(brief.datePublished).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {#if brief.summary}
                                    <p class="mt-4 text-gray-300">
                                        {brief.summary}
                                    </p>
                                {/if}

                                {#if brief.citation}
                                    <div class="mt-4 pt-4 border-t border-gray-700/50 text-cyan-400/70 text-sm">
                                        Citation: {brief.citation}
                                    </div>
                                {/if}
                            </div>
                        </article>
                    {/each}
                </div>
            {:else}
                <div class="flex flex-col items-center justify-center h-full text-gray-400">
                    <p class="font-serif text-lg">Begin your search for legal opinions</p>
                    <p class="text-sm mt-2">Use keywords, case numbers, or citations</p>
                </div>
            {/if}
        </main>
    </div>

    <!-- Search Icon - Moved to bottom -->
    <button 
        class="lg:hidden fixed bottom-2 left-4 z-50 p-3 rounded-lg 
               bg-gray-800 border border-gray-700 shadow-lg
               hover:bg-gray-700 transition-colors"
        on:click={() => isSidebarOpen = !isSidebarOpen}
        aria-label="Toggle search sidebar"
    >
        {#if !isSidebarOpen}
            <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
        {:else}
            <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        {/if}
    </button>
</div>

<style>
    /* Ensure proper scrolling behavior */
    :global(body) {
        overflow: hidden;
    }
    @media (min-width: 1024px) {
        :global(body) {
            overflow: auto;
        }
    }

    /* Optional: Add a subtle pulse on hover */
    @keyframes subtle-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.001); }
    }

    button:hover {
        animation: subtle-pulse 2s infinite;
    }

    /* Slider thumb styles */
    input[type="range"]::-webkit-slider-thumb {
        pointer-events: auto;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: rgb(34 211 238); /* cyan-400 */
        cursor: pointer;
        appearance: none;
        margin-top: -6px; /* Center the thumb */
    }

    input[type="range"]::-moz-range-thumb {
        pointer-events: auto;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: rgb(34 211 238);
        cursor: pointer;
        border: none;
    }

    /* Active track between thumbs */
    input[type="range"]:nth-child(2) {
        background: linear-gradient(to right, transparent 0%, rgb(34 211 238 / 0.5) 0%, rgb(34 211 238 / 0.5) 100%, transparent 100%);
    }
</style> 