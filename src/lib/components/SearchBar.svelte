<script>
    import { Search } from 'lucide-svelte';
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    export let value = '';
    export let placeholder = '';

    function handleSearch() {
        dispatch('search', value);
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            handleSearch();
        }
    }
</script>

<div class="relative">
    <input
        type="text"
        {placeholder}
        bind:value
        on:input
        on:keydown={handleKeydown}
        class="w-full bg-[#243442] text-gray-200 px-4 py-3 pr-12 rounded-lg border border-cyan-500/20 
               focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/40
               placeholder-gray-400"
    />
    <button 
        class="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 transition-colors"
        on:click={handleSearch}
        aria-label="Search"
    >
        <Search size={20} />
    </button>
</div>