<script>
    import { onMount } from 'svelte';
    import { db } from '$lib/firebase';
    import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
    import Navbar from './Navbar.svelte';
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';

    let users = [];
    let selectedStatus = 'all';

    onMount(async () => {
        await fetchUsers();
    });

    async function fetchUsers() {
        const q = query(collection(db, "attorneyProfiles"));
        const querySnapshot = await getDocs(q);
        users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async function updateUserStatus(userId, newStatus) {
        await updateDoc(doc(db, "attorneyProfiles", userId), {
            status: newStatus
        });
        await fetchUsers();
    }

    async function updateUserRole(userId, newRole) {
        await updateDoc(doc(db, "attorneyProfiles", userId), {
            role: newRole
        });
        await fetchUsers();
    }

    $: filteredUsers = selectedStatus === 'all' 
        ? users 
        : users.filter(user => user.status === selectedStatus);
</script>

<main class="bg-no-repeat bg-center bg-cover min-h-screen flex flex-col" style="background-image: url({backgroundImage})">
    <Navbar />
    <div class="flex-grow overflow-y-auto mt-20 p-4">
        <h1 class="text-custom-color-tertiary text-2xl font-bold mb-4">Admin Dashboard</h1>
        
        <div class="mb-4">
            <label for="statusFilter" class="text-custom-color-secondary mr-2">Filter by status:</label>
            <select id="statusFilter" bind:value={selectedStatus} class="bg-zinc-700 text-white p-2 rounded">
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
            </select>
        </div>

        {#if filteredUsers.length === 0}
            <p class="text-custom-color-secondary">No users found.</p>
        {:else}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {#each filteredUsers as user}
                    <div class="bg-zinc-800 bg-opacity-90 shadow-md rounded px-8 pt-6 pb-8 mb-4">
                        <h2 class="text-xl font-bold text-custom-color-tertiary">{user.firstName} {user.lastName}</h2>
                        <p class="text-emerald-400">Email: {user.email}</p>
                        <p class="text-emerald-400">State: {user.state}</p>
                        <p class="text-emerald-400">Practice Areas: {user.practiceAreas.join(', ')}</p>
                        <p class="text-emerald-400">Current Status: {user.status}</p>
                        <p class="text-emerald-400">Current Role: {user.role}</p>
                        <div class="mt-4">
                            <select bind:value={user.status} on:change={() => updateUserStatus(user.id, user.status)} class="bg-zinc-700 text-white p-2 rounded mr-2">
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="denied">Denied</option>
                            </select>
                            <select bind:value={user.role} on:change={() => updateUserRole(user.id, user.role)} class="bg-zinc-700 text-white p-2 rounded">
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</main>

<style>
    :global(body) {
        overflow: auto; /* Ensure the body can scroll */
    }
</style>