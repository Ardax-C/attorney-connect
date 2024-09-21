import adapter from '@sveltejs/adapter-static';

export default {
    kit: {
        adapter: adapter({
            pages: 'build',
            assets: 'build',
            fallback: '200.html'
        }),
        paths: {
            base: process.env.NODE_ENV === 'production' ? '/attorney-connect' : ''
        }
    }
};