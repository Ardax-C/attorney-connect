<script>
    import { onMount } from 'svelte';
    import backgroundImage from '../images/dark_lattice.png';
    import Navbar from "./Navbar.svelte";
    import { base } from '$app/paths';
    import { auth, db } from '$lib/firebase';
    import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
    import { doc, setDoc, getDoc, updateDoc, arrayUnion, runTransaction } from 'firebase/firestore';
    import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
    import { goto } from '$app/navigation';
    import { generateAttorneyKeywords } from '../vertexAI';
    import { sendEmail } from '$lib/emailService';

    let firstName = '';
    let lastName = '';
    let barNumber = '';
    let email = '';
    let phone = '';
    let username = '';
    let password = '';
    let website = '';
    let city = '';
    let state = '';
    let practiceAreas = [''];
    let profilePicture = null;
    let profilePictureError = '';
    let showNavigation = false;
    let errorMessage = '';
    let showNavbar = true;
    let lastScrollTop = 0;
    let signupCard;
    let isLoading = false;
    let signupContainer;
    let submitContainer;

    const states = [
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
        'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
        'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
        'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
        'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
    ];

    onMount(() => {
        signupCard = document.getElementById('signup-card');
        signupContainer = document.getElementById('signup-container');
        submitContainer = document.getElementById('submit-container');

        signupContainer.addEventListener('scroll', handleScroll);

        return () => {
            signupContainer?.removeEventListener('scroll', handleScroll);
        };
    });

    function resetForm() {
        firstName = '';
        lastName = '';
        email = '';
        phone = '';
        username = '';
        password = '';
        website = '';
        city = '';
        state = '';
        practiceAreas = [''];
        profilePicture = null;
        barNumber = '';
    }
  
    function addPracticeArea() {
        practiceAreas = [...practiceAreas, ''];
    }

    function removePracticeArea(index) {
        if (practiceAreas.length > 1) {
            practiceAreas = practiceAreas.filter((_, i) => i !== index);
        }
    }
  
    function handleProfilePictureUpload(event) {
        const file = event.target.files[0];
        const maxFileSize = 6 * 1024 * 1024; // 6MB in bytes

        if (file.size > maxFileSize) {
            profilePictureError = 'File size exceeds the maximum limit of 6MB.';
            profilePicture = null;
        } else {
            profilePictureError = '';
            profilePicture = file;
        }
    }

    async function handleSubmit() {
        if (!firstName || !lastName || !city || !state || practiceAreas.some(area => !area.trim())) {
            errorMessage = 'Please fill out all required fields.';
            return;
        }

        isLoading = true;

        try {
            // Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Send email verification
            await sendEmailVerification(user);

            // Upload profile picture
            const storage = getStorage();
            const profilePictureRef = ref(storage, `profilePictures/${user.uid}`);
            await uploadBytes(profilePictureRef, profilePicture);
            const profilePictureUrl = await getDownloadURL(profilePictureRef);

            // Generate keywords
            const keywords = await generateAttorneyKeywords(firstName, lastName, city, state, practiceAreas.filter(area => area.trim() !== ''));

            // Create user profile in Firestore
            await setDoc(doc(db, "attorneyProfiles", user.uid), {
                firstName,
                lastName,
                email,
                phone,
                username,
                website,
                city,
                state,
                practiceAreas: practiceAreas.filter(area => area.trim() !== ''),
                profilePictureUrl,
                createdAt: new Date(),
                status: 'pending',
                role: 'user',
                keywords,
                searchTerms: keywords,
                barNumber,
            });

            // Update stateMapping collection
            await runTransaction(db, async (transaction) => {
                const stateRef = doc(db, "stateMapping", state);
                const stateDoc = await transaction.get(stateRef);
                const cityRef = doc(stateRef, 'cities', city);
                const cityDoc = await transaction.get(cityRef);

                // Perform all reads before writes
                const stateExists = stateDoc.exists();
                const cityExists = cityDoc.exists();
                const currentCityCount = stateExists ? (stateDoc.data().cityCount || 0) : 0;

                // Now perform writes
                if (!stateExists) {
                    transaction.set(stateRef, {
                        state: state,
                        attorneys: [user.uid],
                        cityCount: 1
                    });
                } else {
                    transaction.update(stateRef, {
                        attorneys: arrayUnion(user.uid)
                    });
                }

                if (!cityExists) {
                    transaction.set(cityRef, {
                        attorneys: [user.uid]
                    });
                    transaction.update(stateRef, {
                        cityCount: currentCityCount + 1
                    });
                } else {
                    transaction.update(cityRef, {
                        attorneys: arrayUnion(user.uid)
                    });
                }
            });

            // Update practiceAreaMappings collection
            const practiceAreaUpdates = practiceAreas.filter(area => area.trim() !== '').map(async (area) => {
                const normalizedArea = area.toLowerCase().trim();
                const safeDocId = normalizedArea.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                const docRef = doc(db, "practiceAreaMappings", safeDocId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    return updateDoc(docRef, {
                        uids: arrayUnion(user.uid)
                    });
                } else {
                    return setDoc(docRef, {
                        originalName: area,
                        uids: [user.uid]
                    });
                }
            });

            await Promise.all(practiceAreaUpdates);

            // Add each practice area to the practiceAreas collection
            const practiceAreaCreations = practiceAreas.filter(area => area.trim() !== '').map(area => 
                setDoc(doc(db, "practiceAreas", area), { practiceArea: area })
            );

            await Promise.all(practiceAreaCreations);
            
            await signOut(auth);
            // Send email to admin
            await sendMailNotification();
            resetForm();
            showNavigation = true;
            // Redirect to a "Registration Pending" page
            goto('/registration-pending');

        } catch (error) {
            console.error("Error during registration:", error);
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already in use. Please try another email.';
            } else {
                errorMessage = 'An error occurred during registration. Please try again.';
            }
        } finally {
            isLoading = false;
        }
    }

    async function sendMailNotification() {
        const adminEmail = `${import.meta.env.VITE_EMAIL_FROM}`;
        const emailSubject = `New User Registration - ${firstName} ${lastName}`;
        const emailBody = {
            firstName,
            lastName,
            city,
            state,
            barNumber,
            email,
            username,
            time: new Date().toLocaleString()
        };

        await sendEmail(adminEmail, emailSubject, emailBody, email);
    }

    function handleWebsiteInput(event) {
        let input = event.target.value.trim();
        
        // Check if the input already starts with a protocol
        if (!/^https?:\/\//i.test(input) && input !== '') {
            // If no protocol is present, prepend 'https://'
            input = 'https://' + input;
        }
        
        website = input;
    }

    function handleScroll() {
        if (!signupContainer || !submitContainer) return;

        const { scrollTop, scrollHeight, clientHeight } = signupContainer;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 20; // 20px threshold

        submitContainer.style.opacity = isAtBottom ? '1' : '0';
        submitContainer.style.pointerEvents = isAtBottom ? 'auto' : 'none';
    }

</script>

<main class="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-800">
    <Navbar bind:visible={showNavbar} />
    
    <div class="container mx-auto px-4 max-w-6xl h-[calc(100vh-5rem)] mt-20 overflow-y-auto" id="signup-container">
        <div class="bg-zinc-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-zinc-700/50 p-6 md:p-8 mb-4">
            <div class="text-center mb-6">
                <h2 class="text-2xl md:text-3xl font-bold text-white mb-2">Create Your Account</h2>
                <p class="text-emerald-400 text-base md:text-lg">Join our Attorney Directory Network</p>
            </div>

            <form on:submit|preventDefault={handleSubmit} class="space-y-6">
                <div class="bg-zinc-900/30 rounded-xl p-4 md:p-6 space-y-4">
                    <h3 class="text-lg md:text-xl font-semibold text-white mb-3">Personal Information</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label for="firstName" class="block text-sm font-medium text-zinc-300">First Name *</label>
                            <input
                                type="text"
                                id="firstName"
                                bind:value={firstName}
                                class="w-full rounded-lg border-0 bg-zinc-700/50 py-2.5 px-4 text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                                required
                            />
                        </div>
                        
                        <div class="space-y-2">
                            <label for="lastName" class="block text-sm font-medium text-zinc-300">Last Name *</label>
                            <input
                                type="text"
                                id="lastName"
                                bind:value={lastName}
                                class="w-full rounded-lg border-0 bg-zinc-700/50 py-2.5 px-4 text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div class="bg-zinc-900/30 rounded-xl p-6 space-y-6">
                    <h3 class="text-xl font-semibold text-white mb-4">Contact Information</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label for="email" class="block text-sm font-medium text-zinc-300">Email *</label>
                            <input
                                type="email"
                                id="email"
                                bind:value={email}
                                class="w-full rounded-lg border-0 bg-zinc-700/50 py-2.5 px-4 text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                                required
                            />
                        </div>

                        <div class="space-y-2">
                            <label for="phone" class="block text-sm font-medium text-zinc-300">Phone *</label>
                            <input
                                type="tel"
                                id="phone"
                                bind:value={phone}
                                class="w-full rounded-lg border-0 bg-zinc-700/50 py-2.5 px-4 text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div class="bg-zinc-900/30 rounded-xl p-6 space-y-6">
                    <h3 class="text-xl font-semibold text-white mb-4">Professional Information</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label for="barNumber" class="block text-sm font-medium text-zinc-300">Bar Number *</label>
                            <input
                                type="text"
                                id="barNumber"
                                bind:value={barNumber}
                                class="w-full rounded-lg border-0 bg-zinc-700/50 py-2.5 px-4 text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                                required
                            />
                        </div>

                        <div class="space-y-2">
                            <label for="website" class="block text-sm font-medium text-zinc-300">Website</label>
                            <input
                                type="text"
                                id="website"
                                bind:value={website}
                                on:input={handleWebsiteInput}
                                class="w-full rounded-lg border-0 bg-zinc-700/50 py-2.5 px-4 text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                                placeholder="https://"
                            />
                        </div>

                        <div class="space-y-2">
                            <label for="city" class="block text-sm font-medium text-zinc-300">City *</label>
                            <input
                                type="text"
                                id="city"
                                bind:value={city}
                                class="w-full rounded-lg border-0 bg-zinc-700/50 py-2.5 px-4 text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                                required
                            />
                        </div>

                        <div class="space-y-2">
                            <label for="state" class="block text-sm font-medium text-zinc-300">State *</label>
                            <select
                                id="state"
                                bind:value={state}
                                class="w-full rounded-lg border-0 bg-zinc-700/50 py-2.5 px-4 text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                                required
                            >
                                <option value="">Select a state</option>
                                {#each states as state}
                                    <option value={state}>{state}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="bg-zinc-900/30 rounded-xl p-6 space-y-6">
                    <h3 class="text-xl font-semibold text-white mb-4">Practice Areas</h3>
                    {#each practiceAreas as practiceArea, index}
                        <div class="flex items-center gap-4">
                            <input
                                type="text"
                                bind:value={practiceAreas[index]}
                                class="flex-1 rounded-lg border-0 bg-zinc-700/50 py-2.5 px-4 text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                                placeholder="Enter practice area"
                                required
                            />
                            <div class="flex gap-2">
                                {#if practiceAreas.length > 1}
                                    <button
                                        type="button"
                                        on:click={() => removePracticeArea(index)}
                                        class="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                                        </svg>
                                    </button>
                                {/if}
                                {#if index === practiceAreas.length - 1}
                                    <button
                                        type="button"
                                        on:click={addPracticeArea}
                                        class="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                                        </svg>
                                    </button>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>

                <div class="bg-zinc-900/30 rounded-xl p-6">
                    <h3 class="text-xl font-semibold text-white mb-4">Profile Picture</h3>
                    <div class="flex items-center gap-4">
                        <input type="file" id="profilePicture" accept="image/*" on:change={handleProfilePictureUpload} class="hidden" />
                        <label
                            for="profilePicture"
                            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                            </svg>
                            {profilePicture ? profilePicture.name : 'Choose File'}
                        </label>
                        {#if profilePictureError}
                            <p class="text-red-400 text-sm">{profilePictureError}</p>
                        {/if}
                    </div>
                </div>

                {#if errorMessage}
                    <div class="bg-red-500/10 text-red-400 p-4 rounded-lg animate-in fade-in">
                        {errorMessage}
                    </div>
                {/if}
            </form>
        </div>
    </div>

    <div 
        class="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-900 to-zinc-900/0 py-6 opacity-0 transition-opacity duration-300"
        id="submit-container"
    >
        <div class="container mx-auto px-4 max-w-6xl flex justify-center">
            <button
                type="submit"
                form="signup-form"
                disabled={isLoading}
                class="px-6 py-2.5 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
            >
                {#if isLoading}
                    <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                {/if}
                {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
        </div>
    </div>
</main>

<style lang="postcss">
    :global(body) {
        @apply bg-zinc-900;
    }

    .animate-in {
        animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .container {
        scrollbar-width: thin;
        scrollbar-color: theme('colors.emerald.500') theme('colors.zinc.800');
    }

    .container::-webkit-scrollbar {
        width: 8px;
    }

    .container::-webkit-scrollbar-track {
        background: theme('colors.zinc.800');
        border-radius: 4px;
    }

    .container::-webkit-scrollbar-thumb {
        background-color: theme('colors.emerald.500');
        border-radius: 4px;
    }
</style>