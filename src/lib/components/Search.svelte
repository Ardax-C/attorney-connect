<script>
    import { onMount, afterUpdate } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { auth, db } from '$lib/firebase';
    import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
    import { ChevronDown, ChevronUp } from 'lucide-svelte';
    import Navbar from './Navbar.svelte';
    import SearchBar from './SearchBar.svelte';
    import UserProfileCard from './UserProfileCard.svelte';
    import MobileSearchComponent from './MobileSearchComponent.svelte';
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';
    import { searchAttorneys } from '$lib/vertexAI';

    let errorMessage = '';
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
    let isSearchExpanded = false;
    let innerHeight;

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
        const updateInnerHeight = () => {
            innerHeight = window.innerHeight;
        };
        updateInnerHeight();
        window.addEventListener('resize', updateInnerHeight);
        return () => {
            unsubscribe();
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('resize', updateInnerHeight);
            if (resultsContainer) {
                resultsContainer.removeEventListener('scroll', handleScroll);
            }
        };
    });

    function checkMobile() {
        isMobile = window.innerWidth <= 768;
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

    function toggleSearchExpansion() {
        isSearchExpanded = !isSearchExpanded;
    }

    async function fetchUniqueFields() {
        // Fetch states
        const statesQuery = query(collection(db, "states"));
        const statesSnapshot = await getDocs(statesQuery);
        statesSnapshot.docs.forEach(doc => {
        });
        states = statesSnapshot.docs.map(doc => doc.data().state);

        // Fetch practice areas
        const practiceAreasQuery = query(collection(db, "practiceAreas"));
        const practiceAreasSnapshot = await getDocs(practiceAreasQuery);
        practiceAreasSnapshot.docs.forEach(doc => {
        });
        practiceAreas = practiceAreasSnapshot.docs.map(doc => doc.data().practiceArea);
    }

    async function handleSearch(event) {
        if (event && event.detail) {
            searchTerm = event.detail.searchTerm || '';
        }

        errorMessage = '';
        searchResults = [];
        isLoading = true;

        try {
            const aiResponse = await searchAttorneys(searchTerm);
            console.log("AI parsed response:", aiResponse);

            let firestoreQuery = collection(db, "attorneyProfiles");
            let conditions = [];
            
            if (aiResponse.state) {
                conditions.push(where("state", "in", [
                    aiResponse.state, 
                    aiResponse.state.toUpperCase(), 
                    aiResponse.state.toLowerCase(),
                    toTitleCase(aiResponse.state)
                ]));
            }
            if (aiResponse.city) {
                conditions.push(where("city", "in", [
                    aiResponse.city, 
                    aiResponse.city.toUpperCase(), 
                    aiResponse.city.toLowerCase(),
                    toTitleCase(aiResponse.city)
                ]));
            }

            // Combine practice areas and keywords for partial matching
            const searchTerms = [...new Set([...aiResponse.practiceAreas, ...aiResponse.keywords])];

            if (searchTerms.length > 0) {
                conditions.push(where("searchTerms", "array-contains-any", searchTerms));
            }
            
            if (conditions.length > 0) {
                firestoreQuery = query(firestoreQuery, ...conditions);
            }

            // Add ordering and limit to the query
            firestoreQuery = query(firestoreQuery, orderBy("lastName"), limit(20));

            const querySnapshot = await getDocs(firestoreQuery);
            searchResults = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data };
            });

            console.log("Final search results:", searchResults);

            if (searchResults.length === 0) {
                errorMessage = "No attorneys found matching your search criteria. Please try a different search.";
            }
        } catch (error) {
            console.error("Error during search:", error);
            errorMessage = "An error occurred while searching. Please try again or refine your search terms.";
            searchResults = [];
        } finally {
            isLoading = false;
        }
    }

    // Helper function to convert strings to Title Case
    function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
    }

    function handleSearchBarSearch(event) {
        if (event.detail && isMobile) {
            searchTerm = event.detail.searchTerm;
            selectedState = event.detail.state;
            selectedPracticeArea = event.detail.practiceArea;
        } else {
            searchTerm = event.detail;
        }
        handleSearch();
    }

    function handleProfileClick(attorneyId) {
        goto(`/attorney/${attorneyId}`);
    }

    $: if (isMobile) {
        isSearchExpanded = true;
    }

    $: selectedPracticeArea
    $: selectedState
</script>

<main class="bg-no-repeat bg-center bg-cover flex flex-col min-h-screen" style="background-image: url({backgroundImage})">
    <Navbar bind:visible={showNavbar} />
    <div class="flex-grow flex flex-col overflow-hidden {showNavbar ? 'mt-16' : 'mt-0'}" style="height: {innerHeight}px">
        <div class="w-full transition-all duration-300 ease-in-out {showNavbar ? '' : 'fixed top-0 left-0 right-0 z-40 bg-zinc-800 bg-opacity-90'}">
            {#if isMobile}
                <MobileSearchComponent
                    headerText="Search Attorneys"
                    on:search={handleSearchBarSearch}
                />
            {:else}
                <div class="max-w-4xl mx-auto bg-zinc-800 bg-opacity-90 rounded-md shadow-md p-4">
                    <button class="flex justify-between items-center cursor-pointer w-full text-left" on:click={toggleSearchExpansion} aria-expanded={isSearchExpanded} type="button">
                        <h2 class="text-2xl font-bold text-cyan-400 font-inter">Search Attorneys</h2>
                        {#if isSearchExpanded}
                            <ChevronUp class="text-cyan-400" size={24} />
                        {:else}
                            <ChevronDown class="text-cyan-400" size={24} />
                        {/if}
                    </button>
                   
                    {#if isSearchExpanded}
                        <div class="mt-4 space-y-4">
                            <div class="w-full">
                                <SearchBar
                                    placeholder="Describe the attorney you're looking for..."
                                    bind:value={searchTerm}
                                    on:search={handleSearchBarSearch}
                                    showSearchButton={true}
                                />
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
        <div id="results-container" class="flex-grow overflow-y-auto px-4 pb-16 mt-4" style="max-height: calc(100% - {isMobile ? '120px' : '0px'});">
            {#if isLoading}
                <p class="text-emerald-400 text-center mt-4">Searching for attorneys...</p>
            {:else if errorMessage}
                <p class="text-red-500 text-center mt-4">{errorMessage}</p>
            {:else if searchResults.length > 0}
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {#each searchResults as result}
                        <div class="w-full flex justify-center">
                            <button class="w-full sm:w-full cursor-pointer" on:click={() => handleProfileClick(result.id)} type="button">
                                <UserProfileCard user={result} />
                            </button>
                        </div>
                    {/each}
                </div>
            {:else if searchResults.length === 0 && searchTerm}
                <p class="text-emerald-400 text-center mt-4">No results found. Please try a different search.</p>
            {:else}
                <p class="text-emerald-400 text-center mt-4">Enter a search query to find attorneys.</p>
            {/if}
        </div>
    </div>
</main>

<style>
    :global(body) {
        overflow: hidden;
    }
</style>