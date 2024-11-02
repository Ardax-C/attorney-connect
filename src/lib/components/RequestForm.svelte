<script>
    import { db } from '$lib/firebase';
    import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
    import { analyzeLegalIssue } from '$lib/vertexAI';
    import backgroundImage from '../images/dark_lattice.png';
    import Navbar from './Navbar.svelte';

    let firstName = '';
    let lastName = '';
    let email = '';
    let phone = '';
    let legalIssue = '';
    let isSubmitting = false;
    let errorMessage = '';
    let successMessage = '';
    let suggestedPracticeAreas = [];
    let isAnalyzing = false;

    async function analyzePracticeAreas() {
        if (!legalIssue.trim()) return;
        
        isAnalyzing = true;
        try {
            const analysis = await analyzeLegalIssue(legalIssue);
            if (analysis.practiceAreas.length > 0) {
                suggestedPracticeAreas = analysis.practiceAreas;
            }
        } catch (error) {
            console.error('Error analyzing legal issue:', error);
        } finally {
            isAnalyzing = false;
        }
    }

    async function handleSubmit() {
        if (!firstName || !lastName || !email || !phone || !legalIssue) {
            errorMessage = 'Please fill out all fields';
            return;
        }

        isSubmitting = true;
        errorMessage = '';

        try {
            // Analyze practice areas before submission
            const analysis = await analyzeLegalIssue(legalIssue);
            
            await addDoc(collection(db, 'legalRequests'), {
                firstName,
                lastName,
                email,
                phone,
                legalIssue,
                suggestedPracticeAreas: analysis.practiceAreas,
                status: 'pending',
                timestamp: serverTimestamp(),
                assignedTo: null
            });

            successMessage = 'Your request has been submitted successfully!';
            // Reset form
            firstName = '';
            lastName = '';
            email = '';
            phone = '';
            legalIssue = '';
            suggestedPracticeAreas = [];
        } catch (error) {
            errorMessage = 'Error submitting request. Please try again.';
            console.error('Error:', error);
        } finally {
            isSubmitting = false;
        }
    }
</script>

<main class="bg-no-repeat bg-center bg-cover min-h-screen flex flex-col" style="background-image: url({backgroundImage})">
    <Navbar />
    <div class="flex-grow flex items-center justify-center p-4 pt-20">
        <div class="bg-zinc-800 bg-opacity-90 rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 class="text-2xl font-bold mb-4 text-center text-custom-color-tertiary">Request Legal Assistance</h2>
            
            {#if successMessage}
                <div class="bg-green-500 bg-opacity-20 text-green-300 p-4 rounded mb-4">
                    {successMessage}
                </div>
            {/if}

            {#if errorMessage}
                <div class="bg-red-500 bg-opacity-20 text-red-300 p-4 rounded mb-4">
                    {errorMessage}
                </div>
            {/if}

            <form on:submit|preventDefault={handleSubmit} class="space-y-4">
                <div>
                    <label for="firstName" class="block text-emerald-400 mb-1">First Name *</label>
                    <input
                        type="text"
                        id="firstName"
                        bind:value={firstName}
                        class="w-full px-4 py-2 bg-zinc-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary"
                        required
                    />
                </div>

                <div>
                    <label for="lastName" class="block text-emerald-400 mb-1">Last Name *</label>
                    <input
                        type="text"
                        id="lastName"
                        bind:value={lastName}
                        class="w-full px-4 py-2 bg-zinc-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary"
                        required
                    />
                </div>

                <div>
                    <label for="email" class="block text-emerald-400 mb-1">Email *</label>
                    <input
                        type="email"
                        id="email"
                        bind:value={email}
                        class="w-full px-4 py-2 bg-zinc-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary"
                        required
                    />
                </div>

                <div>
                    <label for="phone" class="block text-emerald-400 mb-1">Phone *</label>
                    <input
                        type="tel"
                        id="phone"
                        bind:value={phone}
                        class="w-full px-4 py-2 bg-zinc-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary"
                        required
                    />
                </div>

                <div>
                    <label for="legalIssue" class="block text-emerald-400 mb-1">Legal Issue *</label>
                    <textarea
                        id="legalIssue"
                        bind:value={legalIssue}
                        on:blur={analyzePracticeAreas}
                        rows="4"
                        class="w-full px-4 py-2 bg-zinc-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary resize-none"
                        required
                    ></textarea>
                </div>

                <div class="mt-2">
                    {#if isAnalyzing}
                        <p class="text-emerald-400 text-sm">Analyzing legal issue...</p>
                    {:else if suggestedPracticeAreas.length > 0}
                        <div class="space-y-2">
                            <p class="text-emerald-400 text-sm">Suggested Practice Areas:</p>
                            <div class="flex flex-wrap gap-2">
                                {#each suggestedPracticeAreas as area}
                                    <span class="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-lg text-sm">
                                        {area}
                                    </span>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    class="w-full bg-custom-color-tertiary text-blue-950 font-inter py-2 px-4 rounded-sm text-lg cursor-pointer transition duration-300 ease-in-out transform hover:bg-blue-900 hover:text-custom-color-tertiary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
            </form>
        </div>
    </div>
</main>
