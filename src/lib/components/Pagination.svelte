<script>
    import { createEventDispatcher } from 'svelte';

    export let currentPage;
    export let totalPages;

    const dispatch = createEventDispatcher();

    function changePage(newPage) {
        if (newPage >= 1 && newPage <= totalPages) {
            dispatch('pageChange', newPage);
        }
    }
</script>

<div class="flex justify-center items-center mt-4 space-x-2">
    <button 
        on:click={() => changePage(currentPage - 1)} 
        disabled={currentPage === 1}
        class="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-400"
    >
        Previous
    </button>
    
    <span class="text-white">Page {currentPage} of {totalPages}</span>
    
    <button 
        on:click={() => changePage(currentPage + 1)} 
        disabled={currentPage === totalPages}
        class="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-400"
    >
        Next
    </button>
</div>