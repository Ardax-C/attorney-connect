<script>
    import Fa from 'svelte-fa';
    import { faUser } from '@fortawesome/free-solid-svg-icons';
    import { library } from '@fortawesome/fontawesome-svg-core';
    
    // Initialize the library
    library.add(faUser);
    
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
                const data = attorneyDoc.data();
                attorney = { 
                    id: attorneyDoc.id, 
                    ...data,
                    profilePictureUrl: getProfilePictureUrl(data.profilePictureUrl) || '/images/default-avatar.png'
                };
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
                        profilePictureUrl: data.profilePictureUrl || '',
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

    function getProfilePictureUrl(profilePicture) {
        if (!profilePicture) return null;
        if (typeof profilePicture === 'string') return profilePicture;
        if (profilePicture.url) return profilePicture.url;
        return null;
    }

    const sectionMapping = {
        'Law Firm Experience': 'lawFirmExperience',
        'Professional Credentials': 'professionalCredentials',
        'Education': 'education',
        'Biography': 'biography'
    };
</script>

<main class="bg-zinc-950 bg-no-repeat bg-center bg-cover min-h-screen" style="background-image: url({backgroundImage})">
    <Navbar />
    <div class="container mx-auto px-4 py-8 mt-16">
        {#if loading}
            <div class="flex justify-center items-center h-64">
                <div class="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        {:else if error}
            <div class="text-red-400 text-center p-4">{error}</div>
        {:else if attorney}
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <!-- Main Profile Content -->
                <div class="lg:col-span-3">
                    <div class="bg-zinc-900/95 rounded-2xl shadow-2xl overflow-hidden border border-zinc-800/50">
                        <!-- Header Banner -->
                        <div class="relative bg-gradient-to-r from-zinc-800 to-zinc-900 p-8">
                            <div class="flex items-start space-x-6">
                                <!-- Main Profile Image -->
                                <div class="w-32 h-32 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center">
                                    <div class="h-full w-full bg-cyan-500/20 flex items-center justify-center">
                                        {#if attorney.profilePictureUrl}
                                            <img 
                                                src={attorney.profilePictureUrl}
                                                alt="Profile"
                                                class="h-full w-full object-cover"
                                                on:error={() => attorney.profilePictureUrl = null}
                                            />
                                        {:else}
                                            <Fa icon={faUser} class="text-cyan-500 text-5xl" />
                                        {/if}
                                    </div>
                                </div>
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
                        <div class="pt-8 px-8 pb-8 space-y-8">
                            <!-- Practice Areas -->
                            <div class="bg-zinc-800/30 p-6 rounded-xl border border-zinc-700/20">
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

                            <!-- Update the sections loop to properly display all content -->
                            {#each ['Biography', 'Law Firm Experience', 'Professional Credentials', 'Education'] as section}
                                {#if attorney[sectionMapping[section]] && attorney[sectionMapping[section]].length > 0}
                                    <div class="bg-zinc-800/30 p-6 rounded-xl border border-zinc-700/20">
                                        <h2 class="text-xl font-semibold text-custom-color-tertiary mb-4">{section}</h2>
                                        {#if section === 'Biography'}
                                            <p class="text-emerald-400/70 italic leading-relaxed">
                                                {attorney.biography}
                                            </p>
                                        {:else if section === 'Law Firm Experience'}
                                            <div class="space-y-4">
                                                {#each attorney.lawFirmExperience as experience}
                                                    <div class="bg-zinc-700/30 p-4 rounded-lg">
                                                        <h3 class="text-white font-medium">{experience.firmName}</h3>
                                                        <p class="text-emerald-400">{experience.role}</p>
                                                        <p class="text-emerald-400/70 text-sm">
                                                            {experience.startDate} - {experience.endDate || 'Present'}
                                                        </p>
                                                        {#if experience.description}
                                                            <p class="text-emerald-400/70 mt-2">{experience.description}</p>
                                                        {/if}
                                                    </div>
                                                {/each}
                                            </div>
                                        {:else if section === 'Professional Credentials'}
                                            <div class="space-y-4">
                                                {#each attorney.professionalCredentials as credential}
                                                    <div class="bg-zinc-700/30 p-4 rounded-lg">
                                                        <h3 class="text-white font-medium">{credential.title}</h3>
                                                        <p class="text-emerald-400">{credential.issuer}</p>
                                                        <p class="text-emerald-400/70 text-sm">
                                                            Received: {credential.dateReceived}
                                                        </p>
                                                        {#if credential.description}
                                                            <p class="text-emerald-400/70 mt-2">{credential.description}</p>
                                                        {/if}
                                                    </div>
                                                {/each}
                                            </div>
                                        {:else if section === 'Education'}
                                            <div class="space-y-4">
                                                {#each attorney.education as edu}
                                                    <div class="bg-zinc-700/30 p-4 rounded-lg">
                                                        <h3 class="text-white font-medium">{edu.institution}</h3>
                                                        <p class="text-emerald-400">{edu.degree}</p>
                                                        <p class="text-emerald-400/70 text-sm">
                                                            Graduated: {edu.graduationYear}
                                                        </p>
                                                        {#if edu.honors}
                                                            <p class="text-emerald-400/70 mt-2">{edu.honors}</p>
                                                        {/if}
                                                    </div>
                                                {/each}
                                            </div>
                                        {/if}
                                    </div>
                                {:else}
                                    <div class="bg-zinc-800/30 p-6 rounded-xl border border-zinc-700/20">
                                        <h2 class="text-xl font-semibold text-custom-color-tertiary mb-4">{section}</h2>
                                        <p class="text-emerald-400/70 italic">
                                            Attorney has not added {section.toLowerCase()} yet.
                                        </p>
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    </div>
                </div>

                <!-- Related Attorneys Column -->
                <div class="lg:col-span-1">
                    <div class="bg-zinc-900/95 p-6 rounded-xl border border-zinc-800/50 sticky top-24">
                        <h2 class="text-xl font-semibold text-custom-color-tertiary mb-6">Related Attorneys</h2>
                        
                        {#if relatedAttorneys.length > 0}
                            <div class="space-y-4">
                                {#each relatedAttorneys as relatedAttorney}
                                    <a 
                                        href="/attorney/{relatedAttorney.id}"
                                        class="block bg-zinc-800/50 p-4 rounded-lg hover:bg-zinc-700/50 transition-colors"
                                    >
                                        <div class="flex items-center space-x-4">
                                            <div class="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                                                <div class="h-full w-full bg-cyan-500/20 flex items-center justify-center">
                                                    <div class="h-full w-full bg-cyan-500/20 flex items-center justify-center">
                                                        {#if relatedAttorney.profilePictureUrl}
                                                            <img 
                                                                src={relatedAttorney.profilePictureUrl}
                                                                alt="Profile"
                                                                class="h-full w-full object-cover"
                                                                on:error={() => relatedAttorney.profilePictureUrl = null}
                                                            />
                                                        {:else}
                                                            <Fa icon={faUser} class="text-cyan-500 text-2xl" />
                                                        {/if}
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <h3 class="text-white font-medium">
                                                    {relatedAttorney.firstName} {relatedAttorney.lastName}
                                                </h3>
                                                <p class="text-emerald-400/70 text-sm">
                                                    {relatedAttorney.state}
                                                </p>
                                                <div class="flex flex-wrap gap-1 mt-1">
                                                    {#each relatedAttorney.practiceAreas.slice(0, 2) as area}
                                                        <span class="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded text-xs">
                                                            {area}
                                                        </span>
                                                    {/each}
                                                </div>
                                            </div>
                                        </div>
                                    </a>
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
        overflow-y: auto !important;
    }
</style>