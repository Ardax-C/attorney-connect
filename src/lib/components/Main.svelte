<script>
    import { goto } from '$app/navigation';
    import Navbar from './Navbar.svelte';
    import backgroundImage from '../images/pexels-lastly-2086917.jpg';
    import { base } from '$app/paths';

    let isClicked = false;
</script>

<div class="bg-no-repeat bg-center bg-cover h-screen" style="background-image: url({backgroundImage})">
    <Navbar />
    <div class="w-[400px] ml-10">
        <p class="font-inter text-custom-color-primary text-2xl">Attorney Network</p>
        <p class="font-inter text-custom-color-primary text-8xl"><span class="text-custom-color-secondary">Trusted</span> Attorneys</p>
        <p class="text-custom-color-primary
                    sm:text-[.9rem]
                    md:text-[1rem]
                    lg:text-[1.2rem]
                    w-full
                    max-w-lg
                    mt-2">As a legal professional, your success is our top priority. We're dedicated to providing the expertise and support you need to excel.</p>
        <button
            class="bg-custom-btn-bg text-custom-btn-text font-inter py-2 px-4 rounded-sm border-none mt-8 text-1xl w-[225px] h-[40px] cursor-pointer transition duration-300 ease-in-out transform hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text active:scale-95"
            on:click={() => goto(`${base}/signup`)}
            class:clicked={isClicked}
        >
            Get Started
        </button>
    </div>
</div>

<style>
    .clicked {
        background-color: #5E8C75;
        color: #efede1;
    }
</style>