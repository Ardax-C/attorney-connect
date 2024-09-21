<script>
    import { goto } from '$app/navigation';
    import Navbar from './Navbar.svelte';
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';
    import { base } from '$app/paths';
    let isClicked = false;
</script>

<div class="bg-no-repeat bg-center bg-cover min-h-screen" style="background-image: url({backgroundImage})">
    <Navbar />
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-lg mx-auto my-16 text-center">
            <p class="font-inter text-custom-color-primary text-3xl sm:text-4xl mb-2">ATTORNEY NETWORK</p>
            <p class="font-inter text-custom-color-primary text-5xl sm:text-6xl md:text-7xl"><span class="text-custom-color-tertiary">Trusted</span> Attorneys</p>
            <p class="text-custom-color-primary text-lg sm:text-xl mt-6 mb-8">
                As a legal professional, your <span class="text-custom-color-primary">success is our top priority</span>. We're dedicated to providing the expertise and support you need to excel.
            </p>
            <button
                class="bg-custom-btn-bg text-custom-btn-text font-inter py-3 px-6 rounded-sm border-none text-xl sm:text-2xl w-full sm:w-auto cursor-pointer transition duration-300 ease-in-out transform hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text active:scale-95"
                on:click={() => goto(`${base}/signup`)}
                class:clicked={isClicked}
            >
                Get Started
            </button>
        </div>
    </div>
</div>

<style>
    .clicked {
        background-color: #5E8C75;
        color: #efede1;
    }
</style>