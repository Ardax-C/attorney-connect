<script>
    import { onMount } from 'svelte';
    import Navbar from './Navbar.svelte';
    import SearchBar from './SearchBar.svelte';
    import { auth, db } from '$lib/firebase';
    import { onAuthStateChanged } from 'firebase/auth';
    import { goto } from '$app/navigation'
    import { doc, getDoc, updateDoc } from 'firebase/firestore';
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';
    import { faPencilAlt, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
    import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

    let user = null;
    let userDetails = null;
    let errorMessage = '';
    let editField = null;
    let tempValue = '';
    let showNavbar = true;
    let lastScrollTop = 0;
    let profileCard;

    const fieldOrder = [
        'email',
        'phone',
        'username',
        'practiceAreas',
        'website',
        'city',
        'state',
        'createdAt'
    ];

    function formatDate(timestamp) {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
    }

    function handleSearch(event) {
        const searchTerm = event.detail;
        goto(`/search?q=${encodeURIComponent(searchTerm)}`);
    }

    onMount(() => {
        profileCard = document.getElementById('profile-card');  
    });

    onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            user = currentUser;
            try {
                const userDoc = await getDoc(doc(db, 'attorneyProfiles', user.uid));
                if (userDoc.exists()) {
                    userDetails = userDoc.data();
                } else {
                    errorMessage = 'User details not found.';
                }
            } catch (error) {
                errorMessage = error.message;
            }
        } else {
            errorMessage = 'No user is logged in.';
        }
    });

    function startEdit(field) {
        if (field !== 'createdAt') {
            editField = field;
            if (field === 'practiceAreas') {
                tempValue = userDetails[field].join(', ');
            } else {
                tempValue = userDetails[field];
            }
        }
    }

    function cancelEdit() {
        editField = null;
        tempValue = '';
    }

    async function saveEdit(field) {
        try {
            let valueToSave = tempValue;
            if (field === 'practiceAreas') {
                valueToSave = tempValue.split(',').map(area => area.trim()).filter(area => area !== '');
            }
            await updateDoc(doc(db, 'attorneyProfiles', user.uid), { [field]: valueToSave });
            userDetails[field] = valueToSave;
            editField = null;
            tempValue = '';
        } catch (error) {
            errorMessage = error.message;
        }
    }
</script>

<main class="bg-no-repeat bg-center bg-cover h-screen flex flex-col" style="background-image: url({backgroundImage})">
    <Navbar bind:visible={showNavbar} />
    <div id="profile-card" class="flex-grow overflow-y-auto">
        <div class="flex items-center justify-center py-8 px-4 min-h-full">
            <div class="flex flex-col md:flex-row items-start justify-center bg-zinc-800 bg-opacity-90 p-4 sm:p-6 md:p-8 rounded-md shadow-md w-full max-w-4xl">
                {#if userDetails}
                    <div class="flex flex-col items-center md:items-start md:w-1/3 mb-6 md:mb-0">
                        <img src={userDetails.profilePictureUrl || 'default-profile.png'} alt={userDetails.firstName + ' ' + userDetails.lastName} class="w-40 h-40 md:h-60 object-cover mb-4 rounded-md" onerror="this.src='default-profile.png';" />
                    </div>
                    <div class="md:w-2/3 text-white w-full">
                        <h2 class="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-custom-color-tertiary">{userDetails.firstName} {userDetails.lastName}</h2>
                        <div class="space-y-2">
                            {#each fieldOrder as field}
                                {#if userDetails[field] !== undefined}
                                    <div class="grid grid-cols-1 sm:grid-cols-[1fr,2fr,auto] gap-x-2 sm:gap-x-4 gap-y-1 pb-2 border-b border-gray-700">
                                        <div class="font-bold capitalize text-sm sm:text-base text-custom-color-tertiary">{field.replace(/([A-Z])/g, ' $1')}:</div>
                                        <div class="text-left sm:text-right text-sm sm:text-base">
                                            {#if editField === field}
                                                <input type="text" bind:value={tempValue} class="w-full p-1 sm:p-2 rounded-md text-black text-sm" placeholder={field === 'practiceAreas' ? 'Separate areas with commas' : ''} />
                                            {:else}
                                                {#if field === 'practiceAreas'}
                                                    {userDetails[field].join(', ')}
                                                {:else if field === 'createdAt'}
                                                    {formatDate(userDetails[field])}
                                                {:else}
                                                    {userDetails[field]}
                                                {/if}
                                            {/if}
                                        </div>
                                        <div class="flex items-center justify-end">
                                            {#if editField === field}
                                                <button on:click={() => saveEdit(field)} class="ml-1 sm:ml-2 text-green-500"><FontAwesomeIcon icon={faCheck} /></button>
                                                <button on:click={cancelEdit} class="ml-1 sm:ml-2 text-red-500"><FontAwesomeIcon icon={faTimes} /></button>
                                            {:else if field !== 'createdAt'}
                                                <button on:click={() => startEdit(field)} class="ml-1 sm:ml-2 text-gray-500 hover:text-orange-400 transition-colors duration-200">
                                                    <FontAwesomeIcon icon={faPencilAlt} />
                                                </button>
                                            {/if}
                                        </div>
                                    </div>
                                {/if}
                            {/each}
                            
                            {#each Object.keys(userDetails).filter(field => !fieldOrder.includes(field) && !['profilePictureUrl', 'firstName', 'lastName', 'status', 'role'].includes(field)) as field}
                                <div class="grid grid-cols-1 sm:grid-cols-[1fr,2fr,auto] gap-x-2 sm:gap-x-4 gap-y-1 pb-2 border-b border-gray-700">
                                    <div class="font-bold capitalize text-sm sm:text-base text-custom-color-tertiary">{field.replace(/([A-Z])/g, ' $1')}:</div>
                                    <div class="text-left sm:text-right text-sm sm:text-base">
                                        {#if editField === field}
                                            <input type="text" bind:value={tempValue} class="w-full p-1 sm:p-2 rounded-md text-black text-sm" />
                                        {:else}
                                            {userDetails[field]}
                                        {/if}
                                    </div>
                                    <div class="flex items-center justify-end">
                                        {#if editField === field}
                                            <button on:click={() => saveEdit(field)} class="ml-1 sm:ml-2 text-green-500"><FontAwesomeIcon icon={faCheck} /></button>
                                            <button on:click={cancelEdit} class="ml-1 sm:ml-2 text-red-500"><FontAwesomeIcon icon={faTimes} /></button>
                                        {:else}
                                            <button on:click={() => startEdit(field)} class="ml-1 sm:ml-2 text-gray-500 hover:text-orange-400 transition-colors duration-200">
                                                <FontAwesomeIcon icon={faPencilAlt} />
                                            </button>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {:else if errorMessage}
                    <p class="text-red-500">{errorMessage}</p>
                {:else}
                    <p class="text-white">Loading...</p>
                {/if}
            </div>
        </div>
    </div>
</main>