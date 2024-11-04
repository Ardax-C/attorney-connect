import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: adapter({
            runtime: 'nodejs18.x'
        }),
        prerender: {
            handleMissingId: 'ignore'
        }
    }
};

export default config;