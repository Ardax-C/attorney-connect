<script>
    import Navbar from "./Navbar.svelte";
    import backgroundImage from '../images/dark_lattice.png';
</script>

<div class="bg-no-repeat bg-center bg-cover min-h-screen flex flex-col" style="background-image: url({backgroundImage})">
    <Navbar />
    <div class="flex-grow flex items-center justify-center">
        <div class="bg-white bg-opacity-90 p-6 sm:p-8 rounded-md shadow-md text-center">
            <h2 class="text-4xl sm:text-5xl font-bold mb-4 text-custom-color-secondary">Error</h2>
            <p class="text-xl sm:text-2xl text-gray-600">Page Not Found</p>
            <a href="/" class="inline-block mt-6 bg-custom-btn-bg text-custom-btn-text px-6 py-3 text-base rounded-md hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg">Go to Home</a>
        </div>
    </div>
</div>