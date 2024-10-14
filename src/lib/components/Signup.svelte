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

</script>

<main class="bg-no-repeat bg-center bg-cover min-h-screen flex flex-col" style="background-image: url({backgroundImage})">
    <Navbar bind:visible={showNavbar} />
    <div class="flex-grow flex items-start justify-center p-4 pt-20 overflow-hidden">
        <div id="signup-card" class="bg-zinc-800 bg-opacity-90 rounded-md shadow-md w-full max-w-4xl max-h-[calc(92vh-4rem)] overflow-y-auto">
            <div class="p-4 sm:p-6 md:p-8">
                <h2 class="text-2xl font-bold mb-4 text-center text-custom-color-tertiary font-inter">Sign Up for Access!</h2>
                <p class="text-center text-emerald-400 mb-6 text-base sm:text-lg">Once registered, you will have access to view the Attorney Directory!</p>

                <form on:submit|preventDefault={handleSubmit} class="grid grid-cols-2 gap-4">
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
                        <div>
                            <label for="phone" class="block text-emerald-400 text-base mb-1">Phone/Mobile *</label>
                            <input type="tel" id="phone" bind:value={phone} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                        </div>
                        <div>
                            <label for="barNumber" class="block text-emerald-400 text-base mb-1">Bar Number *</label>
                            <input type="text" id="barNumber" bind:value={barNumber} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label for="username" class="block text-emerald-400 text-base mb-1">Username *</label>
                            <input type="text" id="username" bind:value={username} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                        </div>
                        <div>
                            <label for="password" class="block text-emerald-400 text-base mb-1">Password *</label>
                            <input type="password" id="password" bind:value={password} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                        </div>
                        <div>
                            <label for="website" class="block text-emerald-400 text-base mb-1">Website</label>
                            <input 
                                type="text" 
                                id="website" 
                                bind:value={website} 
                                on:input={handleWebsiteInput}
                                class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary"
                            >
                        </div>
                        <div>
                            <label for="city" class="block text-emerald-400 text-base mb-1">City</label>
                            <input type="text" id="city" bind:value={city} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                        </div>
                        <div>
                            <label for="state" class="block text-emerald-400 text-base mb-1">State</label>
                            <select id="state" bind:value={state} class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                                <option value="">- Select -</option>
                                {#each states as state}
                                    <option value={state}>{state}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                    <div class="sm:col-span-2 md:col-span-3 space-y-4">
                        
                        <div class="sm:col-span-2 md:col-span-3 space-y-4">
                            <div>
                                <label for="practiceAreas" class="block text-emerald-400 text-base mb-1">Practice Areas</label>
                                {#each practiceAreas as practiceArea, index}
                                    <div class="flex items-center mb-2 gap-2">
                                        <input type="text" id="practiceAreas" bind:value={practiceAreas[index]} class="flex-grow px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                                        <div class="flex-shrink-0">
                                            {#if practiceAreas.length > 1}
                                                <button type="button" on:click={() => removePracticeArea(index)} class="bg-red-500 text-white px-2 py-2 text-base rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                                                    </svg>
                                                </button>
                                            {/if}
                                            {#if index === practiceAreas.length - 1}
                                                <button type="button" on:click={addPracticeArea} class="bg-custom-btn-bg text-custom-btn-text px-2 py-2 text-base rounded hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                                                    </svg>
                                                </button>
                                            {/if}
                                        </div>
                                    </div>
                                {/each}
                            </div>

                        <div>
                            <label for="profilePicture" class="block text-emerald-400 text-base mb-2">Profile Picture</label>
                            <input type="file" id="profilePicture" accept="image/*" on:change={handleProfilePictureUpload} class="hidden">
                            <label for="profilePicture" class="bg-custom-btn-bg text-custom-btn-text px-4 py-2 text-base rounded cursor-pointer hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg">
                                {profilePicture ? profilePicture.name : 'Choose File'}
                            </label>
                        </div>
                        
                        {#if errorMessage}
                            <p class="text-red-500">{errorMessage}</p>
                        {/if}

                        <div class="text-center">
                            <button type="submit" class="w-full sm:w-1/2 bg-custom-btn-bg text-custom-btn-text px-6 py-3 text-base rounded hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg font-bold">Register</button>
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
    {#if isLoading}
        <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-400"></div>
        </div>
    {/if}
</main>

<style>
    :global(body) {
        overflow: hidden;
    }
</style>