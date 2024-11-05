<script>
    import { onMount, onDestroy } from 'svelte';
    import Navbar from './Navbar.svelte';
    import { auth, db, storage } from '$lib/firebase';
    import { onAuthStateChanged } from 'firebase/auth';
    import { goto } from '$app/navigation'
    import { doc, getDoc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
    import backgroundImage from '../images/dark_lattice.png';
    import { faPencilAlt, faCheck, faTimes, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';
    import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
    import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

    let user = null;
    let userDetails = null;
    let errorMessage = '';
    let editField = null;
    let tempValue = '';
    let showNavbar = true;
    let lastScrollTop = 0;
    let profileCard;
    let acceptedRequests = [];
    let acceptedRequestsUnsubscribe = null;
    let showNotesModal = false;
    let selectedRequest = null;
    let currentNotes = '';
    let expandedNotes = null;
    let showArchived = false;
    let isUpdatingStatus = false;
    let showDetailsModal = false;
    let selectedDetails = null;
    let fileInput;
    let uploading = false;

    const fieldOrder = [
        'email',
        'phone',
        'city',
        'state',
        'practiceAreas',
        'website',
        'username',
        'createdAt'
    ];

    function formatDate(timestamp) {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function handleSearch(event) {
        const searchTerm = event.detail;
        goto(`/search?q=${encodeURIComponent(searchTerm)}`);
    }

    onMount(() => {
        profileCard = document.getElementById('profile-card');
        
        if (acceptedRequestsUnsubscribe) {
            acceptedRequestsUnsubscribe();
        }

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                user = currentUser;
                try {
                    const userDoc = await getDoc(doc(db, 'attorneyProfiles', user.uid));
                    if (userDoc.exists()) {
                        userDetails = userDoc.data();
                        
                        acceptedRequestsUnsubscribe = onSnapshot(
                            query(
                                collection(db, 'legalRequests'),
                                where('assignedTo', '==', user.uid),
                                where('status', 'in', ['accepted', 'completed']),
                                orderBy('timestamp', 'desc')
                            ),
                            (snapshot) => {
                                acceptedRequests = snapshot.docs.map(doc => ({
                                    id: doc.id,
                                    ...doc.data(),
                                    notes: doc.data().notes || '',
                                    timestamp: doc.data().timestamp?.toDate()
                                }));
                            }
                        );
                    } else {
                        errorMessage = 'User details not found.';
                    }
                } catch (error) {
                    errorMessage = error.message;
                }
            } else {
                errorMessage = 'No user is logged in.';
                if (acceptedRequestsUnsubscribe) {
                    acceptedRequestsUnsubscribe();
                    acceptedRequestsUnsubscribe = null;
                }
            }
        });

        return () => {
            if (acceptedRequestsUnsubscribe) {
                acceptedRequestsUnsubscribe();
            }
            unsubscribeAuth();
        };
    });

    onDestroy(() => {
        if (acceptedRequestsUnsubscribe) {
            acceptedRequestsUnsubscribe();
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
                await updatePracticeAreas(valueToSave);
            } else if (field === 'state') {
                await updateState(valueToSave);
            }
            await updateDoc(doc(db, 'attorneyProfiles', user.uid), { [field]: valueToSave });
            userDetails[field] = valueToSave;
            editField = null;
            tempValue = '';
        } catch (error) {
            errorMessage = error.message;
        }
    }

    async function updatePracticeAreas(areas) {
        for (const area of areas) {
            const areaDoc = doc(db, 'practiceAreas', area);
            const areaSnapshot = await getDoc(areaDoc);
            if (!areaSnapshot.exists()) {
                await setDoc(areaDoc, { practiceArea: area });
            }
        }
    }

    async function updateState(state) {
        const stateDoc = doc(db, 'states', state);
        const stateSnapshot = await getDoc(stateDoc);
        if (!stateSnapshot.exists()) {
            await setDoc(stateDoc, { state: state });
        }
    }

    function openNotesModal(request) {
        selectedRequest = request;
        currentNotes = request.notes || '';
        showNotesModal = true;
    }

    async function saveNotes() {
        try {
            const noteEntry = {
                content: currentNotes,
                timestamp: new Date(),
                author: {
                    id: user.uid,
                    name: `${userDetails.firstName} ${userDetails.lastName}`
                }
            };

            const requestRef = doc(db, 'legalRequests', selectedRequest.id);
            await updateDoc(requestRef, {
                notesHistory: arrayUnion(noteEntry)
            });
            
            showNotesModal = false;
            selectedRequest = null;
            currentNotes = '';
        } catch (error) {
            console.error('Error saving notes:', error);
            errorMessage = error.message;
        }
    }

    function toggleNotes(requestId) {
        expandedNotes = expandedNotes === requestId ? null : requestId;
    }

    async function updateRequestStatus(requestId, newStatus) {
        if (isUpdatingStatus) return;
        
        try {
            isUpdatingStatus = true;
            const requestRef = doc(db, 'legalRequests', requestId);
            
            if (newStatus === 'pending') {
                await updateDoc(requestRef, {
                    status: 'pending',
                    assignedTo: null
                });
            } else if (newStatus === 'completed') {
                await updateDoc(requestRef, {
                    status: newStatus,
                    completedAt: new Date(),
                    completedBy: {
                        id: user.uid,
                        name: `${userDetails.firstName} ${userDetails.lastName}`
                    }
                });
            }
        } catch (error) {
            console.error('Error updating request status:', error);
            errorMessage = error.message;
        } finally {
            isUpdatingStatus = false;
        }
    }

    function truncateText(text, length = 80) {
        if (!text) return '';
        return text.length > length ? text.slice(0, length) + '...' : text;
    }

    function openDetailsModal(request) {
        selectedDetails = request;
        showDetailsModal = true;
    }

    // Add type definitions using JSDoc
    /** @typedef {{
        firmName: string;
        role: string;
        startDate: string;
        endDate: string;
        description: string;
    }} LawFirmExperience */

    /** @typedef {{
        title: string;
        issuer: string;
        dateReceived: string;
        description: string;
    }} Credential */

    /** @typedef {{
        institution: string;
        degree: string;
        graduationYear: string;
        honors: string;
    }} Education */

    // Add new state variables
    let editingExperience = null;
    let editingCredential = null;
    let editingEducation = null;
    let tempExperience = {};
    let tempCredential = {};
    let tempEducation = {};

    // Add new functions for handling updates
    async function saveNewSection(section, data) {
        try {
            const sectionData = userDetails[section] || [];
            const updatedData = [...sectionData, data];
            
            await updateDoc(doc(db, 'attorneyProfiles', user.uid), {
                [section]: updatedData
            });
            
            userDetails = {
                ...userDetails,
                [section]: updatedData
            };
        } catch (error) {
            errorMessage = error.message;
        }
    }

    async function updateSection(section, index, data) {
        try {
            const sectionData = [...userDetails[section]];
            sectionData[index] = data;
            
            await updateDoc(doc(db, 'attorneyProfiles', user.uid), {
                [section]: sectionData
            });
            
            userDetails = {
                ...userDetails,
                [section]: sectionData
            };
        } catch (error) {
            errorMessage = error.message;
        }
    }

    let deletingIndices = new Set();

    async function deleteFromSection(section, index) {
        if (deletingIndices.has(`${section}-${index}`)) return;
        
        try {
            deletingIndices.add(`${section}-${index}`);
            const sectionData = userDetails[section].filter((_, i) => i !== index);
            
            await updateDoc(doc(db, 'attorneyProfiles', user.uid), {
                [section]: sectionData
            });
            
            userDetails = {
                ...userDetails,
                [section]: sectionData
            };
        } catch (error) {
            errorMessage = error.message;
        } finally {
            deletingIndices.delete(`${section}-${index}`);
        }
    }

    async function handleProfilePictureUpdate(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            uploading = true;
            const storageRef = ref(storage, `profilePictures/${user.uid}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            await updateDoc(doc(db, 'attorneyProfiles', user.uid), {
                profilePictureUrl: downloadURL
            });

            userDetails = {
                ...userDetails,
                profilePictureUrl: downloadURL
            };
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            errorMessage = error.message;
        } finally {
            uploading = false;
        }
    }
</script>

<main class="bg-zinc-950 bg-no-repeat bg-center bg-cover min-h-screen" style="background-image: url({backgroundImage})">
    <Navbar bind:visible={showNavbar} />
    
    <div class="container mx-auto px-4 py-8 mt-16">
        <!-- Profile Card -->
        <div class="bg-zinc-900/95 rounded-2xl shadow-2xl overflow-hidden border border-zinc-800/50">
            <!-- Header Section -->
            <div class="relative h-48 bg-gradient-to-r from-zinc-800 to-zinc-900 border-b border-zinc-800/50">
                <div class="absolute -bottom-16 left-8">
                    <div class="relative">
                        <img 
                            src={userDetails?.profilePictureUrl || '/images/default-avatar.png'} 
                            alt={userDetails?.firstName || 'Profile'} 
                            class="w-32 h-32 rounded-xl object-cover border-4 border-zinc-900 shadow-xl"
                            on:error={(e) => e.target.src = '/images/default-avatar.png'}
                        />
                        <input
                            type="file"
                            accept="image/*"
                            class="hidden"
                            bind:this={fileInput}
                            on:change={handleProfilePictureUpdate}
                        />
                        <button 
                            class="absolute bottom-2 right-2 bg-zinc-900 p-2 rounded-full hover:bg-zinc-800 transition-colors shadow-lg"
                            on:click={() => fileInput.click()}
                            disabled={uploading}
                        >
                            {#if uploading}
                                <div class="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                            {:else}
                                <Fa icon={faPencilAlt} class="text-cyan-400 text-sm" />
                            {/if}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Profile Information -->
            <div class="pt-20 px-8 pb-8">
                <h1 class="text-3xl font-bold text-white mb-1">
                    {userDetails?.firstName} {userDetails?.lastName}
                </h1>
                <p class="text-cyan-400 text-lg mb-8">
                    {userDetails?.practiceAreas?.join(' • ')}
                </p>

                <!-- Profile Details Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Contact Information -->
                    <div class="bg-zinc-800/30 p-6 rounded-xl border border-zinc-700/20 backdrop-blur-sm">
                        <h2 class="text-xl font-semibold text-white mb-4">Contact Information</h2>
                        <div class="space-y-4">
                            {#each ['email', 'phone', 'website'] as field}
                                {#if userDetails?.[field]}
                                    <div class="flex items-center justify-between group">
                                        <div>
                                            <p class="text-emerald-400/70 text-sm">{field.charAt(0).toUpperCase() + field.slice(1)}</p>
                                            <p class="text-white">
                                                {#if editField === field}
                                                    <input 
                                                        type="text" 
                                                        bind:value={tempValue}
                                                        class="bg-zinc-600 text-white px-2 py-1 rounded w-full"
                                                    />
                                                {:else}
                                                    {userDetails[field]}
                                                {/if}
                                            </p>
                                        </div>
                                        <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                                            {#if editField === field}
                                                <button on:click={() => saveEdit(field)} class="text-green-500 mx-1">
                                                    <Fa icon={faCheck} />
                                                </button>
                                                <button on:click={cancelEdit} class="text-red-500 mx-1">
                                                    <Fa icon={faTimes} />
                                                </button>
                                            {:else}
                                                <button on:click={() => startEdit(field)} class="text-gray-400 hover:text-emerald-400">
                                                    <Fa icon={faPencilAlt} />
                                                </button>
                                            {/if}
                                        </div>
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    </div>

                    <!-- Location Information -->
                    <div class="bg-zinc-800/30 p-6 rounded-xl border border-zinc-700/20 backdrop-blur-sm">
                        <h2 class="text-xl font-semibold text-white mb-4">Location</h2>
                        <div class="space-y-4">
                            {#each ['city', 'state'] as field}
                                <div class="flex items-center justify-between group">
                                    <div>
                                        <p class="text-emerald-400/70 text-sm">{field.charAt(0).toUpperCase() + field.slice(1)}</p>
                                        <p class="text-white">
                                            {#if editField === field}
                                                <input 
                                                    type="text" 
                                                    bind:value={tempValue}
                                                    class="bg-zinc-600 text-white px-2 py-1 rounded w-full"
                                                />
                                            {:else}
                                                {userDetails?.[field]}
                                            {/if}
                                        </p>
                                    </div>
                                    <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                                        {#if editField === field}
                                            <button on:click={() => saveEdit(field)} class="text-green-500 mx-1">
                                                <Fa icon={faCheck} />
                                            </button>
                                            <button on:click={cancelEdit} class="text-red-500 mx-1">
                                                <Fa icon={faTimes} />
                                            </button>
                                        {:else}
                                            <button on:click={() => startEdit(field)} class="text-gray-400 hover:text-emerald-400">
                                                <Fa icon={faPencilAlt} />
                                            </button>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-zinc-800/30 p-6 rounded-xl border border-zinc-700/20 backdrop-blur-sm mx-8 mb-8">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-white">Practice Areas</h2>
                    {#if editField !== 'practiceAreas'}
                        <button 
                            on:click={() => startEdit('practiceAreas')} 
                            class="text-gray-400 hover:text-emerald-400 transition-colors"
                        >
                            <Fa icon={faPencilAlt} />
                        </button>
                    {/if}
                </div>
                
                {#if editField === 'practiceAreas'}
                    <div class="space-y-3">
                        <textarea
                            bind:value={tempValue}
                            placeholder="Enter practice areas separated by commas"
                            class="w-full bg-zinc-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none h-24"
                        ></textarea>
                        <div class="flex justify-end space-x-2">
                            <button 
                                on:click={() => saveEdit('practiceAreas')} 
                                class="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors"
                            >
                                <Fa icon={faCheck} class="mr-2" />
                                Save
                            </button>
                            <button 
                                on:click={cancelEdit} 
                                class="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                                <Fa icon={faTimes} class="mr-2" />
                                Cancel
                            </button>
                        </div>
                        <p class="text-emerald-400/70 text-sm">
                            Separate practice areas with commas (e.g., "Criminal Law, Family Law, Estate Planning")
                        </p>
                    </div>
                {:else}
                    <div class="flex flex-wrap gap-2">
                        {#each userDetails?.practiceAreas || [] as area}
                            <span class="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-lg text-sm border border-cyan-500/20">
                                {area}
                            </span>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Biography Section -->
            <div class="bg-zinc-800/30 p-6 rounded-xl border border-zinc-700/20 backdrop-blur-sm mx-8 mb-8">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-white">Biography</h2>
                    {#if editField !== 'biography'}
                        <button 
                            on:click={() => startEdit('biography')} 
                            class="text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                            <Fa icon={faPencilAlt} />
                        </button>
                    {/if}
                </div>
                
                {#if editField === 'biography'}
                    <div class="space-y-3">
                        <textarea
                            bind:value={tempValue}
                            placeholder="Enter your professional biography..."
                            class="w-full bg-zinc-600/30 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none h-32"
                        ></textarea>
                        <div class="flex justify-end space-x-2">
                            <button 
                                on:click={() => saveEdit('biography')} 
                                class="bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-500/30 transition-colors"
                            >
                                <Fa icon={faCheck} class="mr-2" />
                                Save
                            </button>
                            <button 
                                on:click={cancelEdit} 
                                class="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                                <Fa icon={faTimes} class="mr-2" />
                                Cancel
                            </button>
                        </div>
                    </div>
                {:else}
                    <p class="text-gray-300 whitespace-pre-wrap">
                        {userDetails?.biography || 'No biography added yet.'}
                    </p>
                {/if}
            </div>

            <!-- Law Firm Experience Section -->
            <div class="bg-zinc-800/30 p-6 rounded-xl border border-zinc-700/20 backdrop-blur-sm mx-8 mb-8">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-white">Prior Law Firm Experience</h2>
                    <button 
                        on:click={() => {
                            editingExperience = -1;
                            tempExperience = {};
                        }} 
                        class="text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                        Add Experience
                    </button>
                </div>

                {#if editingExperience !== null}
                    <div class="space-y-4 bg-zinc-700/30 p-4 rounded-lg mb-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                bind:value={tempExperience.firmName}
                                placeholder="Firm Name"
                                class="w-full"
                            />
                            <input
                                bind:value={tempExperience.role}
                                placeholder="Role"
                                class="w-full"
                            />
                            <input
                                bind:value={tempExperience.startDate}
                                placeholder="Start Date"
                                type="date"
                                class="w-full"
                            />
                            <input
                                bind:value={tempExperience.endDate}
                                placeholder="End Date"
                                type="date"
                                class="w-full"
                            />
                        </div>
                        <textarea
                            bind:value={tempExperience.description}
                            placeholder="Description of responsibilities and achievements..."
                            class="w-full h-24"
                        ></textarea>
                        <div class="flex justify-end space-x-2">
                            <button 
                                on:click={() => {
                                    if (editingExperience === -1) {
                                        saveNewSection('lawFirmExperience', tempExperience);
                                    } else {
                                        updateSection('lawFirmExperience', editingExperience, tempExperience);
                                    }
                                    editingExperience = null;
                                    tempExperience = {};
                                }}
                                class="bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-500/30 transition-colors"
                            >
                                <Fa icon={faCheck} class="mr-2" />
                                Save
                            </button>
                            <button 
                                on:click={() => {
                                    editingExperience = null;
                                    tempExperience = {};
                                }}
                                class="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                                <Fa icon={faTimes} class="mr-2" />
                                Cancel
                            </button>
                        </div>
                    </div>
                {/if}

                <!-- Add this section to display existing experiences -->
                <div class="space-y-4">
                    {#each userDetails?.lawFirmExperience || [] as experience, index}
                        <div class="bg-zinc-700/30 p-4 rounded-lg group">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h3 class="text-lg font-medium text-white">{experience.firmName}</h3>
                                    <p class="text-cyan-400">{experience.role}</p>
                                    <p class="text-gray-400 text-sm">
                                        {experience.startDate} - {experience.endDate || 'Present'}
                                    </p>
                                    {#if experience.description}
                                        <p class="text-gray-300 mt-2">{experience.description}</p>
                                    {/if}
                                </div>
                                <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        on:click={() => {
                                            editingExperience = index;
                                            tempExperience = {...experience};
                                        }}
                                        class="text-gray-400 hover:text-cyan-400 mx-1"
                                    >
                                        <Fa icon={faPencilAlt} />
                                    </button>
                                    <button 
                                        on:click={() => deleteFromSection('lawFirmExperience', index)}
                                        class="text-gray-400 hover:text-red-400 mx-1"
                                        disabled={deletingIndices.has(`lawFirmExperience-${index}`)}
                                    >
                                        {#if deletingIndices.has(`lawFirmExperience-${index}`)}
                                            <div class="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                        {:else}
                                            <Fa icon={faTimes} />
                                        {/if}
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Credentials Section -->
            <div class="bg-zinc-800/30 p-6 rounded-xl border border-zinc-700/20 backdrop-blur-sm mx-8 mb-8">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-white">Professional Credentials</h2>
                    <button 
                        on:click={() => {
                            editingCredential = -1;
                            tempCredential = {};
                        }} 
                        class="text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                        Add Credential
                    </button>
                </div>

                {#if editingCredential !== null}
                    <div class="space-y-4 bg-zinc-700/30 p-4 rounded-lg mb-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                bind:value={tempCredential.title}
                                placeholder="Credential Title"
                                class="w-full"
                            />
                            <input
                                bind:value={tempCredential.issuer}
                                placeholder="Issuing Organization"
                                class="w-full"
                            />
                            <input
                                bind:value={tempCredential.dateReceived}
                                placeholder="Date Received"
                                type="date"
                                class="w-full"
                            />
                        </div>
                        <textarea
                            bind:value={tempCredential.description}
                            placeholder="Description of the credential..."
                            class="w-full h-24"
                        ></textarea>
                        <div class="flex justify-end space-x-2">
                            <button 
                                on:click={() => {
                                    if (editingCredential === -1) {
                                        saveNewSection('credentials', tempCredential);
                                    } else {
                                        updateSection('credentials', editingCredential, tempCredential);
                                    }
                                    editingCredential = null;
                                    tempCredential = {};
                                }}
                                class="bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-500/30 transition-colors"
                            >
                                <Fa icon={faCheck} class="mr-2" />
                                Save
                            </button>
                            <button 
                                on:click={() => {
                                    editingCredential = null;
                                    tempCredential = {};
                                }}
                                class="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                                <Fa icon={faTimes} class="mr-2" />
                                Cancel
                            </button>
                        </div>
                    </div>
                {/if}

                <div class="space-y-4">
                    {#each userDetails?.credentials || [] as credential, index}
                        <div class="bg-zinc-700/30 p-4 rounded-lg group">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h3 class="text-lg font-medium text-white">{credential.title}</h3>
                                    <p class="text-cyan-400">{credential.issuer}</p>
                                    <p class="text-gray-400 text-sm">Received: {new Date(credential.dateReceived).toLocaleDateString()}</p>
                                    <p class="text-gray-300 mt-2">{credential.description}</p>
                                </div>
                                <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        on:click={() => {
                                            editingCredential = index;
                                            tempCredential = {...credential};
                                        }}
                                        class="text-gray-400 hover:text-cyan-400 mx-1"
                                    >
                                        <Fa icon={faPencilAlt} />
                                    </button>
                                    <button 
                                        on:click={() => deleteFromSection('credentials', index)}
                                        class="text-gray-400 hover:text-red-400 mx-1"
                                        disabled={deletingIndices.has(`credentials-${index}`)}
                                    >
                                        {#if deletingIndices.has(`credentials-${index}`)}
                                            <div class="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                        {:else}
                                            <Fa icon={faTimes} />
                                        {/if}
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Education Section -->
            <div class="bg-zinc-800/30 p-6 rounded-xl border border-zinc-700/20 backdrop-blur-sm mx-8 mb-8">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-white">Education</h2>
                    <button 
                        on:click={() => {
                            editingEducation = -1;
                            tempEducation = {};
                        }} 
                        class="text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                        Add Education
                    </button>
                </div>

                {#if editingEducation !== null}
                    <div class="space-y-4 bg-zinc-700/30 p-4 rounded-lg mb-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                bind:value={tempEducation.institution}
                                placeholder="Institution Name"
                                class="w-full"
                            />
                            <input
                                bind:value={tempEducation.degree}
                                placeholder="Degree"
                                class="w-full"
                            />
                            <input
                                bind:value={tempEducation.graduationYear}
                                placeholder="Graduation Year"
                                type="number"
                                min="1900"
                                max={new Date().getFullYear()}
                                class="w-full"
                            />
                            <input
                                bind:value={tempEducation.honors}
                                placeholder="Honors/Distinctions"
                                class="w-full"
                            />
                        </div>
                        <div class="flex justify-end space-x-2">
                            <button 
                                on:click={() => {
                                    if (editingEducation === -1) {
                                        saveNewSection('education', tempEducation);
                                    } else {
                                        updateSection('education', editingEducation, tempEducation);
                                    }
                                    editingEducation = null;
                                    tempEducation = {};
                                }}
                                class="bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-500/30 transition-colors"
                            >
                                <Fa icon={faCheck} class="mr-2" />
                                Save
                            </button>
                            <button 
                                on:click={() => {
                                    editingEducation = null;
                                    tempEducation = {};
                                }}
                                class="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                                <Fa icon={faTimes} class="mr-2" />
                                Cancel
                            </button>
                        </div>
                    </div>
                {/if}

                <div class="space-y-4">
                    {#each userDetails?.education || [] as education, index}
                        <div class="bg-zinc-700/30 p-4 rounded-lg group">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h3 class="text-lg font-medium text-white">{education.institution}</h3>
                                    <p class="text-cyan-400">{education.degree}</p>
                                    <p class="text-gray-400">Class of {education.graduationYear}</p>
                                    {#if education.honors}
                                        <p class="text-gray-300 mt-2 italic">{education.honors}</p>
                                    {/if}
                                </div>
                                <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        on:click={() => {
                                            editingEducation = index;
                                            tempEducation = {...education};
                                        }}
                                        class="text-gray-400 hover:text-cyan-400 mx-1"
                                    >
                                        <Fa icon={faPencilAlt} />
                                    </button>
                                    <button 
                                        on:click={() => deleteFromSection('education', index)}
                                        class="text-gray-400 hover:text-red-400 mx-1"
                                        disabled={deletingIndices.has(`education-${index}`)}
                                    >
                                        {#if deletingIndices.has(`education-${index}`)}
                                            <div class="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                        {:else}
                                            <Fa icon={faTimes} />
                                        {/if}
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>

        <!-- Legal Requests Section -->
        <div class="mt-8 bg-zinc-900/95 rounded-2xl shadow-2xl p-8 border border-zinc-800/50">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-custom-color-tertiary">Legal Requests</h2>
                <button
                    on:click={() => showArchived = !showArchived}
                    class="text-emerald-400 hover:text-emerald-300 transition-colors text-sm"
                >
                    {showArchived ? 'Hide Completed' : 'Show Completed'}
                </button>
            </div>
            
            {#if acceptedRequests.filter(r => r.status === (showArchived ? 'completed' : 'accepted')).length === 0}
                <div class="text-center py-8">
                    <p class="text-emerald-400 text-lg">No {showArchived ? 'completed' : 'active'} requests</p>
                    <p class="text-emerald-400/70 mt-2">
                        {showArchived ? 'Completed requests will appear here' : 'Accepted requests will appear here'}
                    </p>
                </div>
            {:else}
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {#each acceptedRequests.filter(r => r.status === (showArchived ? 'completed' : 'accepted')) as request}
                        <div class="bg-zinc-800/30 rounded-xl border border-zinc-700/20 backdrop-blur-sm hover:bg-zinc-800/40 transition-all duration-300">
                            <!-- Card Content -->
                            <div class="p-4 sm:p-6 flex-1">
                                <div class="flex flex-col sm:flex-row gap-4 sm:gap-6">
                                    <!-- Left side: Request information -->
                                    <div class="flex-1">
                                        <h3 class="text-xl font-semibold text-custom-color-tertiary">
                                            {request.firstName} {request.lastName}
                                        </h3>
                                        <p class="text-white/70 mt-1">{request.email}</p>
                                        <p class="text-white/70">{request.phone}</p>
                                        <div class="mt-4">
                                            <h4 class="text-emerald-400/70 font-medium">Legal Issue</h4>
                                            <p class="text-white mt-1">
                                                {truncateText(request.legalIssue)}
                                                {#if request.legalIssue?.length > 80}
                                                    <button 
                                                        on:click|stopPropagation={() => openDetailsModal(request)}
                                                        class="text-emerald-400 hover:text-emerald-300 transition-colors text-sm ml-1"
                                                    >
                                                        Read More
                                                    </button>
                                                {/if}
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Right side: Notes preview -->
                                    {#if request.notesHistory && request.notesHistory.length > 0}
                                        <div class="flex-1 sm:border-l border-t sm:border-t-0 border-zinc-600 pt-4 sm:pt-0 sm:pl-6">
                                            <div class="flex justify-between items-start">
                                                <h4 class="text-emerald-400/70 font-medium">Latest Note</h4>
                                                <button 
                                                    on:click|stopPropagation={() => toggleNotes(request.id)}
                                                    class="text-zinc-400 hover:text-white transition-colors"
                                                >
                                                    View All Notes
                                                </button>
                                            </div>
                                            <div class="mt-2">
                                                <p class="text-white line-clamp-3">
                                                    {request.notesHistory[request.notesHistory.length - 1].content}
                                                </p>
                                                <p class="text-sm text-zinc-400 mt-1">
                                                    {formatDate(request.notesHistory[request.notesHistory.length - 1].timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            </div>

                            <!-- Action Buttons - Fixed to bottom -->
                            <div class="p-4 sm:p-6 pt-0 mt-auto">
                                <div class="flex flex-wrap gap-2">
                                    <button 
                                        on:click={() => openNotesModal(request)}
                                        class="flex-1 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg hover:bg-emerald-500/30 transition-colors"
                                    >
                                        {request.notes ? 'Edit Notes' : 'Add Notes'}
                                    </button>
                                    
                                    {#if !showArchived}
                                        <div class="flex-1 flex gap-2">
                                            <button 
                                                on:click={() => updateRequestStatus(request.id, 'completed')}
                                                class="flex-1 bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-500/30 transition-colors"
                                                disabled={isUpdatingStatus}
                                            >
                                                Mark Complete
                                            </button>
                                            <button 
                                                on:click={() => updateRequestStatus(request.id, 'pending')}
                                                class="flex-1 bg-zinc-500/20 text-zinc-400 px-4 py-2 rounded-lg hover:bg-zinc-500/30 transition-colors"
                                                disabled={isUpdatingStatus}
                                            >
                                                Return to Board
                                            </button>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    {#if showNotesModal}
        <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-zinc-900 rounded-xl p-6 w-full max-w-2xl mx-auto border border-zinc-800/50">
                <h2 class="text-xl sm:text-2xl font-bold text-custom-color-tertiary mb-4">
                    Add Note for {selectedRequest.firstName} {selectedRequest.lastName}
                </h2>
                
                <textarea
                    bind:value={currentNotes}
                    class="w-full bg-zinc-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none h-48 mb-4"
                    placeholder="Enter your notes here..."
                ></textarea>
                
                <div class="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                    <button 
                        on:click={() => showNotesModal = false}
                        class="w-full sm:w-auto bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors order-2 sm:order-1"
                    >
                        Cancel
                    </button>
                    <button 
                        on:click={saveNotes}
                        class="w-full sm:w-auto bg-green-500/20 text-green-400 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors order-1 sm:order-2"
                    >
                        Save Note
                    </button>
                </div>
            </div>
        </div>
    {/if}

    {#if expandedNotes}
        <div 
            class="fixed top-0 right-0 h-full w-full sm:w-[28rem] bg-zinc-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-40"
            class:translate-x-0={expandedNotes}
            class:translate-x-full={!expandedNotes}
        >
            <div class="p-4 sm:p-6 h-full overflow-y-auto">
                <!-- Request Info -->
                {#if expandedNotes && acceptedRequests.find(r => r.id === expandedNotes)}
                    {@const request = acceptedRequests.find(r => r.id === expandedNotes)}
                    <div class="mb-6">
                        <p class="text-emerald-400/70 text-sm">Client</p>
                        <p class="text-white font-medium">{request.firstName} {request.lastName}</p>
                        <p class="text-white/70 text-sm mt-2">{request.email}</p>
                        <p class="text-white/70 text-sm">{request.phone}</p>
                    </div>

                    <!-- Notes Content -->
                    <div class="mt-6">
                        {#if request.completedAt}
                            <div class="mb-6 p-3 bg-emerald-500/10 rounded-lg">
                                <p class="text-emerald-400 font-medium">Case Completed</p>
                                <p class="text-emerald-400/70 text-sm">
                                    By {request.completedBy.name} on {formatDate(request.completedAt)}
                                </p>
                            </div>
                        {/if}
                        
                        {#if request.notesHistory && request.notesHistory.length > 0}
                            <div class="space-y-4">
                                {#each request.notesHistory as note}
                                    <div class="bg-zinc-700/50 p-4 rounded-lg">
                                        <p class="text-white whitespace-pre-wrap">{note.content}</p>
                                        <div class="mt-2 flex justify-between items-center text-sm">
                                            <span class="text-emerald-400/70">
                                                By {note.author.name}
                                            </span>
                                            <span class="text-zinc-400">
                                                {formatDate(note.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <p class="text-zinc-400 text-center py-4">No notes yet</p>
                        {/if}
                    </div>

                    <!-- Buttons -->
                    <div class="mt-6 space-y-3">
                        <button 
                            on:click={() => openNotesModal(request)}
                            class="w-full bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg hover:bg-emerald-500/30 transition-colors"
                        >
                            Edit Notes
                        </button>
                        <button 
                            on:click={() => toggleNotes(null)}
                            class="w-full bg-zinc-600/20 text-zinc-400 px-4 py-2 rounded-lg hover:bg-zinc-600/30 transition-colors"
                        >
                            Close Notes
                        </button>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Overlay (only visible on larger screens) -->
        <div 
            class="fixed inset-0 bg-black bg-opacity-50 z-30 hidden sm:block"
            on:click={() => toggleNotes(null)}
        ></div>
    {/if}

    {#if showDetailsModal}
        <div 
            role="dialog"
            aria-modal="true"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            on:click={() => showDetailsModal = false}
            on:keydown={e => e.key === 'Escape' && (showDetailsModal = false)}
            tabindex="-1"
        >
            <div 
                role="document"
                class="bg-zinc-800 rounded-xl p-4 sm:p-6 w-full max-w-2xl mx-auto"
                on:click|stopPropagation={() => {}}
            >
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h2 class="text-xl sm:text-2xl font-bold text-custom-color-tertiary">
                            {selectedDetails.firstName} {selectedDetails.lastName}
                        </h2>
                        <p class="text-emerald-400/70 mt-1">{selectedDetails.email}</p>
                        <p class="text-emerald-400/70">{selectedDetails.phone}</p>
                    </div>
                    <button 
                        on:click={() => showDetailsModal = false}
                        class="text-zinc-400 hover:text-white transition-colors p-2"
                    >
                        <Fa icon={faTimes} />
                    </button>
                </div>

                <div class="bg-zinc-700/50 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-emerald-400 mb-2">Legal Issue</h3>
                    <p class="text-white whitespace-pre-wrap">{selectedDetails.legalIssue}</p>
                </div>

                {#if selectedDetails.additionalDetails}
                    <div class="mt-4 bg-zinc-700/50 rounded-lg p-4">
                        <h3 class="text-lg font-semibold text-emerald-400 mb-2">Additional Details</h3>
                        <p class="text-white whitespace-pre-wrap">{selectedDetails.additionalDetails}</p>
                    </div>
                {/if}

                <div class="mt-6 flex justify-end">
                    <button 
                        on:click={() => showDetailsModal = false}
                        class="bg-zinc-600/20 text-zinc-400 px-4 py-2 rounded-lg hover:bg-zinc-600/30 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    {/if}
</main>

<style lang="postcss">
    .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    /* Add smooth transitions for the sidebar */
    .transform {
        transform: translateX(0);
        transition: transform 0.3s ease-in-out;
    }

    /* Add overflow control to prevent freezing */
    :global(body) {
        overflow-y: auto !important;
    }

    main {
        position: relative;
        min-height: 100vh;
        overflow-x: hidden;
    }

    /* Ensure modals don't break scrolling */
    :global(body.modal-open) {
        overflow: hidden;
    }

    :global(input), :global(textarea) {
        background-color: rgba(39, 39, 42, 0.3);
        border: 1px solid rgba(63, 63, 70, 0.5);
        border-radius: 0.5rem;
        padding: 0.5rem 1rem;
        transition: all 200ms;
        color: #67cfcf;
    }

    :global(input:focus), :global(textarea:focus) {
        --tw-ring-opacity: 0.5;
        --tw-ring-color: rgba(6, 182, 212, var(--tw-ring-opacity));
        --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
        --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
        box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
        border-color: rgba(6, 182, 212, 0.5);
    }

    :global(button) {
        @apply transition-all duration-200;
    }

    :global(.hover-effect) {
        transform: scale(1);
        transition: all 300ms;
    }
    :global(.hover-effect:hover) {
        transform: scale(1.02);
    }

    .glass-effect {
        @apply backdrop-blur-sm bg-opacity-30;
    }
</style>