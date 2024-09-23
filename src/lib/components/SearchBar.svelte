<script>
    import { createEventDispatcher } from 'svelte';
    export let placeholder = "Search...";
    export let value = "";
    export let searchFields = [];
    export let showSearchButton = true;

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
            handleSubmit();
        }
    }
</script>

<div class="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
    <div class="relative w-full">
        <input
            type="text"
            {value}
            on:input={handleInput}
            on:keydown={handleKeyDown}
            {placeholder}
            class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary bg-zinc-700 text-white"
        />
        {#if searchFields.length > 0}
            <div class="absolute right-2 top-2">
                <select
                    class="bg-zinc-700 text-white border-none focus:outline-none focus:ring-2 focus:ring-custom-color-primary"
                    on:change
                >
                    {#each searchFields as field}
                        <option value={field.value}>{field.label}</option>
                    {/each}
                </select>
            </div>
        {/if}
    </div>
    {#if showSearchButton == true}
        <button
        on:click={handleSubmit}
        class="bg-cyan-600 text-orange-300 px-6 py-2 text-base rounded hover:bg-cyan-700 hover:text-orange-300 focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg font-bold"
        >
            Search
        </button>
    {/if}
</div>