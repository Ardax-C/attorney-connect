<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { db, auth, functions } from '$lib/firebase';
    import { collection, query, getDocs, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
    import { ChevronDown, ChevronUp, Trash2 } from 'lucide-svelte';
    import { httpsCallable } from 'firebase/functions';
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
        const statesQuery = query(collection(db, "states"));
        const statesSnapshot = await getDocs(statesQuery);
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
                practiceAreas: data.practiceAreas || [] // Ensure practiceAreas always exists
            };
        });
        filterUsers()
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
                await deleteUserFunction({ userId: userId });
                
                users = users.filter(user => user.id !== userId);
                filterUsers();
                alert("User deleted successfully");
            } catch (error) {
                alert("An error occurred while deleting the user. Please try again.");
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
             user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             user.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    function handleProfileClick(attorneyId) {
        goto(`/attorney/${attorneyId}`);
    }

    function handleSearchBarSearch(event) {
        if (event.detail) {
            searchTerm = event.detail.searchTerm;
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
</script>

<main class="bg-no-repeat bg-center bg-cover flex flex-col min-h-screen" style="background-image: url({backgroundImage})">
    <Navbar bind:visible={showNavbar} />
    <div class="flex-grow flex flex-col overflow-hidden {showNavbar ? 'mt-16' : 'mt-0'}" style="height: {innerHeight}px">
        <div class="w-full transition-all duration-300 ease-in-out {showNavbar ? '' : 'fixed top-0 left-0 right-0 z-40 bg-zinc-800 bg-opacity-90'}">
            {#if isMobile}
                <MobileSearchComponent
                    headerText="Admin Dashboard"
                    filters={[
                        {
                            key: 'status',
                            placeholder: 'All Statuses',
                            options: statusOptions.filter(option => option.value !== 'all')
                        },
                        {
                            key: 'role',
                            placeholder: 'All Roles',
                            options: roleOptions.filter(option => option.value !== 'all')
                        }
                    ]}
                    on:search={handleSearchBarSearch}
                />
            {:else}
                <div class="max-w-4xl mx-auto bg-zinc-800 bg-opacity-90 rounded-md shadow-md p-4">
                    <button class="flex justify-between items-center cursor-pointer w-full text-left" on:click={toggleSearchExpansion} aria-expanded={isSearchExpanded} type="button">
                        <h2 class="text-2xl font-bold text-cyan-400 font-inter">Admin Dashboard</h2>
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
                                    placeholder="Search by name or email"
                                    bind:value={searchTerm}
                                    on:search={handleSearchBarSearch}
                                    showSearchButton={false}
                                />
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <Select bind:value={selectedStatus} options={statusOptions} on:change={fetchUsers} />
                                <Select bind:value={selectedRole} options={roleOptions} on:change={fetchUsers} />
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <div id="results-container" class="flex-grow overflow-y-auto px-4 pb-16 mt-4" style="max-height: calc(100% - {isMobile ? '120px' : '0px'});">
            {#if filteredUsers.length === 0}
                <p class="text-custom-color-secondary">No users found.</p>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {#each filteredUsers as user}
                        <button class="profile-card cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg active:scale-95" on:click={() => handleProfileClick(user.id)} on:keydown={(event) => event.key === 'Enter' && handleProfileClick(user.id)}>
                            <Card>
                                <div class="p-6">
                                    <h2 class="text-xl font-bold mb-2 text-custom-color-tertiary">{user.firstName} {user.lastName}</h2>
                                    <p class="text-sm text-orange-400 mb-4">{user.email}</p>
                                    <div class="space-y-2 mb-4">
                                        <p><span class="font-semibold">State:</span> {user.state}</p>
                                        <p><span class="font-semibold">Practice Areas:</span> {user.practiceAreas ? user.practiceAreas.join(', ') : 'None'}</p>
                                        <p><span class="font-semibold">Status:</span> <span class={`font-semibold ${user.status === 'approved' ? 'text-green-500' : user.status === 'denied' ? 'text-red-500' : 'text-yellow-500'}`}>{user.status}</span></p>
                                        <p><span class="font-semibold">Role:</span> {user.role}</p>
                                    </div>
                                    <button class="flex flex-wrap gap-2" on:click|stopPropagation on:keydown={(event) => event.key === 'Enter' && event.target.click()}>
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
                                    <Button on:click={() => setUserAsAdmin(user.id)}>Make Admin</Button>
                                    <Button variant="destructive" size="sm" on:click={() => deleteUserProfile(user.id)}>
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </Card>
                        </button>
                    {/each}
                </div>
            {/if}
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
</style>