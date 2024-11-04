<script>
    import { createEventDispatcher } from 'svelte';
    
    export let value = '';
    export let placeholder = "Search by name, practice area, or location...";
    
    const dispatch = createEventDispatcher();
    
    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Debounced input handler
    const debouncedInput = debounce((value) => {
        dispatch('input', value);
    }, 300);
    
    function handleInput(event) {
        value = event.target.value;
        debouncedInput(value);
    }
    
    function handleSubmit() {
        dispatch('search', value);
    }
    
    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSubmit();
        }
    }
</script>

<div class="relative">
    <input
        type="text"
        {placeholder}
        {value}
        on:input={handleInput}
        on:keydown={handleKeyDown}
        class="w-full px-6 py-4 bg-black/20 backdrop-blur-md border border-[#00e6e6]/20 rounded-full text-white/90 placeholder:text-white/50 focus:outline-none focus:border-[#00e6e6]/50 focus:ring-1 focus:ring-[#00e6e6]/50"
    />
    
    <button
        type="button"
        on:click={handleSubmit}
        class="absolute right-3 top-1/2 -translate-y-1/2 pl-3 pr-1 py-2 bg-[#00e6e6] hover:bg-[#00e6e6]/90 text-black font-medium rounded-full text-sm transition-all shadow-lg hover:shadow-[#00e6e6]/20"
    >
        <i class="fas fa-search mr-2"></i>
    </button>
</div>