<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import { ChevronDown, ChevronUp, X } from 'lucide-svelte';
    import { browser } from '$app/environment';
    
    const dispatch = createEventDispatcher();
    let isMobile = browser ? window.innerWidth < 1024 : false;

    export let facets = {
        practiceAreas: [],
        states: [],
        cities: []
    };
    export let selectedFilters = [];

    let expandedSections = {
        practiceAreas: true,
        states: true,
        cities: true
    };

    function toggleSection(section) {
        expandedSections[section] = !expandedSections[section];
    }

    function handleFilterChange(event) {
        const { checked, value } = event.target;
        let newFilters;
        
        if (checked) {
            newFilters = [...selectedFilters, value];
        } else {
            newFilters = selectedFilters.filter(f => f !== value);
        }
        
        dispatch('filterChange', newFilters);
    }

    function clearFilters() {
        selectedFilters = [];
        dispatch('filterChange', []);
    }

    function handleResize() {
        isMobile = window.innerWidth < 1024;
    }

    onMount(() => {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    });
</script>

<div class="bg-[#243442] p-4 lg:p-6 rounded-lg {isMobile ? 'h-[calc(100vh-6rem)]' : ''}">
    <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-[#00e6e6]">Filters</h2>
        {#if selectedFilters.length > 0}
            <button 
                on:click={clearFilters}
                class="text-sm text-[#00e6e6] hover:text-[#00ffff] transition-colors"
            >
                Clear All
            </button>
        {/if}
    </div>

    <div class="space-y-4 {isMobile ? 'h-[calc(100%-5rem)] overflow-y-auto pb-20' : ''}">
        <!-- Practice Areas -->
        {#if facets.practiceAreas.length > 0}
            <div class="filter-section">
                <button 
                    class="w-full flex justify-between items-center text-lg font-medium text-[#00e6e6] mb-2 hover:text-[#00ffff] transition-colors"
                    on:click={() => toggleSection('practiceAreas')}
                >
                    <span>Practice Areas</span>
                    <div class="flex items-center space-x-2">
                        <span class="text-sm">
                            ({selectedFilters.filter(f => facets.practiceAreas.includes(f)).length})
                        </span>
                        {#if expandedSections.practiceAreas}
                            <ChevronUp size={20} />
                        {:else}
                            <ChevronDown size={20} />
                        {/if}
                    </div>
                </button>
                {#if expandedSections.practiceAreas}
                    <div 
                        class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2"
                        transition:slide
                    >
                        {#each facets.practiceAreas as area}
                            <label class="flex items-center space-x-2 hover:bg-[#2d4456] p-2 rounded-lg transition-colors">
                                <input 
                                    type="checkbox"
                                    value={area}
                                    checked={selectedFilters.includes(area)}
                                    on:change={handleFilterChange}
                                    class="rounded border-gray-600 text-cyan-500 focus:ring-cyan-500"
                                />
                                <span class="text-gray-300 text-sm">{area}</span>
                            </label>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}

        <!-- States -->
        {#if facets.states.length > 0}
            <div class="filter-section">
                <button 
                    class="w-full flex justify-between items-center text-lg font-medium text-[#00e6e6] mb-2 hover:text-[#00ffff] transition-colors"
                    on:click={() => toggleSection('states')}
                >
                    <span>States</span>
                    <div class="flex items-center space-x-2">
                        <span class="text-sm">
                            ({selectedFilters.filter(f => facets.states.includes(f)).length})
                        </span>
                        {#if expandedSections.states}
                            <ChevronUp size={20} />
                        {:else}
                            <ChevronDown size={20} />
                        {/if}
                    </div>
                </button>
                {#if expandedSections.states}
                    <div 
                        class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2"
                        transition:slide
                    >
                        {#each facets.states as state}
                            <label class="flex items-center space-x-2 hover:bg-[#2d4456] p-2 rounded-lg transition-colors">
                                <input 
                                    type="checkbox"
                                    value={state}
                                    checked={selectedFilters.includes(state)}
                                    on:change={handleFilterChange}
                                    class="rounded border-gray-600 text-cyan-500 focus:ring-cyan-500"
                                />
                                <span class="text-gray-300 text-sm">{state}</span>
                            </label>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Cities -->
        {#if facets.cities.length > 0}
            <div class="filter-section">
                <button 
                    class="w-full flex justify-between items-center text-lg font-medium text-[#00e6e6] mb-2 hover:text-[#00ffff] transition-colors"
                    on:click={() => toggleSection('cities')}
                >
                    <span>Cities</span>
                    <div class="flex items-center space-x-2">
                        <span class="text-sm">
                            ({selectedFilters.filter(f => facets.cities.includes(f)).length})
                        </span>
                        {#if expandedSections.cities}
                            <ChevronUp size={20} />
                        {:else}
                            <ChevronDown size={20} />
                        {/if}
                    </div>
                </button>
                {#if expandedSections.cities}
                    <div 
                        class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2"
                        transition:slide
                    >
                        {#each facets.cities as city}
                            <label class="flex items-center space-x-2 hover:bg-[#2d4456] p-2 rounded-lg transition-colors">
                                <input 
                                    type="checkbox"
                                    value={city}
                                    checked={selectedFilters.includes(city)}
                                    on:change={handleFilterChange}
                                    class="rounded border-gray-600 text-cyan-500 focus:ring-cyan-500"
                                />
                                <span class="text-gray-300 text-sm">{city}</span>
                            </label>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #00e6e6 #243442;
    }

    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
        background: #243442;
        border-radius: 3px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: #00e6e6;
        border-radius: 3px;
    }

    .filter-section {
        @apply border-b border-gray-700/50 pb-4;
    }

    .filter-section:last-child {
        @apply border-b-0 pb-0;
    }
</style>