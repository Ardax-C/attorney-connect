<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { db, auth, functions } from '$lib/firebase';
    import { collection, query, getDocs, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
    import { ChevronDown, ChevronUp, Trash2, Loader2, RefreshCw } from 'lucide-svelte';
    import { httpsCallable, getFunctions } from 'firebase/functions';
    import Navbar from './Navbar.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import SearchBar from './SearchBar.svelte';
    import MobileSearchComponent from './MobileSearchComponent.svelte';
    import backgroundImage from '../images/dark_lattice.png';

    let users = [];
    let filteredUsers = [];
    let selectedStatus = 'all';
    let selectedRole = 'all';
    let selectedState = '';
    let selectedPracticeArea = '';
    let searchTerm = '';
    let states = [];
    let practiceAreas = [];
    let showNavbar = true;
    let isAuthenticated = false;
    let isLoading = true;
    let isMobile = false;
    let lastScrollTop = 0;
    let isSearchExpanded = false;
    let innerHeight;
    let isSidePanelOpen = !isMobile;
    let isSyncing = false;

    const statusOptions = [
        { value: 'all', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'denied', label: 'Denied' }
    ];

    const roleOptions = [
        { value: 'all', label: 'All Roles' },
        { value: 'user', label: 'User' },
        { value: 'admin', label: 'Admin' }
    ];

    onMount(async () => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                isAuthenticated = true;
                await fetchUniqueFields();
                await fetchUsers();
                checkMobile();
                window.addEventListener('resize', checkMobile);
                
                const resultsContainer = document.getElementById('results-container');
                if (resultsContainer) {
                    resultsContainer.addEventListener('scroll', handleScroll, { passive: true });
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
            const resultsContainer = document.getElementById('results-container');
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

    async function fetchUniqueFields() {
        const statesQuery = query(collection(db, "states"));
        const statesSnapshot = await getDocs(statesQuery);
        // Make sure each state is a separate string
        states = statesSnapshot.docs.map(doc => doc.data().state);

        const practiceAreasQuery = query(collection(db, "practiceAreas"));
        const practiceAreasSnapshot = await getDocs(practiceAreasQuery);
        practiceAreas = practiceAreasSnapshot.docs.map(doc => doc.data().practiceArea);
    }

    async function fetchUsers() {
        let usersQuery = query(collection(db, "attorneyProfiles"));

        if (selectedStatus && selectedStatus !== 'all') {
            usersQuery = query(usersQuery, where("status", "==", selectedStatus));
        }
        if (selectedRole && selectedRole !== 'all') {
            usersQuery = query(usersQuery, where("role", "==", selectedRole));
        }

        if (searchTerm) {
            usersQuery = query(usersQuery, where("email", ">=", searchTerm), where("email", "<=", searchTerm + '\uf8ff'));
        }

        const querySnapshot = await getDocs(usersQuery);
        users = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                practiceAreas: data.practiceAreas || []
            };
        });
        filterUsers();
    }

    async function updateUserStatus(userId, newStatus) {
        const userRef = doc(db, "attorneyProfiles", userId);
        await updateDoc(userRef, { status: newStatus });
        await fetchUsers();
    }

    async function updateUserRole(userId, newRole) {
        await updateDoc(doc(db, "attorneyProfiles", userId), {
            role: newRole
        });
        await fetchUsers();
    }

    async function deleteUserProfile(userId) {
        if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            try {
                const deleteUserFunction = httpsCallable(functions, 'deleteUser');
                const result = await deleteUserFunction({ userId: userId });
                
                users = users.filter(user => user.id !== userId);
                filterUsers();
                alert(result.data.result);
            } catch (error) {
                console.error("Error deleting user:", error);
                alert(`An error occurred while deleting the user: ${error.message}`);
            }
        }
    }

    async function setUserAsAdmin(userId) {
        try {
            const setAdminClaimFunction = httpsCallable(functions, 'setAdminClaim');
            await setAdminClaimFunction({ uid: userId });
            alert('User has been set as an admin.');
            await fetchUsers(); // Refresh the user list
        } catch (error) {
            alert('Failed to set user as admin. See console for details.');
        }
    }

    function filterUsers() {
        filteredUsers = users.filter(user => 
            (searchTerm === '' || 
             user.firstName.toLowerCase().includes(searchTerm) ||
             user.lastName.toLowerCase().includes(searchTerm) ||
             user.email.toLowerCase().includes(searchTerm))
        );
    }

    function handleProfileClick(attorneyId) {
        goto(`/attorney/${attorneyId}`);
    }

    function handleSearchBarSearch(event) {
        if (event.detail) {
            searchTerm = event.detail.searchTerm.toLowerCase();
            selectedStatus = event.detail.status;
            selectedRole = event.detail.role;
        }
        fetchUsers();
    }

    $: {
        searchTerm;
        selectedStatus;
        selectedRole;
        selectedState;
        selectedPracticeArea;
        fetchUsers();
    }

    $: if (isMobile) {
        isSearchExpanded = true;
    }

    async function syncToElasticsearch() {
        isSyncing = true;
        try {
            const functions = getFunctions();
            const initIndex = httpsCallable(functions, 'initializeElasticsearchIndex');
            const result = await initIndex();
            
            // Show completion message with proper counts
            const message = `Elasticsearch sync completed:\n\nProcessed: ${result.data.documentsProcessed} documents\nTotal attorneys: ${result.data.documentsProcessed}`;
            alert(message);
        } catch (error) {
            console.error('Sync failed:', error);
            alert('Sync failed. Please check console for details.');
        } finally {
            isSyncing = false;
        }
    }
</script>

<main class="bg-no-repeat bg-center bg-cover flex flex-col min-h-screen" style="background-image: url({backgroundImage})">
    <Navbar bind:visible={showNavbar} />
    <div class="flex-grow flex overflow-hidden {showNavbar ? 'mt-16' : 'mt-0'}" style="height: {innerHeight}px">
        <!-- Side Panel -->
        <div class="hidden md:block bg-zinc-800 bg-opacity-90 w-80 p-6 border-r border-zinc-700 transition-all duration-300 ease-in-out {isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'}">
            <h2 class="text-2xl font-bold text-cyan-400 font-inter mb-6">Filters</h2>
            
            <div class="space-y-4">
                <div class="space-y-2">
                    <SearchBar
                        placeholder="Search by name or email"
                        bind:value={searchTerm}
                        on:input={(e) => searchTerm = e.target.value.toLowerCase()}
                        on:search={handleSearchBarSearch}
                        showSearchButton={true}
                    />
                </div>
                
                <div class="space-y-3">
                    <Select bind:value={selectedStatus} options={statusOptions} on:change={fetchUsers} />
                    <Select bind:value={selectedRole} options={roleOptions} on:change={fetchUsers} />
                </div>

                <button 
                    class="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    on:click={syncToElasticsearch}
                >
                    <svg 
                        class="w-4 h-4 {isSyncing ? 'animate-spin' : ''}" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                    >
                        <path 
                            stroke-linecap="round" 
                            stroke-linejoin="round" 
                            stroke-width="2" 
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                    Sync Firestore to Elasticsearch
                </button>
            </div>
        </div>

        <!-- Main Content -->
        <div class="flex-1 overflow-hidden">
            <!-- Mobile Header -->
            {#if isMobile}
                <MobileSearchComponent
                    {states}
                    {practiceAreas}
                    selectedFilters={[selectedStatus, selectedRole, selectedState, selectedPracticeArea]}
                    on:filterChange={(event) => {
                        selectedStatus = event.detail.status;
                        selectedRole = event.detail.role;
                        searchTerm = event.detail.searchTerm;
                        fetchUsers();
                    }}
                />
            {/if}

            <!-- Results Container -->
            <div id="results-container" class="h-full overflow-y-auto px-6 py-20">
                {#if isLoading}
                    <div class="flex items-center justify-center h-full">
                        <Loader2 class="animate-spin" size={32} />
                    </div>
                {:else if filteredUsers.length === 0}
                    <div class="flex flex-col items-center justify-center h-full text-center">
                        <p class="text-xl text-custom-color-secondary mb-2">No users found</p>
                        <p class="text-sm text-custom-color-secondary opacity-75">Try adjusting your filters or search terms</p>
                    </div>
                {:else}
                    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {#each filteredUsers as user}
                            <Card class="hover:shadow-xl transition-all duration-300">
                                <div class="p-6">
                                    <!-- User Info -->
                                    <div class="flex items-start justify-between mb-4">
                                        <div>
                                            <h2 class="text-xl font-bold text-custom-color-tertiary">{user.firstName} {user.lastName}</h2>
                                            <p class="text-sm text-orange-400">{user.email}</p>
                                        </div>
                                        <div class="flex gap-2">
                                            <Button 
                                                variant="destructive" 
                                                size="sm" 
                                                on:click={(e) => {
                                                    e.stopPropagation();
                                                    deleteUserProfile(user.id);
                                                }}>
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>

                                    <!-- User Details -->
                                    <div class="space-y-2 mb-6">
                                        <div class="flex items-center gap-2">
                                            <span class="text-sm font-semibold">Status:</span>
                                            <span class={`px-2 py-1 rounded-full text-xs font-medium
                                                ${user.status === 'approved' ? 'bg-green-500/20 text-green-400' : 
                                                user.status === 'denied' ? 'bg-red-500/20 text-red-400' : 
                                                'bg-yellow-500/20 text-yellow-400'}`}>
                                                {user.status}
                                            </span>
                                        </div>
                                        <p class="text-sm"><span class="font-semibold">Role:</span> {user.role}</p>
                                        <p class="text-sm"><span class="font-semibold">State:</span> {user.state}</p>
                                        <p class="text-sm"><span class="font-semibold">Practice Areas:</span> {user.practiceAreas ? user.practiceAreas.join(', ') : 'None'}</p>
                                    </div>

                                    <!-- Actions -->
                                    <div class="flex flex-col gap-2">
                                        <div class="grid grid-cols-2 gap-2">
                                            <Select 
                                                value={user.status} 
                                                options={statusOptions.filter(option => option.value !== 'all')} 
                                                on:change={(event) => updateUserStatus(user.id, event.target.value)} 
                                            />
                                            <Select 
                                                value={user.role} 
                                                options={roleOptions.filter(option => option.value !== 'all')} 
                                                on:change={(event) => updateUserRole(user.id, event.target.value)} 
                                            />
                                        </div>
                                        <Button class="w-full" on:click={() => setUserAsAdmin(user.id)}>Make Admin</Button>
                                    </div>
                                </div>
                            </Card>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
</main>

<style>
    :global(body) {
        overflow: hidden;
    }

    .profile-card {
        transition: all 0.3s ease-in-out;
    }

    .profile-card:hover {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }

    .profile-card:active {
        transform: scale(0.95);
    }

    :global(.card) {
        background-color: rgba(39, 39, 42, 0.9);
        border: 1px solid rgb(63, 63, 70);
    }
    
    :global(.select) {
        background-color: rgb(63, 63, 70);
        border-color: rgb(82, 82, 91);
    }

    .animate-spin {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(-360deg);
        }
    }
</style>