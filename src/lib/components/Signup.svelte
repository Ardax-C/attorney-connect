<script>
    // ... (previous import statements and variable declarations remain the same)

    let showNavbar = true;
    let lastScrollTop = 0;
    let signupCard;

    onMount(() => {
        signupCard = document.getElementById('signup-card');
        signupCard.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            signupCard.removeEventListener('scroll', handleScroll);
        };
    });

    function handleScroll() {
        const scrollTop = signupCard.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 50) {
            showNavbar = false;
        } else if (scrollTop < lastScrollTop || scrollTop === 0) {
            showNavbar = true;
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }

    // ... (rest of the script remains the same)
</script>

<main class="bg-no-repeat bg-center bg-cover h-screen flex flex-col" style="background-image: url({backgroundImage})">
    <Navbar bind:visible={showNavbar} />
    <div class="flex-grow flex items-start justify-center p-4 overflow-hidden">
        <div id="signup-card" class="bg-zinc-800 bg-opacity-90 rounded-md shadow-md w-full max-w-4xl h-[calc(100vh-5rem)] overflow-y-auto">
            <div class="p-4 sm:p-6 md:p-8">
                <h2 class="text-2xl font-bold mb-4 text-center text-custom-color-tertiary font-inter">Sign Up for Access!</h2>
                <p class="text-center text-emerald-400 mb-6 text-base sm:text-lg">Once registered, you will have access to view the Attorney Directory!</p>

                <form on:submit|preventDefault={handleSubmit} class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <!-- ... (form fields remain the same) ... -->
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