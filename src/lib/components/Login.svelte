<script>
    import { onMount } from 'svelte';
    import { auth, db } from '$lib/firebase';
    import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
    import { goto } from '$app/navigation';
    import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
    import Navbar from './Navbar.svelte';
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';

    let emailOrUsername = '';
    let password = '';
    let errorMessage = '';
    let resetEmail = '';
    let resetMessage = '';
    let showResetPassword = false;
    let showNavbar = true;
    let lastScrollTop = 0;
    let loginContent;

    onMount(() => {
        loginContent = document.getElementById('login-content');
        loginContent.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            loginContent.removeEventListener('scroll', handleScroll);
        };
    });

    function handleScroll() {
        const scrollTop = loginContent.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 50) {
            showNavbar = false;
        } else if (scrollTop < lastScrollTop || scrollTop === 0) {
            showNavbar = true;
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }

    async function handleLogin(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const loginEmail = formData.get('username');
        const loginPassword = formData.get('password');

        try {
            let userEmail = loginEmail;

            // Check if the input is a username
            if (!loginEmail.includes('@')) {
                const usersRef = collection(db, 'attorneyProfiles');
                const q = query(
                    usersRef,
                    where('username', '==', loginEmail),
                    limit(1)
                );
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    throw new Error('No user found with this username.');
                }

                userEmail = querySnapshot.docs[0].data().email;
            }

            const userCredential = await signInWithEmailAndPassword(auth, userEmail, loginPassword);
            const user = userCredential.user;

            const userDoc = await getDoc(doc(db, 'attorneyProfiles', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.status === 'approved') {
                    goto('/search');
                } else if (userData.status === 'pending') {
                    goto('/registration-pending');
                } else {
                    // status is 'denied'
                    errorMessage = 'Your account has been denied access.';
                    await signOut(auth);
                }
            } else {
                errorMessage = 'User profile not found.';
                await signOut(auth);
            }
        } catch (error) {
            console.error("Login error:", error);
            if (error.code === 'auth/wrong-password' || 
                error.code === 'auth/user-not-found' || 
                error.code === 'Missing or insufficient permissions') {
                errorMessage = "Invalid email/username or password. Please try again.";
            } else {
                errorMessage = "An error occurred during login. Please try again.";
            }
        }
    }

    async function handlePasswordReset(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const resetEmailValue = formData.get('email');

        try {
            await sendPasswordResetEmail(auth, resetEmailValue);
            resetMessage = 'Password reset email sent. Please check your email.';
        } catch (error) {
            console.error("Error during password reset:", error);
            resetMessage = error.message;
        }
    }
</script>

<main class="bg-no-repeat bg-center bg-cover h-screen flex flex-col" style="background-image: url({backgroundImage})">
    <Navbar bind:visible={showNavbar} />
    <div id="login-content" class="flex-grow overflow-y-auto pt-16"> 
        <div class="flex items-center justify-center py-8 px-4 min-h-full">
            <div class="bg-zinc-800 bg-opacity-90 p-6 sm:p-8 rounded-md shadow-md w-full max-w-md">
                <h2 class="text-2xl sm:text-3xl font-bold mb-6 text-center text-custom-color-secondary">Login to your account:</h2>
                <form on:submit={handleLogin} autocomplete="on">
                    <div class="mb-4">
                        <input 
                            type="text" 
                            id="emailOrUsername"
                            name="username"
                            autocomplete="username"
                            placeholder="Email" 
                            class="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-color-primary" 
                            required
                        >
                    </div>
                    <div class="mb-6">
                        <input 
                            type="password" 
                            id="password"
                            name="password"
                            autocomplete="current-password"
                            placeholder="Password" 
                            class="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-color-primary" 
                            required
                        >
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
</main>

{#if showResetPassword}
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div class="bg-white p-6 rounded-md shadow-md w-full max-w-md">
            <h2 class="text-2xl font-bold mb-4">Reset Password</h2>
            <form on:submit={handlePasswordReset}>
                <div class="mb-4">
                    <input 
                        type="email" 
                        id="resetEmail"
                        name="email"
                        autocomplete="email"
                        placeholder="Email" 
                        class="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-color-primary" 
                        required
                    >
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