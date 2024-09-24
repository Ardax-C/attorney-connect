<script>
    import { createEventDispatcher } from 'svelte';
    import { ChevronDown, ChevronUp, Search } from 'lucide-svelte';
    export let headerText = "Search";
    export let filters = []; // Array of filter objects
    let isExpanded = false;
    let searchTerm = '';
    let filterValues = {};
    const dispatch = createEventDispatcher();
  
    function toggleExpand() {
        isExpanded = !isExpanded;
    }
  
    function handleSearch() {
        dispatch('search', {
            searchTerm,
            ...filterValues
        });
    }
  
    $: {
        searchTerm;
        filterValues;
    }
</script>

<div class="bg-zinc-800 text-white p-4 rounded-lg shadow-md">
    <button type="button" class="flex items-center justify-between cursor-pointer w-full text-left" on:click={toggleExpand} aria-expanded={isExpanded}>
        <h2 class="text-lg font-semibold text-custom-color-tertiary">{headerText}</h2>
        {#if isExpanded}
            <ChevronUp size={20} />
        {:else}
            <ChevronDown size={20} />
        {/if}
    </button>
  
    {#if isExpanded}
        <div class="mt-4 space-y-3 text-emerald-400">
            <div class="relative">
                <input
                    type="text"
                    placeholder="Describe the attorney you're looking for..."
                    bind:value={searchTerm}
                    class="w-full bg-zinc-700 px-4 py-2 pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <Search class="absolute right-3 top-2.5 text-gray-400" size={20} />
            </div>
    
            {#each filters as filter}
                <select
                    bind:value={filterValues[filter.key]}
                    class="w-full bg-zinc-700 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-emerald-400"
                >
                    <option value="">{filter.placeholder}</option>
                    {#each filter.options as option}
                        {#if option.value !== 'all'}
                            <option value={option.value}>{option.label}</option>
                        {/if}
                    {/each}
                </select>
            {/each}
    
            <button
                on:click={handleSearch}
                class="w-full bg-cyan-600 hover:bg-cyan-700 text-orange-300 font-bold py-2 px-4 rounded-md transition duration-300"
            >
                Search
            </button>
        </div>
    {/if}
</div>