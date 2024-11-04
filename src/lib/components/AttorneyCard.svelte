<script>
  export let attorney = {
    id: '',
    name: 'Unknown Attorney',
    location: 'Location Unknown',
    practiceAreas: [],
    profilePicture: '',
    website: '',
  };

  // Ensure practiceAreas is always an array and filter out any undefined/null values
  $: areas = Array.isArray(attorney.practiceAreas) 
    ? attorney.practiceAreas.filter(area => area) 
    : [];

  // Ensure name and location have fallback values
  $: displayName = attorney.name || 'Unknown Attorney';
  $: displayLocation = attorney.location || 'Location Unknown';

  // Helper function to get valid profile picture URL
  function getProfilePictureUrl(profilePicture) {
    if (!profilePicture) return '';
    if (typeof profilePicture === 'string') return profilePicture;
    if (profilePicture.url) return profilePicture.url;
    return '';
  }

  $: profilePictureUrl = getProfilePictureUrl(attorney.profilePicture);
</script>

<div class="relative overflow-hidden rounded-lg bg-black/20 hover:shadow-2xl transition-all duration-300 backdrop-blur-md border border-[#00e6e6]/10 h-[280px]">
  <div class="p-6 flex flex-col h-full">
    <!-- Top Section with Photo and Basic Info -->
    <div class="flex items-start gap-6 flex-shrink-0">
      <!-- Profile Picture -->
      <div class="shrink-0">
        <div class="w-20 h-20 rounded-lg ring-2 ring-[#00e6e6]/20 shadow-lg overflow-hidden">
          {#if profilePictureUrl}
            <img 
              src={profilePictureUrl} 
              alt=""
              class="w-full h-full object-cover"
              on:error={() => profilePictureUrl = ''}
            />
          {:else}
            <div class="w-full h-full bg-gradient-to-br from-[#00e6e6]/80 to-[#00e6e6] flex items-center justify-center">
              <svg 
                class="w-10 h-10 text-black/80" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fill-rule="evenodd" 
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" 
                  clip-rule="evenodd"
                />
              </svg>
            </div>
          {/if}
        </div>
      </div>

      <!-- Name and Location -->
      <div class="flex-grow min-w-0">
        <h2 class="text-xl font-semibold tracking-tight text-white/90 truncate">
          {displayName}
        </h2>
        <div class="flex items-center text-sm text-white/70 mt-1">
          <i class="fas fa-location-dot mr-2"></i>
          <span class="truncate">{displayLocation}</span>
        </div>
      </div>
    </div>

    <!-- Practice Areas -->
    {#if areas.length > 0}
      <div class="mt-6 flex-grow overflow-hidden">
        <div class="text-sm font-medium text-white/60 mb-2">Practice Areas</div>
        <div class="flex flex-wrap gap-2 overflow-hidden max-h-[80px]">
          {#each areas.slice(0, 3) as area}
            <span class="px-3 py-1 rounded-full text-xs border border-[#00e6e6]/30 text-[#00e6e6] bg-[#00e6e6]/5 truncate max-w-full">
              {area}
            </span>
          {/each}
          {#if areas.length > 3}
            <span class="px-3 py-1 rounded-full text-xs bg-white/5 text-white/60">
              +{areas.length - 3} more
            </span>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Actions -->
    <div class="flex justify-between items-center mt-auto pt-6 flex-shrink-0">
      <div class="flex gap-3">
        {#if attorney.website}
          <a 
            href={attorney.website} 
            target="_blank" 
            rel="noopener noreferrer" 
            class="p-2 rounded-full hover:bg-[#00e6e6]/10 text-white/70 hover:text-[#00e6e6] transition-colors"
            title="Website"
          >
            <i class="fas fa-globe"></i>
          </a>
        {/if}
      </div>
      
      <a 
        href="/attorney/{attorney.id}" 
        class="px-6 py-2 bg-[#00e6e6] hover:bg-[#00e6e6]/90 text-black font-medium rounded-full text-sm transition-colors shadow-lg hover:shadow-[#00e6e6]/20"
      >
        View Profile
        <i class="fas fa-arrow-right ml-2"></i>
      </a>
    </div>
  </div>
</div> 