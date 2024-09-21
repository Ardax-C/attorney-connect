<script>
    import { goto } from '$app/navigation';
    import Navbar from './Navbar.svelte';
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';
    import { base } from '$app/paths';
    let username = '';
    let password = '';
    function handleSubmit() {
        // Login logic goes here
        console.log('Login submitted');
        // Redirect to home page or other authenticated route
        goto(`${base}/`);
    }
</script>

<div class="bg-no-repeat bg-center bg-cover min-h-screen" style="background-image: url({backgroundImage})">
    <Navbar />
    <div class="flex items-center justify-center py-8 px-4">
        <div class="bg-zinc-800 bg-opacity-90 p-6 sm:p-8 rounded-md shadow-md w-full max-w-md">
            <h2 class="text-2xl sm:text-3xl font-bold mb-6 text-center text-custom-color-secondary">Login to your account:</h2>
            <form on:submit|preventDefault={handleSubmit}>
                <div class="mb-4">
                    <input type="text" id="username" bind:value={username} placeholder="Username" class="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                </div>
                <div class="mb-6">
                    <input type="password" id="password" bind:value={password} placeholder="Password" class="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                </div>
                <div class="flex flex-col sm:flex-row items-center justify-between">
                    <button type="submit" class="bg-custom-btn-bg text-custom-btn-text px-6 py-3 text-base rounded-md hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg mb-4 sm:mb-0 w-full sm:w-auto">Login</button>
                    <a href="{base}/signup" class="text-custom-color-secondary text-base hover:underline">Sign Up</a>
                </div>
            </form>
        </div>
    </div>
</div>