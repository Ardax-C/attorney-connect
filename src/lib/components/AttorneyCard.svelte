<script>
  import { faUser, faGlobe } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';

  export let attorney;

  function getProfilePictureUrl(profilePicture) {
    if (!profilePicture) return null;
    if (typeof profilePicture === 'string') return profilePicture;
    if (profilePicture.url) return profilePicture.url;
    return null;
  }

  let profilePictureUrl = getProfilePictureUrl(attorney.profilePicture);
</script>

<div class="card-wrapper h-[225px]">
  <a href="/attorney/{attorney.id}" class="block h-full">
    <div class="h-full rounded-lg overflow-hidden border border-cyan-500/20 hover:border-cyan-500/40 transition-colors glass-card">
      <div class="p-4 h-full flex flex-col">
        <div class="flex items-center space-x-3">
          <div class="h-16 w-16 rounded-full overflow-hidden border-2 border-cyan-500/20">
            <div class="h-full w-full bg-cyan-500/20 flex items-center justify-center">
              {#if profilePictureUrl}
                <img 
                  src={profilePictureUrl} 
                  alt=""
                  class="h-full w-full object-cover"
                  on:error={() => profilePictureUrl = null}
                />
              {:else}
                <Fa icon={faUser} class="text-cyan-500 text-2xl" />
              {/if}
            </div>
          </div>
          
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold text-cyan-400 truncate">
              {attorney.name}
            </h3>
            <p class="text-gray-400 mt-1 text-sm truncate">
              {attorney.location}
            </p>
          </div>
        </div>

        <div class="flex-1">
          {#if attorney.practiceAreas?.length}
            <div class="mt-3 flex flex-wrap gap-1.5">
              {#each attorney.practiceAreas as area}
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400">
                  {area}
                </span>
              {/each}
            </div>
          {/if}
        </div>

        {#if attorney.website}
          <div class="mt-3">
            <a 
              href={attorney.website} 
              target="_blank" 
              rel="noopener noreferrer" 
              class="text-cyan-400 hover:text-cyan-300"
              title="Visit website"
            >
              <Fa icon={faGlobe} />
            </a>
          </div>
        {/if}
      </div>
    </div>
  </a>
</div>

<style>
  .card-wrapper {
    min-height: 225px;
    max-height: 225px;
  }

  .glass-card {
    background: rgba(17, 25, 40, 0.75);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  }

  .glass-card:hover {
    background: rgba(17, 25, 40, 0.85);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.45);
  }
</style> 