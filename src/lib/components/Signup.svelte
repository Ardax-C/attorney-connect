<script>
    import { onMount } from 'svelte';
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';
    import Navbar from "./Navbar.svelte";
    import { base } from '$app/paths';
    import { auth, db } from '$lib/firebase';
    import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
    import { doc, setDoc } from 'firebase/firestore';
    import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
    import { goto } from '$app/navigation';
    import { generateAttorneyKeywords } from '../vertexAI';

    let firstName = '';
    let lastName = '';
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

    const states = [
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
        'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
        'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
        'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
        'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
    ];

    onMount(() => {
        signupCard = document.getElementById('signup-card');
  
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
        profilePictureError = '';
    }
  
    function addPracticeArea() {
        practiceAreas = [...practiceAreas, ''];
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

    async function generateKeywords(city, state, practiceAreas) {
        try {
            const result = await generateAttorneyKeywords(city, state, practiceAreas);
            
            // Combine AI-generated keywords with basic terms
            const baseKeywords = [
                city.toLowerCase(),
                state.toLowerCase(),
                ...city.toLowerCase().split(' '),
                ...state.toLowerCase().split(' '),
                ...practiceAreas.flatMap(area => area.toLowerCase().split(' '))
            ];

            // Ensure all keywords are lowercase and unique
            const allKeywords = [...new Set([
                ...baseKeywords,
                ...result.keywords
            ])].map(keyword => keyword.toLowerCase());

            return allKeywords;
        } catch (error) {
            console.error('Error generating keywords:', error);
            // Fallback to basic keyword generation if AI fails
            return [...new Set([
                city.toLowerCase(),
                state.toLowerCase(),
                ...city.toLowerCase().split(' '),
                ...state.toLowerCase().split(' '),
                ...practiceAreas.flatMap(area => area.toLowerCase().split(' '))
            ])];
        }
    }

    async function handleSubmit() {
        if (!profilePicture) {
            profilePictureError = 'Please select a profile picture.';
            return;
        }

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
            const keywords = await generateKeywords(city, state, practiceAreas.filter(area => area.trim() !== ''));

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
                searchTerms: keywords
            });

            // Add state to the states collection
            await setDoc(doc(db, "states", state), {
                state
            });

            // Add each practice area to the practiceAreas collection
            for (const area of practiceAreas.filter(area => area.trim() !== '')) {
                await setDoc(doc(db, "practiceAreas", area), {
                    practiceArea: area
                });
            }
            
            await signOut(auth);
            resetForm();
            showNavigation = true;
            // Redirect to a "Registration Pending" page
            goto('/registration-pending');
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already in use. Please try another email.';
            } else {
                errorMessage = 'An error occurred during registration. Please try again.';
            }
        }
    }

</script>

<main class="bg-no-repeat bg-center bg-cover min-h-screen flex flex-col" style="background-image: url({backgroundImage})">
    <Navbar bind:visible={showNavbar} />
    <div class="flex-grow flex items-start justify-center p-4 pt-20 overflow-hidden">
        <div id="signup-card" class="bg-zinc-800 bg-opacity-90 rounded-md shadow-md w-full max-w-4xl max-h-[calc(92vh-4rem)] overflow-y-auto">
            <div class="p-4 sm:p-6 md:p-8">
                <h2 class="text-2xl font-bold mb-4 text-center text-custom-color-tertiary font-inter">Sign Up for Access!</h2>
                <p class="text-center text-emerald-400 mb-6 text-base sm:text-lg">Once registered, you will have access to view the Attorney Directory!</p>

                <form on:submit|preventDefault={handleSubmit} class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div class="space-y-4">
                        <div>
                            <label for="firstName" class="block text-emerald-400 text-base mb-1">First Name *</label>
                            <input type="text" id="firstName" bind:value={firstName} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                        </div>
                        <div>
                            <label for="lastName" class="block text-emerald-400 text-base mb-1">Last Name *</label>  
                            <input type="text" id="lastName" bind:value={lastName} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                        </div>
                        <div>
                            <label for="email" class="block text-emerald-400 text-base mb-1">Email *</label>
                            <input type="email" id="email" bind:value={email} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <label for="phone" class="block text-emerald-400 text-base mb-1">Phone/Mobile *</label>
                            <input type="tel" id="phone" bind:value={phone} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                        </div>
                        <div>
                            <label for="username" class="block text-emerald-400 text-base mb-1">Username *</label>
                            <input type="text" id="username" bind:value={username} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                        </div>
                        <div>
                            <label for="password" class="block text-emerald-400 text-base mb-1">Password *</label>
                            <input type="password" id="password" bind:value={password} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <label for="website" class="block text-emerald-400 text-base mb-1">Website</label>
                            <input type="url" id="website" bind:value={website} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary">
                        </div>
                        <div>
                            <label for="city" class="block text-emerald-400 text-base mb-1">City</label>
                            <input type="text" id="city" bind:value={city} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary">
                        </div>
                        <div>
                            <label for="state" class="block text-emerald-400 text-base mb-1">State</label>
                            <select id="state" bind:value={state} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary">
                                <option value="">- Select -</option>
                                {#each states as state}
                                    <option value={state}>{state}</option>
                                {/each}
                            </select>
                        </div>
                    </div>

                    <div class="sm:col-span-2 md:col-span-3 space-y-4">
                        <div>
                            <label for="practiceAreas" class="block text-emerald-400 text-base mb-1">Practice Areas</label>
                            {#each practiceAreas as practiceArea, index}
                                <div class="flex items-center mb-2">
                                    <input type="text" id="practiceAreas" bind:value={practiceAreas[index]} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary">
                                    {#if index === practiceAreas.length - 1}
                                        <button type="button" on:click={addPracticeArea} class="ml-2 bg-custom-btn-bg text-custom-btn-text px-4 py-2 text-base rounded hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                                            </svg>
                                        </button>
                                    {/if}
                                </div>
                            {/each}
                        </div>

                        <div>
                            <label for="profilePicture" class="block text-emerald-400 text-base mb-2">Profile Picture</label>
                            <input type="file" id="profilePicture" accept="image/*" on:change={handleProfilePictureUpload} class="hidden">
                            <label for="profilePicture" class="bg-custom-btn-bg text-custom-btn-text px-4 py-2 text-base rounded cursor-pointer hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg">
                                {profilePicture ? profilePicture.name : 'Choose File'}
                            </label>
                            {#if profilePictureError}
                                <p class="text-red-500 mt-1 text-sm">{profilePictureError}</p>
                            {/if}
                        </div>
                        
                        {#if errorMessage}
                            <p class="text-red-500">{errorMessage}</p>
                        {/if}

                        <div class="text-center">
                            <button type="submit" class="bg-custom-btn-bg text-custom-btn-text px-6 py-3 text-base rounded hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg font-bold">Register</button>
                        </div>
            
                        {#if showNavigation}
                            <div class="mt-6 text-center">
                                <p class="text-emerald-400 mb-4 text-base">Registration Complete! Please check your email for verification.</p>
                                <div class="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                                    <a href="{base}/" class="text-custom-color-secondary text-base hover:underline">Home Screen</a>
                                    <a href="{base}/login" class="text-custom-color-secondary text-base hover:underline">Login Screen</a>
                                </div>
                            </div>
                        {/if}
                    </div>
                </form>
            </div>
        </div>
    </div>
</main>

<style>
    :global(body) {
        overflow: hidden;
    }
</style>