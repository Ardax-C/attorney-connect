<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { auth, db } from '$lib/firebase';
    import { collection, query, where, getDocs } from 'firebase/firestore';
    import Navbar from './Navbar.svelte';
    import SearchBar from './SearchBar.svelte';
    import UserProfileCard from './UserProfileCard.svelte';
    import MobileSearchComponent from './MobileSearchComponent.svelte';
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';
  
    let searchTerm = '';
    let selectedState = '';
    let selectedPracticeArea = '';
    let searchResults = [];
    let states = [];
    let practiceAreas = [];
    let showNavbar = true;
    let resultsContainer;
    let isAuthenticated = false;
    let isLoading = true;
    let isMobile = false;
    let lastScrollTop = 0;
  
    onMount(() => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
          isAuthenticated = true;
          await fetchUniqueFields();
          checkMobile();
          window.addEventListener('resize', checkMobile);
          
          resultsContainer = document.getElementById('results-container');
          if (resultsContainer) {
            resultsContainer.addEventListener('scroll', handleScroll, { passive: true });
          }
  
          const urlSearchParams = new URLSearchParams($page.url.searchParams);
          const incomingSearchTerm = urlSearchParams.get('q');
          if (incomingSearchTerm) {
            searchTerm = incomingSearchTerm;
            await handleSearch();
          }
        } else {
          goto('/login');
        }
        isLoading = false;
      });
  
      return () => {
        unsubscribe();
        window.removeEventListener('resize', checkMobile);
        if (resultsContainer) {
          resultsContainer.removeEventListener('scroll', handleScroll);
        }
      };
    });
  
    function checkMobile() {
      isMobile = window.innerWidth <= 768; // Adjust this breakpoint as needed
    }
  
    function handleScroll(event) {
      const scrollTop = event.target.scrollTop;
      if (scrollTop > lastScrollTop && scrollTop > 50) {
        showNavbar = false;
      } else if (scrollTop < lastScrollTop || scrollTop === 0) {
        showNavbar = true;
      }
      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }
  
    async function fetchUniqueFields() {
      // Implement fetching unique states and practice areas
      states = ['Wisconsin', 'California', 'New York', 'Alabama', 'Maryland'];
      practiceAreas = ['International Law', 'Memetic Warfare', 'Criminal Law', 'Family Law', 'Tax Law'];
    }
  
    async function handleSearch(event) {
      if (event) {
        searchTerm = event.detail.searchTerm;
        selectedState = event.detail.selectedState;
        selectedPracticeArea = event.detail.selectedPracticeArea;
      }
  
      let q = collection(db, "attorneyProfiles");
  
      if (searchTerm) {
        q = query(q, 
          where('firstName', '>=', searchTerm), 
          where('firstName', '<=', searchTerm + '\uf8ff')
        );
      }
  
      if (selectedState) {
        q = query(q, where('state', '==', selectedState));
      }
  
      if (selectedPracticeArea) {
        q = query(q, where('practiceAreas', 'array-contains', selectedPracticeArea));
      }
  
      const querySnapshot = await getDocs(q);
      searchResults = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data };
      });
    }
  </script>
  
  <main class="bg-no-repeat bg-center bg-cover min-h-screen flex flex-col" style="background-image: url({backgroundImage})">
    <Navbar bind:visible={showNavbar} />
    <div class="flex-grow flex flex-col items-center overflow-hidden px-4 {showNavbar ? 'mt-20' : 'mt-4'}">
      <div class="w-full max-w-4xl transition-all duration-300 ease-in-out {showNavbar ? '' : 'fixed top-0 left-0 right-0 z-40 px-4 py-2 bg-zinc-800 bg-opacity-90'}">
        {#if isMobile}
          <MobileSearchComponent
            {states}
            {practiceAreas}
            on:search={handleSearch}
          />
        {:else}
          <div class="bg-zinc-800 bg-opacity-90 rounded-md shadow-md p-4 sm:p-6">
            <h2 class="text-2xl font-bold mb-4 text-center text-custom-color-tertiary font-inter">Search Attorneys</h2>
            
            <div class="mb-4">
              <SearchBar 
                placeholder="Search by name or username"
                bind:value={searchTerm}
                on:input={() => handleSearch()}
                on:submit={() => handleSearch()}
              />
            </div>
            
            <div class="mb-4">
              <label for="state" class="block text-emerald-400 text-base mb-1">State</label>
              <select id="state" bind:value={selectedState} on:change={() => handleSearch()} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary bg-zinc-700 text-white">
                <option value="">All States</option>
                {#each states as state}
                  <option value={state}>{state}</option>
                {/each}
              </select>
            </div>
            
            <div class="mb-4">
              <label for="practiceArea" class="block text-emerald-400 text-base mb-1">Practice Area</label>
              <select id="practiceArea" bind:value={selectedPracticeArea} on:change={() => handleSearch()} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary bg-zinc-700 text-white">
                <option value="">All Practice Areas</option>
                {#each practiceAreas as area}
                  <option value={area}>{area}</option>
                {/each}
              </select>
            </div>
          </div>
        {/if}
      </div>
  
      <div id="results-container" class="w-full max-w-4xl flex-grow overflow-y-auto mt-4" style="max-height: calc(100vh - 200px);">
        {#if searchResults.length > 0}
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {#each searchResults as result}
              <div class="w-full">
                <UserProfileCard user={result} />
              </div>
            {/each}
          </div>
        {:else if searchResults.length === 0 && searchTerm}
          <p class="text-emerald-400 text-center mt-4">No results found.</p>
        {/if}
      </div>
    </div>
  </main>
  
  <style>
    :global(body) {
      overflow: hidden;
    }
  </style>