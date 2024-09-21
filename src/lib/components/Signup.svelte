<script>
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';
    import { goto } from '$app/navigation';
    import Navbar from "./Navbar.svelte";
    import { base } from '$app/paths';

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

    const states = [
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
        'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
        'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
        'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
        'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
    ];

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

    function handleSubmit() {
        if (!profilePicture) {
            profilePictureError = 'Please select a profile picture.';
            return;
        }
        //TODO Form submission logic goes here
        console.log('Form submitted');

        resetForm();

        showNavigation = true;
    }
</script>

<div class="bg-no-repeat bg-center bg-cover h-screen" style="background-image: url({backgroundImage})">
    <Navbar />
    <div class="max-w-5xl mx-auto my-10 p-6 rounded-sm shadow-md bg-white bg-opacity-90">
        <h2 class="text-xl font-bold mb-4 text-center text-custom-color-secondary font-inter">Sign Up for Access!</h2>
        <p class="text-center text-gray-600 mb-6 text-sm">Once registered, you will have access to view the Attorney Directory!</p>

        <form on:submit|preventDefault={handleSubmit} class="grid grid-cols-3 gap-4">
            <div>
                <div class="mb-2">
                    <label for="firstName" class="block text-gray-700 text-sm mb-1">First Name *</label>
                    <input type="text" id="firstName" bind:value={firstName} class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                </div>
                <div class="mb-2">
                    <label for="lastName" class="block text-gray-700 text-sm mb-1">Last Name *</label>
                    <input type="text" id="lastName" bind:value={lastName} class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                </div>
                <div class="mb-2">
                    <label for="email" class="block text-gray-700 text-sm mb-1">Email *</label>
                    <input type="email" id="email" bind:value={email} class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                </div>
            </div>

            <div>
                <div class="mb-2">
                    <label for="phone" class="block text-gray-700 text-sm mb-1">Phone/Mobile *</label>
                    <input type="tel" id="phone" bind:value={phone} class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                </div>
                <div class="mb-2">
                    <label for="username" class="block text-gray-700 text-sm mb-1">Username *</label>
                    <input type="text" id="username" bind:value={username} class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                </div>
                <div class="mb-2">
                    <label for="password" class="block text-gray-700 text-sm mb-1">Password *</label>
                    <input type="password" id="password" bind:value={password} class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                </div>
            </div>

            <div>
                <div class="mb-2">
                    <label for="website" class="block text-gray-700 text-sm mb-1">Website</label>
                    <input type="url" id="website" bind:value={website} class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary">
                </div>
                <div class="mb-2">
                    <label for="city" class="block text-gray-700 text-sm mb-1">City</label>
                    <input type="text" id="city" bind:value={city} class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary">
                </div>
                <div class="mb-2">
                    <label for="state" class="block text-gray-700 text-sm mb-1">State</label>
                    <select id="state" bind:value={state} class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary">
                        <option value="">- Select -</option>
                        {#each states as state}
                            <option value={state}>{state}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <div class="col-span-3">
                <div class="mb-2">
                    <label for="practiceAreas" class="block text-gray-700 text-sm mb-1">Practice Areas</label>
                    {#each practiceAreas as practiceArea, index}
                        <div class="flex items-center mb-2">
                            <input type="text" id="practiceAreas" bind:value={practiceAreas[index]} class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary">
                            {#if index === practiceAreas.length - 1}
                                <button type="button" on:click={addPracticeArea} class="ml-2 bg-custom-btn-bg text-custom-btn-text px-2 py-1 text-xs rounded hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                                    </svg>
                                </button>
                            {/if}
                        </div>
                    {/each}
                </div>

                <div class="mb-2">
                    <label for="profilePicture" class="block text-gray-700 text-sm mb-1">Profile Picture</label>
                    <input type="file" id="profilePicture" accept="image/*" on:change={handleProfilePictureUpload} class="hidden">
                    <label for="profilePicture" class="bg-custom-btn-bg text-custom-btn-text px-3 py-1 text-sm rounded cursor-pointer hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg">
                        {profilePicture ? profilePicture.name : 'Choose File'}
                    </label>
                    {#if profilePictureError}
                        <p class="text-red-500 mt-1 text-xs">{profilePictureError}</p>
                    {/if}
                </div>

                <div class="text-center">
                    <button type="submit" class="bg-custom-btn-bg text-custom-btn-text px-4 py-2 text-sm rounded hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg font-bold">Submit Form</button>
                </div>
    
                {#if showNavigation}
                    <div class="mt-4 text-center">
                        <p class="text-gray-600 mb-2">Registration Complete! Please check your email for verification.</p>
                        <div class="flex justify-center space-x-4">
                            <a href="{base}/" class="text-custom-color-secondary hover:underline">Home Screen</a>
                            <a href="{base}/login" class="text-custom-color-secondary hover:underline">Login Screen</a>
                        </div>
                    </div>
                {/if}
            </div>
        </form>
    </div>
</div>