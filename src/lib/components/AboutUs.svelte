<script>
    import { goto } from '$app/navigation';
    import Navbar from '$lib/components/Navbar.svelte';
    import backgroundImage from '$lib/images/dark_lattice.png';
    import { fade, fly, scale } from 'svelte/transition';
    import { onMount } from 'svelte';
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';
    import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
    import { faClock } from '@fortawesome/free-solid-svg-icons';

    const features = [
        {
            title: "Secure Communications",
            description: "Standard SSL encryption protecting your communications with the same technology trusted by major banks and financial institutions.",
            icon: "🔐"
        },
        {
            title: "Advanced Legal Research",
            description: "Cutting-edge research tools integrated seamlessly into your workflow, powered by advanced AI technology.",
            icon: "⚖️"
        },
        {
            title: "Professional Network",
            description: "Connect with verified legal professionals in your practice area and jurisdiction.",
            icon: "🌐"
        },
        {
            title: "Case Request Board",
            description: "Browse and claim active client cases through our innovative bounty board system, matching attorneys with clients who need their expertise.",
            icon: "📋"
        },
        {
            title: "Streamlined Intake",
            description: "Efficient client request forms that capture all essential case details upfront, ensuring smooth onboarding and precise attorney matching.",
            icon: "📝"
        },
        {
            title: "Seamless Integration",
            description: "Enterprise-grade tools that integrate effortlessly with your existing legal practice management systems.",
            icon: "⚡"
        }
    ];

    // Add this simple array to track visibility
    let visibleFeatures = Array(features.length).fill(false);

    // Create tweened store for percentage counter
    const percentage = tweened(0, {
        duration: 3000,
        easing: cubicOut
    });

    onMount(() => {
        // Start the counter animation
        setTimeout(() => {
            percentage.set(100);
        }, 500);
    });

    // Add a small delay before showing first items
    setTimeout(() => {
        visibleFeatures[0] = true;
        visibleFeatures[1] = true;
        visibleFeatures = visibleFeatures; // trigger reactivity
    }, 500);

    // Set up scroll handler
    const handleScroll = () => {
        features.forEach((_, index) => {
            const element = document.getElementById(`feature-${index}`);
            if (!element) return;

            const rect = element.getBoundingClientRect();
            const isVisible = rect.top <= window.innerHeight - 100;
            
            if (isVisible && !visibleFeatures[index]) {
                visibleFeatures[index] = true;
                visibleFeatures = [...visibleFeatures]; // trigger reactivity
            }
        });
    };

    // Initial check
    handleScroll();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
</script>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Gothic+A1:wght@100;200;300;400;500;600;700;800;900&display=swap');

    :global(body) {
        font-family: 'Gothic A1', sans-serif;
    }

    .animated-gradient {
        background-size: 200% 100%;
        background-image: linear-gradient(
            90deg,
            #B8860B 0%,  /* Dark golden rod */
            #FFD700 25%, /* Gold */
            #DAA520 50%, /* Golden rod */
            #FFD700 75%, /* Gold */
            #B8860B 100% /* Dark golden rod */
        );
        animation: gradient 8s linear infinite;
    }

    .supreme-gradient {
        background: linear-gradient(
            135deg,
            rgba(0, 0, 0, 0.97) 0%,
            rgba(17, 17, 17, 0.98) 100%
        );
    }

    .shine-text {
        position: relative;
    }

    .shine-text::after {
        content: '';
        position: absolute;
        top: -180%;
        left: -100%;
        width: 20%;
        height: 500%;
        background: linear-gradient(
            to right,
            transparent 0%,
            rgba(255, 255, 255, 0) 10%,
            rgba(255, 215, 0, 0.3) 40%,
            rgba(255, 255, 255, 0.6) 50%,
            rgba(255, 215, 0, 0.3) 60%,
            rgba(255, 255, 255, 0) 90%,
            transparent 100%
        );
        transform: rotate(35deg);
        transition: all 0.5s;
        filter: blur(3px);
    }

    button:hover .shine-text::after {
        animation: lens-flare 1s ease-in-out infinite;
    }

    @keyframes gradient {
        0% {
            background-position: 0% 50%;
        }
        100% {
            background-position: 200% 50%;
        }
    }

    @keyframes lens-flare {
        0% {
            left: -100%;
            opacity: 0;
        }
        10% {
            opacity: 1;
        }
        90% {
            opacity: 1;
        }
        100% {
            left: 200%;
            opacity: 0;
        }
    }

    .group:hover {
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.1);
    }

    button:hover {
        box-shadow: 0 0 40px rgba(255, 215, 0, 0.2);
    }

    .swirl-button {
        background: linear-gradient(
            45deg,
            #000000,
            #1a1a1a,
            #B8860B,
            #DAA520,
            #C0C0C0,
            #1a1a1a,
            #000000
        );
        background-size: 400% 400%;
        animation: swirl 15s ease infinite;
        border: 1px solid rgba(218, 165, 32, 0.3);
    }

    @keyframes swirl {
        0% {
            background-position: 0% 50%;
        }
        25% {
            background-position: 100% 100%;
        }
        50% {
            background-position: 50% 0%;
        }
        75% {
            background-position: 0% 100%;
        }
        100% {
            background-position: 0% 50%;
        }
    }

    .swirl-button:hover {
        border-color: rgba(218, 165, 32, 0.6);
        box-shadow: 0 0 30px rgba(218, 165, 32, 0.2);
    }

    .shine-text {
        color: #FFFFFF;
        text-shadow: 0 0 10px rgba(218, 165, 32, 0.3);
    }

    @keyframes barChart {
        0% { height: 20%; }
        50% { height: 100%; }
        100% { height: 20%; }
    }

    @keyframes clockSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .bar-chart {
        width: 4px;
        background: #DAA520;
        animation: barChart 2s ease-in-out infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
</style>

<main 
    class="min-h-screen bg-black bg-no-repeat bg-fixed bg-center bg-cover relative overflow-hidden"
    style="background-image: url({backgroundImage})"
>
    <!-- Existing content -->
    <div class="absolute inset-0 supreme-gradient backdrop-blur-md"></div>
    
    <Navbar />
    
    {#if visibleFeatures.some(Boolean)}
    <div class="relative z-10">
        <div class="max-w-7xl mx-auto px-8 py-24 sm:px-12 lg:px-16">
            <!-- Hero Section -->
            <div in:fade={{ duration: 1000, delay: 200 }} class="text-center mt-10 mb-32">
                <h1 class="text-6xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-500 text-transparent bg-clip-text mb-8 leading-tight">
                    Elevating Legal Excellence
                </h1>
                <p class="text-2xl text-gray-300/90 max-w-3xl mx-auto leading-relaxed font-light tracking-wide">
                    Where distinguished attorneys connect, collaborate, and shape the future of law.
                </p>
            </div>

            <!-- Stats Section -->
            <div 
                in:fade={{ duration: 1000, delay: 800 }}
                class="bg-black/80 p-16 rounded-lg mb-32 border border-yellow-900/30 backdrop-blur-sm"
            >
                <div class="grid md:grid-cols-3 gap-12 text-center">
                    <!-- Percentage Counter -->
                    <div in:scale={{ duration: 800, delay: 1000 }}>
                        <div class="text-5xl font-black text-yellow-500 mb-3 tracking-tight">
                            {#if $percentage !== undefined}
                                {Math.round($percentage)}%
                            {/if}
                        </div>
                        <div class="text-gray-300 font-light tracking-wide text-lg">
                            Secure Communications
                        </div>
                    </div>

                    <!-- Uptime Bar Chart -->
                    <div in:scale={{ duration: 800, delay: 1200 }}>
                        <div class="text-5xl font-black text-yellow-500 mb-3 tracking-tight flex items-end justify-center h-12 gap-1">
                            <div class="bar-chart"></div>
                            <div class="bar-chart" style="animation-delay: -0.2s"></div>
                            <div class="bar-chart" style="animation-delay: -0.4s"></div>
                            99.9%
                        </div>
                        <div class="text-gray-300 font-light tracking-wide text-lg">
                            Uptime
                        </div>
                    </div>

                    <!-- Clock Animation -->
                    <div in:scale={{ duration: 800, delay: 1400 }}>
                        <div class="text-5xl font-black text-yellow-500 mb-3 tracking-tight flex items-center justify-center">
                            <FontAwesomeIcon 
                                icon={faClock} 
                                class="spinning-clock mr-4" 
                                size="sm"
                            />
                            <span>&lt;2hr</span>
                        </div>
                        <div class="text-gray-300 font-light tracking-wide text-lg">
                            Average Response Time
                        </div>
                    </div>
                </div>
            </div>

            <!-- Feature Grid -->
            <div class="grid md:grid-cols-2 gap-16 mb-32">
                {#each features as feature, i}
                <div 
                    id="feature-{i}"
                    class="group p-10 rounded-lg bg-black/80 border border-yellow-900/30 hover:border-yellow-500/50 transition-all duration-500 hover:shadow-xl hover:shadow-yellow-900/20 backdrop-blur-sm"
                >
                    {#if visibleFeatures[i]}
                        <div 
                            in:fly={{ 
                                x: i % 2 === 0 ? -100 : 100, 
                                duration: 800,
                                delay: 100 
                            }}
                        >
                            <div class="text-4xl mb-6">{feature.icon}</div>
                            <h2 class="text-2xl font-bold text-gray-100 mb-4 group-hover:text-yellow-500 transition-colors duration-500 tracking-wide">
                                {feature.title}
                            </h2>
                            <p class="text-gray-400 leading-relaxed font-light tracking-wide">
                                {feature.description}
                            </p>
                        </div>
                    {:else}
                        <div class="opacity-0">
                            <div class="text-4xl mb-4">{feature.icon}</div>
                            <h2 class="text-2xl font-bold text-white mb-4">
                                {feature.title}
                            </h2>
                            <p class="text-gray-300 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    {/if}
                </div>
                {/each}
            </div>

            <!-- CTA Section -->
            <div 
                in:fade={{ duration: 1000, delay: 1200 }}
                class="text-center"
            >
                <button 
                    on:click={() => goto('/signup')}
                    class="swirl-button relative inline-flex items-center justify-center px-12 py-5 text-xl font-bold rounded-lg overflow-hidden transition-all duration-500 hover:scale-105"
                >
                    <span class="shine-text relative z-10 tracking-wide">Join the Distinguished Network</span>
                </button>
                <p class="text-gray-500 mt-8 font-light tracking-wide text-lg">
                    Transform your practice with unparalleled legal innovation
                </p>
            </div>
        </div>
    </div>
    {/if}
</main>