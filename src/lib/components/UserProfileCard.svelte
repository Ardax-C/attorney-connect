<script>
    /** @type {import('$lib/types').Attorney} */
    export let attorney;
    let imgError = false;

    function handleImageError() {
        imgError = true;
    }
</script>

<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
    <div class="flex items-start justify-between">
        <div class="flex items-center gap-4">
            <img 
                src={imgError ? '/images/default-avatar.png' : (attorney.profilePictureUrl || '/images/default-avatar.png')}
                alt={`${attorney.firstName} ${attorney.lastName}`}
                class="w-16 h-16 rounded-lg object-cover"
                on:error={handleImageError}
            />
            <div>
                <h3 class="text-xl font-semibold text-gray-900">{attorney.name}</h3>
                <p class="text-gray-600 mt-1">{attorney.state}</p>
            </div>
        </div>
    </div>

    {#if attorney.practiceAreas && attorney.practiceAreas.length > 0}
        <div class="mt-4">
            <div class="flex flex-wrap gap-2">
                {#each attorney.practiceAreas as area}
                    <span class="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
                        {area}
                    </span>
                {/each}
            </div>
        </div>
    {/if}

    {#if attorney.biography}
        <p class="mt-4 text-gray-700 line-clamp-3">
            {attorney.biography}
        </p>
    {/if}

    <div class="mt-6 flex justify-end">
        <a
            href="/attorney/{attorney.id}"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
            View Profile
        </a>
    </div>
</div>

<style>
    /* Keep your existing styles */
</style>