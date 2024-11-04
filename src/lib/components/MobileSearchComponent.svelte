<script>
    import { createEventDispatcher } from 'svelte';
    import { slide } from 'svelte/transition';
    import { ChevronDown, ChevronUp, Search, X, RefreshCw } from 'lucide-svelte';
    import { functions } from '$lib/firebase';
    import { httpsCallable } from 'firebase/functions';
    
    const dispatch = createEventDispatcher();

    let searchTerm = '';
    let selectedStatus = 'all';
    let selectedRole = 'all';

    let isExpanded = false;
    let isSyncing = false;

    $: activeFiltersCount = [
        selectedStatus !== 'all' ? 1 : 0,
        selectedRole !== 'all' ? 1 : 0,
        searchTerm ? 1 : 0
    ].reduce((a, b) => a + b, 0);

    function clearFilters() {
        searchTerm = '';
        selectedStatus = 'all';
        selectedRole = 'all';
        handleSearch();
    }

    function handleSearch() {
        dispatch('filterChange', {
            searchTerm,
            status: selectedStatus,
            role: selectedRole
        });
        isExpanded = false;
    }

    async function syncToElasticsearch() {
        try {
            isSyncing = true;
            const initIndex = httpsCallable(functions, 'initializeElasticsearchIndex');
            const result = await initIndex();
            alert(`Elasticsearch sync completed:\n\nProcessed: ${result.data.documentsProcessed} documents\nTotal attorneys: ${result.data.totalDocuments}`);
        } catch (error) {
            console.error('Error syncing to Elasticsearch:', error);
            alert('Error syncing to Elasticsearch. Please try again.');
        } finally {
            isSyncing = false;
        }
    }
</script>

<div class="fixed bottom-0 left-0 right-0 bg-[#1a2632] border-t border-cyan-500/20 z-50">
    <!-- Sync Button -->
    <button
        on:click={syncToElasticsearch}
        disabled={isSyncing}
        class="w-full flex items-center justify-center px-4 py-2 bg-emerald-500/10 text-emerald-400
               hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
        <RefreshCw 
            size={16} 
            class="mr-2 {isSyncing ? 'animate-spin' : ''}"
        />
        {isSyncing ? 'Syncing...' : 'Sync Firestore to Elasticsearch'}
    </button>

    <!-- Search Input -->
    <div class="relative bg-[#243442] p-4">
        <input
            type="text"
            placeholder="Search by name or email..."
            bind:value={searchTerm}
            on:input={(e) => searchTerm = e.target.value.toLowerCase()}
            class="w-full bg-[#1a2632] text-gray-200 px-4 py-3 pr-12 rounded-lg 
                   border border-cyan-500/20 focus:border-cyan-500/40
                   placeholder-gray-400"
        />
        <button 
            class="absolute right-6 top-1/2 -translate-y-1/2 text-cyan-400"
            on:click={handleSearch}
        >
            <Search size={20} />
        </button>
    </div>

    <!-- Filter Toggle -->
    <button
        class="w-full flex items-center justify-between px-4 py-3 text-cyan-400 bg-[#243442]"
        on:click={() => isExpanded = !isExpanded}
    >
        <div class="flex items-center space-x-2">
            <Search size={20} />
            <span>Filters</span>
            {#if activeFiltersCount > 0}
                <span class="bg-cyan-500/20 px-2 py-0.5 rounded-full text-xs">
                    {activeFiltersCount} selected
                </span>
            {/if}
        </div>
        {#if isExpanded}
            <X size={20} />
        {:else}
            <ChevronUp size={20} />
        {/if}
    </button>

    <!-- Expanded Filters Panel -->
    {#if isExpanded}
        <div 
            class="bg-[#243442] p-4 h-[calc(100vh-12rem)] overflow-y-auto"
            transition:slide
        >
            <div class="space-y-4">
                <!-- Status -->
                <select
                    bind:value={selectedStatus}
                    class="w-full bg-[#1a2632] text-gray-200 px-4 py-3 rounded-lg
                           border border-cyan-500/20 focus:border-cyan-500/40"
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="denied">Denied</option>
                </select>

                <!-- Role -->
                <select
                    bind:value={selectedRole}
                    class="w-full bg-[#1a2632] text-gray-200 px-4 py-3 rounded-lg
                           border border-cyan-500/20 focus:border-cyan-500/40"
                >
                    <option value="all">All Roles</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                </select>

                <!-- Action Buttons -->
                <div class="flex space-x-4 pt-4">
                    <button
                        on:click={clearFilters}
                        class="flex-1 px-4 py-2 rounded-lg text-cyan-400 border border-cyan-500/20
                               hover:bg-cyan-500/10 transition-colors"
                    >
                        Clear
                    </button>
                    <button
                        on:click={handleSearch}
                        class="flex-1 px-4 py-2 rounded-lg bg-cyan-500 text-[#1a2632] font-medium
                               hover:bg-cyan-400 transition-colors"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #00e6e6 #243442;
    }

    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
        background: #243442;
        border-radius: 3px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: #00e6e6;
        border-radius: 3px;
    }

    .filter-section {
        @apply border-b border-gray-700/50 pb-4;
    }

    .filter-section:last-child {
        @apply border-b-0 pb-0;
    }
</style>