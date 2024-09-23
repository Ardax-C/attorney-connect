<script>
  import { createEventDispatcher } from 'svelte';
  import { ChevronDown, ChevronUp, Search } from 'lucide-svelte';
  export let states = [];
  export let headerText = "Search";
  let isExpanded = false;
  let searchTerm = '';
  let selectedState = '';
  let selectedStatus = '';
  const dispatch = createEventDispatcher();

  function toggleExpand() {
      isExpanded = !isExpanded;
  }

  function handleSearch() {
      dispatch('search', {
          searchTerm,
          selectedState: selectedState || 'all',
          selectedStatus: selectedStatus || 'all'
      });
  }

  $: {
      searchTerm;
      selectedStatus;
      selectedState;
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
                  placeholder="Search by name or username"
                  bind:value={searchTerm}
                  class="w-full bg-zinc-700 px-4 py-2 pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <Search class="absolute right-3 top-2.5 text-gray-400" size={20} />
          </div>
   
          {#if headerText === 'Admin Dashboard'}
              <select
                  bind:value={selectedStatus}
                  class="w-full bg-zinc-700 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-emerald-400"
              >
                  <option value="">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="denied">Denied</option>
              </select>
      
              <select
                  bind:value={selectedState}
                  class="w-full bg-zinc-700 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-emerald-400"
              >
                  <option value="">All States</option>
                  {#each states as state}
                      <option value={state}>{state}</option>
                  {/each}
              </select>
          {:else}
              <select
                  bind:value={selectedState}
                  class="w-full bg-zinc-700 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-emerald-400"
              >
                  <option value="">All States</option>
                  {#each states as state}
                      <option value={state}>{state}</option>
                  {/each}
              </select>
          {/if}
   
          <button
              on:click={handleSearch}
              class="w-full bg-cyan-600 hover:bg-cyan-700 text-orange-300 font-bold py-2 px-4 rounded-md transition duration-300"
          >
              Search
          </button>
      </div>
  {/if}
</div>