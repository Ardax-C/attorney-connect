<script>
    import { onMount, afterUpdate } from 'svelte';
    import { page } from '$app/stores';
    import { db } from '$lib/firebase';
    import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
    import { goto } from '$app/navigation';
    import {Link, Mail, Phone } from 'lucide-svelte';
    import Navbar from './Navbar.svelte';
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';

    let attorney = null;
    let relatedAttorneys = [];
    let loading = true;
    let error = null;

    $: attorneyId = $page.params.id;

    $: if (attorneyId) {
        loadAttorneyProfile(attorneyId);
    }

    async function fetchRelatedAttorneys(currentAttorney) {
        try {
            const q = query(
                collection(db, 'attorneyProfiles'),
                where('state', '==', currentAttorney.state),
                where('practiceAreas', 'array-contains-any', currentAttorney.practiceAreas),
                limit(5)
            );

            const querySnapshot = await getDocs(q);

            const relatedAttorneys = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(attorney => attorney.id !== currentAttorney.id);


            return relatedAttorneys;
        } catch (error) {
            console.error("Error fetching related attorneys:", error);
            throw error;
        }
    }

    async function loadAttorneyProfile(id) {
        loading = true;
        error = null;
        try {
            const attorneyDoc = await getDoc(doc(db, 'attorneyProfiles', id));
            if (attorneyDoc.exists()) {
                attorney = { id: attorneyDoc.id, ...attorneyDoc.data() };
                relatedAttorneys = await fetchRelatedAttorneys(attorney);
            } else {
                error = 'Attorney not found';
            }
        } catch (err) {
            console.error("Error loading attorney profile:", err);
            error = 'Error loading attorney profile';
        } finally {
            loading = false;
        }
    }

    function navigateToAttorney(attorneyId) {
        goto(`/attorney/${attorneyId}`, { replaceState: true });
    }

    function formatPhoneNumber(phoneNumber) {
        if (!phoneNumber) return 'Not provided';
        const cleaned = ('' + phoneNumber).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return `(${match[1]}) ${match[2]}-${match[3]}`;
        }
        return phoneNumber;
    }

    onMount(() => {
        if (attorneyId) {
            loadAttorneyProfile(attorneyId);
        }
    });

</script>

<Navbar />

<main class="bg-no-repeat bg-center bg-cover flex flex-col min-h-screen pt-16" style="background-image: url({backgroundImage})">
    <div class="flex-grow flex flex-col md:flex-row p-4 space-y-4 md:space-y-0 md:space-x-4 max-w-7xl mx-auto w-full">
        <!-- Current Attorney Profile -->
        <div class="w-full md:w-1/3 bg-zinc-800 bg-opacity-90 rounded-lg shadow-xl overflow-hidden p-4">
            {#if loading}
                <p class="text-emerald-400">Loading...</p>
            {:else if error}
                <p class="text-red-500">{error}</p>
            {:else if attorney}
                <div class="flex items-start mb-4">
                    <img src={attorney.profilePictureUrl || '/default-profile.png'} alt="{attorney.firstName} {attorney.lastName}" class="w-36 h-36 rounded-md object-cover mr-4">
                    <div>
                        <h2 class="text-xl font-bold text-cyan-400">{attorney.firstName} {attorney.lastName}</h2>
                        <p class="text-emerald-400 text-md">{attorney.state}</p>
                    </div>
                </div>
                
                <h3 class="text-2xl font-semibold text-cyan-400 mb-1">Practice Areas:</h3>
                <ul class="list-disc list-inside text-emerald-400 text-sm mb-2">
                    {#each attorney.practiceAreas as area}
                        <li>{area}</li>
                    {/each}
                </ul>
                
                <h3 class="text-2xl font-semibold text-cyan-400 mb-1">About:</h3>
                <p class="text-emerald-400 text-sm mb-2">{attorney.about || 'No information provided.'}</p>
                
                <h3 class="text-2xl font-semibold text-cyan-400 mb-1">Contact:</h3>
                <div class="text-emerald-400 text-sm space-y-2">
                    <div class="flex items-center">
                        <span>Website:</span>
                        <a href={attorney.website} target="_blank" rel="noopener noreferrer" class="ml-2 text-emerald-400 hover:underline">
                            {attorney.website}
                            <Link class="inline-block ml-1" size={16} />
                        </a>
                    </div>
                    <div class="flex items-center">
                        <span>Email:</span>
                        <a href={`mailto:${attorney.email}`} class="ml-2 text-emerald-400 hover:underline">
                            {attorney.email}
                            <Mail class="inline-block ml-1" size={16} />
                        </a>
                    </div>
                    <div class="flex items-center">
                        <span>Phone:</span>
                        <span class="ml-2">{formatPhoneNumber(attorney.phone)}</span>
                        <Phone class="inline-block ml-1" size={16} />
                    </div>
                </div>
            {/if}
        </div>

        <!-- Related Attorneys -->
        <div class="w-full md:w-2/3 bg-zinc-800 bg-opacity-90 rounded-lg shadow-xl overflow-hidden p-4">
            <h3 class="text-xl font-bold text-cyan-400 mb-4">Related Attorneys</h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {#if loading}
                    <p class="text-emerald-400 col-span-full">Loading related attorneys...</p>
                {:else if error}
                    <p class="text-red-500 col-span-full">{error}</p>
                {:else if relatedAttorneys.length > 0}
                    {#each relatedAttorneys as relatedAttorney}
                        <div 
                            class="bg-zinc-700 p-2 rounded-md cursor-pointer hover:bg-zinc-600 transition-colors duration-200"
                            on:click={() => navigateToAttorney(relatedAttorney.id)}
                            on:keydown={(e) => e.key === 'Enter' && navigateToAttorney(relatedAttorney.id)}
                            tabindex="0"
                            role="button"
                        >
                            <img src={relatedAttorney.profilePictureUrl || '/default-profile.png'} alt="{relatedAttorney.firstName} {relatedAttorney.lastName}" class="w-16 h-16 rounded-full object-cover mx-auto mb-2">
                            <h4 class="text-cyan-400 text-sm font-semibold text-center">{relatedAttorney.firstName} {relatedAttorney.lastName}</h4>
                            <p class="text-emerald-400 text-xs text-center">{relatedAttorney.state}</p>
                            {#if relatedAttorney.practiceAreas && relatedAttorney.practiceAreas.length > 0}
                                <p class="text-emerald-400 text-xs text-center mt-1">{relatedAttorney.practiceAreas[0]}</p>
                            {/if}
                        </div>
                    {/each}
                {:else}
                    <p class="text-emerald-400 col-span-full">No related attorneys found.</p>
                {/if}
            </div>
        </div>
    </div>
</main>

<style>
    :global(body) {
        overflow-y: auto;
    }
</style>