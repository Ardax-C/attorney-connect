<script>
  import { onMount } from 'svelte';
  import { searchStore } from '$lib/stores/searchStore';
  
  let searchError = null;
  let isLoading = false;

  async function handleSearch() {
    try {
      isLoading = true;
      searchError = null;
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          searchTerm: $searchStore.searchTerm,
          practiceAreas: $searchStore.practiceAreas,
          states: $searchStore.states,
          page: $searchStore.page
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();
      searchStore.setResults(data.results, data.total);
    } catch (error) {
      console.error('Search error:', error);
      searchError = error.message;
      searchStore.setError(error.message);
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    // Initial search if needed
    if ($searchStore.searchTerm) {
      handleSearch();
    }
  });
</script>

<div class="search-container">
  {#if searchError}
    <div class="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong class="font-bold">Error:</strong>
      <span class="block sm:inline">{searchError}</span>
    </div>
  {/if}

  {#if isLoading}
    <div class="loading-spinner">Loading...</div>
  {:else}
    <!-- Search results -->
    {#if $searchStore.results.length > 0}
      <!-- Your existing results display code -->
    {:else}
      <p>No results found</p>
    {/if}
  {/if}
</div>
