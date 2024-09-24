<script>
    export let user;

    function formatPracticeAreas(areas) {
        if (!areas || areas.length === 0) return "Not specified";
        if (areas.length === 1) return areas[0];
        return `${areas[0]} +${areas.length - 1} more`;
    }
</script>

<div class="bg-zinc-700 p-4 rounded-sm w-full h-full flex flex-col overflow-hidden">
    <div class="flex items-center justify-center mb-3">
        <img src={user.profilePictureUrl || '/default-profile.png'} alt={`${user.firstName} ${user.lastName}`} class="w-24 h-24 rounded-full object-cover" />
    </div>
    <div class="text-center flex-grow">
        <h3 class="text-lg font-bold text-custom-color-tertiary truncate mb-1">{user.firstName} {user.lastName}</h3>
        <p class="text-emerald-400 text-sm mb-2">{user.city || ''}, {user.state}</p>
    </div>
    <div class="mt-2">
        <p class="text-emerald-400 text-xs mb-1">Practice Areas:</p>
        <p class="text-emerald-400 text-sm truncate">
            {formatPracticeAreas(user.practiceAreas)}
        </p>
    </div>
</div>