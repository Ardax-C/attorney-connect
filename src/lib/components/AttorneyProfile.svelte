<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { db } from '$lib/firebase';
    import { doc, getDoc, collection, query, where, limit as limitQuery, getDocs, addDoc } from 'firebase/firestore';
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
            error = 'Error loading attorney profile';
        } finally {
            loading = false;
        }
    }

    async function loadRelatedAttorneys(currentAttorney) {
        try {
            if (!currentAttorney.state || !currentAttorney.practiceAreas) {
                relatedAttorneys = [];
                return;
            }

            // Query Firestore directly from the client
            const attorneysRef = collection(db, 'attorneyProfiles');
            const q = query(
                attorneysRef,
                where('state', '==', currentAttorney.state),
                limitQuery(20)
            );

            const snapshot = await getDocs(q);
            
            // Process results in memory
            relatedAttorneys = snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        state: data.state,
                        practiceAreas: data.practiceAreas || [],
                        profilePictureUrl: data.profilePictureUrl,
                        matchScore: (data.practiceAreas || [])
                            .filter(area => currentAttorney.practiceAreas.includes(area))
                            .length
                    };
                })
                .filter(attorney => 
                    attorney.id !== currentAttorney.id && 
                    attorney.matchScore > 0
                )
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, 5);


        } catch (error) {
            console.error("Error fetching related attorneys:", error);
            relatedAttorneys = [];
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
                                
                                <!-- Website and Message Button -->
                                <div class="mt-6 flex items-center gap-4">
                                    {#if attorney.website}
                                        <a 
                                            href={attorney.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="flex items-center space-x-2 bg-zinc-700/80 p-3 rounded-lg hover:bg-zinc-600 transition-colors"
                                        >
                                            <Link size={20} class="text-emerald-400" />
                                            <span class="text-emerald-400 truncate">Visit Website</span>
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

                            <!-- Biography Section -->
                            <div class="mb-8">
                                <h2 class="text-xl font-semibold text-custom-color-tertiary mb-4">Biography</h2>
                                <p class="text-emerald-400/70 italic leading-relaxed">
                                    {attorney.biography || 'Attorney has not added a biography yet.'}
                                </p>
                            </div>

                            <!-- Law Firm Experience Section -->
                            {#if attorney.lawFirmExperience && attorney.lawFirmExperience.length > 0}
                                <div class="mb-8">
                                    <h2 class="text-xl font-semibold text-custom-color-tertiary mb-4">Law Firm Experience</h2>
                                    <div class="space-y-4">
                                        {#each attorney.lawFirmExperience as experience}
                                            <div class="bg-zinc-700/30 p-4 rounded-lg">
                                                <h3 class="text-lg font-medium text-white">{experience.firmName}</h3>
                                                <p class="text-cyan-400">{experience.role}</p>
                                                <p class="text-gray-400 text-sm">
                                                    {experience.startDate} - {experience.endDate}
                                                </p>
                                                {#if experience.description}
                                                    <p class="text-gray-300 mt-2">{experience.description}</p>
                                                {/if}
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {:else}
                                <div class="mb-8">
                                    <h2 class="text-xl font-semibold text-custom-color-tertiary mb-4">Law Firm Experience</h2>
                                    <p class="text-emerald-400/70 italic">Attorney has not updated their experience yet.</p>
                                </div>
                            {/if}

                            <!-- Credentials Section -->
                            {#if attorney.credentials && attorney.credentials.length > 0}
                                <div class="mb-8">
                                    <h2 class="text-xl font-semibold text-custom-color-tertiary mb-4">Professional Credentials</h2>
                                    <div class="space-y-4">
                                        {#each attorney.credentials as credential}
                                            <div class="bg-zinc-700/30 p-4 rounded-lg">
                                                <h3 class="text-lg font-medium text-white">{credential.title}</h3>
                                                <p class="text-cyan-400">{credential.issuer}</p>
                                                <p class="text-gray-400 text-sm">
                                                    Received: {new Date(credential.dateReceived).toLocaleDateString()}
                                                </p>
                                                {#if credential.description}
                                                    <p class="text-gray-300 mt-2">{credential.description}</p>
                                                {/if}
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {:else}
                                <div class="mb-8">
                                    <h2 class="text-xl font-semibold text-custom-color-tertiary mb-4">Professional Credentials</h2>
                                    <p class="text-emerald-400/70 italic">Attorney has not added any credentials yet.</p>
                                </div>
                            {/if}

                            <!-- Education Section -->
                            {#if attorney.education && attorney.education.length > 0}
                                <div class="mb-8">
                                    <h2 class="text-xl font-semibold text-custom-color-tertiary mb-4">Education</h2>
                                    <div class="space-y-4">
                                        {#each attorney.education as education}
                                            <div class="bg-zinc-700/30 p-4 rounded-lg">
                                                <h3 class="text-lg font-medium text-white">{education.institution}</h3>
                                                <p class="text-cyan-400">{education.degree}</p>
                                                <p class="text-gray-400">Class of {education.graduationYear}</p>
                                                {#if education.honors}
                                                    <p class="text-gray-300 mt-2 italic">{education.honors}</p>
                                                {/if}
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {:else}
                                <div class="mb-8">
                                    <h2 class="text-xl font-semibold text-custom-color-tertiary mb-4">Education</h2>
                                    <p class="text-emerald-400/70 italic">Attorney has not added their education history yet.</p>
                                </div>
                            {/if}
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
                                            <div class="flex-1">
                                                <h3 class="text-cyan-400 font-semibold group-hover:text-cyan-300 transition-colors">
                                                    {relatedAttorney.firstName} {relatedAttorney.lastName}
                                                </h3>
                                                <p class="text-emerald-400/70 text-sm">{relatedAttorney.state}</p>
                                                <div class="flex flex-wrap gap-2 mt-2">
                                                    {#each relatedAttorney.practiceAreas.slice(0, 2) as area}
                                                        <span class="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded text-xs">
                                                            {area}
                                                        </span>
                                                    {/each}
                                                    {#if relatedAttorney.practiceAreas.length > 2}
                                                        <span class="text-cyan-400/50 text-xs">
                                                            +{relatedAttorney.practiceAreas.length - 2} more
                                                        </span>
                                                    {/if}
                                                </div>
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