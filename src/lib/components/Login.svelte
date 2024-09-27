<script>
    import Navbar from './Navbar.svelte';
    import backgroundImage from '../images/dark_lattice.png';
    import { onMount } from 'svelte';
    import { auth, db } from '$lib/firebase';
    import { goto } from '$app/navigation';
    import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
    import { collection, query, where, getDocs, doc, getDoc, limit, orderBy } from 'firebase/firestore';

    let email = '';
    let password = '';
    let errorMessage = '';
    let resetEmail = '';
    let resetMessage = '';
    let showResetPassword = false;
    let showNavbar = true;
    let lastScrollTop = 0;
    let loginContent;
    let errorTimeout;

    function setTimedErrorMessage(message, duration = 3000) {
        errorMessage = message;
        clearTimeout(errorTimeout);
        errorTimeout = setTimeout(() => {
            errorMessage = '';
        }, duration);
    }

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
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const userDoc = await getDocs(query(collection(db, 'attorneyProfiles'), where('email', '==', email), limit(1)));
            if (!userDoc.empty) {
                const userData = userDoc.docs[0].data();
                switch (userData.status) {
                    case 'approved':
                        goto('/');
                        break;
                    case 'pending':
                        goto('/registration-pending');
                        break;
                    default:
                        setTimedErrorMessage('Your account has been denied access.');
                        await auth.signOut();
                }
            } else {
                setTimedErrorMessage('User profile not found.');
                await auth.signOut();
            }
        } catch (error) {
            handleLoginError(error);
        }
    }

    function handleLoginError(error) {
        let message;
        switch (error.code) {
            case 'auth/invalid-email':
                message = "Invalid email address. Please check and try again.";
                break;
            case 'auth/user-disabled':
                message = "This account has been disabled. Please contact support.";
                break;
            case 'auth/wrong-password':
                message = "Invalid email or password. Please try again.";
                break;
            case 'auth/invalid-credential':
                message = "Invalid credentials. Please try again.";
                break;
            case 'auth/too-many-requests':
                message = "Too many failed login attempts. Please try again later.";
                break;
            case 'auth/network-request-failed':
                message = "Network error. Please check your internet connection and try again.";
                break;
            default:
                message = "An unexpected error occurred. Please try again later.";
        }
        setTimedErrorMessage(message);
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
                            type="email" 
                            id="email"
                            name="email"
                            autocomplete="email"
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