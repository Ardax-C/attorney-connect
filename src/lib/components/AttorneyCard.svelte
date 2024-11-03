<script>
    export let attorney = {};
    
    // Destructure attorney properties with defaults
    const {
        firstName = '',
        lastName = '',
        practiceAreas = [],
        city = '',
        state = '',
        profilePictureUrl = '',
        id = ''
    } = attorney;

    // Format practice areas for display
    $: displayPracticeAreas = practiceAreas.slice(0, 3).join(', ') + 
        (practiceAreas.length > 3 ? '...' : '');

    // Handle click to view profile
    function handleViewProfile() {
        window.location.href = `/attorney/${id}`;
    }
</script>

<div class="bg-zinc-800/90 rounded-xl p-6 shadow-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
    <div class="flex items-start space-x-4">
        <!-- Profile Picture -->
        <div class="flex-shrink-0">
            {#if profilePictureUrl}
                <img
                    src={profilePictureUrl}
                    alt="{firstName} {lastName}"
                    class="w-16 h-16 rounded-full object-cover border-2 border-cyan-500/20"
                />
            {:else}
                <div class="w-16 h-16 rounded-full bg-cyan-900/30 flex items-center justify-center text-cyan-500 text-xl font-bold">
                    {firstName.charAt(0)}{lastName.charAt(0)}
                </div>
            {/if}
        </div>

        <!-- Attorney Info -->
        <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold text-cyan-500 truncate">
                {firstName} {lastName}
            </h3>
            
            {#if city || state}
                <p class="text-emerald-400 text-sm mt-1">
                    {[city, state].filter(Boolean).join(', ')}
                </p>
            {/if}
            
            {#if practiceAreas.length > 0}
                <p class="text-gray-400 text-sm mt-1 truncate">
                    {displayPracticeAreas}
                </p>
            {/if}
        </div>
    </div>

    <!-- Action Button -->
    <div class="mt-4">
        <button
            on:click={handleViewProfile}
            class="w-full bg-cyan-600/20 text-cyan-400 px-4 py-2 rounded-md hover:bg-cyan-600/30 transition-colors text-sm font-medium"
        >
            View Profile
        </button>
    </div>
</div> 