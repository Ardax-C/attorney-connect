<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { db } from '$lib/firebase';
    import { doc, getDoc, collection, query, where, limit, getDocs, addDoc } from 'firebase/firestore';
    import { Link } from 'lucide-svelte';
    import { requireAuth } from '$lib/auth.js';
    import { sendNewChatEmail } from '$lib/emailService';
    import Navbar from './Navbar.svelte';
    import backgroundImage from '../images/dark_lattice.png';

    let attorney = null;
    let relatedAttorneys = [];
    let loading = true;
    let error = null;
    let user = null;

    $: attorneyId = $page.params.id;

    $: {
        if (attorneyId) {
            loadAttorneyProfile(attorneyId);
        }
    }

    onMount(async () => {
        try {
            user = await requireAuth();
            if (attorneyId) {
                await loadAttorneyProfile(attorneyId);
            }
        } catch (error) {
            console.error("Authentication error:", error);
            error = "Authentication failed. Please log in and try again.";
        }
    });

    async function loadAttorneyProfile(id) {
        loading = true;
        error = null;
        try {
            const attorneyDoc = await getDoc(doc(db, 'attorneyProfiles', id));
            if (attorneyDoc.exists()) {
                attorney = { id: attorneyDoc.id, ...attorneyDoc.data() };
                await loadRelatedAttorneys(attorney);
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

    async function loadRelatedAttorneys(currentAttorney) {
        try {
            const q = query(
                collection(db, 'attorneyProfiles'),
                where('state', '==', currentAttorney.state),
                where('practiceAreas', 'array-contains-any', currentAttorney.practiceAreas),
                limit(5)
            );

            const querySnapshot = await getDocs(q);
            relatedAttorneys = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(attorney => attorney.id !== currentAttorney.id);
        } catch (error) {
            console.error("Error fetching related attorneys:", error);
        }
    }

    function navigateToAttorney(attorneyId) {
        goto(`/attorney/${attorneyId}`);
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

    async function startChat() {
        if (!user || !attorney) {
            error = 'Unable to start chat. Please try again later.';
            return;
        }

        if (user.uid === attorney.id) {
            error = 'You cannot start a chat with yourself.';
            return;
        }

        try {
            const existingChatId = await checkExistingChat(user.uid, attorney.id);
            
            if (existingChatId) {
                goto(`/chat/${existingChatId}`);
                return;
            }

            const chatRef = await addDoc(collection(db, 'chats'), {
                participants: [user.uid, attorney.id],
                lastMessage: null,
                lastMessageTimestamp: new Date(),
            });

            const userDoc = await getDoc(doc(db, 'attorneyProfiles', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (attorney.email) {
                    await sendNewChatEmail(
                        attorney.email,
                        userData.firstName,
                        userData.lastName,
                        user.email
                    );
                }
            }

            goto(`/chat/${chatRef.id}`);
        } catch (err) {
            console.error("Error starting chat:", err);
            error = 'Error starting chat. Please try again later.';
        }
    }

    async function checkExistingChat(userId, attorneyId) {
        const chatsRef = collection(db, 'chats');
        const q = query(
            chatsRef,
            where('participants', 'array-contains', userId)
        );
        
        const querySnapshot = await getDocs(q);
        const existingChat = querySnapshot.docs.find(doc => 
            doc.data().participants.includes(attorneyId)
        );
        
        return existingChat ? existingChat.id : null;
    }
</script>

<main class="bg-no-repeat bg-center bg-cover min-h-screen" style="background-image: url({backgroundImage})">
    <Navbar />
    
    <div class="container mx-auto px-4 py-8 mt-16">
        {#if loading}
            <div class="flex justify-center items-center h-64">
                <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
            </div>
        {:else if error}
            <div class="bg-red-500/20 text-red-400 p-4 rounded-lg text-center">
                {error}
            </div>
        {:else if attorney}
            <!-- Main Profile Section -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Left Column - Profile Info -->
                <div class="lg:col-span-2">
                    <div class="bg-zinc-800 bg-opacity-90 rounded-xl shadow-2xl overflow-hidden">
                        <!-- Header Banner -->
                        <div class="relative h-48 bg-gradient-to-r from-cyan-600 to-cyan-800">
                            <div class="absolute -bottom-16 left-8 flex items-end space-x-6">
                                <img 
                                    src={attorney.profilePictureUrl || '/default-profile.png'} 
                                    alt="{attorney.firstName} {attorney.lastName}" 
                                    class="w-32 h-32 rounded-xl object-cover border-4 border-zinc-800 shadow-lg"
                                >
                                <div class="mb-4">
                                    <h1 class="text-3xl font-bold text-white mb-1">
                                        {attorney.firstName} {attorney.lastName}
                                    </h1>
                                    <p class="text-emerald-400 text-lg">
                                        {attorney.state}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Profile Content -->
                        <div class="pt-20 px-8 pb-8">
                            <!-- Practice Areas -->
                            <div class="mb-8">
                                <h2 class="text-xl font-semibold text-custom-color-tertiary mb-4">Practice Areas</h2>
                                <div class="flex flex-wrap gap-2">
                                    {#each attorney.practiceAreas as area}
                                        <span class="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-lg text-sm">
                                            {area}
                                        </span>
                                    {/each}
                                </div>
                            </div>

                            <!-- About Section -->
                            <div class="mb-8">
                                <h2 class="text-xl font-semibold text-custom-color-tertiary mb-4">About</h2>
                                <p class="text-emerald-400 leading-relaxed">
                                    {attorney.about || 'No information provided.'}
                                </p>
                            </div>

                            <!-- Contact Information -->
                            <div class="bg-zinc-700/50 rounded-xl p-6">
                                <h2 class="text-xl font-semibold text-custom-color-tertiary mb-4">Contact Information</h2>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {#if attorney.website}
                                        <a 
                                            href={attorney.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="flex items-center space-x-2 bg-zinc-600/50 p-3 rounded-lg hover:bg-zinc-600 transition-colors"
                                        >
                                            <Link size={20} class="text-emerald-400" />
                                            <span class="text-emerald-400 truncate">{attorney.website}</span>
                                        </a>
                                    {/if}
                                    
                                    {#if attorney && user && attorney.id !== user.uid}
                                        <button
                                            on:click={startChat}
                                            class="flex items-center justify-center space-x-2 bg-custom-color-tertiary text-blue-950 p-3 rounded-lg hover:bg-blue-900 hover:text-custom-color-tertiary transition-all transform active:scale-95"
                                        >
                                            <span class="font-semibold">Message Attorney</span>
                                        </button>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Column - Related Attorneys -->
                <div class="lg:col-span-1">
                    <div class="bg-zinc-800 bg-opacity-90 rounded-xl shadow-2xl p-6">
                        <h2 class="text-xl font-semibold text-custom-color-tertiary mb-6">Related Attorneys</h2>
                        
                        {#if relatedAttorneys.length > 0}
                            <div class="space-y-4">
                                {#each relatedAttorneys as relatedAttorney}
                                    <div 
                                        class="group bg-zinc-700/50 rounded-lg p-4 cursor-pointer hover:bg-zinc-700 transition-all duration-300 transform hover:-translate-y-1"
                                        on:click={() => navigateToAttorney(relatedAttorney.id)}
                                        on:keydown={(e) => e.key === 'Enter' && navigateToAttorney(relatedAttorney.id)}
                                        tabindex="0"
                                        role="button"
                                    >
                                        <div class="flex items-center space-x-4">
                                            <img 
                                                src={relatedAttorney.profilePictureUrl || '/default-profile.png'} 
                                                alt="{relatedAttorney.firstName} {relatedAttorney.lastName}" 
                                                class="w-16 h-16 rounded-lg object-cover"
                                            >
                                            <div>
                                                <h3 class="text-cyan-400 font-semibold group-hover:text-cyan-300 transition-colors">
                                                    {relatedAttorney.firstName} {relatedAttorney.lastName}
                                                </h3>
                                                <p class="text-emerald-400/70 text-sm">{relatedAttorney.state}</p>
                                                {#if relatedAttorney.practiceAreas?.[0]}
                                                    <p class="text-emerald-400/70 text-sm mt-1">
                                                        {relatedAttorney.practiceAreas[0]}
                                                    </p>
                                                {/if}
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <div class="text-center py-8 text-emerald-400/70">
                                <p>No related attorneys found</p>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        {/if}
    </div>
</main>

<style>
    :global(body) {
        overflow-y: auto;
    }
</style>