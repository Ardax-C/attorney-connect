import adapter from '@sveltejs/adapter-static';
import sveltePreprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: sveltePreprocess(),

    kit: {
        adapter: adapter({
            fallback: 'app.html' // or any other fallback file
        }),
        paths: {
            base: process.env.NODE_ENV === 'production' ? '/attorney-connect' : '',
        }
    }
};

export default config;