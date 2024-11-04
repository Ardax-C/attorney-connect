<script>
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    
    export let onSelect = (gif) => {};
    export let onClose = () => {};
    
    let searchTerm = '';
    let gifs = [];
    let loading = false;
    let debounceTimer;
    
    const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;
    const GIPHY_ENDPOINT = 'https://api.giphy.com/v1/gifs';

    async function searchGifs() {
        if (!searchTerm.trim()) {
            const trendingUrl = `${GIPHY_ENDPOINT}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=pg-13`;
            const response = await fetch(trendingUrl);
            const data = await response.json();
            gifs = data.data;
            return;
        }

        const searchUrl = `${GIPHY_ENDPOINT}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=20&rating=pg-13`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        gifs = data.data;
    }

    function handleSearch() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            loading = true;
            await searchGifs();
            loading = false;
        }, 500);
    }

    function handleSelect(gif) {
        onSelect({
            url: gif.images.original.url,
            width: gif.images.original.width,
            height: gif.images.original.height,
            preview: gif.images.fixed_height_small.url
        });
        onClose();
    }

    onMount(() => {
        searchGifs();
    });
</script>

<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" 
     on:click|self={onClose}
     transition:fade={{ duration: 200 }}>
    <div class="bg-zinc-800 rounded-lg shadow-xl w-full max-w-md p-4">
        <div class="flex items-center gap-2 mb-4">
            <input
                type="text"
                placeholder="Search GIFs..."
                bind:value={searchTerm}
                on:input={handleSearch}
                class="w-full bg-zinc-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button 
                on:click={onClose}
                class="text-gray-400 hover:text-white"
            >
                ✕
            </button>
        </div>
        
        <div class="h-96 overflow-y-auto custom-scrollbar">
            {#if loading}
                <div class="flex justify-center items-center h-full">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                </div>
            {:else}
                <div class="grid grid-cols-2 gap-2">
                    {#each gifs as gif}
                        <button
                            on:click={() => handleSelect(gif)}
                            class="relative group overflow-hidden rounded hover:ring-2 hover:ring-cyan-500 transition-all"
                        >
                            <img
                                src={gif.images.fixed_height_small.url}
                                alt="GIF"
                                loading="lazy"
                                class="w-full h-auto object-cover"
                            />
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgb(14 165 233) transparent;
    }

    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: rgb(14 165 233);
        border-radius: 3px;
    }
</style>
