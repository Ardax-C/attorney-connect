<script>
    import { createEventDispatcher } from 'svelte';
    
    export let value = '';
    export let placeholder = "Describe the attorney you're looking for...";
    
    const dispatch = createEventDispatcher();
    
    function handleInput(event) {
        value = event.target.value;
        dispatch('input', value);
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

<div class="flex gap-4">
    <input
        type="text"
        {value}
        on:input={handleInput}
        on:keydown={handleKeyDown}
        {placeholder}
        class="flex-1 bg-zinc-700 px-4 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
    />
    
    <button
        type="button"
        on:click={handleSubmit}
        class="bg-cyan-600 text-orange-300 px-6 py-2 rounded hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
    >
        Search
    </button>
</div>