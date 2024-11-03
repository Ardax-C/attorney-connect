<script>
    import { createEventDispatcher } from 'svelte';

    export let currentPage = 1;
    export let totalPages = 1;

    const dispatch = createEventDispatcher();

    function changePage(newPage) {
        if (newPage >= 1 && newPage <= totalPages) {
            dispatch('pageChange', newPage);
        }
    }

    $: pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    $: visiblePages = pages.filter(page => 
        page === 1 || 
        page === totalPages || 
        (page >= currentPage - 1 && page <= currentPage + 1)
    ).reduce((acc, page, i, arr) => {
        if (i > 0 && page - arr[i-1] > 1) {
            acc.push('...');
        }
        acc.push(page);
        return acc;
    }, []);
</script>

<div class="flex justify-center space-x-2">
    <!-- Previous Button -->
    <button
        on:click={() => changePage(currentPage - 1)}
        disabled={currentPage === 1}
        class="px-3 py-1 rounded-md {currentPage === 1 ? 'bg-zinc-700 text-gray-400' : 'bg-cyan-600 text-orange-300 hover:bg-cyan-700'}"
    >
        Previous
    </button>
    
    <!-- Page Numbers -->
    {#each visiblePages as page}
        {#if page === '...'}
            <span class="px-3 py-1 text-gray-400">...</span>
        {:else}
            <button
                on:click={() => changePage(page)}
                class="px-3 py-1 rounded-md {currentPage === page ? 'bg-cyan-600 text-orange-300' : 'bg-zinc-700 text-gray-400 hover:bg-zinc-600'}"
            >
                {page}
            </button>
        {/if}
    {/each}
    
    <!-- Next Button -->
    <button
        on:click={() => changePage(currentPage + 1)}
        disabled={currentPage === totalPages}
        class="px-3 py-1 rounded-md {currentPage === totalPages ? 'bg-zinc-700 text-gray-400' : 'bg-cyan-600 text-orange-300 hover:bg-cyan-700'}"
    >
        Next
    </button>
</div>