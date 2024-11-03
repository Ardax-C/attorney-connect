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
    let isLoading = false;

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
        isLoading = true;
        
        try {
            const formData = new FormData(event.target);
            const email = formData.get('email');
            const password = formData.get('password');

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
        } finally {
            isLoading = false;
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

<main class="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-800 flex flex-col">
    <Navbar bind:visible={showNavbar} />
    <div id="login-content" class="flex-grow overflow-y-auto pt-16">
        <div class="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 min-h-full">
            <div class="w-full max-w-md space-y-8 bg-zinc-800/50 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-zinc-700/50">
                <div>
                    <!-- Add your logo here if you have one -->
                    <h2 class="mt-6 text-3xl font-bold tracking-tight text-white text-center">
                        Welcome back
                    </h2>
                    <p class="mt-2 text-sm text-zinc-400 text-center">
                        Sign in to your account
                    </p>
                </div>

                <form class="mt-8 space-y-6" on:submit={handleLogin}>
                    <div class="space-y-4 rounded-md">
                        <div>
                            <label for="email" class="sr-only">Email address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                autocomplete="email"
                                required
                                class="relative block w-full rounded-lg border-0 bg-zinc-700/50 py-3 px-4 text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-custom-color-primary sm:text-sm sm:leading-6"
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <label for="password" class="sr-only">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                autocomplete="current-password"
                                required
                                class="relative block w-full rounded-lg border-0 bg-zinc-700/50 py-3 px-4 text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-custom-color-primary sm:text-sm sm:leading-6"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    {#if errorMessage}
                        <div class="rounded-md bg-red-500/10 p-4 transition-all duration-300 animate-in fade-in">
                            <p class="text-sm text-red-400">{errorMessage}</p>
                        </div>
                    {/if}

                    <div class="flex justify-between items-center text-sm">
                        <a href="/forgot-password" class="text-emerald-400 hover:text-emerald-300">Forgot Password?</a>
                        <a href="/signup" class="text-emerald-400 hover:text-emerald-300">Sign Up</a>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        class="group relative flex w-full justify-center rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-700/90 focus:outline-none focus:ring-2 focus:ring-custom-color-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {#if isLoading}
                            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        {/if}
                        {isLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>
            </div>
        </div>
    </div>
</main>

{#if showResetPassword}
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-zinc-700/50">
            <h2 class="text-2xl font-bold text-white mb-6">Reset Password</h2>
            <form on:submit={handlePasswordReset} class="space-y-4">
                <input 
                    type="email" 
                    id="resetEmail"
                    name="email"
                    autocomplete="email"
                    placeholder="Enter your email address" 
                    class="relative block w-full rounded-lg border-0 bg-zinc-700/50 py-3 px-4 text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-custom-color-primary sm:text-sm sm:leading-6"
                    required
                >
                
                {#if resetMessage}
                    <div class="rounded-md bg-green-500/10 p-4">
                        <p class="text-sm text-green-400">{resetMessage}</p>
                    </div>
                {/if}
                
                <div class="flex items-center justify-end space-x-4 mt-6">
                    <button 
                        type="button" 
                        on:click={() => showResetPassword = false}
                        class="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        class="px-4 py-2 bg-custom-color-tertiary text-black rounded-lg text-sm font-medium hover:bg-cyan-700/90 hover:text-white focus:outline-none focus:ring-2 focus:ring-custom-color-primary focus:ring-offset-2 transition-colors"
                    >
                        Send Reset Link
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}