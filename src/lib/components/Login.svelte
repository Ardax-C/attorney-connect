<script>
    import { auth, db } from '$lib/firebase';
    import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
    import { goto } from '$app/navigation';
    import { collection, query, where, getDocs } from 'firebase/firestore';
    import Navbar from './Navbar.svelte';
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';

    let emailOrUsername = '';
    let password = '';
    let errorMessage = '';
    let resetEmail = '';
    let resetMessage = '';
    let showResetPassword = false;

    async function handleLogin() {
        try {
            let email = emailOrUsername;

            // Check if the input is a username
            if (!emailOrUsername.includes('@')) {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('username', '==', emailOrUsername));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    throw new Error('No user found with this username.');
                }

                // Assuming usernames are unique, get the email of the first matching user
                email = querySnapshot.docs[0].data().email;
            }

            // Sign in with email and password
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Check if the email is verified
            if (!user.emailVerified) {
                await signOut(auth);
                throw new Error('Please verify your email before logging in.');
            }

            // Redirect to the dashboard or home page
            goto('/profile');
        } catch (error) {
            console.error("Error during login:", error);
            errorMessage = error.message;
        }
    }

    async function handlePasswordReset() {
        try {
            await sendPasswordResetEmail(auth, resetEmail);
            resetMessage = 'Password reset email sent. Please check your email.';
        } catch (error) {
            console.error("Error during password reset:", error);
            resetMessage = error.message;
        }
    }
</script>

<div class="bg-no-repeat bg-center bg-cover min-h-screen" style="background-image: url({backgroundImage})">
    <Navbar />
    <div class="flex items-center justify-center py-8 px-4">
        <div class="bg-zinc-800 bg-opacity-90 p-6 sm:p-8 rounded-md shadow-md w-full max-w-md">
            <h2 class="text-2xl sm:text-3xl font-bold mb-6 text-center text-custom-color-secondary">Login to your account:</h2>
            <form on:submit|preventDefault={handleLogin}>
                <div class="mb-4">
                    <input type="text" bind:value={emailOrUsername} placeholder="Email or Username" class="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                </div>
                <div class="mb-6">
                    <input type="password" bind:value={password} placeholder="Password" class="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                </div>
                {#if errorMessage}
                    <p class="text-red-500 mb-4">{errorMessage}</p>
                {/if}
                <div class="flex flex-col sm:flex-row items-center justify-between">
                    <button type="submit" class="bg-custom-btn-bg text-custom-btn-text px-6 py-3 text-base rounded-md hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg mb-4 sm:mb-0 w-full sm:w-auto">Login</button>
                    <button type="button" on:click={() => showResetPassword = true} class="text-custom-color-secondary text-base hover:underline bg-transparent border-none p-0">Forgot Password?</button>
                </div>
            </form>
        </div>
    </div>
</div>

{#if showResetPassword}
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div class="bg-white p-6 rounded-md shadow-md w-full max-w-md">
            <h2 class="text-2xl font-bold mb-4">Reset Password</h2>
            <form on:submit|preventDefault={handlePasswordReset}>
                <div class="mb-4">
                    <input type="email" bind:value={resetEmail} placeholder="Enter your email" class="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required>
                </div>
                {#if resetMessage}
                    <p class="text-green-500 mb-4">{resetMessage}</p>
                {/if}
                <div class="flex items-center justify-between">
                    <button type="submit" class="bg-custom-btn-bg text-custom-btn-text px-6 py-3 text-base rounded-md hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg">Send Reset Email</button>
                    <button type="button" on:click={() => showResetPassword = false} class="text-custom-color-secondary text-base hover:underline">Cancel</button>
                </div>
            </form>
        </div>
    </div>
{/if}