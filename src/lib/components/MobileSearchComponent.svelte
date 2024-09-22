<script>
    import { createEventDispatcher } from 'svelte';
    import { ChevronDown, ChevronUp, Search } from 'lucide-svelte';
  
    export let states = [];
    export let practiceAreas = [];
  
    let isExpanded = false;
    let searchTerm = '';
    let selectedState = '';
    let selectedPracticeArea = '';
  
    const dispatch = createEventDispatcher();
  
    function toggleExpand() {
      isExpanded = !isExpanded;
    }
  
    function handleSearch() {
      dispatch('search', {
        searchTerm,
        selectedState,
        selectedPracticeArea
      });
    }
  </script>
  
  <div class="bg-zinc-800 text-white p-4 rounded-lg shadow-md">
    <div class="flex items-center justify-between cursor-pointer" on:click={toggleExpand}>
      <h2 class="text-lg font-semibold">Search Attorneys</h2>
      {#if isExpanded}
        <ChevronUp size={20} />
      {:else}
        <ChevronDown size={20} />
      {/if}
    </div>
    
    {#if isExpanded}
      <div class="mt-4 space-y-3">
        <div class="relative">
          <input
            type="text"
            placeholder="Search by name or username"
            bind:value={searchTerm}
            class="w-full bg-zinc-700 px-4 py-2 pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <Search class="absolute right-3 top-2.5 text-gray-400" size={20} />
        </div>
        
        <select
          bind:value={selectedState}
          class="w-full bg-zinc-700 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="">All States</option>
          {#each states as state}
            <option value={state}>{state}</option>
          {/each}
        </select>
        
        <select
          bind:value={selectedPracticeArea}
          class="w-full bg-zinc-700 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="">All Practice Areas</option>
          {#each practiceAreas as area}
            <option value={area}>{area}</option>
          {/each}
        </select>
        
        <button
          on:click={handleSearch}
          class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
        >
          Search
        </button>
      </div>
    {/if}
  </div>