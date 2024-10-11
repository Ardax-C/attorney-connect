<script>
    import { onMount, afterUpdate } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { auth, db } from '$lib/firebase';
    import { collection, query, getDocs, where, orderBy, limit, startAfter, or, and } from 'firebase/firestore';
    import { ChevronDown, ChevronUp } from 'lucide-svelte';
    import Navbar from './Navbar.svelte';
    import SearchBar from './SearchBar.svelte';
    import UserProfileCard from './UserProfileCard.svelte';
    import MobileSearchComponent from './MobileSearchComponent.svelte';
    import backgroundImage from '../images/dark_lattice.png';
    import { searchAttorneys } from '$lib/vertexAI';

    let errorMessage = '';
    let searchTerm = '';
    let searchResults = [];
    let showNavbar = true;
    let resultsContainer;
    let isAuthenticated = false;
    let isLoading = true;
    let isMobile = false;
    let lastScrollTop = 0;
    let isSearchExpanded = false;
    let innerHeight;

    // Pagination variables
    let currentPage = 1;
    let totalPages = 1;
    let attorneysPerPage = 20;  // Default, can be adjusted
    let lastVisible = null;
    let isViewingAllAttorneys = false;

    // New variable to indicate we're on the search page
    let isSearchPage = true;

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                isAuthenticated = true;
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
                } else {
                    // Initialize with all attorneys if no search term
                    handleSearch();
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
            showNavbar = true;
        } else if (scrollTop < lastScrollTop || scrollTop === 0) {
            showNavbar = true;
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }

    function toggleSearchExpansion() {
        isSearchExpanded = !isSearchExpanded;
    }

    async function handleSearch(event, page = 1) {
        if (event && event.detail) {
            searchTerm = event.detail.searchTerm || '';
        }

        errorMessage = '';
        searchResults = [];
        isLoading = true;
        currentPage = page;

        try {
            const aiResponse = await searchAttorneys(searchTerm);
            let firestoreQuery = collection(db, "attorneyProfiles");
            let conditions = [];

            isViewingAllAttorneys = aiResponse.isAllAttorneys;

            if (aiResponse.isAllAttorneys) {
                // Query for all attorneys
                firestoreQuery = query(firestoreQuery, orderBy("lastName"), limit(attorneysPerPage));
            } else {
                // Handle name searches
                if (aiResponse.names.full.length > 0 || aiResponse.names.first.length > 0 || aiResponse.names.last.length > 0) {
                    const nameConditions = [];
                    aiResponse.names.full.forEach(name => {
                        const [firstName, lastName] = name.split(' ');
                        if (firstName && lastName) {
                            nameConditions.push(and(
                                where("firstName", "==", firstName),
                                where("lastName", "==", lastName)
                            ));
                        }
                    });
                    if (aiResponse.names.first.length > 0) {
                        nameConditions.push(where("firstName", "in", aiResponse.names.first));
                    }
                    if (aiResponse.names.last.length > 0) {
                        nameConditions.push(where("lastName", "in", aiResponse.names.last));
                    }
                    if (nameConditions.length > 0) {
                        conditions.push(or(...nameConditions));
                    }
                }

                // Handle location searches
                if (aiResponse.locations.states.length > 0) {
                    conditions.push(where("state", "in", aiResponse.locations.states));
                }
                if (aiResponse.locations.cities.length > 0) {
                    conditions.push(where("city", "in", aiResponse.locations.cities));
                }

                // Handle practice areas and keywords
                const searchTerms = [
                    ...new Set([
                        ...aiResponse.practiceAreas,
                        ...aiResponse.keywords
                    ].map(term => term.toLowerCase()))
                ];

                if (searchTerms.length > 0) {
                    conditions.push(or(
                        where("searchTerms.keywords", "array-contains-any", searchTerms),
                        where("practiceAreas", "array-contains-any", searchTerms.map(toTitleCase))
                    ));
                }

                // Construct the final query
                if (conditions.length > 0) {
                    firestoreQuery = query(firestoreQuery, 
                        aiResponse.isGeneral ? or(...conditions) : and(...conditions), 
                        orderBy("lastName"), 
                        limit(attorneysPerPage)
                    );
                } else {
                    firestoreQuery = query(firestoreQuery, orderBy("lastName"), limit(attorneysPerPage));
                }
            }

            if (page > 1 && lastVisible) {
                firestoreQuery = query(firestoreQuery, startAfter(lastVisible));
            }

            const querySnapshot = await getDocs(firestoreQuery);
            searchResults = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data };
            });

            if (querySnapshot.docs.length > 0) {
                lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            }

            // Calculate total pages
            const totalAttorneysQuery = await getDocs(query(collection(db, "attorneyProfiles")));
            const totalAttorneys = totalAttorneysQuery.size;
            totalPages = Math.ceil(totalAttorneys / attorneysPerPage);

            if (searchResults.length === 0) {
                errorMessage = "No attorneys found matching your search criteria. Please try different keywords or locations.";
            }
        } catch (error) {
            console.error("Search error:", error);
            errorMessage = "An error occurred while searching. Please try again.";
            searchResults = [];
        } finally {
            isLoading = false;
        }
    }

    function handleSearchBarSearch(event) {
        if (event.detail && isMobile) {
            searchTerm = event.detail.searchTerm;
        } else {
            searchTerm = event.detail;
        }
        handleSearch();
    }

    function handleProfileClick(attorneyId) {
        goto(`/attorney/${attorneyId}`);
    }

    function handlePageChange(newPage) {
        handleSearch(null, newPage);
    }

    function handleAttorneysPerPageChange(event) {
        attorneysPerPage = parseInt(event.target.value);
        handleSearch();
    }

    function toTitleCase(str) {
        return str.replace(/\w\S*/g, function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }

    $: if (isMobile) {
        isSearchExpanded = true;
    }
</script>

<Navbar 
    bind:visible={showNavbar}
    {isSearchPage}
    {currentPage}
    {totalPages}
    onPageChange={handlePageChange}
/>

<main class="bg-no-repeat bg-center bg-cover flex flex-col min-h-screen" style="background-image: url({backgroundImage})">
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
                                    placeholder="Search for attorneys (e.g., 'divorce lawyer in New York')"
                                    bind:value={searchTerm}
                                    on:search={handleSearchBarSearch}
                                    showSearchButton={true}
                                />
                            </div>
                            <div class="flex justify-between items-center">
                                <select bind:value={attorneysPerPage} on:change={handleAttorneysPerPageChange} class="bg-zinc-700 text-white rounded p-2">
                                    <option value="10">10 per page</option>
                                    <option value="20">20 per page</option>
                                    <option value="50">50 per page</option>
                                </select>
                                {#if isViewingAllAttorneys}
                                    <span class="text-cyan-400">Viewing all attorneys</span>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
        <div id="results-container" class="flex-grow overflow-y-auto px-4 pb-16 mt-4 mb-4" style="max-height: calc(100% - {isMobile ? '120px' : '0px'});">
            {#if isLoading}
                <p class="text-cyan-400 text-center mt-4">Searching for attorneys...</p>
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
                <p class="text-xl text-orange-300 font-bold text-center mt-4">Enter a search query to find attorneys.</p>
            {/if}
        </div>
    </div>
</main>

<style>
    :global(body) {
        overflow: hidden;
    }
</style>