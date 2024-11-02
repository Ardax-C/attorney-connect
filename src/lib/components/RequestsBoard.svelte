<script>
    import { onMount } from 'svelte';
    import { db } from '$lib/firebase';
    import { collection, query, where, getDocs, orderBy, doc, updateDoc, arrayUnion } from 'firebase/firestore';
    import { formatDate } from '$lib/utils';
    import { ChevronDown, ChevronRight } from 'lucide-svelte';
    import backgroundImage from '$lib/images/dark_lattice.png';
    import RequestModal from './RequestModal.svelte';
    import { getAuth } from 'firebase/auth';

    let loading = true;
    let error = null;
    let requests = [];
    let groupedRequests = {};
    // Track expanded state of each practice area
    let expandedSections = {};
    let selectedRequest = null;
    let showModal = false;

    onMount(async () => {
        await fetchRequests();
    });

    async function fetchRequests() {
        try {
            const q = query(
                collection(db, 'legalRequests'),
                where('status', '==', 'pending'),
                where('assignedTo', '==', null),
                orderBy('timestamp', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            requests = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate()
            }));

            groupedRequests = groupRequestsByPracticeArea(requests);
            // Initialize all sections as collapsed
            expandedSections = Object.keys(groupedRequests).reduce((acc, area) => {
                acc[area] = false;
                return acc;
            }, {});
        } catch (err) {
            error = 'Error loading requests: ' + err.message;
            console.error('Error:', err);
        } finally {
            loading = false;
        }
    }

    function toggleSection(practiceArea) {
        expandedSections[practiceArea] = !expandedSections[practiceArea];
        expandedSections = expandedSections; // Trigger reactivity
    }

    function groupRequestsByPracticeArea(requests) {
        const grouped = {};
        
        requests.forEach(request => {
            const areas = request.suggestedPracticeAreas || ['Uncategorized'];
            
            // Add request to each of its practice areas
            areas.forEach(area => {
                if (!grouped[area]) {
                    grouped[area] = [];
                }
                grouped[area].push(request);
            });
        });

        // Sort practice areas by number of requests (descending)
        return Object.fromEntries(
            Object.entries(grouped)
                .sort(([,a], [,b]) => b.length - a.length)
        );
    }

    function openRequestModal(request) {
        selectedRequest = request;
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        selectedRequest = null;
    }

    async function handleAcceptRequest(event) {
        const request = event.detail;
        const auth = getAuth();
        const attorneyId = auth.currentUser.uid;

        try {
            // Update the request status
            await updateDoc(doc(db, 'legalRequests', request.id), {
                status: 'accepted',
                assignedTo: attorneyId,
                acceptedAt: new Date()
            });

            // Add the request to attorney's accepted cases
            await updateDoc(doc(db, 'attorneyProfiles', attorneyId), {
                acceptedRequests: arrayUnion(request.id)
            });

            // Remove the request from the local state
            requests = requests.filter(r => r.id !== request.id);
            groupedRequests = groupRequestsByPracticeArea(requests);
            
            // Close the modal
            closeModal();
            
            // Show success message (you might want to add a toast notification here)
            alert('Request accepted successfully!');
        } catch (error) {
            console.error('Error accepting request:', error);
            alert('Failed to accept request. Please try again.');
        }
    }
</script>

<!-- Add the modal component -->
<RequestModal 
    request={selectedRequest}
    show={showModal}
    on:close={closeModal}
    on:accept={handleAcceptRequest}
/>

<div class="min-h-screen bg-no-repeat bg-center bg-cover flex flex-col" style="background-image: url({backgroundImage})">
    <div class="flex-grow p-8">
        <div class="max-w-7xl mx-auto">
            <h2 class="text-2xl font-bold mb-6 text-custom-color-tertiary">Legal Assistance Requests</h2>

            {#if loading}
                <p class="text-emerald-400">Loading requests...</p>
            {:else if error}
                <p class="text-red-500">{error}</p>
            {:else if Object.keys(groupedRequests).length === 0}
                <p class="text-emerald-400">No pending requests available.</p>
            {:else}
                <div class="space-y-4">
                    {#each Object.entries(groupedRequests) as [practiceArea, areaRequests]}
                        <div class="bg-zinc-900/90 rounded-lg overflow-hidden">
                            <!-- Section Header -->
                            <button 
                                class="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
                                on:click={() => toggleSection(practiceArea)}
                            >
                                <div class="flex items-center space-x-2">
                                    {#if expandedSections[practiceArea]}
                                        <ChevronDown class="w-5 h-5 text-cyan-400" />
                                    {:else}
                                        <ChevronRight class="w-5 h-5 text-cyan-400" />
                                    {/if}
                                    <h3 class="text-xl font-semibold text-cyan-400">
                                        {practiceArea}
                                    </h3>
                                </div>
                                <span class="text-sm text-emerald-400">
                                    {areaRequests.length} {areaRequests.length === 1 ? 'request' : 'requests'}
                                </span>
                            </button>

                            <!-- Section Content -->
                            {#if expandedSections[practiceArea]}
                                <div class="p-4 pt-0">
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {#each areaRequests as request}
                                            <button 
                                                type="button"
                                                class="w-full text-left bg-zinc-700 p-4 rounded-lg hover:bg-zinc-600 transition-colors my-2.5" 
                                                on:click={() => openRequestModal(request)}
                                            >
                                                <h4 class="text-lg font-semibold text-cyan-400 mb-2">
                                                    {request.firstName} {request.lastName}
                                                </h4>
                                                <p class="text-emerald-400 text-sm mb-2">
                                                    Submitted: {formatDate(request.timestamp)}
                                                </p>
                                                <p class="text-emerald-400 text-sm mb-4 line-clamp-3">
                                                    {request.legalIssue}
                                                </p>
                                                <div class="flex flex-wrap gap-2">
                                                    {#each request.suggestedPracticeAreas || [] as area}
                                                        <span class="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded text-xs">
                                                            {area}
                                                        </span>
                                                    {/each}
                                                </div>
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    /* Optional: Add smooth transition for collapse/expand */
    .overflow-hidden {
        transition: max-height 0.3s ease-in-out;
    }
</style>
