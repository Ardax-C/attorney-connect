<script>
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import { X } from 'lucide-svelte';
    
    export let request;
    export let show = false;
    
    const dispatch = createEventDispatcher();

    function closeModal() {
        dispatch('close');
    }

    function handleAcceptRequest() {
        dispatch('accept', request);
    }

    // Close on escape key
    function handleKeydown(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown}/>

{#if show}
    <button 
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        transition:fade
        on:click={closeModal}
    >
        <div 
            role="dialog"
            class="bg-zinc-800 rounded-lg w-full max-w-2xl overflow-hidden"
            on:click|stopPropagation
            on:keydown|stopPropagation
            aria-modal="true"
            tabindex="-1"
        >
            <!-- Header -->
            <div class="flex justify-between items-center p-6 border-b border-zinc-700">
                <h3 class="text-xl font-semibold text-cyan-400">
                    Legal Assistance Request
                </h3>
                <button 
                    class="text-gray-400 hover:text-white"
                    on:click={closeModal}
                >
                    <X size={24} />
                </button>
            </div>

            <!-- Content -->
            <div class="p-6">
                <div class="space-y-4">
                    <div>
                        <h4 class="text-sm font-medium text-gray-400 mb-1">Client</h4>
                        <p class="text-lg text-white">{request.firstName} {request.lastName}</p>
                    </div>

                    <div>
                        <h4 class="text-sm font-medium text-gray-400 mb-1">Contact Information</h4>
                        <p class="text-white">Email: {request.email}</p>
                        <p class="text-white">Phone: {request.phone}</p>
                    </div>

                    <div>
                        <h4 class="text-sm font-medium text-gray-400 mb-1">Legal Issue</h4>
                        <p class="text-white whitespace-pre-wrap">{request.legalIssue}</p>
                    </div>

                    <div>
                        <h4 class="text-sm font-medium text-gray-400 mb-1">Suggested Practice Areas</h4>
                        <div class="flex flex-wrap gap-2">
                            {#each request.suggestedPracticeAreas || [] as area}
                                <span class="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded text-sm">
                                    {area}
                                </span>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-6 border-t border-zinc-700 flex justify-end space-x-4">
                <button 
                    class="px-4 py-2 text-gray-400 hover:text-white rounded-lg"
                    on:click={closeModal}
                >
                    Cancel
                </button>
                <button 
                    class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    on:click={handleAcceptRequest}
                >
                    Accept Request
                </button>
            </div>
        </div>
    </button>
{/if} 