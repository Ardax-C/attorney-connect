<script>
    export let user;
</script>

<div class="bg-zinc-700 p-4 rounded-md w-full h-full flex flex-col overflow-hidden">
    <div class="flex items-center justify-center mb-3">
        <img src={user.profilePictureUrl || '/default-profile.png'} alt={`${user.firstName} ${user.lastName}`} class="w-24 h-24 rounded-full object-cover" />
    </div>
    <div class="text-center flex-grow">
        <h3 class="text-lg font-bold text-custom-color-tertiary truncate mb-1">{user.firstName} {user.lastName}</h3>
        <p class="text-emerald-400 text-sm mb-2">{user.state}</p>
    </div>
    <div class="mt-2">
        <p class="text-emerald-400 text-xs mb-1">Practice Areas:</p>
        {#if user.practiceAreas && user.practiceAreas.length > 0}
            <ul class="text-emerald-400 text-sm">
                {#each user.practiceAreas.slice(0, 1) as area}
                    <li class="truncate">{area}</li>
                {/each}
                {#if user.practiceAreas.length > 1}
                    <li class="text-xs italic">+{user.practiceAreas.length - 1} more</li>
                {/if}
            </ul>
        {:else}
            <p class="text-emerald-400 text-sm">Not specified</p>
        {/if}
    </div>
</div>