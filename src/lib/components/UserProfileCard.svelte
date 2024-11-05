<script>
    import { faUser } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';
    
    /** @type {import('$lib/types').Attorney} */
    export let attorney;
</script>

<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
    <div class="flex items-start justify-between">
        <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center">
                <div class="h-full w-full bg-cyan-500/20 flex items-center justify-center">
                    {#if attorney.profilePictureUrl}
                        <img 
                            src={attorney.profilePictureUrl}
                            alt="Profile"
                            class="w-full h-full object-cover"
                            on:error={() => attorney.profilePictureUrl = null}
                        />
                    {:else}
                        <Fa icon={faUser} class="text-cyan-500 text-2xl" />
                    {/if}
                </div>
            </div>
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